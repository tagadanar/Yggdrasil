// Path: packages/api-gateway/src/config/gateway.ts
import { GatewayConfig } from '../types/gateway';
import { servicesConfig } from './services';

export const gatewayConfig: GatewayConfig = {
  port: parseInt(process.env.PORT || '8080', 10),
  host: process.env.HOST || '0.0.0.0',
  services: servicesConfig,
  loadBalancer: {
    strategy: 'round_robin',
    healthCheckInterval: 30000,
    unhealthyThreshold: 3,
    healthyThreshold: 2
  },
  proxy: {
    changeOrigin: true,
    preserveHeaderKeyCase: true,
    followRedirects: false,
    timeout: 30000,
    retries: 3,
    logLevel: 'info'
  },
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL || '300000', 10), // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    keyGenerator: (req) => `${req.method}:${req.url}:${req.get('user-agent') || ''}`,
    shouldCache: (req, res) => req.method === 'GET' && res.statusCode === 200
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    endpoint: '/metrics',
    collectDefaultMetrics: true,
    labels: ['service', 'method', 'status_code']
  },
  security: {
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    helmet: {
      enabled: true,
      options: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
          }
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      }
    },
    rateLimiting: {
      global: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000,
        message: 'Too many requests from this IP',
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      }
    },
    authentication: {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      tokenHeader: 'authorization',
      refreshTokenHeader: 'x-refresh-token',
      cookieName: 'auth-token'
    }
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    format: 'combined',
    transports: ['console', 'file'],
    requestLogging: true,
    errorLogging: true,
    performanceLogging: true
  },
  serviceDiscovery: {
    enabled: process.env.SERVICE_DISCOVERY_ENABLED === 'true',
    provider: 'static',
    refreshInterval: 30000,
    healthCheckPath: '/health',
    registrationTtl: 60000
  },
  webSocket: {
    enabled: true,
    path: '/socket.io',
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    },
    authentication: false,
    heartbeatInterval: 25000
  }
};