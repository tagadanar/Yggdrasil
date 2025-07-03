// Path: packages/api-gateway/src/config/services.ts
import { ServiceConfig } from '../types/gateway';

export const servicesConfig: ServiceConfig[] = [
  {
    name: 'auth-service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    path: '/api/auth',
    timeout: 10000,
    retries: 3,
    healthCheck: '/health',
    version: '1.0.0',
    isActive: true,
    weight: 1,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many authentication requests'
    },
    authentication: {
      required: false, // Auth service itself doesn't require auth
      bypassPaths: ['/api/auth/login', '/api/auth/register', '/api/auth/refresh']
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 60000
    }
  },
  {
    name: 'user-service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    path: '/api/users',
    timeout: 8000,
    retries: 2,
    healthCheck: '/health',
    version: '1.0.0',
    isActive: true,
    weight: 1,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 200,
      message: 'Too many user requests'
    },
    authentication: {
      required: true,
      roles: ['admin', 'teacher', 'student'],
      bypassPaths: []
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 3,
      resetTimeout: 20000,
      monitoringPeriod: 60000
    }
  },
  {
    name: 'course-service',
    url: process.env.COURSE_SERVICE_URL || 'http://localhost:3003',
    path: '/api/courses',
    timeout: 12000,
    retries: 2,
    healthCheck: '/health',
    version: '1.0.0',
    isActive: true,
    weight: 2,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 300,
      message: 'Too many course requests'
    },
    authentication: {
      required: true,
      roles: ['admin', 'teacher', 'student'],
      bypassPaths: ['/api/courses/public']
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 4,
      resetTimeout: 25000,
      monitoringPeriod: 60000
    }
  },
  {
    name: 'planning-service',
    url: process.env.PLANNING_SERVICE_URL || 'http://localhost:3004',
    path: '/api/planning',
    timeout: 10000,
    retries: 2,
    healthCheck: '/health',
    version: '1.0.0',
    isActive: true,
    weight: 1,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 150,
      message: 'Too many planning requests'
    },
    authentication: {
      required: true,
      roles: ['admin', 'teacher', 'student'],
      bypassPaths: []
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 3,
      resetTimeout: 20000,
      monitoringPeriod: 60000
    }
  },
  {
    name: 'news-service',
    url: process.env.NEWS_SERVICE_URL || 'http://localhost:3005',
    path: '/api/news',
    timeout: 8000,
    retries: 2,
    healthCheck: '/health',
    version: '1.0.0',
    isActive: true,
    weight: 1,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 250,
      message: 'Too many news requests'
    },
    authentication: {
      required: false, // Some news endpoints are public
      roles: ['admin', 'teacher', 'student'],
      bypassPaths: ['/api/news/public', '/api/news/recent']
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 3,
      resetTimeout: 20000,
      monitoringPeriod: 60000
    }
  },
  {
    name: 'statistics-service',
    url: process.env.STATISTICS_SERVICE_URL || 'http://localhost:3006',
    path: '/api/statistics',
    timeout: 15000,
    retries: 2,
    healthCheck: '/health',
    version: '1.0.0',
    isActive: true,
    weight: 1,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
      message: 'Too many statistics requests'
    },
    authentication: {
      required: true,
      roles: ['admin', 'teacher'],
      bypassPaths: []
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 3,
      resetTimeout: 30000,
      monitoringPeriod: 60000
    }
  },
  {
    name: 'notification-service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    path: '/api/notifications',
    timeout: 10000,
    retries: 3,
    healthCheck: '/health',
    version: '1.0.0',
    isActive: true,
    weight: 1,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 500,
      message: 'Too many notification requests'
    },
    authentication: {
      required: true,
      roles: ['admin', 'teacher', 'student'],
      bypassPaths: []
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 25000,
      monitoringPeriod: 60000
    }
  }
];