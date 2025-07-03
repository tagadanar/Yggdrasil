// Path: packages/api-gateway/src/services/MetricsService.ts
import { MetricsConfig } from '../types/gateway';

interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  totalResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  lastRequestTime: Date;
}

export class MetricsService {
  private metrics: Map<string, ServiceMetrics> = new Map();
  private config: MetricsConfig;

  constructor(config: MetricsConfig) {
    this.config = config;
  }

  recordRequest(service: string, method: string, statusCode: number, responseTime: number): void {
    if (!this.config.enabled) return;

    const key = `${service}_${method}`;
    const existing = this.metrics.get(key) || {
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      lastRequestTime: new Date()
    };

    existing.requestCount++;
    existing.totalResponseTime += responseTime;
    existing.minResponseTime = Math.min(existing.minResponseTime, responseTime);
    existing.maxResponseTime = Math.max(existing.maxResponseTime, responseTime);
    existing.lastRequestTime = new Date();

    if (statusCode >= 400) {
      existing.errorCount++;
    }

    this.metrics.set(key, existing);
  }

  recordError(service: string, method: string, statusCode: number, responseTime: number): void {
    this.recordRequest(service, method, statusCode, responseTime);
  }

  getAverageResponseTime(service: string): number {
    let totalTime = 0;
    let totalRequests = 0;

    for (const [key, metrics] of this.metrics) {
      if (key.startsWith(service)) {
        totalTime += metrics.totalResponseTime;
        totalRequests += metrics.requestCount;
      }
    }

    return totalRequests > 0 ? totalTime / totalRequests : 0;
  }

  getErrorCount(service: string): number {
    let errorCount = 0;

    for (const [key, metrics] of this.metrics) {
      if (key.startsWith(service)) {
        errorCount += metrics.errorCount;
      }
    }

    return errorCount;
  }

  getRequestCount(service: string): number {
    let requestCount = 0;

    for (const [key, metrics] of this.metrics) {
      if (key.startsWith(service)) {
        requestCount += metrics.requestCount;
      }
    }

    return requestCount;
  }

  getAllMetrics(): Record<string, ServiceMetrics> {
    const result: Record<string, ServiceMetrics> = {};
    
    for (const [key, metrics] of this.metrics) {
      result[key] = { ...metrics };
    }

    return result;
  }

  getServiceMetrics(service: string): Record<string, ServiceMetrics> {
    const result: Record<string, ServiceMetrics> = {};
    
    for (const [key, metrics] of this.metrics) {
      if (key.startsWith(service)) {
        result[key] = { ...metrics };
      }
    }

    return result;
  }

  resetMetrics(service?: string): void {
    if (service) {
      for (const key of this.metrics.keys()) {
        if (key.startsWith(service)) {
          this.metrics.delete(key);
        }
      }
    } else {
      this.metrics.clear();
    }
  }
}