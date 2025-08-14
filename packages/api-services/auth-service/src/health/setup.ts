import { Express } from 'express';
import {
  HealthCheckManager,
  DatabaseHealthChecker,
  ExternalServiceHealthChecker,
  HealthChecker,
  HealthStatus,
  HTTP_STATUS,
} from '@yggdrasil/shared-utilities';

import type { HealthCheckResult } from '@yggdrasil/shared-utilities';
import { config } from '@yggdrasil/shared-utilities';
import { SharedJWTHelper } from '@yggdrasil/shared-utilities';

// Custom JWT health check
class JWTHealthChecker extends HealthChecker {
  name = 'jwt-configuration';
  critical = true;

  async check(): Promise<HealthCheckResult> {
    try {
      // Verify JWT configuration
      if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
        return this.createResult(HealthStatus.UNHEALTHY, 'JWT secret not properly configured');
      }

      // Test token generation
      const testToken = SharedJWTHelper.generateAccessToken({
        id: 'test',
        userId: 'test',
        email: 'test@test.com',
        role: 'student',
        tokenVersion: 1,
      });

      // Test token verification
      const verified = SharedJWTHelper.verifyAccessToken(testToken);

      if (!verified.success) {
        return this.createResult(HealthStatus.UNHEALTHY, 'JWT verification failed');
      }

      return this.createResult(HealthStatus.HEALTHY, 'JWT system operational');
    } catch (error) {
      return this.createResult(
        HealthStatus.UNHEALTHY,
        error instanceof Error ? error.message : 'JWT check failed',
      );
    }
  }
}

export function setupHealthChecks(app: Express) {
  const healthManager = new HealthCheckManager(
    'auth-service',
    process.env['npm_package_version'] || '1.0.0',
  );

  // Register health checks
  healthManager.registerChecker(new DatabaseHealthChecker());
  healthManager.registerChecker(new JWTHealthChecker());

  // Check if user service is configured and add external service check
  if (config.USER_SERVICE_PORT) {
    const userServiceUrl = `http://localhost:${config.USER_SERVICE_PORT}`;
    healthManager.registerChecker(
      new ExternalServiceHealthChecker(
        'user-service',
        userServiceUrl + '/health',
        false, // Not critical since auth service has its own user data
      ),
    );
  }

  // Health endpoints
  app.get('/health', healthManager.createHealthEndpoint());
  app.get('/health/live', (_req, res) => {
    res.status(HTTP_STATUS.OK).json({ status: 'alive' });
  });
  app.get('/health/ready', async (_req, res) => {
    const health = await healthManager.checkHealth();
    const isReady = health.status !== 'unhealthy';
    res.status(isReady ? HTTP_STATUS.OK : 503).json({ ready: isReady });
  });

  return healthManager;
}
