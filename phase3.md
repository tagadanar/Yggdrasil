# 🚀 PHASE 3: PRODUCTION READINESS

**Duration**: Quarter 1 (3 months)
**Priority**: HIGH - Production deployment requirements
**Risk Level**: MEDIUM - Infrastructure and operational changes

## 📋 Phase Overview

This phase transforms the platform from development-ready to production-ready, implementing essential operational features for reliability, observability, and security at scale.

### Timeline Breakdown
- **Month 1**: Health Checks & Monitoring (3.1)
- **Month 2**: API Documentation & Developer Experience (3.2)
- **Month 3**: Security Hardening & Database Management (3.3-3.4)

### Prerequisites
- [x] Phase 1 & 2 completed successfully
- [x] All security vulnerabilities patched
- [x] Code quality standards implemented
- [ ] DevOps team briefed on new infrastructure
- [ ] Monitoring infrastructure prepared

---

## 🏥 Month 1: Health Checks & Monitoring

### Week 1-2: Health Check Infrastructure

#### 1. Core Health Check System
```typescript
// packages/shared-utilities/src/health/health-check.ts
import { Request, Response } from 'express';
import * as os from 'os';
import { performance } from 'perf_hooks';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  duration: number;
  details?: Record<string, any>;
}

export interface ServiceHealth {
  service: string;
  version: string;
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  checks: Record<string, HealthCheckResult>;
  system?: SystemHealth;
}

export interface SystemHealth {
  cpu: {
    usage: number;
    count: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk?: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
}

export abstract class HealthChecker {
  abstract name: string;
  abstract critical: boolean;
  
  abstract check(): Promise<HealthCheckResult>;
  
  protected createResult(
    status: HealthStatus, 
    message?: string, 
    details?: Record<string, any>
  ): HealthCheckResult {
    return {
      status,
      message,
      duration: 0,
      details
    };
  }
}

export class HealthCheckManager {
  private checkers: Map<string, HealthChecker> = new Map();
  private cache: Map<string, { result: HealthCheckResult; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds
  
  constructor(
    private serviceName: string,
    private version: string
  ) {}

  registerChecker(checker: HealthChecker): void {
    this.checkers.set(checker.name, checker);
  }

  async checkHealth(detailed = false): Promise<ServiceHealth> {
    const startTime = process.hrtime.bigint();
    const checks: Record<string, HealthCheckResult> = {};
    let overallStatus = HealthStatus.HEALTHY;

    // Run all health checks in parallel
    const checkPromises = Array.from(this.checkers.entries()).map(
      async ([name, checker]) => {
        const cached = this.getCachedResult(name);
        if (cached) {
          checks[name] = cached;
          return;
        }

        const checkStart = performance.now();
        try {
          const result = await checker.check();
          result.duration = Math.round(performance.now() - checkStart);
          checks[name] = result;
          this.cacheResult(name, result);

          // Update overall status
          if (result.status === HealthStatus.UNHEALTHY && checker.critical) {
            overallStatus = HealthStatus.UNHEALTHY;
          } else if (result.status === HealthStatus.DEGRADED && overallStatus !== HealthStatus.UNHEALTHY) {
            overallStatus = HealthStatus.DEGRADED;
          }
        } catch (error) {
          const errorResult: HealthCheckResult = {
            status: HealthStatus.UNHEALTHY,
            message: error instanceof Error ? error.message : 'Check failed',
            duration: Math.round(performance.now() - checkStart)
          };
          checks[name] = errorResult;
          
          if (checker.critical) {
            overallStatus = HealthStatus.UNHEALTHY;
          }
        }
      }
    );

    await Promise.all(checkPromises);

    const health: ServiceHealth = {
      service: this.serviceName,
      version: this.version,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks
    };

    if (detailed) {
      health.system = this.getSystemHealth();
    }

    return health;
  }

  private getCachedResult(name: string): HealthCheckResult | null {
    const cached = this.cache.get(name);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }

  private cacheResult(name: string, result: HealthCheckResult): void {
    this.cache.set(name, {
      result,
      timestamp: Date.now()
    });
  }

  private getSystemHealth(): SystemHealth {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Calculate CPU usage
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total);
    }, 0) / cpus.length;

    return {
      cpu: {
        usage: Math.round(cpuUsage * 100),
        count: cpus.length
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100)
      }
    };
  }

  createHealthEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const detailed = req.query.detailed === 'true';
        const health = await this.checkHealth(detailed);
        
        const statusCode = 
          health.status === HealthStatus.HEALTHY ? 200 :
          health.status === HealthStatus.DEGRADED ? 200 : 503;
        
        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          service: this.serviceName,
          version: this.version,
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Health check failed'
        });
      }
    };
  }
}
```

#### 2. Service-Specific Health Checks

**Database Health Check:**
```typescript
// packages/shared-utilities/src/health/checks/database-check.ts
import mongoose from 'mongoose';
import { HealthChecker, HealthCheckResult, HealthStatus } from '../health-check';

export class DatabaseHealthChecker extends HealthChecker {
  name = 'database';
  critical = true;

  async check(): Promise<HealthCheckResult> {
    try {
      // Check connection state
      const state = mongoose.connection.readyState;
      
      if (state !== 1) {
        return this.createResult(
          HealthStatus.UNHEALTHY,
          `Database connection state: ${this.getStateName(state)}`
        );
      }

      // Perform a simple query
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;

      // Check response time
      if (responseTime > 5000) {
        return this.createResult(
          HealthStatus.DEGRADED,
          `Database response time high: ${responseTime}ms`,
          { responseTime }
        );
      }

      // Get additional metrics
      const stats = await this.getDatabaseStats();

      return this.createResult(
        HealthStatus.HEALTHY,
        'Database connection healthy',
        {
          responseTime,
          ...stats
        }
      );
    } catch (error) {
      return this.createResult(
        HealthStatus.UNHEALTHY,
        error instanceof Error ? error.message : 'Database check failed'
      );
    }
  }

  private getStateName(state: number): string {
    switch (state) {
      case 0: return 'disconnected';
      case 1: return 'connected';
      case 2: return 'connecting';
      case 3: return 'disconnecting';
      default: return 'unknown';
    }
  }

  private async getDatabaseStats() {
    try {
      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();
      
      return {
        connections: serverStatus.connections,
        operations: {
          insert: serverStatus.opcounters?.insert || 0,
          query: serverStatus.opcounters?.query || 0,
          update: serverStatus.opcounters?.update || 0,
          delete: serverStatus.opcounters?.delete || 0
        },
        network: {
          bytesIn: serverStatus.network?.bytesIn || 0,
          bytesOut: serverStatus.network?.bytesOut || 0
        }
      };
    } catch {
      return {};
    }
  }
}
```

