// packages/shared-utilities/src/resources/connection-pool.ts

/**
 * Connection Pool implementation for resource management optimization.
 *
 * Provides generic connection pooling with lifecycle management for various
 * resource types including database connections, HTTP clients, and other
 * expensive-to-create resources.
 *
 * Features:
 * - Configurable min/max pool sizes
 * - Automatic resource creation and destruction
 * - Idle timeout with automatic cleanup
 * - Resource validation on borrow/return
 * - Pending request queue with timeout
 * - Comprehensive metrics and monitoring
 * - Graceful shutdown and draining
 * - Event-driven monitoring
 *
 * @example
 * ```typescript
 * class DatabaseConnectionPool extends ConnectionPool<Database> {
 *   protected async createResource(): Promise<Database> {
 *     return await createDatabaseConnection(this.connectionString);
 *   }
 *
 *   protected async destroyResource(db: Database): Promise<void> {
 *     await db.close();
 *   }
 *
 *   protected async validateResource(db: Database): Promise<boolean> {
 *     return await db.ping();
 *   }
 * }
 *
 * const pool = new DatabaseConnectionPool('db-pool', {
 *   min: 2,
 *   max: 10,
 *   idleTimeout: 300000,
 *   acquireTimeout: 30000
 * });
 *
 * // Use the pool
 * const db = await pool.acquire();
 * try {
 *   const users = await db.query('SELECT * FROM users');
 *   return users;
 * } finally {
 *   await pool.release(db);
 * }
 * ```
 */

import { EventEmitter } from 'events';
import PQueue from 'p-queue';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logging/logger';

/**
 * Configuration options for connection pool.
 */
export interface PoolOptions {
  /** Minimum number of resources to maintain */
  min: number;
  /** Maximum number of resources to create */
  max: number;
  /** Idle timeout in milliseconds before resource is destroyed */
  idleTimeout?: number;
  /** Timeout for acquiring a resource in milliseconds */
  acquireTimeout?: number;
  /** Number of retries when creating a resource */
  createRetries?: number;
  /** Whether to validate resources when borrowing */
  validateOnBorrow?: boolean;
  /** Whether to validate resources when returning */
  validateOnReturn?: boolean;
  /** Maximum lifetime of a resource in milliseconds */
  maxLifetime?: number;
  /** Maximum number of uses for a resource before recreation */
  maxUses?: number;
}

/**
 * Represents a pooled resource with metadata.
 */
export interface PooledResource<T> {
  /** The actual resource */
  resource: T;
  /** Unique identifier for the resource */
  id: string;
  /** When the resource was created */
  createdAt: Date;
  /** When the resource was last used */
  lastUsedAt: Date;
  /** Number of times the resource has been used */
  useCount: number;
  /** Whether the resource is valid */
  isValid: boolean;
}

/**
 * Pool statistics for monitoring.
 */
export interface PoolStats {
  /** Pool name */
  name: string;
  /** Number of available resources */
  available: number;
  /** Number of resources in use */
  inUse: number;
  /** Number of pending acquisition requests */
  pending: number;
  /** Total number of resources */
  total: number;
  /** Configured minimum pool size */
  min: number;
  /** Configured maximum pool size */
  max: number;
  /** Total resources created since startup */
  totalCreated: number;
  /** Total resources destroyed since startup */
  totalDestroyed: number;
  /** Total successful acquisitions */
  totalAcquisitions: number;
  /** Total timeouts occurred */
  totalTimeouts: number;
  /** Average resource age in milliseconds */
  averageAge: number;
  /** Average acquisition time in milliseconds */
  averageAcquisitionTime: number;
}

/**
 * Abstract base class for connection pooling.
 *
 * Provides comprehensive resource lifecycle management with configurable
 * options for different resource types. Subclasses must implement the
 * resource creation, destruction, and validation methods.
 *
 * @template T - Type of the pooled resource
 */
export abstract class ConnectionPool<T> extends EventEmitter {
  protected available: PooledResource<T>[] = [];
  protected inUse = new Map<string, PooledResource<T>>();
  protected pending: Array<{
    resolve: (resource: T) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
    requestedAt: Date;
  }> = [];

