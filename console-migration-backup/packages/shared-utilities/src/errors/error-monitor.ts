import { AppError } from './AppError';
import { logger } from '../logging/logger';

interface ErrorMetrics {
  total: number;
  byType: Record<string, number>;
  byStatusCode: Record<number, number>;
  byService: Record<string, number>;
  recentErrors: Array<{
    timestamp: Date;
    type: string;
    message: string;
    service?: string;
  }>;
}

export class ErrorMonitor {
  private static metrics: ErrorMetrics = {
    total: 0,
    byType: {},
    byStatusCode: {},
    byService: {},
    recentErrors: [],
  };

  static trackError(error: Error, service?: string) {
    this.metrics.total++;

    // Track by type
    const errorType = error.constructor.name;
    this.metrics.byType[errorType] = (this.metrics.byType[errorType] || 0) + 1;

    // Track by status code
    if (error instanceof AppError) {
      const statusCode = error.statusCode;
      this.metrics.byStatusCode[statusCode] =
        (this.metrics.byStatusCode[statusCode] || 0) + 1;
    }

    // Track by service
    if (service) {
      this.metrics.byService[service] =
        (this.metrics.byService[service] || 0) + 1;
    }

    // Keep recent errors (last 100)
    this.metrics.recentErrors.unshift({
      timestamp: new Date(),
      type: errorType,
      message: error.message,
      service,
    });

    if (this.metrics.recentErrors.length > 100) {
      this.metrics.recentErrors.pop();
    }

    // Alert on error spikes
    this.checkErrorSpikes();
  }

  private static checkErrorSpikes() {
    const recentWindow = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    const recentErrorCount = this.metrics.recentErrors.filter(
      err => now - err.timestamp.getTime() < recentWindow,
    ).length;

    if (recentErrorCount > 50) {
      logger.error('Error spike detected', {
        count: recentErrorCount,
        window: '5 minutes',
        topErrors: this.getTopErrors(),
      });
    }
  }

  private static getTopErrors() {
    const counts: Record<string, number> = {};

    this.metrics.recentErrors.forEach(err => {
      counts[err.type] = (counts[err.type] || 0) + 1;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  static getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  static reset() {
    this.metrics = {
      total: 0,
      byType: {},
      byStatusCode: {},
      byService: {},
      recentErrors: [],
    };
  }
}