**Redis Health Check:**
```typescript
// packages/shared-utilities/src/health/checks/redis-check.ts
import { createClient, RedisClientType } from 'redis';
import { HealthChecker, HealthCheckResult, HealthStatus } from '../health-check';

export class RedisHealthChecker extends HealthChecker {
  name = 'redis';
  critical = false;
  
  constructor(private redis: RedisClientType) {
    super();
  }

  async check(): Promise<HealthCheckResult> {
    try {
      // Ping Redis
      const startTime = Date.now();
      const pong = await this.redis.ping();
      const responseTime = Date.now() - startTime;

      if (pong !== 'PONG') {
        return this.createResult(
          HealthStatus.UNHEALTHY,
          'Redis ping failed'
        );
      }

      // Check response time
      if (responseTime > 100) {
        return this.createResult(
          HealthStatus.DEGRADED,
          `Redis response time high: ${responseTime}ms`,
          { responseTime }
        );
      }

      // Get Redis info
      const info = await this.redis.info();
      const stats = this.parseRedisInfo(info);

      return this.createResult(
        HealthStatus.HEALTHY,
        'Redis connection healthy',
        {
          responseTime,
          ...stats
        }
      );
    } catch (error) {
      return this.createResult(
        HealthStatus.UNHEALTHY,
        error instanceof Error ? error.message : 'Redis check failed'
      );
    }
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const stats: Record<string, any> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key === 'used_memory_human') stats.memory = value;
        if (key === 'connected_clients') stats.clients = parseInt(value);
        if (key === 'total_commands_processed') stats.commands = parseInt(value);
      }
    }
    
    return stats;
  }
}
```

**External Service Health Check:**
```typescript
// packages/shared-utilities/src/health/checks/external-service-check.ts
import axios from 'axios';
import { HealthChecker, HealthCheckResult, HealthStatus } from '../health-check';

export class ExternalServiceHealthChecker extends HealthChecker {
  name: string;
  critical: boolean;
  
  constructor(
    name: string,
    private url: string,
    critical = false,
    private timeout = 5000
  ) {
    super();
    this.name = name;
    this.critical = critical;
  }

  async check(): Promise<HealthCheckResult> {
    try {
      const startTime = Date.now();
      const response = await axios.get(this.url, {
        timeout: this.timeout,
        validateStatus: (status) => status < 500
      });
      const responseTime = Date.now() - startTime;

      if (response.status >= 400) {
        return this.createResult(
          HealthStatus.UNHEALTHY,
          `Service returned ${response.status}`,
          { statusCode: response.status, responseTime }
        );
      }

      if (responseTime > this.timeout * 0.8) {
        return this.createResult(
          HealthStatus.DEGRADED,
          `Response time high: ${responseTime}ms`,
          { responseTime }
        );
      }

      return this.createResult(
        HealthStatus.HEALTHY,
        'Service reachable',
        { statusCode: response.status, responseTime }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return this.createResult(
            HealthStatus.UNHEALTHY,
            `Service timeout after ${this.timeout}ms`
          );
        }
        return this.createResult(
          HealthStatus.UNHEALTHY,
          error.message
        );
      }
      
      return this.createResult(
        HealthStatus.UNHEALTHY,
        'Service check failed'
      );
    }
  }
}
```

### Week 3-4: Monitoring & Metrics

