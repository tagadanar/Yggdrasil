// src/middleware/monitoring.ts
// Performance monitoring and structured logging middleware

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { courseLogger as logger } from '@yggdrasil/shared-utilities';

// Extend Express Request type to include correlation ID and timing
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip: string;
  userId?: string;
  userRole?: string;
  correlationId: string;
  timestamp: string;
  contentLength?: number;
  error?: string;
}

interface PerformanceMetrics {
  totalRequests: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  slowRequests: number;
  statusCodeDistribution: { [key: string]: number };
  endpointMetrics: { [key: string]: EndpointMetrics };
  lastReset: string;
}

interface EndpointMetrics {
  count: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorCount: number;
  lastAccessed: string;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private requestHistory: RequestMetrics[] = [];
  private readonly maxHistorySize = 1000;
  private readonly resetInterval = 300000; // 5 minutes
  private lastResetTime = Date.now();

  private constructor() {
    this.metrics = this.initializeMetrics();

    // Reset metrics periodically
    setInterval(() => {
      this.resetMetrics();
    }, this.resetInterval);
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      requestsPerSecond: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowRequests: 0,
      statusCodeDistribution: {},
      endpointMetrics: {},
      lastReset: new Date().toISOString(),
    };
  }

  /**
   * Records request metrics and updates performance statistics.
   */
  public recordRequest(requestMetrics: RequestMetrics): void {
    // Add to history
    this.requestHistory.push(requestMetrics);

    // Trim history if too large
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }

    // Update metrics
    this.updateMetrics(requestMetrics);
  }

  private updateMetrics(request: RequestMetrics): void {
    this.metrics.totalRequests++;

    // Update status code distribution
    const statusKey = `${Math.floor(request.statusCode / 100)}xx`;
    this.metrics.statusCodeDistribution[statusKey] =
      (this.metrics.statusCodeDistribution[statusKey] || 0) + 1;

    // Track slow requests (>2 seconds)
    if (request.responseTime > 2000) {
      this.metrics.slowRequests++;
    }

    // Update endpoint-specific metrics
    this.updateEndpointMetrics(request);

    // Recalculate derived metrics
    this.calculateDerivedMetrics();
  }

  private updateEndpointMetrics(request: RequestMetrics): void {
    const endpoint = `${request.method} ${this.normalizeEndpoint(request.path)}`;

    if (!this.metrics.endpointMetrics[endpoint]) {
      this.metrics.endpointMetrics[endpoint] = {
        count: 0,
        averageResponseTime: 0,
        minResponseTime: request.responseTime,
        maxResponseTime: request.responseTime,
        errorCount: 0,
        lastAccessed: request.timestamp,
      };
    }

    const endpointMetric = this.metrics.endpointMetrics[endpoint];
    endpointMetric.count++;
    endpointMetric.lastAccessed = request.timestamp;

    // Update response time metrics
    endpointMetric.averageResponseTime =
      (endpointMetric.averageResponseTime * (endpointMetric.count - 1) + request.responseTime) /
      endpointMetric.count;
    endpointMetric.minResponseTime = Math.min(endpointMetric.minResponseTime, request.responseTime);
    endpointMetric.maxResponseTime = Math.max(endpointMetric.maxResponseTime, request.responseTime);

    // Track errors
    if (request.statusCode >= 400) {
      endpointMetric.errorCount++;
    }
  }

  private normalizeEndpoint(path: string): string {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/[a-f0-9]{24}(?=\/|$)/g, '/:id') // MongoDB ObjectIds
      .replace(/\/\d+(?=\/|$)/g, '/:id') // Numeric IDs
      .replace(/\/[a-zA-Z0-9-]+(?=\/|$)/g, '/:slug'); // Slugs
  }

  private calculateDerivedMetrics(): void {
    const now = Date.now();
    const timeWindow = now - this.lastResetTime;
    const timeWindowSeconds = timeWindow / 1000;

    // Requests per second
    this.metrics.requestsPerSecond =
      timeWindowSeconds > 0 ? this.metrics.totalRequests / timeWindowSeconds : 0;

    // Average response time
    if (this.requestHistory.length > 0) {
      const totalTime = this.requestHistory.reduce((sum, req) => sum + req.responseTime, 0);
      this.metrics.averageResponseTime = totalTime / this.requestHistory.length;
    }

    // Error rate
    const errorRequests = this.requestHistory.filter(req => req.statusCode >= 400).length;
    this.metrics.errorRate =
      this.requestHistory.length > 0 ? (errorRequests / this.requestHistory.length) * 100 : 0;
  }

  private resetMetrics(): void {
    logger.info('Resetting performance metrics', {
      previousMetrics: { ...this.metrics },
      resetTime: new Date().toISOString(),
    });

    this.metrics = this.initializeMetrics();
    this.requestHistory = [];
    this.lastResetTime = Date.now();
  }

  /**
   * Gets current performance metrics.
   */
  public getMetrics(): PerformanceMetrics {
    this.calculateDerivedMetrics();
    return { ...this.metrics };
  }

  /**
   * Gets recent request history.
   */
  public getRequestHistory(limit = 50): RequestMetrics[] {
    return this.requestHistory.slice(-limit);
  }

  /**
   * Gets metrics for a specific endpoint.
   */
  public getEndpointMetrics(endpoint: string): EndpointMetrics | null {
    return this.metrics.endpointMetrics[endpoint] || null;
  }
}

