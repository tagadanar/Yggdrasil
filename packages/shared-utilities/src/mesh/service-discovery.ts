// packages/shared-utilities/src/mesh/service-discovery.ts

/**
 * Service Discovery implementation using Consul for service mesh.
 *
 * Provides service registration, discovery, health monitoring, and load balancing
 * capabilities for microservices architecture.
 *
 * Features:
 * - Automatic service registration with health checks
 * - Real-time service discovery with health filtering
 * - Multiple load balancing strategies (random, round-robin, least connections)
 * - Service watching with event notifications
 * - Graceful shutdown handling
 *
 * @example
 * ```typescript
 * const discovery = new ServiceDiscovery({
 *   host: 'localhost',
 *   port: '8500'
 * });
 *
 * // Register service
 * await discovery.register({
 *   name: 'user-service',
 *   port: 3002,
 *   tags: ['api', 'v1'],
 *   check: {
 *     http: 'http://localhost:3002/health',
 *     interval: '10s'
 *   }
 * });
 *
 * // Discover services
 * const instances = await discovery.discover('user-service');
 * console.log('Available instances:', instances);
 *
 * // Watch for changes
 * discovery.watch('user-service');
 * discovery.on('change', ({ service, instances }) => {
 *   console.log(`${service} instances updated:`, instances);
 * });
 * ```
 */

import { EventEmitter } from 'events';
import { networkInterfaces } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logging/logger';

/**
 * Get local network address (replacement for ip.address())
 * Uses Node.js built-in os.networkInterfaces() for security
 */