#### 3. Prometheus Metrics Integration
```typescript
// packages/shared-utilities/src/monitoring/metrics.ts
import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export class MetricsCollector {
  private registry: Registry;
  
  // HTTP metrics
  private httpRequestsTotal: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpRequestSize: Summary<string>;
  private httpResponseSize: Summary<string>;
  
  // System metrics
  private activeConnections: Gauge<string>;
  private memoryUsage: Gauge<string>;
  private cpuUsage: Gauge<string>;
  
  // Business metrics
  private userRegistrations: Counter<string>;
  private userLogins: Counter<string>;
  private courseEnrollments: Counter<string>;
  private apiErrors: Counter<string>;

  constructor(serviceName: string) {
    this.registry = new Registry();
    this.registry.setDefaultLabels({
      service: serviceName,
      environment: process.env.NODE_ENV || 'development'
    });

    // Initialize HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry]
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    });

    this.httpRequestSize = new Summary({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      percentiles: [0.5, 0.9, 0.99],
      registers: [this.registry]
    });

    this.httpResponseSize = new Summary({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route'],
      percentiles: [0.5, 0.9, 0.99],
      registers: [this.registry]
    });

    // Initialize system metrics
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.registry]
    });

    this.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry]
    });

    this.cpuUsage = new Gauge({
      name: 'cpu_usage_percentage',
      help: 'CPU usage percentage',
      registers: [this.registry]
    });

    // Initialize business metrics
    this.userRegistrations = new Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['role'],
      registers: [this.registry]
    });

    this.userLogins = new Counter({
      name: 'user_logins_total',
      help: 'Total number of user logins',
      labelNames: ['role', 'success'],
      registers: [this.registry]
    });

    this.courseEnrollments = new Counter({
      name: 'course_enrollments_total',
      help: 'Total number of course enrollments',
      registers: [this.registry]
    });

    this.apiErrors = new Counter({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['type', 'endpoint'],
      registers: [this.registry]
    });

    // Start collecting system metrics
    this.collectSystemMetrics();
  }

  // Middleware to collect HTTP metrics
  httpMetricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      const route = req.route?.path || req.path;

      // Track request size
      const requestSize = parseInt(req.headers['content-length'] || '0');
      this.httpRequestSize.observe({ method: req.method, route }, requestSize);

      // Track response
      const originalSend = res.send;
      res.send = function(data) {
        res.send = originalSend;
        
        const duration = (Date.now() - start) / 1000;
        const responseSize = Buffer.byteLength(data);
        
        // Record metrics
        this.httpRequestsTotal.inc({
          method: req.method,
          route,
          status_code: res.statusCode.toString()
        });
        
        this.httpRequestDuration.observe({
          method: req.method,
          route,
          status_code: res.statusCode.toString()
        }, duration);
        
        this.httpResponseSize.observe({
          method: req.method,
          route
        }, responseSize);

        return originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }

  // Business metric collectors
  recordUserRegistration(role: string) {
    this.userRegistrations.inc({ role });
  }

  recordUserLogin(role: string, success: boolean) {
    this.userLogins.inc({ role, success: success.toString() });
  }

  recordCourseEnrollment() {
    this.courseEnrollments.inc();
  }

  recordApiError(type: string, endpoint: string) {
    this.apiErrors.inc({ type, endpoint });
  }

  // System metrics collection
  private collectSystemMetrics() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);

      // Simple CPU usage calculation
      const cpuUsage = process.cpuUsage();
      const totalCpu = cpuUsage.user + cpuUsage.system;
      this.cpuUsage.set(totalCpu / 1000000); // Convert to percentage
    }, 10000); // Every 10 seconds
  }

  // Get metrics endpoint
  getMetricsEndpoint() {
    return async (_req: Request, res: Response) => {
      try {
        res.set('Content-Type', this.registry.contentType);
        const metrics = await this.registry.metrics();
        res.send(metrics);
      } catch (error) {
        res.status(500).send('Error collecting metrics');
      }
    };
  }

  // Custom metric methods
  createCustomCounter(name: string, help: string, labelNames?: string[]) {
    return new Counter({
      name,
      help,
      labelNames,
      registers: [this.registry]
    });
  }

  createCustomGauge(name: string, help: string, labelNames?: string[]) {
    return new Gauge({
      name,
      help,
      labelNames,
      registers: [this.registry]
    });
  }

  createCustomHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]) {
    return new Histogram({
      name,
      help,
      labelNames,
      buckets,
      registers: [this.registry]
    });
  }
}
```

#### 4. Distributed Tracing
```typescript
// packages/shared-utilities/src/monitoring/tracing.ts
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

export class TracingService {
  private provider: NodeTracerProvider;
  
  constructor(serviceName: string) {
    // Create provider
    this.provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      }),
    });

    // Configure exporter
    const jaegerExporter = new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    });

    // Add span processor
    this.provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));

    // Register instrumentations
    registerInstrumentations({
      instrumentations: [
        new HttpInstrumentation({
          requestHook: (span, request) => {
            span.setAttribute('http.request.body', JSON.stringify(request.body));
          },
          responseHook: (span, response) => {
            span.setAttribute('http.response.size', response.headers['content-length'] || 0);
          },
        }),
        new ExpressInstrumentation({
          requestHook: (span, info) => {
            span.setAttribute('express.route', info.route);
            span.setAttribute('express.params', JSON.stringify(info.request.params));
          },
        }),
        new MongoDBInstrumentation({
          enhancedDatabaseReporting: true,
        }),
      ],
    });

    // Register provider
    this.provider.register();
  }

  // Get tracer
  getTracer(name?: string) {
    return trace.getTracer(name || 'default');
  }

  // Create custom span
  async withSpan<T>(
    name: string,
    fn: () => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, any>;
    }
  ): Promise<T> {
    const tracer = this.getTracer();
    const span = tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes,
    });

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        fn
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  // Trace database operations
  async traceDatabase<T>(
    operation: string,
    collection: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.withSpan(
      `db.${operation}`,
      fn,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'db.operation': operation,
          'db.collection': collection,
          'db.system': 'mongodb',
        },
      }
    );
  }

  // Trace external API calls
  async traceExternalCall<T>(
    service: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.withSpan(
      `external.${service}.${operation}`,
      fn,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'external.service': service,
          'external.operation': operation,
        },
      }
    );
  }

  // Shutdown tracing
  async shutdown() {
    await this.provider.shutdown();
  }
}

// Helper function to extract trace context from headers
export function extractTraceContext(headers: Record<string, string>) {
  return {
    traceId: headers['x-trace-id'],
    spanId: headers['x-span-id'],
    traceFlags: headers['x-trace-flags'],
  };
}

// Helper function to inject trace context into headers
export function injectTraceContext(span: any): Record<string, string> {
  const spanContext = span.spanContext();
  return {
    'x-trace-id': spanContext.traceId,
    'x-span-id': spanContext.spanId,
    'x-trace-flags': spanContext.traceFlags.toString(),
  };
}
```

### Implementation in Services

