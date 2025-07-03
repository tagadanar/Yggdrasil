// Path: packages/api-gateway/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import { gatewayConfig } from './config/gateway';
import { GatewayService } from './services/GatewayService';
import { 
  createAuthMiddleware, 
  createOptionalAuthMiddleware, 
  createRoleMiddleware,
  isPathBypassed,
  AuthenticatedRequest 
} from './middleware/authMiddleware';

const app = express();
const gateway = new GatewayService(gatewayConfig);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1000,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security middleware
if (gatewayConfig.security.helmet.enabled) {
  app.use(helmet(gatewayConfig.security.helmet.options));
}

// CORS middleware
app.use(cors({
  origin: gatewayConfig.security.cors.origins,
  credentials: gatewayConfig.security.cors.credentials,
  methods: gatewayConfig.security.cors.methods,
  allowedHeaders: gatewayConfig.security.cors.headers
}));

// Request logging middleware
if (gatewayConfig.logging.requestLogging) {
  app.use(morgan('combined'));
}

// Request ID middleware
app.use((req: AuthenticatedRequest, res, next) => {
  req.requestId = uuidv4();
  req.startTime = new Date();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: gatewayConfig.security.rateLimiting.global.windowMs,
  max: gatewayConfig.security.rateLimiting.global.maxRequests,
  message: {
    success: false,
    error: gatewayConfig.security.rateLimiting.global.message,
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: gatewayConfig.security.rateLimiting.global.skipSuccessfulRequests,
  skipFailedRequests: gatewayConfig.security.rateLimiting.global.skipFailedRequests
});

app.use(globalLimiter);

// Circuit breaker middleware
app.use((req: AuthenticatedRequest, res, next) => {
  const serviceName = getServiceNameFromPath(req.path);
  
  if (serviceName && gateway.isCircuitBreakerOpen(serviceName)) {
    res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable',
      code: 'CIRCUIT_BREAKER_OPEN',
      service: serviceName,
      requestId: req.requestId
    });
    return;
  }
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const stats = gateway.getGatewayStats();
    const healthChecks = await gateway.performHealthChecks();
    
    const healthyServices = healthChecks.filter(h => h.status === 'healthy').length;
    const totalServices = healthChecks.length;
    const overallHealth = healthyServices === totalServices ? 'healthy' : 
                         healthyServices > 0 ? 'degraded' : 'unhealthy';

    res.status(overallHealth === 'unhealthy' ? 503 : 200).json({
      status: overallHealth,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        total: totalServices,
        healthy: healthyServices,
        unhealthy: totalServices - healthyServices
      },
      stats: {
        totalRequests: stats.totalRequests,
        memoryUsage: stats.memoryUsage,
        responseTime: stats.averageResponseTime
      },
      checks: healthChecks
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint
if (gatewayConfig.metrics.enabled) {
  app.get('/metrics', (req, res) => {
    const stats = gateway.getGatewayStats();
    res.json({
      timestamp: new Date().toISOString(),
      gateway: stats,
      services: gateway.getServices().map(service => ({
        name: service.name,
        metrics: gateway.getServiceMetrics(service.name),
        circuitBreaker: gateway.getCircuitBreakerStats(service.name)
      }))
    });
  });
}

// Gateway management endpoints
app.get('/gateway/services', (req, res) => {
  const services = gateway.getServices();
  res.json({
    success: true,
    data: services,
    count: services.length
  });
});

app.get('/gateway/services/:serviceName', (req, res) => {
  const { serviceName } = req.params;
  const service = gateway.getService(serviceName);
  
  if (!service) {
    res.status(404).json({
      success: false,
      error: 'Service not found'
    });
    return;
  }

  const metrics = gateway.getServiceMetrics(serviceName);
  const circuitBreaker = gateway.getCircuitBreakerStats(serviceName);

  res.json({
    success: true,
    data: {
      service,
      metrics,
      circuitBreaker
    }
  });
});

app.post('/gateway/services/:serviceName/circuit-breaker/reset', (req, res) => {
  const { serviceName } = req.params;
  const success = gateway.resetCircuitBreaker(serviceName);
  
  res.json({
    success,
    message: success ? 'Circuit breaker reset' : 'Service not found'
  });
});

// Setup service proxies
gatewayConfig.services.forEach(service => {
  if (!service.isActive) return;

  const authMiddleware = createAuthMiddleware(gatewayConfig.security);
  const optionalAuthMiddleware = createOptionalAuthMiddleware(gatewayConfig.security);
  
  // Service-specific rate limiting
  let serviceRateLimit;
  if (service.rateLimit) {
    serviceRateLimit = rateLimit({
      windowMs: service.rateLimit.windowMs,
      max: service.rateLimit.maxRequests,
      message: {
        success: false,
        error: service.rateLimit.message || 'Service rate limit exceeded',
        code: 'SERVICE_RATE_LIMIT_EXCEEDED',
        service: service.name
      }
    });
  }

  // Create middleware chain
  const middlewares = [];
  
  // Add service rate limiting if configured
  if (serviceRateLimit) {
    middlewares.push(serviceRateLimit);
  }

  // Add authentication middleware
  middlewares.push((req: AuthenticatedRequest, res: any, next: any) => {
    // Check if path should bypass authentication
    if (service.authentication?.bypassPaths && 
        isPathBypassed(req.path, service.authentication.bypassPaths)) {
      return optionalAuthMiddleware(req, res, next);
    }

    // Check if authentication is required for this service
    if (service.authentication?.required) {
      return authMiddleware(req, res, next);
    }

    // Optional authentication
    return optionalAuthMiddleware(req, res, next);
  });

  // Add role-based access control
  if (service.authentication?.roles) {
    middlewares.push((req: AuthenticatedRequest, res: any, next: any) => {
      // Skip role check for bypass paths or if auth not required
      if ((service.authentication?.bypassPaths && 
           isPathBypassed(req.path, service.authentication.bypassPaths)) ||
          !service.authentication?.required) {
        return next();
      }

      return createRoleMiddleware(service.authentication.roles!)(req, res, next);
    });
  }

  // Add proxy middleware
  middlewares.push(gateway.createProxyMiddleware(service.name));

  // Register the route with all middlewares
  app.use(service.path, ...middlewares);

  console.log(`✓ Registered proxy for ${service.name} at ${service.path} -> ${service.url}`);
});

// Error handling middleware
app.use((error: any, req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  console.error('Gateway error:', error);
  
  if (!res.headersSent) {
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Internal gateway error',
      code: error.code || 'GATEWAY_ERROR',
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// 404 handler
app.use('*', (req: AuthenticatedRequest, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// Helper function to extract service name from path
function getServiceNameFromPath(path: string): string | null {
  for (const service of gatewayConfig.services) {
    if (path.startsWith(service.path)) {
      return service.name;
    }
  }
  return null;
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(gatewayConfig.port, gatewayConfig.host, () => {
    console.log(`🚀 API Gateway running on ${gatewayConfig.host}:${gatewayConfig.port}`);
    console.log(`📊 Health check: http://${gatewayConfig.host}:${gatewayConfig.port}/health`);
    console.log(`📈 Metrics: http://${gatewayConfig.host}:${gatewayConfig.port}/metrics`);
    console.log(`🔧 Gateway management: http://${gatewayConfig.host}:${gatewayConfig.port}/gateway/services`);
    console.log(`📝 Registered ${gatewayConfig.services.filter(s => s.isActive).length} active services`);
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

export default app;