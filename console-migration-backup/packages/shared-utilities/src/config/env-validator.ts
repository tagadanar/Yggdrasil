// packages/shared-utilities/src/config/env-validator.ts
// Environment validation system to prevent hardcoded secrets and ensure proper configuration

import { z } from 'zod';
import { logger } from '@yggdrasil/shared-utilities';

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

export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      logger.error('\n📋 Required environment variables:');
      logger.error('  - JWT_SECRET (min 32 chars)');
      logger.error('  - JWT_REFRESH_SECRET (min 32 chars)');
      logger.error('  - MONGODB_URI');
      logger.error('  - NODE_ENV (development|test|production)\n');

      if (process.env['NODE_ENV'] !== 'test') {
        logger.error('💡 To generate secure development secrets, run:');
        logger.error('   npm run security:generate-secrets\n');
      }

      process.exit(1);
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