  private createQueue: PQueue;
  private idleCheckInterval?: NodeJS.Timeout;
  private isInitialized = false;
  private isDraining = false;

  // Metrics
  private stats = {
    totalCreated: 0,
    totalDestroyed: 0,
    totalAcquisitions: 0,
    totalTimeouts: 0,
    acquisitionTimes: [] as number[],
  };

  /**
   * Create a new connection pool.
   *
   * @param name - Unique name for the pool
   * @param options - Pool configuration options
   */
  constructor(
    protected readonly name: string,
    protected readonly options: PoolOptions,
  ) {
    super();

    // Validate options
    if (options.min < 0) throw new Error('min must be >= 0');
    if (options.max < options.min) throw new Error('max must be >= min');

    this.createQueue = new PQueue({
      concurrency: 1, // Serialize resource creation
    });

    logger.info(`Connection pool created: ${name}`, {
      min: options.min,
      max: options.max,
      idleTimeout: options.idleTimeout,
      acquireTimeout: options.acquireTimeout,
    });
  }

  /**
   * Create a new resource. Must be implemented by subclasses.
   *
   * @returns Promise that resolves to the created resource
   */
  protected abstract createResource(): Promise<T>;

  /**
   * Destroy a resource. Must be implemented by subclasses.
   *
   * @param resource - Resource to destroy
   */
  protected abstract destroyResource(resource: T): Promise<void>;

  /**
   * Validate a resource. Must be implemented by subclasses.
   *
   * @param resource - Resource to validate
   * @returns Promise that resolves to true if resource is valid
   */
  protected abstract validateResource(resource: T): Promise<boolean>;