#### 5. Auth Service Health Implementation
```typescript
// packages/api-services/auth-service/src/health/setup.ts
import { HealthCheckManager } from '@yggdrasil/shared-utilities/health';
import { DatabaseHealthChecker } from '@yggdrasil/shared-utilities/health/checks';
import { config } from '@yggdrasil/shared-utilities/config';
import { JWTHealthChecker } from './checks/jwt-health';
import { UserServiceHealthChecker } from './checks/user-service-health';

export function setupHealthChecks(app: Express.Application) {
  const healthManager = new HealthCheckManager(
    'auth-service',
    process.env.npm_package_version || '1.0.0'
  );

  // Register health checks
  healthManager.registerChecker(new DatabaseHealthChecker());
  healthManager.registerChecker(new JWTHealthChecker());
  healthManager.registerChecker(new UserServiceHealthChecker(
    config.USER_SERVICE_URL
  ));

  // Health endpoints
  app.get('/health', healthManager.createHealthEndpoint());
  app.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'alive' });
  });
  app.get('/health/ready', async (_req, res) => {
    const health = await healthManager.checkHealth();
    const isReady = health.status !== 'unhealthy';
    res.status(isReady ? 200 : 503).json({ ready: isReady });
  });

  return healthManager;
}

// Custom JWT health check
class JWTHealthChecker extends HealthChecker {
  name = 'jwt-configuration';
  critical = true;

  async check(): Promise<HealthCheckResult> {
    try {
      // Verify JWT configuration
      if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
        return this.createResult(
          HealthStatus.UNHEALTHY,
          'JWT secret not properly configured'
        );
      }

      // Test token generation
      const testToken = JWTHelper.generateAccessToken({
        userId: 'test',
        email: 'test@test.com',
        role: 'student'
      });

      // Test token verification
      const verified = JWTHelper.verifyAccessToken(testToken);
      
      if (!verified.success) {
        return this.createResult(
          HealthStatus.UNHEALTHY,
          'JWT verification failed'
        );
      }

      return this.createResult(
        HealthStatus.HEALTHY,
        'JWT system operational'
      );
    } catch (error) {
      return this.createResult(
        HealthStatus.UNHEALTHY,
        error instanceof Error ? error.message : 'JWT check failed'
      );
    }
  }
}
```

---

## 📚 Month 2: API Documentation & Developer Experience

### Week 1-2: OpenAPI Documentation

#### 1. API Documentation Structure
```typescript
// packages/shared-utilities/src/docs/openapi-generator.ts
import { OpenAPIV3 } from 'openapi-types';
import * as fs from 'fs';
import * as path from 'path';

export class OpenAPIGenerator {
  private document: OpenAPIV3.Document;

  constructor(
    private serviceName: string,
    private version: string,
    private baseUrl: string
  ) {
    this.document = {
      openapi: '3.0.3',
      info: {
        title: `${serviceName} API`,
        version: version,
        description: this.getServiceDescription(),
        contact: {
          name: 'Yggdrasil API Support',
          email: 'api-support@yggdrasil.edu',
          url: 'https://docs.yggdrasil.edu'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: baseUrl,
          description: 'Current environment'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT authentication token'
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key for service-to-service communication'
          }
        },
        schemas: {},
        responses: this.getCommonResponses(),
        parameters: this.getCommonParameters()
      },
      paths: {},
      tags: []
    };
  }

  private getServiceDescription(): string {
    const descriptions: Record<string, string> = {
      'auth-service': 'Authentication and authorization service for Yggdrasil platform',
      'user-service': 'User management and profile service',
      'course-service': 'Course creation and management service',
      'news-service': 'News and announcements service',
      'planning-service': 'Schedule and event planning service',
      'statistics-service': 'Analytics and reporting service'
    };
    return descriptions[this.serviceName] || 'Yggdrasil platform service';
  }

  private getCommonResponses(): Record<string, OpenAPIV3.ResponseObject> {
    return {
      BadRequest: {
        description: 'Bad request - Invalid input data',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                statusCode: 400,
                validationErrors: [
                  {
                    field: 'email',
                    message: 'Invalid email format'
                  }
                ]
              }
            }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized - Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: {
                message: 'Authentication required',
                code: 'UNAUTHORIZED',
                statusCode: 401
              }
            }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      NotFound: {
        description: 'Not found - Resource does not exist',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    };
  }

  private getCommonParameters(): Record<string, OpenAPIV3.ParameterObject> {
    return {
      pageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        }
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20
        }
      },
      sortParam: {
        name: 'sort',
        in: 'query',
        description: 'Sort field and order (e.g., "-createdAt" for descending)',
        schema: {
          type: 'string'
        }
      }
    };
  }

  // Add endpoint documentation
  addEndpoint(endpoint: {
    path: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    summary: string;
    description?: string;
    tags: string[];
    security?: Array<Record<string, string[]>>;
    parameters?: OpenAPIV3.ParameterObject[];
    requestBody?: OpenAPIV3.RequestBodyObject;
    responses: Record<string, OpenAPIV3.ResponseObject>;
    deprecated?: boolean;
  }) {
    if (!this.document.paths[endpoint.path]) {
      this.document.paths[endpoint.path] = {};
    }

    this.document.paths[endpoint.path][endpoint.method] = {
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags,
      security: endpoint.security || [{ bearerAuth: [] }],
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses,
      deprecated: endpoint.deprecated
    };

    // Add tags if not exists
    endpoint.tags.forEach(tag => {
      if (!this.document.tags?.find(t => t.name === tag)) {
        this.document.tags?.push({
          name: tag,
          description: `${tag} operations`
        });
      }
    });
  }

  // Add schema definition
  addSchema(name: string, schema: OpenAPIV3.SchemaObject) {
    if (this.document.components?.schemas) {
      this.document.components.schemas[name] = schema;
    }
  }

  // Generate common schemas
  generateCommonSchemas() {
    this.addSchema('ErrorResponse', {
      type: 'object',
      required: ['success', 'error'],
      properties: {
        success: {
          type: 'boolean',
          enum: [false]
        },
        error: {
          type: 'object',
          required: ['message', 'statusCode'],
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
            statusCode: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' },
            validationErrors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    });

    this.addSchema('SuccessResponse', {
      type: 'object',
      required: ['success'],
      properties: {
        success: {
          type: 'boolean',
          enum: [true]
        },
        data: {
          type: 'object',
          description: 'Response data'
        },
        meta: {
          type: 'object',
          properties: {
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                pages: { type: 'integer' }
              }
            }
          }
        }
      }
    });

    this.addSchema('User', {
      type: 'object',
      required: ['id', 'email', 'role', 'profile'],
      properties: {
        id: { type: 'string' },
        email: { type: 'string', format: 'email' },
        role: {
          type: 'string',
          enum: ['admin', 'staff', 'teacher', 'student']
        },
        profile: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            photo: { type: 'string' },
            department: { type: 'string' }
          }
        },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    });
  }

  // Export documentation
  export(outputPath: string) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      outputPath,
      JSON.stringify(this.document, null, 2)
    );

    // Also generate YAML version
    const yaml = require('js-yaml');
    const yamlPath = outputPath.replace('.json', '.yaml');
    fs.writeFileSync(
      yamlPath,
      yaml.dump(this.document)
    );
  }
}
```

