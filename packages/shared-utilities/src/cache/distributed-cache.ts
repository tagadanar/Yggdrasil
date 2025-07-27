// packages/shared-utilities/src/cache/distributed-cache.ts

/**
 * Distributed Cache implementation using Redis with advanced caching patterns.
 *
 * Supports multiple caching strategies for different use cases:
 * - Cache-aside (lazy loading)
 * - Write-through (immediate persistence)
 * - Write-behind (asynchronous persistence)
 * - Refresh-ahead (proactive refresh)
 *
 * Features:
 * - Redis cluster support
 * - Distributed locking
 * - Pattern-based key operations
 * - Automatic serialization/deserialization
 * - TTL management
 * - Error handling and resilience
 *
 * @example
 * ```typescript
 * const cache = new DistributedCache({
 *   host: 'localhost',
 *   port: 6379
 * }, {
 *   prefix: 'yggdrasil',
 *   ttl: 3600
 * });
 *
 * // Cache-aside pattern
 * const user = await cache.getOrSet(
 *   `user:${userId}`,
 *   () => userService.getUser(userId),
 *   300
 * );
 *
 * // Write-through pattern
 * await cache.writeThrough(
 *   `user:${userId}`,
 *   updatedUser,
 *   (user) => userService.updateUser(user)
 * );
 *
 * // Distributed locking
 * const lockId = await cache.acquireLock('user-update', 5000);
 * if (lockId) {
 *   try {
 *     // Critical section
 *   } finally {
 *     await cache.releaseLock('user-update', lockId);
 *   }
 * }
 * ```
 */

import Redis, { Cluster } from 'ioredis';
import { logger } from '../logging/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration options for the distributed cache.
 */
export interface CacheOptions {
  /** Default TTL in seconds */
  ttl?: number;
  /** Key prefix for namespacing */
  prefix?: string;
  /** Cache namespace for multi-tenant scenarios */
  namespace?: string;
  /** Enable compression for large values */
  compression?: boolean;
  /** Maximum value size in bytes */
  maxValueSize?: number;
}

/**
 * Cache metrics and statistics.
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalOperations: number;
  hitRate: number;
}

/**
 * Distributed Cache using Redis with advanced caching patterns.
 *
 * Provides high-performance distributed caching with multiple consistency
 * patterns and advanced features like distributed locking and batch operations.
 */
export class DistributedCache {
  private client: Redis | Cluster;
  private prefix: string;
  private defaultTTL: number;
  private metrics: CacheMetrics;

  /**
   * Initialize distributed cache with Redis connection.
   *
   * @param redisOptions - Redis connection configuration or cluster nodes
   * @param options - Cache configuration options
   */
  constructor(redisOptions: any, options: CacheOptions = {}) {
    // Initialize Redis client (single instance or cluster)
    this.client = Array.isArray(redisOptions)
      ? new Redis.Cluster(redisOptions)
      : new Redis(redisOptions);

    this.prefix = options.prefix || 'cache';
    this.defaultTTL = options.ttl || 3600; // 1 hour default

    // Initialize metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalOperations: 0,
      hitRate: 0,
    };

