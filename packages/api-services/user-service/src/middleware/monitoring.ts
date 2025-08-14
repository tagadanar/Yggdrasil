// packages/api-services/user-service/src/middleware/monitoring.ts
// Performance monitoring and metrics collection

import { Request, Response, NextFunction } from 'express';
import { userLogger as logger } from '@yggdrasil/shared-utilities';

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  userId?: string;
  memoryUsage: NodeJS.MemoryUsage;
}

export interface HealthMetrics {
  service: string;
  version: string;
  uptime: number;
  timestamp: Date;
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  database: {
    connected: boolean;
    responseTime?: number;
  };
  dependencies: Record<
    string,
    {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime?: number;
      error?: string;
    }
  >;
}

// Store metrics in memory (in production, use Redis or external service)
const performanceMetrics: PerformanceMetrics[] = [];
const healthMetrics: HealthMetrics[] = [];
const MAX_METRICS = 1000; // Keep last 1000 entries

/**
 * Performance monitoring middleware
 */
export const performanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  const startCpuUsage = process.cpuUsage();

  // Override res.end to capture response metrics
  const originalEnd = res.end.bind(res);
  res.end = function (...args: any[]) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Collect metrics
    const metrics: PerformanceMetrics = {
      endpoint: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime: Math.round(responseTime * 100) / 100, // Round to 2 decimal places
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.userId,
      memoryUsage: process.memoryUsage(),
    };

    // Store metrics (with rotation)
    storePerformanceMetrics(metrics);

    // Log slow requests
    if (responseTime > 1000) {
      // More than 1 second
      logger.warn('Slow Request', {
        endpoint: metrics.endpoint,
        method: metrics.method,
        responseTime: metrics.responseTime,
        statusCode: metrics.statusCode,
        userId: metrics.userId,
      });
    }

    // Log errors with context
    if (res.statusCode >= 400) {
      const cpuUsage = process.cpuUsage(startCpuUsage);
      logger.error('Request Error', {
        endpoint: metrics.endpoint,
        method: metrics.method,
        statusCode: metrics.statusCode,
        responseTime: metrics.responseTime,
        cpuUsage: {
          user: cpuUsage.user / 1000, // Convert to milliseconds
          system: cpuUsage.system / 1000,
        },
        memoryMB: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
      });
    }

    return (originalEnd as any).apply(this, args);
  };

  next();
};

/**
 * Request size monitoring
 */
export const requestSizeMonitor = (req: Request, _res: Response, next: NextFunction): void => {
  const contentLength = req.get('content-length');

  if (contentLength) {
    const sizeBytes = parseInt(contentLength);
    const sizeMB = sizeBytes / (1024 * 1024);

    // Log large requests
    if (sizeMB > 1) {
      logger.warn('Large Request', {
        endpoint: req.path,
        method: req.method,
        sizeBytes,
        sizeMB: Math.round(sizeMB * 100) / 100,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.userId,
      });
    }
  }

  next();
};

/**
 * Store performance metrics with rotation
 */