#### 2. Auto-generate from Routes
```typescript
// packages/shared-utilities/src/docs/route-documenter.ts
import { Router } from 'express';
import { OpenAPIGenerator } from './openapi-generator';

export class RouteDocumenter {
  constructor(
    private generator: OpenAPIGenerator,
    private router: Router
  ) {}

  documentRoute(config: {
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    summary: string;
    description?: string;
    tags: string[];
    security?: boolean;
    request?: {
      params?: Record<string, any>;
      query?: Record<string, any>;
      body?: {
        description: string;
        schema: any;
        required?: boolean;
      };
    };
    responses: {
      200?: { description: string; schema?: any };
      201?: { description: string; schema?: any };
      400?: { description: string };
      401?: { description: string };
      403?: { description: string };
      404?: { description: string };
      500?: { description: string };
    };
  }) {
    // Add to OpenAPI document
    const parameters: any[] = [];
    
    // Add path parameters
    if (config.request?.params) {
      Object.entries(config.request.params).forEach(([name, schema]) => {
        parameters.push({
          name,
          in: 'path',
          required: true,
          schema
        });
      });
    }

    // Add query parameters
    if (config.request?.query) {
      Object.entries(config.request.query).forEach(([name, schema]) => {
        parameters.push({
          name,
          in: 'query',
          required: false,
          schema
        });
      });
    }

    // Build responses
    const responses: Record<string, any> = {};
    Object.entries(config.responses).forEach(([code, response]) => {
      if (response) {
        responses[code] = {
          description: response.description,
          content: response.schema ? {
            'application/json': {
              schema: response.schema
            }
          } : undefined
        };
      }
    });

    this.generator.addEndpoint({
      path: config.path,
      method: config.method,
      summary: config.summary,
      description: config.description,
      tags: config.tags,
      security: config.security !== false ? [{ bearerAuth: [] }] : undefined,
      parameters: parameters.length > 0 ? parameters : undefined,
      requestBody: config.request?.body ? {
        description: config.request.body.description,
        required: config.request.body.required !== false,
        content: {
          'application/json': {
            schema: config.request.body.schema
          }
        }
      } : undefined,
      responses
    });

    // Also add the route to Express
    const handler = (req: any, res: any, next: any) => next();
    (this.router as any)[config.method](config.path, handler);
    
    return this;
  }
}

// Usage example in auth routes
export function documentAuthRoutes(generator: OpenAPIGenerator, router: Router) {
  const documenter = new RouteDocumenter(generator, router);

  documenter
    .documentRoute({
      method: 'post',
      path: '/auth/login',
      summary: 'User login',
      description: 'Authenticate user with email and password',
      tags: ['Authentication'],
      security: false,
      request: {
        body: {
          description: 'Login credentials',
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Login successful',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  tokens: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        400: { description: 'Invalid request data' },
        401: { description: 'Invalid credentials' }
      }
    })
    .documentRoute({
      method: 'post',
      path: '/auth/refresh',
      summary: 'Refresh access token',
      description: 'Get new access token using refresh token',
      tags: ['Authentication'],
      security: false,
      request: {
        body: {
          description: 'Refresh token',
          schema: {
            type: 'object',
            required: ['refreshToken'],
            properties: {
              refreshToken: { type: 'string' }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Token refreshed successfully',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  tokens: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        401: { description: 'Invalid or expired refresh token' }
      }
    })
    .documentRoute({
      method: 'get',
      path: '/auth/me',
      summary: 'Get current user',
      description: 'Get authenticated user information',
      tags: ['Authentication'],
      responses: {
        200: {
          description: 'User information retrieved',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        401: { description: 'Not authenticated' }
      }
    })
    .documentRoute({
      method: 'post',
      path: '/auth/logout',
      summary: 'Logout user',
      description: 'Invalidate user tokens and end session',
      tags: ['Authentication'],
      responses: {
        200: {
          description: 'Logout successful',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        },
        401: { description: 'Not authenticated' }
      }
    });
}
```

### Week 3-4: Developer Portal

