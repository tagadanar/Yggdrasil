// src/middleware/healthCheck.ts
// Enhanced health check middleware with dependency verification

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CourseModel } from '@yggdrasil/database-schemas';
import { courseLogger as logger, ResponseHelper } from '@yggdrasil/shared-utilities';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  dependencies: {
    database: DependencyStatus;
    memory: DependencyStatus;
    disk: DependencyStatus;
  };
  performance: {
    responseTime: number;
    requestsPerMinute: number;
    errorRate: number;
  };
  details?: string;
}

interface DependencyStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message?: string;
  lastChecked: string;
}

class HealthCheckService {
  private static instance: HealthCheckService;
  private requestCount = 0;
  private errorCount = 0;
  private lastResetTime = Date.now();

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  public incrementRequest(): void {
    this.requestCount++;
  }

  public incrementError(): void {
    this.errorCount++;
  }

  private resetMetrics(): void {
    const now = Date.now();
    const timeDiff = now - this.lastResetTime;

    // Reset metrics every minute
    if (timeDiff >= 60000) {
      this.requestCount = 0;
      this.errorCount = 0;
      this.lastResetTime = now;
    }
  }

  /**
   * Performs comprehensive health check including all dependencies.
   *
   * @returns Complete health status report
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    this.resetMetrics();

    const timestamp = new Date().toISOString();
    const version = process.env['npm_package_version'] || '1.0.0';
    const uptime = process.uptime();

    try {
      // Parallel dependency checks for performance
      const [databaseStatus, memoryStatus, diskStatus] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkMemory(),
        this.checkDisk(),
      ]);

      const dependencies = {
        database:
          databaseStatus.status === 'fulfilled'
            ? databaseStatus.value
            : this.createErrorStatus('Database check failed'),
        memory:
          memoryStatus.status === 'fulfilled'
            ? memoryStatus.value
            : this.createErrorStatus('Memory check failed'),
        disk:
          diskStatus.status === 'fulfilled'
            ? diskStatus.value
            : this.createErrorStatus('Disk check failed'),
      };

      const responseTime = Date.now() - startTime;
      const requestsPerMinute = this.requestCount;
      const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

      const performance = {
        responseTime,
        requestsPerMinute,
        errorRate,
      };

      // Determine overall health status
      const overallStatus = this.determineOverallStatus(dependencies, performance);

      return {
        status: overallStatus,
        timestamp,
        service: 'course-service',
        version,
        uptime,
        dependencies,
        performance,
        ...(overallStatus !== 'healthy' && { details: this.getHealthDetails(dependencies) }),
      };
    } catch (error: any) {
      logger.error('Health check failed:', error);

      return {
        status: 'unhealthy',
        timestamp,
        service: 'course-service',
        version,
        uptime,
        dependencies: {
          database: this.createErrorStatus('Health check system error'),
          memory: this.createErrorStatus('Health check system error'),
          disk: this.createErrorStatus('Health check system error'),
        },
        performance: {
          responseTime: Date.now() - startTime,
          requestsPerMinute: 0,
          errorRate: 100,
        },
        details: `Health check system failure: ${error.message}`,
      };
    }
  }

  /**
   * Checks database connectivity and performance.
   */
  private async checkDatabase(): Promise<DependencyStatus> {
    const startTime = Date.now();

    try {
      // Check MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        return {
          status: 'unhealthy',
          message: 'Database not connected',
          lastChecked: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        };
      }

      // Perform a lightweight database operation
      await CourseModel.findOne().limit(1).lean().maxTimeMS(5000);

      const responseTime = Date.now() - startTime;

      // Evaluate database performance
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Database responsive';

      if (responseTime > 2000) {
        status = 'unhealthy';
        message = 'Database response time too slow';
      } else if (responseTime > 1000) {
        status = 'degraded';
        message = 'Database response time elevated';
      }