    this.setupEventHandlers();
  }

  /**
   * Set up Redis event handlers for monitoring and logging.
   */
  private setupEventHandlers(): void {
    this.client.on('error', (err: Error) => {
      logger.error('Redis error:', err);
      this.metrics.errors++;
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });

    this.client.on('reconnecting', () => {
      logger.warn('Redis reconnecting...');
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  /**
   * Generate full cache key with prefix and namespace.
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Get a value from the cache.
   *
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      this.metrics.totalOperations++;

      const data = await this.client.get(this.getKey(key));
      if (!data) {
        this.metrics.misses++;
        this.updateHitRate();
        return null;
      }

      this.metrics.hits++;
      this.updateHitRate();

      const result = JSON.parse(data) as T;

      logger.debug(`Cache hit for key: ${key}`, {
        keySize: key.length,
        valueSize: data.length,
      });

      return result;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Set a value in the cache.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional TTL in seconds
   * @returns Success status
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      this.metrics.totalOperations++;
      this.metrics.sets++;

      const data = JSON.stringify(value);
      const ttlSeconds = ttl || this.defaultTTL;

      await this.client.setex(this.getKey(key), ttlSeconds, data);

      logger.debug(`Cache set for key: ${key}`, {
        ttl: ttlSeconds,
        keySize: key.length,
        valueSize: data.length,
      });

      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete a value from the cache.
   *
   * @param key - Cache key to delete
   * @returns Success status
   */
  async delete(key: string): Promise<boolean> {
    try {
      this.metrics.totalOperations++;
      this.metrics.deletes++;

      const result = await this.client.del(this.getKey(key));

      logger.debug(`Cache delete for key: ${key}`, {
        deleted: result > 0,
      });

      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern.
   *
   * @param pattern - Key pattern (supports wildcards)
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      this.metrics.totalOperations++;

      const keys = await this.scanKeys(`${this.prefix}:${pattern}`);
      if (keys.length === 0) return 0;

      const result = await this.client.del(...keys);
      this.metrics.deletes += result;

      logger.debug(`Cache delete pattern: ${pattern}`, {
        keysDeleted: result,
      });

      return result;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Check if a key exists in the cache.
   *
   * @param key - Cache key to check
   * @returns True if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      this.metrics.totalOperations++;
      const result = await this.client.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get TTL for a key.
   *
   * @param key - Cache key
   * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  async getTTL(key: string): Promise<number> {
    try {
      this.metrics.totalOperations++;
      return await this.client.ttl(this.getKey(key));
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}:`, error);
      this.metrics.errors++;
      return -2;
    }
  }

  /**
   * Cache-aside pattern: Get from cache or load and cache.
   *
   * This is the most common caching pattern where the application
   * manages the cache explicitly.
   *
   * @param key - Cache key
   * @param factory - Function to load data if cache miss
   * @param ttl - Optional TTL in seconds
   * @returns Cached or loaded value
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      // Cache miss - load from source
      logger.debug(`Cache miss for key: ${key}, loading from source`);
      const value = await factory();

      // Set in cache for future requests
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      logger.error(`Cache-aside factory error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Write-through pattern: Update cache and persistent store synchronously.
   *
   * Ensures cache and persistent store are always consistent but
   * has higher latency due to synchronous writes.
   *
   * @param key - Cache key
   * @param value - Value to store
   * @param persist - Function to persist data
   * @param ttl - Optional TTL in seconds
   */
  async writeThrough<T>(
    key: string,
    value: T,
    persist: (value: T) => Promise<void>,
    ttl?: number,
  ): Promise<void> {
    try {
      // Write to persistent store first
      logger.debug(`Write-through: persisting data for key: ${key}`);
      await persist(value);

      // Then update cache
      await this.set(key, value, ttl);

      logger.debug(`Write-through completed for key: ${key}`);
    } catch (error) {
      logger.error(`Write-through error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Write-behind pattern: Update cache immediately, persist asynchronously.
   *
   * Provides lower latency by updating cache immediately and
   * persisting data in the background.
   *
   * @param key - Cache key
   * @param value - Value to store
   * @param persist - Function to persist data
   * @param ttl - Optional TTL in seconds
   */
  async writeBehind<T>(
    key: string,
    value: T,
    persist: (value: T) => Promise<void>,
    ttl?: number,
  ): Promise<void> {
    try {
      // Update cache immediately for low latency
      await this.set(key, value, ttl);

      logger.debug(`Write-behind: cache updated for key: ${key}`);

      // Queue write to persistent store (fire and forget)
      setImmediate(async () => {
        try {
          await persist(value);
          logger.debug(`Write-behind: persistence completed for key: ${key}`);
        } catch (error) {
          logger.error(`Write-behind persist error for key ${key}:`, error);
          // In production, implement retry logic or dead letter queue
          this.emit('writeBehindError', { key, value, error });
        }
      });
    } catch (error) {
      logger.error(`Write-behind cache update error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Refresh-ahead pattern: Proactively refresh cache before expiration.
   *
   * Reduces cache miss latency by refreshing cache entries before
   * they expire, based on a refresh threshold.
   *
   * @param key - Cache key
   * @param factory - Function to load fresh data
   * @param ttl - TTL for cached data
   * @param refreshThreshold - Refresh when remaining TTL is below this ratio
   * @returns Cached value (may trigger background refresh)
   */
  async refreshAhead<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number,
    refreshThreshold = 0.8,
  ): Promise<T | null> {
    try {
      // Get value and TTL
      const [value, remainingTTL] = await Promise.all([this.get<T>(key), this.getTTL(key)]);

      if (value === null) {
        // Cache miss - load and cache
        logger.debug(`Refresh-ahead cache miss for key: ${key}`);
        const newValue = await factory();
        await this.set(key, newValue, ttl);
        return newValue;
      }

      // Check if refresh needed
      if (remainingTTL > 0 && remainingTTL < ttl * refreshThreshold) {
        logger.debug(`Refresh-ahead threshold reached for key: ${key}, refreshing in background`);

        // Refresh in background
        setImmediate(async () => {
          try {
            const newValue = await factory();
            await this.set(key, newValue, ttl);
            logger.debug(`Refresh-ahead completed for key: ${key}`);
          } catch (error) {
            logger.error(`Refresh-ahead error for key ${key}:`, error);
            this.emit('refreshAheadError', { key, error });
          }
        });
      }

      return value;
    } catch (error) {
      logger.error(`Refresh-ahead error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Acquire a distributed lock.
   *
   * Uses Redis SETNX with expiration for distributed locking.
   * Returns a lock ID if successful, null if lock is already held.
   *
   * @param resource - Resource to lock
   * @param ttl - Lock TTL in milliseconds
   * @returns Lock ID if acquired, null otherwise
   */
  async acquireLock(resource: string, ttl = 10000): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const lockValue = uuidv4();

    try {
      const result = await this.client.set(lockKey, lockValue, 'PX', ttl, 'NX');

      if (result === 'OK') {
        logger.debug(`Lock acquired for resource: ${resource}`, {
          lockId: lockValue,
          ttl,
        });
        return lockValue;
      }

      logger.debug(`Failed to acquire lock for resource: ${resource}`);
      return null;
    } catch (error) {
      logger.error(`Lock acquisition error for resource ${resource}:`, error);
      return null;
    }
  }

  /**
   * Release a distributed lock.
   *
   * Uses Lua script to ensure atomic check-and-delete operation.
   * Only the lock holder (with correct lock ID) can release the lock.
   *
   * @param resource - Resource to unlock
   * @param lockValue - Lock ID returned from acquireLock
   * @returns True if lock was released, false otherwise
   */
  async releaseLock(resource: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;

    // Lua script for atomic lock release
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = (await this.client.eval(script, 1, lockKey, lockValue)) as number;

      const released = result === 1;

      logger.debug(`Lock release for resource: ${resource}`, {
        lockId: lockValue,
        released,
      });

      return released;
    } catch (error) {
      logger.error(`Lock release error for resource ${resource}:`, error);
      return false;
    }
  }

  /**
   * Execute operation with distributed lock.
   *
   * Automatically acquires lock, executes operation, and releases lock.
   *
   * @param resource - Resource to lock
   * @param operation - Operation to execute while holding lock
   * @param ttl - Lock TTL in milliseconds
   * @returns Operation result
   */
  async withLock<T>(resource: string, operation: () => Promise<T>, ttl = 10000): Promise<T | null> {
    const lockId = await this.acquireLock(resource, ttl);
    if (!lockId) {
      logger.warn(`Could not acquire lock for resource: ${resource}`);
      return null;
    }

    try {
      const result = await operation();
      return result;
    } finally {
      await this.releaseLock(resource, lockId);
    }
  }

  /**
   * Get cache metrics and statistics.
   *
   * @returns Current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset cache metrics.
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalOperations: 0,
      hitRate: 0,
    };
  }

  /**
   * Flush all cache data.
   *
   * WARNING: This will delete all data in the Redis database.
   */
  async flush(): Promise<void> {
    try {
      await this.client.flushdb();
      logger.info('Cache flushed');
    } catch (error) {
      logger.error('Cache flush error:', error);
      throw error;
    }
  }

  /**
   * Gracefully close the cache connection.
   */
  async close(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Cache connection closed');
    } catch (error) {
      logger.error('Cache close error:', error);
    }
  }

  /**
   * Scan for keys matching a pattern.
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];

    try {
      if ('scanStream' in this.client) {
        // Single Redis instance
        const stream = (this.client as Redis).scanStream({
          match: pattern,
          count: 100,
        });

        return new Promise((resolve, reject) => {
          stream.on('data', (resultKeys: string[]) => {
            keys.push(...resultKeys);
          });

          stream.on('end', () => {
            resolve(keys);
          });

          stream.on('error', (err: Error) => {
            reject(err);
          });
        });
      } else {
        // Cluster - use scan command manually
        let cursor = '0';
        do {
          const result = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = result[0];
          keys.push(...result[1]);
        } while (cursor !== '0');

        return keys;
      }
    } catch (error) {
      logger.error('Error scanning keys:', error);
      return [];
    }
  }

  /**
   * Update hit rate metric.
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  /**
   * Emit events for monitoring (make this class an EventEmitter if needed).
   */
  private emit(event: string, data: any): void {
    // For now, just log events. Can extend EventEmitter if needed.
    logger.debug(`Cache event: ${event}`, data);
  }
}

/**
 * Factory function for creating distributed cache instances.
 *
 * @param redisOptions - Redis connection configuration
 * @param cacheOptions - Cache configuration options
 * @returns New DistributedCache instance
 */
export function createDistributedCache(
  redisOptions: any,
  cacheOptions?: CacheOptions,
): DistributedCache {
  return new DistributedCache(redisOptions, cacheOptions);
}