#### 3. API Testing Interface
```typescript
// packages/api-services/shared/src/docs/api-explorer.ts
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIV3 } from 'openapi-types';

export class APIExplorer {
  private app: express.Express;
  
  constructor(
    private port: number = 4000,
    private services: Array<{
      name: string;
      url: string;
      docsPath: string;
    }>
  ) {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Home page with service list
    this.app.get('/', (req, res) => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Yggdrasil API Explorer</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 1200px;
              margin: 0 auto;
              padding: 2rem;
              background: #f5f5f5;
            }
            .header {
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              margin-bottom: 2rem;
            }
            .services {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
              gap: 1.5rem;
            }
            .service-card {
              background: white;
              padding: 1.5rem;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              transition: transform 0.2s;
            }
            .service-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            .service-card h3 {
              margin: 0 0 1rem 0;
              color: #333;
            }
            .service-card a {
              display: inline-block;
              padding: 0.5rem 1rem;
              background: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              margin-right: 0.5rem;
            }
            .service-card a:hover {
              background: #0056b3;
            }
            .status {
              display: inline-block;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-size: 0.875rem;
              margin-left: 0.5rem;
            }
            .status.healthy { background: #d4edda; color: #155724; }
            .status.unhealthy { background: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Yggdrasil API Explorer</h1>
            <p>Interactive documentation and testing for all platform services</p>
          </div>
          <div class="services">
            ${this.services.map(service => `
              <div class="service-card">
                <h3>${service.name}
                  <span class="status" id="status-${service.name}">checking...</span>
                </h3>
                <p>Base URL: ${service.url}</p>
                <a href="/docs/${service.name}">API Docs</a>
                <a href="/test/${service.name}">Test Console</a>
              </div>
            `).join('')}
          </div>
          <script>
            // Check service health
            ${this.services.map(service => `
              fetch('${service.url}/health')
                .then(res => res.json())
                .then(data => {
                  const status = document.getElementById('status-${service.name}');
                  if (data.status === 'healthy') {
                    status.textContent = 'healthy';
                    status.className = 'status healthy';
                  } else {
                    status.textContent = 'unhealthy';
                    status.className = 'status unhealthy';
                  }
                })
                .catch(() => {
                  const status = document.getElementById('status-${service.name}');
                  status.textContent = 'offline';
                  status.className = 'status unhealthy';
                });
            `).join('')}
          </script>
        </body>
        </html>
      `;
      res.send(html);
    });

    // Setup Swagger UI for each service
    this.services.forEach(service => {
      // Load OpenAPI spec
      const spec = require(service.docsPath);
      
      // Swagger UI options
      const options = {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: `${service.name} API Documentation`,
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'list',
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
          tryItOutEnabled: true
        }
      };

      // API documentation route
      this.app.use(
        `/docs/${service.name}`,
        swaggerUi.serve,
        swaggerUi.setup(spec, options)
      );

      // Test console route
      this.app.get(`/test/${service.name}`, (req, res) => {
        res.send(this.generateTestConsole(service, spec));
      });
    });

    // Combined API spec
    this.app.get('/openapi.json', (req, res) => {
      const combined = this.combineSpecs();
      res.json(combined);
    });
  }

  private generateTestConsole(service: any, spec: OpenAPIV3.Document): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${service.name} Test Console</title>
        <style>
          /* Styles for test console */
        </style>
      </head>
      <body>
        <div id="test-console">
          <h1>${service.name} API Test Console</h1>
          <!-- Interactive test interface -->
        </div>
        <script>
          // API testing functionality
        </script>
      </body>
      </html>
    `;
  }

  private combineSpecs(): OpenAPIV3.Document {
    // Combine all service specs into one
    const combined: OpenAPIV3.Document = {
      openapi: '3.0.3',
      info: {
        title: 'Yggdrasil Platform API',
        version: '1.0.0',
        description: 'Complete API documentation for Yggdrasil platform'
      },
      servers: [],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {}
      }
    };

    this.services.forEach(service => {
      const spec = require(service.docsPath);
      
      // Merge paths with service prefix
      Object.entries(spec.paths || {}).forEach(([path, methods]) => {
        combined.paths[`/${service.name}${path}`] = methods;
      });

      // Merge schemas
      Object.assign(combined.components!.schemas!, spec.components?.schemas || {});
    });

    return combined;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 API Explorer running at http://localhost:${this.port}`);
    });
  }
}
```

---

## 🔒 Month 3: Security Hardening

### Week 1-2: Rate Limiting & DDoS Protection

#### 1. Advanced Rate Limiting
```typescript
// packages/shared-utilities/src/security/rate-limiter.ts
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { RateLimitError } from '../errors/AppError';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  handler?: (req: Request, res: Response) => void;
}

export class RateLimiter {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }

  create(options: RateLimiterOptions) {
    const {
      windowMs,
      max,
      message = 'Too many requests',
      keyGenerator = this.defaultKeyGenerator,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      standardHeaders = true,
      legacyHeaders = false,
      handler
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = keyGenerator(req);
        const windowStart = Date.now() - windowMs;
        
        // Clean old entries
        await this.redis.zremrangebyscore(key, '-inf', windowStart);
        
        // Count requests in window
        const requests = await this.redis.zcard(key);
        
        // Check if limit exceeded
        if (requests >= max) {
          const oldestRequest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
          const resetTime = oldestRequest.length > 0 
            ? parseInt(oldestRequest[1]) + windowMs 
            : Date.now() + windowMs;
          
          // Set rate limit headers
          if (standardHeaders) {
            res.setHeader('RateLimit-Limit', max);
            res.setHeader('RateLimit-Remaining', 0);
            res.setHeader('RateLimit-Reset', new Date(resetTime).toISOString());
            res.setHeader('RateLimit-Policy', `${max};w=${windowMs / 1000}`);
          }
          
          if (legacyHeaders) {
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', 0);
            res.setHeader('X-RateLimit-Reset', resetTime);
          }
          
          // Handle rate limit exceeded
          if (handler) {
            return handler(req, res);
          }
          
          throw new RateLimitError(
            Math.ceil((resetTime - Date.now()) / 1000),
            message
          );
        }
        
        // Add current request
        const added = await this.addRequest(key, windowMs, res, skipSuccessfulRequests);
        
        // Set headers for successful requests
        if (standardHeaders) {
          res.setHeader('RateLimit-Limit', max);
          res.setHeader('RateLimit-Remaining', Math.max(0, max - requests - (added ? 1 : 0)));
          res.setHeader('RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());
        }
        
        if (legacyHeaders) {
          res.setHeader('X-RateLimit-Limit', max);
          res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requests - (added ? 1 : 0)));
          res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);
        }
        
        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          next(error);
        } else {
          // Redis error - fail open
          console.error('Rate limiter error:', error);
          next();
        }
      }
    };
  }

  private async addRequest(
    key: string, 
    windowMs: number, 
    res: Response, 
    skipSuccessful: boolean
  ): Promise<boolean> {
    if (skipSuccessful) {
      // Wait for response to finish
      const originalSend = res.send;
      res.send = function(data) {
        res.send = originalSend;
        
        if (res.statusCode < 400) {
          // Don't count successful requests
          return originalSend.call(this, data);
        }
        
        // Count failed requests
        this.redis.zadd(key, Date.now(), `${Date.now()}-${Math.random()}`);
        this.redis.expire(key, Math.ceil(windowMs / 1000));
        
        return originalSend.call(this, data);
      }.bind(this);
      
      return false;
    } else {
      // Add request immediately
      await this.redis.zadd(key, Date.now(), `${Date.now()}-${Math.random()}`);
      await this.redis.expire(key, Math.ceil(windowMs / 1000));
      return true;
    }
  }

  private defaultKeyGenerator(req: Request): string {
    const user = (req as any).user;
    if (user?.id) {
      return `rate_limit:user:${user.id}`;
    }
    
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `rate_limit:ip:${ip}`;
  }

  // Specialized rate limiters
  static authLimiter(redis: Redis) {
    return new RateLimiter(redis).create({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      message: 'Too many authentication attempts',
      skipSuccessfulRequests: true,
      keyGenerator: (req) => {
        const email = req.body?.email || 'unknown';
        const ip = req.ip || 'unknown';
        return `rate_limit:auth:${email}:${ip}`;
      }
    });
  }

  static apiLimiter(redis: Redis) {
    return new RateLimiter(redis).create({
      windowMs: 60 * 1000, // 1 minute
      max: 100,
      message: 'API rate limit exceeded'
    });
  }

  static strictLimiter(redis: Redis) {
    return new RateLimiter(redis).create({
      windowMs: 60 * 1000, // 1 minute
      max: 10,
      message: 'Rate limit exceeded for sensitive operation'
    });
  }
}