function getLocalAddress(): string {
  const interfaces = networkInterfaces();
  
  // Look for non-internal IPv4 addresses
  for (const name in interfaces) {
    const networkInterface = interfaces[name];
    if (networkInterface) {
      for (const net of networkInterface) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }
  
  // Fallback to localhost if no external address found
  return '127.0.0.1';
}

// Using any type for Consul due to deprecated package
// In production, would use a modern Consul client
let Consul: any;
try {
  Consul = require('consul');
} catch (error) {
  logger.warn('Consul package not available. Service discovery will use mock implementation.');
}

/**
 * Represents a service instance discovered from service registry.
 */
export interface ServiceInstance {
  /** Unique identifier for the service instance */
  id: string;
  /** Service name */
  name: string;
  /** IP address or hostname */
  address: string;
  /** Port number */
  port: number;
  /** Service tags for filtering and routing */
  tags: string[];
  /** Additional metadata */
  meta: Record<string, string>;
  /** Health status of the instance */
  health: 'passing' | 'warning' | 'critical';
}

/**
 * Service registration configuration.
 */
export interface ServiceRegistration {
  /** Service name */
  name: string;
  /** Optional unique ID (generated if not provided) */
  id?: string;
  /** Optional address (auto-detected if not provided) */
  address?: string;
  /** Port number */
  port: number;
  /** Optional tags for service categorization */
  tags?: string[];
  /** Optional metadata */
  meta?: Record<string, string>;
  /** Health check configuration */
  check?: {
    /** HTTP endpoint for health checks */
    http?: string;
    /** Check interval */
    interval?: string;
    /** Check timeout */
    timeout?: string;
  };
}

/**
 * Service Discovery using Consul for distributed service mesh.
 *
 * Provides comprehensive service registry capabilities including:
 * - Service registration with automatic deregistration
 * - Health-aware service discovery
 * - Real-time service watching
 * - Multiple load balancing strategies
 * - Event-driven notifications
 */
export class ServiceDiscovery extends EventEmitter {
  private consul: any;
  private services = new Map<string, ServiceInstance[]>();
  private watchers = new Map<string, any>();
  private roundRobinCounters = new Map<string, number>();
  private registeredServices = new Set<string>();

  /**
   * Initialize Service Discovery with Consul connection.
   *
   * @param consulOptions - Consul client configuration
   */
  constructor(consulOptions?: any) {
    super();

    if (Consul) {
      this.consul = new Consul(
        consulOptions || {
          host: process.env['CONSUL_HOST'] || 'localhost',
          port: process.env['CONSUL_PORT'] || '8500',
        },
      );
    } else {
      // Mock implementation for environments without Consul
      this.consul = this.createMockConsul();
    }

    // Set up shutdown handlers
    this.setupShutdownHandlers();
  }

  /**
   * Register a service with the service registry.
   *
   * Automatically sets up health checks and graceful shutdown handling.
   *
   * @param service - Service registration configuration
   */
  async register(service: ServiceRegistration): Promise<void> {
    const registration = {
      name: service.name,
      id: service.id || `${service.name}-${uuidv4()}`,
      address: service.address || getLocalAddress(),
      port: service.port,
      tags: service.tags || [],
      meta: service.meta || {},
      check: service.check || {
        http: `http://localhost:${service.port}/health`,
        interval: '10s',
        timeout: '5s',
      },
    };

    try {
      await this.consul.agent.service.register(registration);
      this.registeredServices.add(registration.id);

      logger.info(`Service registered: ${registration.name} (${registration.id})`, {
        address: registration.address,
        port: registration.port,
        tags: registration.tags,
      });

      this.emit('registered', { service: registration });
    } catch (error) {
      logger.error(`Failed to register service ${registration.name}:`, error);
      throw error;
    }
  }

  /**
   * Deregister a service from the service registry.
   *
   * @param serviceId - ID of the service to deregister
   */
  async deregister(serviceId: string): Promise<void> {
    try {
      await this.consul.agent.service.deregister(serviceId);
      this.registeredServices.delete(serviceId);

      logger.info(`Service deregistered: ${serviceId}`);
      this.emit('deregistered', { serviceId });
    } catch (error) {
      logger.error(`Failed to deregister service ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Discover healthy instances of a service.
   *
   * @param serviceName - Name of the service to discover
   * @returns Array of healthy service instances
   */
  async discover(serviceName: string): Promise<ServiceInstance[]> {
    try {
      const result = await this.consul.health.service(serviceName);

      const instances: ServiceInstance[] = result.map((item: any) => ({
        id: item.Service.ID,
        name: item.Service.Service,
        address: item.Service.Address,
        port: item.Service.Port,
        tags: item.Service.Tags || [],
        meta: item.Service.Meta || {},
        health: this.getHealthStatus(item.Checks),
      }));

      // Filter healthy instances
      const healthyInstances = instances.filter(i => i.health === 'passing');

      // Cache results
      this.services.set(serviceName, healthyInstances);

      logger.debug(`Discovered ${healthyInstances.length} healthy instances of ${serviceName}`);

      return healthyInstances;
    } catch (error) {
      logger.error(`Failed to discover service ${serviceName}:`, error);
      return [];
    }
  }

  /**
   * Start watching a service for changes.
   *
   * Emits 'change' events when service instances are added/removed/updated.
   *
   * @param serviceName - Name of the service to watch
   */
  watch(serviceName: string): void {
    if (this.watchers.has(serviceName)) {
      logger.debug(`Already watching service: ${serviceName}`);
      return;
    }

    try {
      const watcher = this.consul.watch({
        method: this.consul.health.service,
        options: { service: serviceName },
      });

      watcher.on('change', async (_data: any) => {
        try {
          const instances = await this.discover(serviceName);
          this.emit('change', { service: serviceName, instances });

          logger.debug(`Service ${serviceName} instances changed`, {
            instanceCount: instances.length,
          });
        } catch (error) {
          logger.error(`Error processing service change for ${serviceName}:`, error);
        }
      });

      watcher.on('error', (err: Error) => {
        logger.error(`Service watch error for ${serviceName}:`, err);
        this.emit('error', { service: serviceName, error: err });
      });

      this.watchers.set(serviceName, watcher);
      logger.info(`Started watching service: ${serviceName}`);
    } catch (error) {
      logger.error(`Failed to start watching service ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * Stop watching a service.
   *
   * @param serviceName - Name of the service to stop watching
   */
  unwatch(serviceName: string): void {
    const watcher = this.watchers.get(serviceName);
    if (watcher) {
      try {
        watcher.end();
        this.watchers.delete(serviceName);
        logger.info(`Stopped watching service: ${serviceName}`);
      } catch (error) {
        logger.error(`Error stopping watch for service ${serviceName}:`, error);
      }
    }
  }

  /**
   * Get a random instance of a service (random load balancing).
   *
   * @param serviceName - Name of the service
   * @returns Random service instance or null if none available
   */
  getRandomInstance(serviceName: string): ServiceInstance | null {
    const instances = this.services.get(serviceName) || [];
    if (instances.length === 0) {
      logger.debug(`No instances available for service: ${serviceName}`);
      return null;
    }

    const index = Math.floor(Math.random() * instances.length);
    const instance = instances[index];

    if (!instance) {
      logger.warn(`Instance at index ${index} is undefined for service: ${serviceName}`);
      return null;
    }

    logger.debug(`Selected random instance for ${serviceName}:`, {
      instanceId: instance.id,
      address: `${instance.address}:${instance.port}`,
    });

    return instance;
  }

  /**
   * Get the next instance using round-robin load balancing.
   *
   * @param serviceName - Name of the service
   * @returns Next service instance in round-robin order or null if none available
   */
  getRoundRobinInstance(serviceName: string): ServiceInstance | null {
    const instances = this.services.get(serviceName) || [];
    if (instances.length === 0) {
      logger.debug(`No instances available for service: ${serviceName}`);
      return null;
    }

    const currentIndex = this.roundRobinCounters.get(serviceName) || 0;
    const index = currentIndex % instances.length;
    this.roundRobinCounters.set(serviceName, index + 1);

    const instance = instances[index];

    if (!instance) {
      logger.warn(`Instance at index ${index} is undefined for service: ${serviceName}`);
      return null;
    }

    logger.debug(`Selected round-robin instance for ${serviceName}:`, {
      instanceId: instance.id,
      address: `${instance.address}:${instance.port}`,
      roundRobinIndex: index,
    });

    return instance;
  }

  /**
   * Get the instance with least connections (requires external connection tracking).
   *
   * @param serviceName - Name of the service
   * @param connectionCounts - Map of instance ID to connection count
   * @returns Instance with least connections or null if none available
   */
  getLeastConnectionsInstance(
    serviceName: string,
    connectionCounts: Map<string, number>,
  ): ServiceInstance | null {
    const instances = this.services.get(serviceName) || [];
    if (instances.length === 0) {
      logger.debug(`No instances available for service: ${serviceName}`);
      return null;
    }

    let leastConnections = Infinity;
    let selectedInstance: ServiceInstance | null = null;

    for (const instance of instances) {
      const connections = connectionCounts.get(instance.id) || 0;
      if (connections < leastConnections) {
        leastConnections = connections;
        selectedInstance = instance;
      }
    }

    if (selectedInstance) {
      logger.debug(`Selected least-connections instance for ${serviceName}:`, {
        instanceId: selectedInstance.id,
        address: `${selectedInstance.address}:${selectedInstance.port}`,
        connections: leastConnections,
      });
    }

    return selectedInstance;
  }

  /**
   * Get statistics about the service discovery.
   */
  getStats(): {
    registeredServices: number;
    watchedServices: number;
    discoveredServices: Record<string, number>;
  } {
    const discoveredServices: Record<string, number> = {};
    this.services.forEach((instances, serviceName) => {
      discoveredServices[serviceName] = instances.length;
    });

    return {
      registeredServices: this.registeredServices.size,
      watchedServices: this.watchers.size,
      discoveredServices,
    };
  }

  /**
   * Gracefully shutdown all service discovery operations.
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down service discovery...');

    // Stop all watchers
    for (const [serviceName] of this.watchers) {
      this.unwatch(serviceName);
    }

    // Deregister all services
    for (const serviceId of this.registeredServices) {
      try {
        await this.deregister(serviceId);
      } catch (error) {
        logger.error(`Error deregistering service ${serviceId} during shutdown:`, error);
      }
    }

    this.removeAllListeners();
    logger.info('Service discovery shutdown complete');
  }

  /**
   * Determine health status from Consul health checks.
   */
  private getHealthStatus(checks: any[]): 'passing' | 'warning' | 'critical' {
    if (!checks || checks.length === 0) return 'critical';

    if (checks.some(c => c.Status === 'critical')) return 'critical';
    if (checks.some(c => c.Status === 'warning')) return 'warning';
    return 'passing';
  }

  /**
   * Set up process handlers for graceful shutdown.
   */
  private setupShutdownHandlers(): void {
    const shutdownHandler = async () => {
      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        logger.error('Error during service discovery shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
  }

  /**
   * Create a mock Consul client for testing/development without Consul.
   */
  private createMockConsul(): any {
    const mockServices = new Map<string, any[]>();

    return {
      agent: {
        service: {
          register: async (service: any) => {
            logger.info(`[MOCK] Service registered: ${service.name} (${service.id})`);
          },
          deregister: async (serviceId: string) => {
            logger.info(`[MOCK] Service deregistered: ${serviceId}`);
          },
        },
      },
      health: {
        service: async (serviceName: string) => {
          // Return mock healthy service for testing
          return (
            mockServices.get(serviceName) || [
              {
                Service: {
                  ID: `${serviceName}-mock-1`,
                  Service: serviceName,
                  Address: 'localhost',
                  Port: 3000,
                  Tags: ['mock'],
                  Meta: {},
                },
                Checks: [{ Status: 'passing' }],
              },
            ]
          );
        },
      },
      watch: () => {
        const emitter = new EventEmitter();
        // Mock watch doesn't emit changes
        setTimeout(() => emitter.emit('change', []), 100);
        return emitter;
      },
    };
  }
}

/**
 * Factory function for creating service discovery instances.
 *
 * @param consulOptions - Consul client configuration
 * @returns New ServiceDiscovery instance
 */
export function createServiceDiscovery(consulOptions?: any): ServiceDiscovery {
  return new ServiceDiscovery(consulOptions);
}