/**
 * Correlation ID middleware.
 * Adds unique correlation ID to each request for distributed tracing.
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Check for existing correlation ID in headers
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    uuidv4();

  req.correlationId = correlationId;

  // Add correlation ID to response headers
  res.setHeader('x-correlation-id', correlationId);

  next();
};

/**
 * Performance monitoring middleware.
 * Tracks request metrics and logs structured data.
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  req.startTime = startTime;

  const monitor = PerformanceMonitor.getInstance();

  // Log incoming request
  const requestLog = {
    event: 'request_start',
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString(),
    contentLength: req.headers['content-length'],
  };

  logger.info('Incoming request', requestLog);

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const responseTime = Date.now() - startTime;

    // Create request metrics
    const requestMetrics: RequestMetrics = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.headers['user-agent'] as string,
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userId: (req as any).user?.id || (req as any).user?.userId || (req as any).user?._id,
      userRole: (req as any).user?.role,
      correlationId: req.correlationId || 'unknown',
      timestamp: new Date().toISOString(),
      contentLength: parseInt(res.getHeader('content-length') as string) || undefined,
    };

    // Add error details for failed requests
    if (res.statusCode >= 400) {
      requestMetrics.error = res.statusMessage || 'Unknown error';
    }

    // Record metrics
    monitor.recordRequest(requestMetrics);

    // Log response
    const responseLog = {
      event: 'request_complete',
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      userId: requestMetrics.userId,
      userRole: requestMetrics.userRole,
      timestamp: requestMetrics.timestamp,
      ...(res.statusCode >= 400 && { error: requestMetrics.error }),
    };

    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Request completed', responseLog);

    // Performance alerts for slow requests
    if (responseTime > 5000) {
      logger.warn('Slow request detected', {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        responseTime,
        threshold: 5000,
      });
    }

    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
};

/**
 * Metrics endpoint handler.
 * Provides performance metrics for monitoring systems.
 */
export const metricsEndpoint = (_req: Request, res: Response): Response => {
  const monitor = PerformanceMonitor.getInstance();
  const metrics = monitor.getMetrics();

  return res.status(200).json({
    success: true,
    data: {
      service: 'course-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      metrics,
    },
    message: 'Performance metrics retrieved successfully',
  });
};

/**
 * Request history endpoint for debugging.
 */
export const requestHistoryEndpoint = (req: Request, res: Response): Response => {
  const monitor = PerformanceMonitor.getInstance();
  const limit = parseInt(req.query['limit'] as string) || 50;
  const history = monitor.getRequestHistory(limit);

  return res.status(200).json({
    success: true,
    data: {
      history,
      count: history.length,
      timestamp: new Date().toISOString(),
    },
    message: 'Request history retrieved successfully',
  });
};

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
