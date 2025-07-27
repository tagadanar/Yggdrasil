import { RedisClientType } from 'redis';
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
        return this.createResult(HealthStatus.UNHEALTHY, 'Redis ping failed');
      }

      // Check response time
      if (responseTime > 100) {
        return this.createResult(
          HealthStatus.DEGRADED,
          `Redis response time high: ${responseTime}ms`,
          { responseTime },
        );
      }

      // Get Redis info
      const info = await this.redis.info();
      const stats = this.parseRedisInfo(info);

      return this.createResult(HealthStatus.HEALTHY, 'Redis connection healthy', {
        responseTime,
        ...stats,
      });
    } catch (error) {
      return this.createResult(
        HealthStatus.UNHEALTHY,
        error instanceof Error ? error.message : 'Redis check failed',
      );
    }
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const stats: Record<string, any> = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key === 'used_memory_human') stats['memory'] = value;
        if (key === 'connected_clients') stats['clients'] = parseInt(value || '0');
        if (key === 'total_commands_processed') stats['commands'] = parseInt(value || '0');
      }
    }

    return stats;
  }
}
