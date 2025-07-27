import { Request, Response } from 'express';
import * as os from 'os';
import { performance } from 'perf_hooks';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
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
    details?: Record<string, any>,
  ): HealthCheckResult {
    return {
      status,
      message,
      duration: 0,
      details,
    };
  }
}

export class HealthCheckManager {
  private checkers: Map<string, HealthChecker> = new Map();
  private cache: Map<string, { result: HealthCheckResult; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds

  constructor(
    private serviceName: string,
    private version: string,
  ) {}

  registerChecker(checker: HealthChecker): void {
    this.checkers.set(checker.name, checker);
  }

  async checkHealth(detailed = false): Promise<ServiceHealth> {
    const checks: Record<string, HealthCheckResult> = {};
    let overallStatus = HealthStatus.HEALTHY;

    // Run all health checks in parallel
    const checkPromises = Array.from(this.checkers.entries()).map(async ([name, checker]) => {
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
        } else if (
          result.status === HealthStatus.DEGRADED &&
          overallStatus !== HealthStatus.UNHEALTHY
        ) {
          overallStatus = HealthStatus.DEGRADED;
        }
      } catch (error) {
        const errorResult: HealthCheckResult = {
          status: HealthStatus.UNHEALTHY,
          message: error instanceof Error ? error.message : 'Check failed',
          duration: Math.round(performance.now() - checkStart),
        };
        checks[name] = errorResult;

        if (checker.critical) {
          overallStatus = HealthStatus.UNHEALTHY;
        }
      }
    });

    await Promise.all(checkPromises);

    const health: ServiceHealth = {
      service: this.serviceName,
      version: this.version,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
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
      timestamp: Date.now(),
    });
  }

  private getSystemHealth(): SystemHealth {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Calculate CPU usage
    const cpuUsage =
      cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return acc + (total - idle) / total;
      }, 0) / cpus.length;

    return {
      cpu: {
        usage: Math.round(cpuUsage * 100),
        count: cpus.length,
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
    };
  }

  createHealthEndpoint() {
    return async (req: Request, res: Response) => {
      try {
        const detailed = req.query['detailed'] === 'true';
        const health = await this.checkHealth(detailed);

        const statusCode =
          health.status === HealthStatus.HEALTHY
            ? 200
            : health.status === HealthStatus.DEGRADED
              ? 200
              : 503;

        res.status(statusCode).json(health);
      } catch (error) {
        res.status(503).json({
          service: this.serviceName,
          version: this.version,
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Health check failed',
        });
      }
    };
  }
}