  /**
   * Initialize the connection pool.
   *
   * Creates the minimum number of resources and sets up idle checking.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug(`Pool ${this.name} already initialized`);
      return;
    }

    logger.info(`Initializing connection pool: ${this.name}`);

    try {
      // Create minimum resources
      const promises: Promise<PooledResource<T>>[] = [];
      for (let i = 0; i < this.options.min; i++) {
        promises.push(this.createAndAddResource());
      }

      await Promise.all(promises);

      // Start idle check if configured
      if (this.options.idleTimeout && this.options.idleTimeout > 0) {
        this.idleCheckInterval = setInterval(
          () => this.removeIdleResources(),
          Math.max(this.options.idleTimeout / 2, 5000), // Check at least every 5 seconds
        );
      }

      this.isInitialized = true;

      this.emit('initialized', {
        pool: this.name,
        size: this.available.length,
      });

      logger.info(`Connection pool initialized: ${this.name}`, {
        available: this.available.length,
        total: this.getTotalSize(),
      });
    } catch (error) {
      logger.error(`Failed to initialize pool ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Acquire a resource from the pool.
   *
   * @returns Promise that resolves to a resource
   * @throws Error if acquisition times out or pool is draining
   */
  async acquire(): Promise<T> {
    if (this.isDraining) {
      throw new Error(`Pool ${this.name} is draining`);
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    let pooled: PooledResource<T> | null = null;

    try {
      // Try to get available resource
      pooled = this.getAvailableResource();

      if (pooled) {
        // Validate if required
        if (this.options.validateOnBorrow) {
          const isValid = await this.validateResource(pooled.resource);
          if (!isValid) {
            await this.destroyPooledResource(pooled);
            pooled = null;
          }
        }
      }

      // Create new resource if needed and possible
      if (!pooled && this.getTotalSize() < this.options.max) {
        await this.createAndAddResource();
        // Now get the newly created resource from available pool
        pooled = this.getAvailableResource();
      }

      // If still no resource, wait for one
      if (!pooled) {
        pooled = await this.waitForResource();
      }

      // Mark as in use
      pooled.lastUsedAt = new Date();
      pooled.useCount++;
      this.inUse.set(pooled.id, pooled);

      // Update metrics
      this.stats.totalAcquisitions++;
      const acquisitionTime = Date.now() - startTime;
      this.stats.acquisitionTimes.push(acquisitionTime);

      // Keep only last 100 acquisition times for rolling average
      if (this.stats.acquisitionTimes.length > 100) {
        this.stats.acquisitionTimes.shift();
      }

      this.emit('acquire', {
        pool: this.name,
        resourceId: pooled.id,
        acquisitionTime,
        available: this.available.length,
        inUse: this.inUse.size,
      });

      logger.debug(`Resource acquired from pool ${this.name}:`, {
        resourceId: pooled.id,
        acquisitionTime,
        useCount: pooled.useCount,
        available: this.available.length,
        inUse: this.inUse.size,
      });

      return pooled.resource;
    } catch (error) {
      logger.error(`Failed to acquire resource from pool ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Release a resource back to the pool.
   *
   * @param resource - Resource to release
   * @throws Error if resource is not from this pool
   */
  async release(resource: T): Promise<void> {
    const pooled = this.findPooledResource(resource);
    if (!pooled) {
      throw new Error(`Resource not from pool ${this.name}`);
    }

    try {
      // Remove from in-use
      this.inUse.delete(pooled.id);

      // Check if resource should be destroyed due to age or usage
      if (this.shouldDestroyResource(pooled)) {
        await this.destroyPooledResource(pooled);
        this.emit('release', {
          pool: this.name,
          resourceId: pooled.id,
          action: 'destroyed',
          reason: 'expired',
          available: this.available.length,
          inUse: this.inUse.size,
        });
        return;
      }

      // Validate resource if required
      if (this.options.validateOnReturn) {
        const isValid = await this.validateResource(resource);
        if (!isValid) {
          await this.destroyPooledResource(pooled);
          this.emit('release', {
            pool: this.name,
            resourceId: pooled.id,
            action: 'destroyed',
            reason: 'invalid',
            available: this.available.length,
            inUse: this.inUse.size,
          });
          return;
        }
      }

      // Return to available pool
      pooled.lastUsedAt = new Date();
      pooled.isValid = true;
      this.available.push(pooled);

      // Process pending requests
      this.processPending();

      this.emit('release', {
        pool: this.name,
        resourceId: pooled.id,
        action: 'returned',
        available: this.available.length,
        inUse: this.inUse.size,
      });

      logger.debug(`Resource released to pool ${this.name}:`, {
        resourceId: pooled.id,
        useCount: pooled.useCount,
        available: this.available.length,
        inUse: this.inUse.size,
      });
    } catch (error) {
      logger.error(`Failed to release resource to pool ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute a function with a pooled resource.
   *
   * Automatically acquires a resource, executes the function, and releases
   * the resource even if the function throws an error.
   *
   * @param fn - Function to execute with the resource
   * @returns Promise that resolves to the function result
   */
  async withResource<R>(fn: (resource: T) => Promise<R>): Promise<R> {
    const resource = await this.acquire();
    try {
      return await fn(resource);
    } finally {
      await this.release(resource);
    }
  }

  /**
   * Get pool statistics.
   *
   * @returns Current pool statistics
   */
  getStats(): PoolStats {
    const now = Date.now();
    const totalResources = [...this.available, ...this.inUse.values()];

    // Calculate average age
    const averageAge =
      totalResources.length > 0
        ? totalResources.reduce((sum, p) => sum + (now - p.createdAt.getTime()), 0) /
          totalResources.length
        : 0;

    // Calculate average acquisition time
    const averageAcquisitionTime =
      this.stats.acquisitionTimes.length > 0
        ? this.stats.acquisitionTimes.reduce((sum, time) => sum + time, 0) /
          this.stats.acquisitionTimes.length
        : 0;

    return {
      name: this.name,
      available: this.available.length,
      inUse: this.inUse.size,
      pending: this.pending.length,
      total: this.getTotalSize(),
      min: this.options.min,
      max: this.options.max,
      totalCreated: this.stats.totalCreated,
      totalDestroyed: this.stats.totalDestroyed,
      totalAcquisitions: this.stats.totalAcquisitions,
      totalTimeouts: this.stats.totalTimeouts,
      averageAge,
      averageAcquisitionTime,
    };
  }

  /**
   * Drain the pool by destroying all resources.
   *
   * Rejects all pending requests and destroys all resources.
   */
  async drain(): Promise<void> {
    if (this.isDraining) {
      logger.debug(`Pool ${this.name} is already draining`);
      return;
    }

    this.isDraining = true;
    logger.info(`Draining connection pool: ${this.name}`);

    try {
      // Clear pending requests
      for (const { reject, timeout } of this.pending) {
        clearTimeout(timeout);
        reject(new Error(`Pool ${this.name} is draining`));
      }
      this.pending = [];

      // Stop idle check
      if (this.idleCheckInterval) {
        clearInterval(this.idleCheckInterval);
        this.idleCheckInterval = undefined;
      }

      // Destroy all resources
      const allResources = [...this.available, ...this.inUse.values()];

      await Promise.all(allResources.map(pooled => this.destroyPooledResource(pooled)));

      this.available = [];
      this.inUse.clear();
      this.isInitialized = false;

      this.emit('drained', { pool: this.name });
      logger.info(`Connection pool drained: ${this.name}`);
    } catch (error) {
      logger.error(`Error draining pool ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Check if the pool is healthy.
   *
   * @returns True if pool has adequate resources available
   */
  isHealthy(): boolean {
    const stats = this.getStats();
    return stats.available > 0 || stats.total < stats.max;
  }

  /**
   * Get an available resource from the pool.
   */
  private getAvailableResource(): PooledResource<T> | null {
    return this.available.shift() || null;
  }

  /**
   * Create a new resource and add it to the pool.
   */
  private async createAndAddResource(): Promise<PooledResource<T>> {
    const resource = await this.createQueue.add(async () => {
      let lastError: Error | null = null;

      for (let i = 0; i < (this.options.createRetries || 3); i++) {
        try {
          return await this.createResource();
        } catch (error) {
          lastError = error as Error;
          if (i < (this.options.createRetries || 3) - 1) {
            const delay = 1000 * Math.pow(2, i); // Exponential backoff
            logger.warn(`Resource creation failed, retrying in ${delay}ms:`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    });

    const pooled: PooledResource<T> = {
      resource: resource!,
      id: uuidv4(),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 0,
      isValid: true,
    };

    this.stats.totalCreated++;

    // Add to available pool
    this.available.push(pooled);

    logger.debug(`Resource created for pool ${this.name}:`, {
      resourceId: pooled.id,
      totalCreated: this.stats.totalCreated,
    });

    return pooled;
  }

  /**
   * Wait for a resource to become available.
   */
  private waitForResource(): Promise<PooledResource<T>> {
    return new Promise((resolve, reject) => {
      const requestedAt = new Date();
      const timeout = setTimeout(() => {
        const index = this.pending.findIndex(p => p.timeout === timeout);
        if (index >= 0) {
          this.pending.splice(index, 1);
        }
        this.stats.totalTimeouts++;
        reject(
          new Error(`Resource acquisition timeout after ${this.options.acquireTimeout || 30000}ms`),
        );
      }, this.options.acquireTimeout || 30000);

      this.pending.push({
        resolve: resolve as any,
        reject,
        timeout,
        requestedAt,
      });
    });
  }

  /**
   * Process pending acquisition requests.
   */
  private processPending(): void {
    while (this.pending.length > 0 && this.available.length > 0) {
      const { resolve, timeout } = this.pending.shift()!;
      clearTimeout(timeout);

      const pooled = this.available.shift()!;
      resolve(pooled as any);
    }
  }

  /**
   * Destroy a pooled resource.
   */
  private async destroyPooledResource(pooled: PooledResource<T>): Promise<void> {
    try {
      await this.destroyResource(pooled.resource);
      this.stats.totalDestroyed++;

      const lifespan = Date.now() - pooled.createdAt.getTime();

      this.emit('destroy', {
        pool: this.name,
        resourceId: pooled.id,
        lifespan,
        useCount: pooled.useCount,
      });

      logger.debug(`Resource destroyed in pool ${this.name}:`, {
        resourceId: pooled.id,
        lifespan,
        useCount: pooled.useCount,
        totalDestroyed: this.stats.totalDestroyed,
      });
    } catch (error) {
      logger.error(`Failed to destroy resource in pool ${this.name}:`, error);
    }
  }

  /**
   * Check if a resource should be destroyed due to age or usage.
   */
  private shouldDestroyResource(pooled: PooledResource<T>): boolean {
    const now = Date.now();
    const age = now - pooled.createdAt.getTime();

    // Check maximum lifetime
    if (this.options.maxLifetime && age > this.options.maxLifetime) {
      return true;
    }

    // Check maximum uses
    if (this.options.maxUses && pooled.useCount >= this.options.maxUses) {
      return true;
    }

    return false;
  }

  /**
   * Remove idle resources from the pool.
   */
  private async removeIdleResources(): Promise<void> {
    if (this.isDraining) return;

    const now = Date.now();
    const timeout = this.options.idleTimeout!;

    const toRemove = this.available.filter(
      pooled =>
        now - pooled.lastUsedAt.getTime() > timeout && this.getTotalSize() > this.options.min,
    );

    for (const pooled of toRemove) {
      const index = this.available.indexOf(pooled);
      if (index >= 0) {
        this.available.splice(index, 1);
        await this.destroyPooledResource(pooled);
      }
    }

    if (toRemove.length > 0) {
      logger.debug(`Removed ${toRemove.length} idle resources from pool ${this.name}`);
    }
  }

  /**
   * Find a pooled resource by its actual resource.
   */
  private findPooledResource(resource: T): PooledResource<T> | null {
    for (const pooled of this.inUse.values()) {
      if (pooled.resource === resource) {
        return pooled;
      }
    }
    return null;
  }

  /**
   * Get total number of resources (available + in use).
   */
  private getTotalSize(): number {
    return this.available.length + this.inUse.size;
  }
}

/**
 * Pool manager for managing multiple connection pools.
 */
export class PoolManager {
  private pools = new Map<string, ConnectionPool<any>>();

  /**
   * Register a connection pool.
   *
   * @param name - Pool name
   * @param pool - Pool instance
   */
  register<T>(name: string, pool: ConnectionPool<T>): void {
    this.pools.set(name, pool);
    logger.info(`Pool registered: ${name}`);
  }

  /**
   * Get a connection pool by name.
   *
   * @param name - Pool name
   * @returns Pool instance or undefined
   */
  get<T>(name: string): ConnectionPool<T> | undefined {
    return this.pools.get(name);
  }

  /**
   * Get all registered pools.
   */
  getAll(): ConnectionPool<any>[] {
    return Array.from(this.pools.values());
  }

  /**
   * Get statistics for all pools.
   */
  getAllStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {};

    this.pools.forEach((pool, name) => {
      stats[name] = pool.getStats();
    });

    return stats;
  }

  /**
   * Drain all pools.
   */
  async drainAll(): Promise<void> {
    logger.info('Draining all connection pools...');

    await Promise.all(Array.from(this.pools.values()).map(pool => pool.drain()));

    logger.info('All connection pools drained');
  }

  /**
   * Check health of all pools.
   */
  checkHealth(): Record<string, boolean> {
    const health: Record<string, boolean> = {};

    this.pools.forEach((pool, name) => {
      health[name] = pool.isHealthy();
    });

    return health;
  }
}

/**
 * Global pool manager instance.
 */
export const poolManager = new PoolManager();

/**
 * Factory function for creating connection pools.
 *
 * @param name - Pool name
 * @param options - Pool configuration
 * @param factory - Resource factory functions
 * @returns Connection pool instance
 */
export function createConnectionPool<T>(
  name: string,
  options: PoolOptions,
  factory: {
    create: () => Promise<T>;
    destroy: (resource: T) => Promise<void>;
    validate: (resource: T) => Promise<boolean>;
  },
): ConnectionPool<T> {
  class GenericConnectionPool extends ConnectionPool<T> {
    protected async createResource(): Promise<T> {
      return factory.create();
    }

    protected async destroyResource(resource: T): Promise<void> {
      return factory.destroy(resource);
    }

    protected async validateResource(resource: T): Promise<boolean> {
      return factory.validate(resource);
    }
  }

  return new GenericConnectionPool(name, options);
}