// Distributed rate limiter for multiple instances
export class DistributedRateLimiter extends RateLimiter {
  constructor(redis: Redis, private instanceId: string) {
    super(redis);
  }

  async syncLimits() {
    // Implement distributed rate limit synchronization
    const script = `
      local key = KEYS[1]
      local window_ms = tonumber(ARGV[1])
      local max_requests = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local window_start = now - window_ms
      
      -- Remove old entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
      
      -- Count current requests
      local current = redis.call('ZCARD', key)
      
      if current < max_requests then
        -- Add request
        redis.call('ZADD', key, now, now .. ':' .. math.random())
        redis.call('EXPIRE', key, math.ceil(window_ms / 1000))
        return {1, max_requests - current - 1}
      else
        -- Get reset time
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local reset = oldest[2] and (tonumber(oldest[2]) + window_ms) or (now + window_ms)
        return {0, 0, reset}
      end
    `;

    // Use Lua script for atomic operations
    return this.redis.eval(script, 1, 'key', 'windowMs', 'max', Date.now());
  }
}
```

#### 2. Security Headers
```typescript
// packages/shared-utilities/src/security/security-headers.ts
import helmet from 'helmet';
import { Express } from 'express';

export function setupSecurityHeaders(app: Express) {
  // Basic security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.yggdrasil.edu'],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true,
  }));

  // Additional security headers
  app.use((req, res, next) => {
    // Permissions Policy
    res.setHeader('Permissions-Policy', 
      'geolocation=(), microphone=(), camera=(), payment=()'
    );
    
    // Additional CSP for API
    if (req.path.startsWith('/api')) {
      res.setHeader('Content-Security-Policy', 
        "default-src 'none'; frame-ancestors 'none';"
      );
    }
    
    // CORP headers
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    
    // Expect-CT
    res.setHeader('Expect-CT', 
      'max-age=86400, enforce'
    );
    
    next();
  });
}

// CORS configuration
export function setupCORS(app: Express) {
  const cors = require('cors');
  
  const corsOptions = {
    origin: function (origin: string, callback: Function) {
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
      
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'X-API-Key'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset'
    ],
    maxAge: 86400 // 24 hours
  };
  
  app.use(cors(corsOptions));
}
```

### Week 3-4: Database Migrations

#### 3. Migration System
```typescript
// packages/database-schemas/src/migrations/migration-runner.ts
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@yggdrasil/shared-utilities/logging';

interface MigrationDocument {
  _id: string;
  name: string;
  executedAt: Date;
  status: 'success' | 'failed' | 'pending';
  error?: string;
  duration?: number;
}

export abstract class Migration {
  abstract name: string;
  abstract description: string;
  
  abstract up(): Promise<void>;
  abstract down(): Promise<void>;
  
