// packages/api-services/statistics-service/src/app.ts
// Express application setup for statistics service

// Increase max listeners to prevent EventEmitter memory leak warnings
// Statistics service needs listeners for: shutdown, database, testing framework
process.setMaxListeners(20);

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from '@yggdrasil/database-schemas';
import { ResponseHelper, statsLogger as logger, initializeJWT } from '@yggdrasil/shared-utilities';
import statisticsRoutes from './routes/statisticsRoutes';

// Load environment variables
dotenv.config();

// Initialize JWT system for token validation
initializeJWT();
logger.info('🔑 JWT system initialized for statistics service');

const app = express();

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting (more strict for analytics endpoints)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env['NODE_ENV'] === 'production' 
    ? [process.env['FRONTEND_URL'] || 'http://localhost:3000']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (only in development)
if (process.env['NODE_ENV'] !== 'production') {
  app.use(morgan('combined'));
}

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

// Configure test mode database settings before connecting
logger.info(`🔧 STATISTICS SERVICE: Starting database initialization...`);
logger.debug(`🔧 STATISTICS SERVICE: NODE_ENV: ${process.env['NODE_ENV']}`);

// In test mode, use worker-specific database configuration (same as auth-service)
if (process.env['NODE_ENV'] === 'test') {
  const receivedWorkerId = process.env['WORKER_ID'];
  const workerId = receivedWorkerId || 
                  process.env['PLAYWRIGHT_WORKER_ID'] || 
                  process.env['TEST_WORKER_INDEX'] || 
                  '0';
  
  const workerPrefix = `w${workerId}`;
  const workerDatabase = process.env['DB_NAME'] || `yggdrasil_test_${workerPrefix}`;
  
  logger.debug(`🔧 STATISTICS SERVICE: Test mode detected, Worker ID: ${workerId}`);
  
  if (!process.env['DB_NAME']) {
    process.env['DB_NAME'] = workerDatabase;
    logger.debug(`🔧 STATISTICS SERVICE: Set DB_NAME: ${process.env['DB_NAME']}`);
  }
  if (!process.env['DB_COLLECTION_PREFIX']) {
    process.env['DB_COLLECTION_PREFIX'] = `${workerPrefix}_`;
    logger.debug(`🔧 STATISTICS SERVICE: Set DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`);
  }
}

// Connect to MongoDB
connectDatabase()
  .then(() => {
    logger.info('📊 Statistics Service: Connected to MongoDB successfully');
  })
  .catch((error) => {
    logger.error('❌ Statistics Service: Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json(
    ResponseHelper.success({
      service: 'statistics-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }, 'Statistics service is healthy')
  );
});

// API routes
app.use('/api/statistics', statisticsRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json(
    ResponseHelper.success({
      service: 'statistics-service',
      version: process.env['npm_package_version'] || '1.0.0',
      description: 'Statistics and analytics service for the Yggdrasil educational platform',
      endpoints: {
        health: '/health',
        statistics: '/api/statistics',
        dashboards: {
          student: '/api/statistics/dashboard/student/:userId',
          teacher: '/api/statistics/dashboard/teacher/:userId',
          admin: '/api/statistics/dashboard/admin'
        },
        progress: {
          student: '/api/statistics/progress/student/:userId',
          course: '/api/statistics/progress/course/:courseId'
        },
        analytics: {
          course: '/api/statistics/analytics/course/:courseId',
          platform: '/api/statistics/analytics/platform'
        }
      }
    }, 'Yggdrasil Statistics Service')
  );
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json(
    ResponseHelper.notFound(`Route ${req.originalUrl}`)
  );
});

// Global error handler
app.use((error: any, _req: Request, res: Response, _next: any) => {
  logger.error('❌ Statistics Service Error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    res.status(400).json(
      ResponseHelper.badRequest('Validation error: ' + error.message)
    );
    return;
  }
  
  if (error.name === 'CastError') {
    res.status(400).json(
      ResponseHelper.badRequest('Invalid ID format')
    );
    return;
  }
  
  if (error.code === 11000) {
    res.status(409).json(
      ResponseHelper.conflict('Duplicate entry')
    );
    return;
  }

  if (error.name === 'UnauthorizedError' || error.status === 401) {
    res.status(401).json(
      ResponseHelper.unauthorized('Invalid or expired token')
    );
    return;
  }
  
  if (error.status === 403) {
    res.status(403).json(
      ResponseHelper.forbidden('Access denied')
    );
    return;
  }
  
  // Default server error
  res.status(500).json(
    ResponseHelper.error(
      process.env['NODE_ENV'] === 'development' ? error.message : 'Internal server error'
    )
  );
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

const gracefulShutdown = (signal: string) => {
  logger.debug(`📊 Statistics Service: Received ${signal}, shutting down gracefully...`);
  
  // Close database connection
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Statistics Service: Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Statistics Service: Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;