      return {
        status,
        responseTime,
        message,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Database health check failed:', error);

      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Database error: ${error.message}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Checks memory usage and availability.
   */
  private async checkMemory(): Promise<DependencyStatus> {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = memUsage.heapTotal;
      const usedMem = memUsage.heapUsed;
      const memPercentage = (usedMem / totalMem) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Memory usage: ${memPercentage.toFixed(1)}%`;

      if (memPercentage > 90) {
        status = 'unhealthy';
        message = `Critical memory usage: ${memPercentage.toFixed(1)}%`;
      } else if (memPercentage > 75) {
        status = 'degraded';
        message = `High memory usage: ${memPercentage.toFixed(1)}%`;
      }

      return {
        status,
        message,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Memory check failed: ${error.message}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Checks disk space and I/O availability.
   */
  private async checkDisk(): Promise<DependencyStatus> {
    try {
      // Basic file system check - try to write a small temp file
      const fs = await import('fs/promises');
      const path = await import('path');
      const tmpFile = path.join('/tmp', `health-check-${Date.now()}.tmp`);

      const startTime = Date.now();
      await fs.writeFile(tmpFile, 'health-check', 'utf8');
      await fs.unlink(tmpFile);
      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Disk I/O: ${responseTime}ms`;

      if (responseTime > 1000) {
        status = 'unhealthy';
        message = `Slow disk I/O: ${responseTime}ms`;
      } else if (responseTime > 500) {
        status = 'degraded';
        message = `Elevated disk I/O: ${responseTime}ms`;
      }

      return {
        status,
        responseTime,
        message,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Disk check failed: ${error.message}`,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private createErrorStatus(message: string): DependencyStatus {
    return {
      status: 'unhealthy',
      message,
      lastChecked: new Date().toISOString(),
    };
  }

  private determineOverallStatus(
    dependencies: HealthCheckResult['dependencies'],
    performance: HealthCheckResult['performance'],
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const depStatuses = Object.values(dependencies).map(dep => dep.status);

    // If any critical dependency is unhealthy, service is unhealthy
    if (depStatuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    // High error rate indicates unhealthy service
    if (performance.errorRate > 10) {
      return 'unhealthy';
    }

    // Slow response time or degraded dependencies indicate degraded service
    if (
      performance.responseTime > 5000 ||
      depStatuses.includes('degraded') ||
      performance.errorRate > 5
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  private getHealthDetails(dependencies: HealthCheckResult['dependencies']): string {
    const issues = Object.entries(dependencies)
      .filter(([, status]) => status.status !== 'healthy')
      .map(([name, status]) => `${name}: ${status.message}`)
      .join(', ');

    return issues || 'Service experiencing issues';
  }
}

/**
 * Enhanced health check endpoint handler.
 * Provides comprehensive service health information for monitoring systems.
 */
export const enhancedHealthCheck = async (_req: Request, res: Response): Promise<Response> => {
  const healthService = HealthCheckService.getInstance();

  try {
    const healthResult = await healthService.performHealthCheck();

    // Set appropriate HTTP status based on health
    let httpStatus = 200;
    if (healthResult.status === 'degraded') {
      httpStatus = 200; // Still operational but degraded
    } else if (healthResult.status === 'unhealthy') {
      httpStatus = 503; // Service unavailable
    }

    return res
      .status(httpStatus)
      .json(ResponseHelper.success(healthResult, 'Health check completed'));
  } catch (error: any) {
    logger.error('Health check endpoint error:', error);

    return res.status(503).json(ResponseHelper.error('Health check failed', 503));
  }
};

/**
 * Simple health check for basic monitoring.
 * Returns 200 OK if service is operational.
 */
export const simpleHealthCheck = (_req: Request, res: Response): Response => {
  const healthService = HealthCheckService.getInstance();
  healthService.incrementRequest();

  return res.status(200).json(
    ResponseHelper.success(
      {
        service: 'course-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env['npm_package_version'] || '1.0.0',
      },
      'Course service is healthy',
    ),
  );
};

/**
 * Readiness probe for Kubernetes/container orchestration.
 * Checks if service is ready to receive traffic.
 */
export const readinessProbe = async (_req: Request, res: Response): Promise<Response> => {
  try {
    // Quick database connectivity check
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ status: 'not ready', reason: 'database not connected' });
    }

    return res.status(200).json({ status: 'ready' });
  } catch (error) {
    return res
      .status(503)
      .json({ status: 'not ready', reason: 'service initialization incomplete' });
  }
};

/**
 * Liveness probe for Kubernetes/container orchestration.
 * Checks if service is alive and should not be restarted.
 */
export const livenessProbe = (_req: Request, res: Response): Response => {
  return res.status(200).json({ status: 'alive' });
};

// Export singleton instance for middleware usage
export const healthCheckService = HealthCheckService.getInstance();
