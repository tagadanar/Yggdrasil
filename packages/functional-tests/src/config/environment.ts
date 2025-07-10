/**
 * Environment configuration for functional tests
 * Centralizes all service URLs and test environment settings
 */

export interface TestEnvironment {
  services: {
    auth: string;
    user: string;
    course: string;
    planning: string;
    news: string;
    statistics: string;
    notification: string;
    frontend: string;
    gateway?: string;
  };
  database: {
    uri: string;
    testDbName: string;
    cleanup: boolean;
  };
  authentication: {
    jwtSecret: string;
    testTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  timeouts: {
    api: number;
    database: number;
    browser: number;
  };
  retry: {
    attempts: number;
    delay: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableFile: boolean;
  };
}

export const testEnvironment: TestEnvironment = {
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3101',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3102',
    course: process.env.COURSE_SERVICE_URL || 'http://localhost:3103',
    planning: process.env.PLANNING_SERVICE_URL || 'http://localhost:3104',
    news: process.env.NEWS_SERVICE_URL || 'http://localhost:3105',
    statistics: process.env.STATISTICS_SERVICE_URL || 'http://localhost:3106',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3107',
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
    gateway: process.env.GATEWAY_URL || undefined,
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-test?authSource=admin',
    testDbName: process.env.TEST_DB_NAME || 'yggdrasil-test',
    cleanup: process.env.TEST_DB_CLEANUP !== 'false',
  },
  authentication: {
    jwtSecret: process.env.JWT_SECRET || 'yggdrasil-test-secret-key',
    testTokenExpiry: process.env.TEST_TOKEN_EXPIRY || '24h',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  },
  timeouts: {
    api: parseInt(process.env.API_TIMEOUT || '10000'),
    database: parseInt(process.env.DB_TIMEOUT || '5000'),
    browser: parseInt(process.env.BROWSER_TIMEOUT || '30000'),
  },
  retry: {
    attempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    delay: parseInt(process.env.RETRY_DELAY || '1000'),
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
  },
};

export const isTestEnvironment = process.env.NODE_ENV === 'test';
export const isCI = process.env.CI === 'true';
export const isDebugMode = process.env.DEBUG === 'true';

/**
 * Validates that all required environment variables are set
 */
export function validateEnvironment(): void {
  const requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

/**
 * Gets the base URL for a service
 */
export function getServiceUrl(service: keyof TestEnvironment['services']): string {
  const url = testEnvironment.services[service];
  if (!url) {
    throw new Error(`Service URL not configured for: ${service}`);
  }
  return url;
}

export default testEnvironment;