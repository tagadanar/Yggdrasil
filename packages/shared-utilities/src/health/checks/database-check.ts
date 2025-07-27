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
          `Database connection state: ${this.getStateName(state)}`,
        );
      }

      // Perform a simple query
      const startTime = Date.now();
      if (!mongoose.connection.db) {
        throw new Error('Database connection not available');
      }
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;

      // Check response time
      if (responseTime > 5000) {
        return this.createResult(
          HealthStatus.DEGRADED,
          `Database response time high: ${responseTime}ms`,
          { responseTime },
        );
      }

      // Get additional metrics
      const stats = await this.getDatabaseStats();

      return this.createResult(HealthStatus.HEALTHY, 'Database connection healthy', {
        responseTime,
        ...stats,
      });
    } catch (error) {
      return this.createResult(
        HealthStatus.UNHEALTHY,
        error instanceof Error ? error.message : 'Database check failed',
      );
    }
  }

  private getStateName(state: number): string {
    switch (state) {
      case 0:
        return 'disconnected';
      case 1:
        return 'connected';
      case 2:
        return 'connecting';
      case 3:
        return 'disconnecting';
      default:
        return 'unknown';
    }
  }

  private async getDatabaseStats() {
    try {
      if (!mongoose.connection.db) {
        return {};
      }
      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();

      return {
        connections: serverStatus['connections'],
        operations: {
          insert: serverStatus['opcounters']?.['insert'] || 0,
          query: serverStatus['opcounters']?.['query'] || 0,
          update: serverStatus['opcounters']?.['update'] || 0,
          delete: serverStatus['opcounters']?.['delete'] || 0,
        },
        network: {
          bytesIn: serverStatus['network']?.['bytesIn'] || 0,
          bytesOut: serverStatus['network']?.['bytesOut'] || 0,
        },
      };
    } catch {
      return {};
    }
  }
}