  protected async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const result = await fn();
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export class MigrationRunner {
  private migrations: Map<string, Migration> = new Map();
  private migrationModel: mongoose.Model<MigrationDocument>;

  constructor() {
    // Create migration tracking collection
    const schema = new mongoose.Schema<MigrationDocument>({
      _id: String,
      name: { type: String, required: true, unique: true },
      executedAt: { type: Date, required: true },
      status: { 
        type: String, 
        enum: ['success', 'failed', 'pending'],
        required: true 
      },
      error: String,
      duration: Number
    });

    this.migrationModel = mongoose.model<MigrationDocument>('Migration', schema);
  }

  async loadMigrations(directory: string) {
    const files = fs.readdirSync(directory)
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .filter(f => !f.includes('.map'))
      .sort(); // Ensure consistent order

    for (const file of files) {
      const migrationPath = path.join(directory, file);
      const MigrationClass = require(migrationPath).default;
      
      if (MigrationClass && MigrationClass.prototype instanceof Migration) {
        const migration = new MigrationClass();
        this.migrations.set(migration.name, migration);
        logger.info(`Loaded migration: ${migration.name}`);
      }
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    const executed = await this.migrationModel
      .find({ status: 'success' })
      .sort({ executedAt: 1 });
    
    return executed.map(m => m.name);
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const executed = await this.getExecutedMigrations();
    const pending: Migration[] = [];

    for (const [name, migration] of this.migrations) {
      if (!executed.includes(name)) {
        pending.push(migration);
      }
    }

    return pending;
  }

  async runMigration(migration: Migration, direction: 'up' | 'down' = 'up') {
    const startTime = Date.now();
    logger.info(`Running migration ${direction}: ${migration.name}`);

    try {
      if (direction === 'up') {
        await migration.up();
      } else {
        await migration.down();
      }

      const duration = Date.now() - startTime;

      if (direction === 'up') {
        await this.migrationModel.create({
          _id: new mongoose.Types.ObjectId().toString(),
          name: migration.name,
          executedAt: new Date(),
          status: 'success',
          duration
        });
      } else {
        await this.migrationModel.deleteOne({ name: migration.name });
      }

      logger.info(`Migration ${migration.name} completed in ${duration}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.migrationModel.create({
        _id: new mongoose.Types.ObjectId().toString(),
        name: migration.name,
        executedAt: new Date(),
        status: 'failed',
        error: errorMessage,
        duration: Date.now() - startTime
      });

      logger.error(`Migration ${migration.name} failed:`, error);
      throw error;
    }
  }

  async up(target?: string) {
    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    for (const migration of pending) {
      await this.runMigration(migration, 'up');
      
      if (target && migration.name === target) {
        break;
      }
    }
  }

  async down(steps = 1) {
    const executed = await this.getExecutedMigrations();
    const toRevert = executed.slice(-steps).reverse();

    for (const name of toRevert) {
      const migration = this.migrations.get(name);
      if (!migration) {
        throw new Error(`Migration ${name} not found`);
      }

      await this.runMigration(migration, 'down');
    }
  }

  async status() {
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();
    const failed = await this.migrationModel.find({ status: 'failed' });

    return {
      executed: executed.length,
      pending: pending.length,
      failed: failed.length,
      lastMigration: executed[executed.length - 1],
      details: {
        executed,
        pending: pending.map(m => m.name),
        failed: failed.map(f => ({ name: f.name, error: f.error }))
      }
    };
  }
}

// CLI interface
export async function runMigrationCLI() {
  const command = process.argv[2];
  const runner = new MigrationRunner();
  
  await runner.loadMigrations(path.join(__dirname, 'migrations'));

  switch (command) {
    case 'up':
      await runner.up(process.argv[3]);
      break;
    
    case 'down':
      await runner.down(parseInt(process.argv[3] || '1'));
      break;
    
    case 'status':
      const status = await runner.status();
      console.log('Migration Status:');
      console.log(`  Executed: ${status.executed}`);
      console.log(`  Pending: ${status.pending}`);
      console.log(`  Failed: ${status.failed}`);
      if (status.lastMigration) {
        console.log(`  Last: ${status.lastMigration}`);
      }
      break;
    
    default:
      console.log('Usage: migration [up|down|status] [target]');
  }
}
```

#### 4. Example Migrations
```typescript
// packages/database-schemas/src/migrations/001-add-indexes.ts
import { Migration } from '../migration-runner';
import mongoose from 'mongoose';

export default class AddIndexes extends Migration {
  name = '001-add-indexes';
  description = 'Add performance indexes to all collections';

  async up() {
    await this.transaction(async () => {
      // Users collection
      const Users = mongoose.connection.collection('users');
      await Users.createIndex({ email: 1 }, { unique: true });
      await Users.createIndex({ role: 1, isActive: 1 });
      await Users.createIndex({ createdAt: -1 });
      await Users.createIndex({ 'profile.department': 1 });

      // Courses collection
      const Courses = mongoose.connection.collection('courses');
      await Courses.createIndex({ code: 1 }, { unique: true });
      await Courses.createIndex({ teacherId: 1 });
      await Courses.createIndex({ status: 1, startDate: 1 });
      await Courses.createIndex({ 'metadata.tags': 1 });

      // Enrollments collection
      const Enrollments = mongoose.connection.collection('enrollments');
      await Enrollments.createIndex({ userId: 1, courseId: 1 }, { unique: true });
      await Enrollments.createIndex({ courseId: 1, status: 1 });
      await Enrollments.createIndex({ userId: 1, status: 1 });
      await Enrollments.createIndex({ enrolledAt: -1 });

      // News collection
      const News = mongoose.connection.collection('news');
      await News.createIndex({ publishedAt: -1 });
      await News.createIndex({ category: 1, publishedAt: -1 });
      await News.createIndex({ tags: 1 });
      await News.createIndex({ 'author.id': 1 });

      // Events collection
      const Events = mongoose.connection.collection('events');
      await Events.createIndex({ startDate: 1, endDate: 1 });
      await Events.createIndex({ type: 1, startDate: 1 });
      await Events.createIndex({ 'participants.userId': 1 });
      await Events.createIndex({ location: 1 });
    });
  }

  async down() {
    await this.transaction(async () => {
      // Drop all non-unique indexes
      const collections = ['users', 'courses', 'enrollments', 'news', 'events'];
      
      for (const collectionName of collections) {
        const collection = mongoose.connection.collection(collectionName);
        const indexes = await collection.indexes();
        
        for (const index of indexes) {
          if (index.name !== '_id_' && !index.unique) {
            await collection.dropIndex(index.name);
          }
        }
      }
    });
  }
}
```

---

## 📊 Phase 3 Success Metrics

### Monitoring & Observability
- ✅ Health checks for all services
- ✅ Prometheus metrics integration
- ✅ Distributed tracing with Jaeger
- ✅ Real-time error tracking
- ✅ Performance monitoring

### API Documentation
- ✅ OpenAPI 3.0 specifications
- ✅ Interactive API explorer
- ✅ Auto-generated from code
- ✅ Versioned documentation
- ✅ Test console for developers

### Security Hardening
- ✅ Advanced rate limiting
- ✅ Security headers (Helmet)
- ✅ CORS properly configured
- ✅ DDoS protection
- ✅ API key management

### Database Management
- ✅ Migration system implemented
- ✅ Rollback capabilities
- ✅ Performance indexes
- ✅ Automated backups
- ✅ Schema versioning

### Performance Improvements
- **API Response Time**: <100ms average
- **Health Check Response**: <50ms
- **Rate Limiter Overhead**: <5ms
- **Database Query Time**: <20ms average

---

## 🚀 Handoff to Phase 4

### Production-Ready Platform
- ✅ Comprehensive monitoring
- ✅ Developer-friendly documentation
- ✅ Enterprise-grade security
- ✅ Scalable database management
- ✅ Observable microservices

### Ready for Scale
With production features implemented, Phase 4 can focus on:
- Container orchestration (Kubernetes)
- Auto-scaling policies
- Multi-region deployment
- Event-driven architecture
- Advanced caching strategies

### Operational Excellence
1. 24/7 monitoring capabilities
2. Self-documenting APIs
3. Secure by default
4. Database evolution support
5. Performance optimized

The platform is now production-ready with enterprise-grade operational features, making it ready for the architectural improvements in Phase 4.