function storePerformanceMetrics(metrics: PerformanceMetrics): void {
  performanceMetrics.push(metrics);

  // Rotate metrics to prevent memory issues
  if (performanceMetrics.length > MAX_METRICS) {
    performanceMetrics.shift();
  }
}

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = (
  minutes: number = 60,
): {
  metrics: PerformanceMetrics[];
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    slowRequests: number;
    topEndpoints: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
  };
} => {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  const recentMetrics = performanceMetrics.filter(m => m.timestamp > cutoff);

  if (recentMetrics.length === 0) {
    return {
      metrics: [],
      summary: {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowRequests: 0,
        topEndpoints: [],
      },
    };
  }

  const totalRequests = recentMetrics.length;
  const averageResponseTime =
    recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
  const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
  const errorRate = (errorCount / totalRequests) * 100;
  const slowRequests = recentMetrics.filter(m => m.responseTime > 1000).length;

  // Top endpoints by request count
  const endpointCounts = recentMetrics.reduce(
    (acc, m) => {
      const key = `${m.method} ${m.endpoint}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalTime: 0 };
      }
      acc[key].count++;
      acc[key].totalTime += m.responseTime;
      return acc;
    },
    {} as Record<string, { count: number; totalTime: number }>,
  );

  const topEndpoints = Object.entries(endpointCounts)
    .map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      avgResponseTime: Math.round((data.totalTime / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    metrics: recentMetrics,
    summary: {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      slowRequests,
      topEndpoints,
    },
  };
};

/**
 * Generate comprehensive health metrics
 */
export const generateHealthMetrics = async (): Promise<HealthMetrics> => {
  const metrics: HealthMetrics = {
    service: 'user-service',
    version: process.env['npm_package_version'] || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    database: {
      connected: true, // This should check actual database connection
    },
    dependencies: {
      'auth-service': {
        status: 'healthy', // This should check actual service
      },
      'shared-utilities': {
        status: 'healthy',
      },
    },
  };

  // Test database connection
  try {
    // This would be a real database ping in production
    const start = Date.now();
    // await mongoose.connection.db.admin().ping();
    metrics.database.responseTime = Date.now() - start;
    metrics.database.connected = true;
  } catch (error) {
    metrics.database.connected = false;
  }

  // Store health metrics
  healthMetrics.push(metrics);
  if (healthMetrics.length > 100) {
    healthMetrics.shift();
  }

  return metrics;
};

/**
 * Get system resources usage
 */
export const getSystemResources = (): {
  memory: {
    heapUsed: number;
    heapTotal: number;
    heapUsedMB: number;
    heapTotalMB: number;
    rss: number;
    rssMB: number;
  };
  uptime: number;
  cpu: NodeJS.CpuUsage;
} => {
  const memoryUsage = process.memoryUsage();

  return {
    memory: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      heapUsedMB: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMB: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      rss: memoryUsage.rss,
      rssMB: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
    },
    uptime: process.uptime(),
    cpu: process.cpuUsage(),
  };
};

/**
 * Memory leak detection
 */
export const memoryLeakDetector = (): void => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

  // Alert if heap usage exceeds 500MB
  if (heapUsedMB > 500) {
    logger.error('High Memory Usage Detected', {
      heapUsedMB: Math.round(heapUsedMB),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      timestamp: new Date(),
    });
  }
};

/**
 * Start monitoring timers
 */
export const startMonitoring = (): void => {
  // Memory leak detection every 30 seconds
  setInterval(memoryLeakDetector, 30000);

  // Log system resources every 5 minutes
  setInterval(
    () => {
      const resources = getSystemResources();
      logger.info('System Resources', {
        heapUsedMB: resources.memory.heapUsedMB,
        rssMB: resources.memory.rssMB,
        uptimeHours: Math.round((resources.uptime / 3600) * 100) / 100,
      });
    },
    5 * 60 * 1000,
  );

  logger.info('Performance monitoring started');
};

/**
 * Enhanced health check endpoint data
 */
export const getDetailedHealthCheck = async () => {
  const healthMetrics = await generateHealthMetrics();
  const performanceData = getPerformanceMetrics(10); // Last 10 minutes
  const resources = getSystemResources();

  return {
    status: healthMetrics.database.connected ? 'ok' : 'degraded',
    service: 'user-service',
    version: healthMetrics.version,
    timestamp: new Date(),
    uptime: resources.uptime,
    metrics: {
      memory: {
        heapUsedMB: resources.memory.heapUsedMB,
        heapTotalMB: resources.memory.heapTotalMB,
        rssMB: resources.memory.rssMB,
      },
      performance: {
        requestsLast10Min: performanceData.summary.totalRequests,
        averageResponseTime: performanceData.summary.averageResponseTime,
        errorRate: performanceData.summary.errorRate,
        slowRequests: performanceData.summary.slowRequests,
      },
      database: healthMetrics.database,
      dependencies: healthMetrics.dependencies,
    },
  };
};
