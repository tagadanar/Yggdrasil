// Path: packages/api-gateway/src/services/GatewayService.ts
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import {
  ServiceConfig,
  LoadBalancingStrategy,
  HealthStatus,
  CircuitBreakerState,
  GatewayConfig,
  ServiceMetrics,
  HealthCheckResult,
  GatewayStats,
  LoadBalancerConfig,
  CircuitBreakerStats
} from '../types/gateway';
import { Logger } from './Logger';
import { MetricsService } from './MetricsService';
import { CacheService } from './CacheService';
import axios from 'axios';

export class GatewayService {
  private services: Map<string, ServiceConfig> = new Map();
  private serviceInstances: Map<string, string[]> = new Map();
  private healthStatus: Map<string, HealthStatus> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerStats> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private lastHealthCheck: Map<string, Date> = new Map();
  private config: GatewayConfig;
  private logger: Logger;
  private metrics: MetricsService;
  private cache: CacheService;

  constructor(config: GatewayConfig) {
    this.config = config;
    this.logger = new Logger(config.logging);
    this.metrics = new MetricsService(config.metrics);
    this.cache = new CacheService(config.cache);
    
    this.initializeServices();
    this.startHealthChecks();
  }

  /**
   * Initialize services from configuration
   */
  private initializeServices(): void {
    this.config.services.forEach(service => {
      this.registerService(service);
    });

    this.logger.info(`Initialized ${this.services.size} services`);
  }

  /**
   * Register a new service
   */
  registerService(serviceConfig: ServiceConfig): void {
    this.services.set(serviceConfig.name, serviceConfig);
    this.serviceInstances.set(serviceConfig.name, [serviceConfig.url]);
    this.healthStatus.set(serviceConfig.name, 'unknown');
    this.requestCounts.set(serviceConfig.name, 0);
    
    // Initialize circuit breaker
    this.circuitBreakers.set(serviceConfig.name, {
      state: 'closed',
      failureCount: 0,
      successCount: 0
    });

    this.logger.info(`Registered service: ${serviceConfig.name} at ${serviceConfig.url}`);
  }

  /**
   * Create proxy middleware for a service
   */
  createProxyMiddleware(serviceName: string): any {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const proxyOptions: Options = {
      target: this.getServiceUrl(serviceName),
      changeOrigin: this.config.proxy.changeOrigin,
      pathRewrite: {
        [`^${service.path}`]: ''
      },
      timeout: service.timeout || this.config.proxy.timeout,
      onError: (err: any, req: any, res: any) => {
        this.handleProxyError(err, req as Request, res as Response, serviceName);
      },
      onProxyReq: (proxyReq: any, req: any, res: any, options: any) => {
        this.handleProxyRequest(proxyReq, req as Request, res as Response, serviceName);
      },
      onProxyRes: (proxyRes: any, req: any, res: any) => {
        this.handleProxyResponse(proxyRes, req as Request, res as Response, serviceName);
      }
    };

    return createProxyMiddleware(proxyOptions);
  }

  /**
   * Get service URL using load balancing
   */
  private getServiceUrl(serviceName: string): string {
    const instances = this.serviceInstances.get(serviceName) || [];
    const healthyInstances = instances.filter(instance => {
      const instanceHealth = this.healthStatus.get(`${serviceName}_${instance}`);
      return instanceHealth === 'healthy' || instanceHealth === 'unknown';
    });

    if (healthyInstances.length === 0) {
      // Fallback to any instance if none are healthy
      return instances[0] || '';
    }

    // Load balancing strategy
    switch (this.config.loadBalancer.strategy) {
      case 'round_robin':
        return this.roundRobinSelection(healthyInstances);
      case 'least_connections':
        return this.leastConnectionsSelection(healthyInstances, serviceName);
      case 'weighted_round_robin':
        return this.weightedRoundRobinSelection(healthyInstances, serviceName);
      case 'least_response_time':
        return this.leastResponseTimeSelection(healthyInstances, serviceName);
      case 'ip_hash':
        return this.ipHashSelection(healthyInstances);
      default:
        return healthyInstances[0];
    }
  }

  /**
   * Load balancing strategies
   */
  private roundRobinSelection(instances: string[]): string {
    const currentTime = Date.now();
    const index = Math.floor(currentTime / 1000) % instances.length;
    return instances[index];
  }

  private leastConnectionsSelection(instances: string[], serviceName: string): string {
    // Simplified: return first instance (would need connection tracking in real implementation)
    return instances[0];
  }

  private weightedRoundRobinSelection(instances: string[], serviceName: string): string {
    const service = this.services.get(serviceName);
    if (!service || !service.weight) {
      return this.roundRobinSelection(instances);
    }
    
    // Simplified weighted selection
    const weights = new Array(instances.length).fill(service.weight);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const randomWeight = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (let i = 0; i < instances.length; i++) {
      currentWeight += weights[i];
      if (randomWeight <= currentWeight) {
        return instances[i];
      }
    }
    
    return instances[0];
  }

