import axios from 'axios';
import { HealthChecker, HealthCheckResult, HealthStatus } from '../health-check';

export class ExternalServiceHealthChecker extends HealthChecker {
  name: string;
  critical: boolean;

  constructor(
    name: string,
    private url: string,
    critical = false,
    private timeout = 5000,
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
        validateStatus: status => status < 500,
      });
      const responseTime = Date.now() - startTime;

      if (response.status >= 400) {
        return this.createResult(HealthStatus.UNHEALTHY, `Service returned ${response.status}`, {
          statusCode: response.status,
          responseTime,
        });
      }

      if (responseTime > this.timeout * 0.8) {
        return this.createResult(HealthStatus.DEGRADED, `Response time high: ${responseTime}ms`, {
          responseTime,
        });
      }

      return this.createResult(HealthStatus.HEALTHY, 'Service reachable', {
        statusCode: response.status,
        responseTime,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return this.createResult(
            HealthStatus.UNHEALTHY,
            `Service timeout after ${this.timeout}ms`,
          );
        }
        return this.createResult(HealthStatus.UNHEALTHY, error.message);
      }

      return this.createResult(HealthStatus.UNHEALTHY, 'Service check failed');
    }
  }
}
