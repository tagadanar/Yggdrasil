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
      environment: process.env['NODE_ENV'] || 'development',
    });

    // Initialize HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestSize = new Summary({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      percentiles: [0.5, 0.9, 0.99],
      registers: [this.registry],
    });

    this.httpResponseSize = new Summary({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route'],
      percentiles: [0.5, 0.9, 0.99],
      registers: [this.registry],
    });

    // Initialize system metrics
    this.memoryUsage = new Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.cpuUsage = new Gauge({
      name: 'cpu_usage_percentage',
      help: 'CPU usage percentage',
      registers: [this.registry],
    });

    // Initialize business metrics
    this.userRegistrations = new Counter({
      name: 'user_registrations_total',
      help: 'Total number of user registrations',
      labelNames: ['role'],
      registers: [this.registry],
    });

    this.userLogins = new Counter({
      name: 'user_logins_total',
      help: 'Total number of user logins',
      labelNames: ['role', 'success'],
      registers: [this.registry],
    });

    this.courseEnrollments = new Counter({
      name: 'course_enrollments_total',
      help: 'Total number of course enrollments',
      registers: [this.registry],
    });

    this.apiErrors = new Counter({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['type', 'endpoint'],
      registers: [this.registry],
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
      const metricsCollector = this;
      res.send = function (data: any) {
        res.send = originalSend;

        const duration = (Date.now() - start) / 1000;
        const responseSize = Buffer.byteLength(data);

        // Record metrics
        metricsCollector.httpRequestsTotal.inc({
          method: req.method,
          route,
          status_code: res.statusCode.toString(),
        });

        metricsCollector.httpRequestDuration.observe(
          {
            method: req.method,
            route,
            status_code: res.statusCode.toString(),
          },
          duration,
        );

        metricsCollector.httpResponseSize.observe(
          {
            method: req.method,
            route,
          },
          responseSize,
        );

        return originalSend.call(this, data);
      };

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
      registers: [this.registry],
    });
  }

  createCustomGauge(name: string, help: string, labelNames?: string[]) {
    return new Gauge({
      name,
      help,
      labelNames,
      registers: [this.registry],
    });
  }

  createCustomHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]) {
    return new Histogram({
      name,
      help,
      labelNames,
      buckets,
      registers: [this.registry],
    });
  }
}