  private leastResponseTimeSelection(instances: string[], serviceName: string): string {
    // Simplified: return first instance (would need response time tracking)
    return instances[0];
  }

  private ipHashSelection(instances: string[]): string {
    // Simplified hash selection
    const hash = Math.abs('127.0.0.1'.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0));
    return instances[hash % instances.length];
  }

  /**
   * Check if circuit breaker allows request
   */
  isCircuitBreakerOpen(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    if (!service?.circuitBreaker?.enabled) {
      return false;
    }

    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) {
      return false;
    }

    const config = service.circuitBreaker;
    const now = Date.now();

    switch (breaker.state) {
      case 'closed':
        return false;
      case 'open':
        if (breaker.nextAttempt && now >= breaker.nextAttempt.getTime()) {
          // Move to half-open state
          breaker.state = 'half_open';
          this.circuitBreakers.set(serviceName, breaker);
          return false;
        }
        return true;
      case 'half_open':
        return false;
      default:
        return false;
    }
  }

  /**
   * Record circuit breaker result
   */
  recordCircuitBreakerResult(serviceName: string, success: boolean): void {
    const service = this.services.get(serviceName);
    if (!service?.circuitBreaker?.enabled) {
      return;
    }

    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) {
      return;
    }

    const config = service.circuitBreaker;
    const now = new Date();

    if (success) {
      breaker.successCount++;
      breaker.lastSuccessTime = now;
      
      if (breaker.state === 'half_open') {
        // Return to closed state after successful request
        breaker.state = 'closed';
        breaker.failureCount = 0;
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = now;
      
      if (breaker.failureCount >= config.failureThreshold) {
        breaker.state = 'open';
        breaker.nextAttempt = new Date(now.getTime() + config.resetTimeout);
      }
    }

    this.circuitBreakers.set(serviceName, breaker);
  }

  /**
   * Handle proxy request
   */
  private handleProxyRequest(proxyReq: any, req: Request, res: Response, serviceName: string): void {
    // Add custom headers
    proxyReq.setHeader('X-Gateway-Request-Id', (req as any).requestId);
    proxyReq.setHeader('X-Gateway-Service', serviceName);
    proxyReq.setHeader('X-Gateway-Timestamp', new Date().toISOString());

    // Add user context if available
    if ((req as any).user) {
      proxyReq.setHeader('X-User-Id', (req as any).user.id);
      proxyReq.setHeader('X-User-Role', (req as any).user.role);
    }

    this.logger.debug(`Proxying request to ${serviceName}`, {
      requestId: (req as any).requestId,
      method: req.method,
      url: req.url,
      service: serviceName
    });
  }

  /**
   * Handle proxy response
   */
  private handleProxyResponse(proxyRes: any, req: Request, res: Response, serviceName: string): void {
    const responseTime = Date.now() - (req as any).startTime;
    
    // Record metrics
    this.metrics.recordRequest(serviceName, req.method, proxyRes.statusCode, responseTime);
    
    // Record circuit breaker result
    this.recordCircuitBreakerResult(serviceName, proxyRes.statusCode < 500);
    
    // Add response headers
    res.setHeader('X-Gateway-Service', serviceName);
    res.setHeader('X-Response-Time', responseTime.toString());
    res.setHeader('X-Request-Id', (req as any).requestId);

    this.logger.debug(`Response from ${serviceName}`, {
      requestId: (req as any).requestId,
      statusCode: proxyRes.statusCode,
      responseTime,
      service: serviceName
    });
  }

  /**
   * Handle proxy error
   */
  private handleProxyError(err: Error, req: Request, res: Response, serviceName: string): void {
    const responseTime = Date.now() - (req as any).startTime;
    
    // Record metrics
    this.metrics.recordError(serviceName, req.method, 503, responseTime);
    
    // Record circuit breaker failure
    this.recordCircuitBreakerResult(serviceName, false);
    
    // Update health status
    this.healthStatus.set(serviceName, 'unhealthy');

    this.logger.error(`Proxy error for service ${serviceName}`, {
      error: err.message,
      requestId: (req as any).requestId,
      method: req.method,
      url: req.url,
      service: serviceName,
      responseTime
    });

    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        service: serviceName,
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Perform health check on all services
   */
  async performHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const [serviceName, service] of this.services) {
      if (!service.isActive) {
        continue;
      }

      const result = await this.checkServiceHealth(serviceName, service);
      results.push(result);
      
      this.healthStatus.set(serviceName, result.status);
      this.lastHealthCheck.set(serviceName, result.timestamp);
    }
    
    return results;
  }

  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(serviceName: string, service: ServiceConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const healthUrl = `${service.url}${service.healthCheck}`;
    
    try {
      const response = await axios.get(healthUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      
      const responseTime = Date.now() - startTime;
      const status: HealthStatus = response.status === 200 ? 'healthy' : 'degraded';
      
      return {
        service: serviceName,
        status,
        responseTime,
        timestamp: new Date(),
        details: response.data
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        service: serviceName,
        status: 'unhealthy',
        responseTime,
        timestamp: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    const interval = this.config.loadBalancer.healthCheckInterval || 30000;
    
    setInterval(async () => {
      try {
        await this.performHealthChecks();
        this.logger.debug('Health checks completed');
      } catch (error) {
        this.logger.error('Health check failed', error);
      }
    }, interval);
    
    this.logger.info(`Started health checks with ${interval}ms interval`);
  }

  /**
   * Get service metrics
   */
  getServiceMetrics(serviceName: string): ServiceMetrics | null {
    const service = this.services.get(serviceName);
    if (!service) {
      return null;
    }

    const healthStatus = this.healthStatus.get(serviceName) || 'unknown';
    const lastHealthCheck = this.lastHealthCheck.get(serviceName) || new Date();
    const circuitBreaker = this.circuitBreakers.get(serviceName) || {
      state: 'closed' as CircuitBreakerState,
      failureCount: 0,
      successCount: 0
    };

    return {
      service: serviceName,
      requestCount: this.requestCounts.get(serviceName) || 0,
      errorCount: this.metrics.getErrorCount(serviceName),
      averageResponseTime: this.metrics.getAverageResponseTime(serviceName),
      uptime: this.calculateUptime(serviceName),
      healthStatus,
      lastHealthCheck,
      circuitBreakerState: circuitBreaker.state
    };
  }

  /**
   * Get gateway statistics
   */
  getGatewayStats(): GatewayStats {
    const serviceStats = Array.from(this.services.keys()).map(serviceName => {
      const service = this.services.get(serviceName)!;
      const metrics = this.getServiceMetrics(serviceName)!;
      
      return {
        name: serviceName,
        status: metrics.healthStatus,
        url: service.url,
        responseTime: metrics.averageResponseTime,
        requestCount: metrics.requestCount,
        errorRate: metrics.errorCount / Math.max(metrics.requestCount, 1),
        lastHealthCheck: metrics.lastHealthCheck
      };
    });

    const totalRequests = serviceStats.reduce((sum, s) => sum + s.requestCount, 0);
    const totalErrors = serviceStats.reduce((sum, s) => sum + (s.errorRate * s.requestCount), 0);

    return {
      totalRequests,
      successfulRequests: totalRequests - totalErrors,
      failedRequests: totalErrors,
      averageResponseTime: serviceStats.reduce((sum, s) => sum + s.responseTime, 0) / serviceStats.length,
      uptime: process.uptime(),
      servicesStatus: serviceStats,
      memoryUsage: process.memoryUsage(),
      systemLoad: 0, // Would implement actual system load monitoring
      timestamp: new Date()
    };
  }

  /**
   * Calculate service uptime
   */
  private calculateUptime(serviceName: string): number {
    // Simplified uptime calculation
    return process.uptime();
  }

  /**
   * Get all registered services
   */
  getServices(): ServiceConfig[] {
    return Array.from(this.services.values());
  }

  /**
   * Update service configuration
   */
  updateServiceConfig(serviceName: string, config: Partial<ServiceConfig>): boolean {
    const existingService = this.services.get(serviceName);
    if (!existingService) {
      return false;
    }

    const updatedService = { ...existingService, ...config };
    this.services.set(serviceName, updatedService);
    
    this.logger.info(`Updated configuration for service: ${serviceName}`);
    return true;
  }

  /**
   * Remove service
   */
  removeService(serviceName: string): boolean {
    const removed = this.services.delete(serviceName);
    if (removed) {
      this.serviceInstances.delete(serviceName);
      this.healthStatus.delete(serviceName);
      this.circuitBreakers.delete(serviceName);
      this.requestCounts.delete(serviceName);
      this.lastHealthCheck.delete(serviceName);
      
      this.logger.info(`Removed service: ${serviceName}`);
    }
    return removed;
  }

  /**
   * Get service by name
   */
  getService(serviceName: string): ServiceConfig | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Check if service exists and is active
   */
  isServiceActive(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    return service ? service.isActive : false;
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats(serviceName: string): CircuitBreakerStats | undefined {
    return this.circuitBreakers.get(serviceName);
  }

  /**
   * Reset circuit breaker for a service
   */
  resetCircuitBreaker(serviceName: string): boolean {
    if (this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, {
        state: 'closed',
        failureCount: 0,
        successCount: 0
      });
      this.logger.info(`Reset circuit breaker for service: ${serviceName}`);
      return true;
    }
    return false;
  }
}