// packages/shared-utilities/src/config/env-validator.ts
// Environment validation system to prevent hardcoded secrets and ensure proper configuration

import { z } from 'zod';
import { LoggerFactory } from '../logging/logger';

const logger = LoggerFactory.createLogger('env-validator');

const envSchema = z.object({
  // Required in all environments
  NODE_ENV: z.enum(['development', 'test', 'production']),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  // Optional with defaults
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Database
  MONGODB_URI: z.string().url().or(z.string().startsWith('mongodb://')),

  // Phase 4.1: Service-specific database URIs (optional, defaults to MONGODB_URI)
  AUTH_DB_URI: z.string().optional(),
  USER_DB_URI: z.string().optional(),
  COURSE_DB_URI: z.string().optional(),
  ENROLLMENT_DB_URI: z.string().optional(),
  NEWS_DB_URI: z.string().optional(),
  PLANNING_DB_URI: z.string().optional(),
  STATS_DB_URI: z.string().optional(),

  // MongoDB Authentication (optional for development without auth)
  MONGO_ROOT_USERNAME: z.string().optional(),
  MONGO_ROOT_PASSWORD: z.string().optional(),
  MONGO_APP_USERNAME: z.string().optional(),
  MONGO_APP_PASSWORD: z.string().optional(),
  MONGO_READONLY_USERNAME: z.string().optional(),
  MONGO_READONLY_PASSWORD: z.string().optional(),
  MONGO_DATABASE: z.string().optional(),

  // Service ports (with defaults for development)
  AUTH_SERVICE_PORT: z.string().default('3001'),
  USER_SERVICE_PORT: z.string().default('3002'),
  NEWS_SERVICE_PORT: z.string().default('3003'),
  COURSE_SERVICE_PORT: z.string().default('3004'),
  PLANNING_SERVICE_PORT: z.string().default('3005'),
  STATISTICS_SERVICE_PORT: z.string().default('3006'),

  // Frontend
  NEXT_PUBLIC_API_URL: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Test defaults - secure defaults for testing environment
const TEST_DEFAULTS = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret-32-characters-long-for-security',
  JWT_REFRESH_SECRET: 'test-refresh-secret-32-characters-long-for-security',
  MONGODB_URI: 'mongodb://localhost:27018/yggdrasil-dev',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  LOG_LEVEL: 'info',
  AUTH_SERVICE_PORT: '3001',
  USER_SERVICE_PORT: '3002',
  NEWS_SERVICE_PORT: '3003',
  COURSE_SERVICE_PORT: '3004',
  PLANNING_SERVICE_PORT: '3005',
  STATISTICS_SERVICE_PORT: '3006',
} as const;

export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // In test mode, use defaults instead of failing
      if (process.env['NODE_ENV'] === 'test' || process.env['NODE_ENV'] === undefined) {
        logger.warn('⚠️ Using test defaults for missing environment variables');
        
        // Merge test defaults with existing env vars
        const testEnv = {
          ...TEST_DEFAULTS,
          ...process.env,
          NODE_ENV: 'test'
        };
        
        try {
          return envSchema.parse(testEnv);
        } catch (testError) {
          logger.error('❌ Even with test defaults, validation failed');
          if (testError instanceof z.ZodError) {
            testError.errors.forEach(err => {
              logger.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
          }
          throw testError;
        }
      }
      
      // For non-test environments, show the error and exit
      logger.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      logger.error('\n📋 Required environment variables:');
      logger.error('  - JWT_SECRET (min 32 chars)');
      logger.error('  - JWT_REFRESH_SECRET (min 32 chars)');
      logger.error('  - MONGODB_URI');
      logger.error('  - NODE_ENV (development|test|production)\n');

      logger.error('💡 To generate secure development secrets, run:');
      logger.error('   npm run security:generate-secrets\n');

      // Only exit in production environments, throw in others for better error handling
      if (process.env['NODE_ENV'] === 'production') {
        process.exit(1);
      } else {
        throw new Error('Environment validation failed - see logs above');
      }
    }
    throw error;
  }
}

// Lazy config loading for test environments
let _config: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!_config) {
    _config = validateEnv();
  }
  return _config;
}

export function reloadConfig(): EnvConfig {
  _config = null;
  return getConfig();
}

// Export validated config (with lazy loading)
export const config = new Proxy({} as EnvConfig, {
  get(_target, prop) {
    const cfg = getConfig();
    return cfg[prop as keyof EnvConfig];
  },
});
