// packages/api-services/course-service/src/app.ts
// Express application setup for course service

// Increase max listeners to prevent EventEmitter memory leak warnings
// Course service needs listeners for: shutdown, database, testing framework
process.setMaxListeners(20);

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDatabase } from '@yggdrasil/database-schemas';
import { ResponseHelper, courseLogger as logger } from '@yggdrasil/shared-utilities';
import courseRoutes from './routes/courseRoutes';

// Load environment variables
dotenv.config();

const app = express();

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env['NODE_ENV'] === 'production' 
    ? [process.env['FRONTEND_URL'] || 'http://localhost:3000']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'cache-control', 'pragma', 'expires']
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

// Database connection function - exported for use in index.ts
export const initializeDatabase = async (): Promise<void> => {
  try {
    logger.info(`🔧 COURSE SERVICE: Starting database initialization...`);
    logger.debug(`🔧 COURSE SERVICE: NODE_ENV: ${process.env['NODE_ENV']}`);
    logger.debug(`🔧 COURSE SERVICE: Received DB_NAME: ${process.env['DB_NAME']}`);
    logger.debug(`🔧 COURSE SERVICE: Received DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`);
    logger.debug(`🔧 COURSE SERVICE: Received PLAYWRIGHT_WORKER_ID: ${process.env['PLAYWRIGHT_WORKER_ID']}`);
    logger.debug(`🔧 COURSE SERVICE: Received TEST_WORKER_INDEX: ${process.env['TEST_WORKER_INDEX']}`);
    logger.debug(`🔧 COURSE SERVICE: Received WORKER_ID: ${process.env['WORKER_ID']}`);
    
    // In test mode, use worker-specific database configuration (same as auth-service)
    if (process.env['NODE_ENV'] === 'test') {
      // Use the worker ID that's already been set by the service manager
      const receivedWorkerId = process.env['WORKER_ID'];
      const workerId = receivedWorkerId || 
                      process.env['PLAYWRIGHT_WORKER_ID'] || 
                      process.env['TEST_WORKER_INDEX'] || 
                      '0'; // Default to worker 0 for single-worker tests
      
      // Set worker-specific database name only if not already set
      const workerPrefix = `w${workerId}`;
      const workerDatabase = process.env['DB_NAME'] || `yggdrasil_test_${workerPrefix}`;
      
      logger.debug(`🔧 COURSE SERVICE: Test mode detected`);
      logger.debug(`🔧 COURSE SERVICE: Using Worker ID: ${workerId}`);
      logger.debug(`🔧 COURSE SERVICE: Worker prefix: ${workerPrefix}`);
      logger.debug(`🔧 COURSE SERVICE: Worker database: ${workerDatabase}`);
      
      // Only set environment variables if they're not already set by service manager
      if (!process.env['DB_NAME']) {
        process.env['DB_NAME'] = workerDatabase;
        logger.debug(`🔧 COURSE SERVICE: Set DB_NAME: ${process.env['DB_NAME']}`);
      }
      if (!process.env['DB_COLLECTION_PREFIX']) {
        process.env['DB_COLLECTION_PREFIX'] = `${workerPrefix}_`;
        logger.debug(`🔧 COURSE SERVICE: Set DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`);
      }
    }
    
    logger.debug(`🔧 COURSE SERVICE: Final environment before database connection:`);
    logger.debug(`🔧 COURSE SERVICE: NODE_ENV: ${process.env['NODE_ENV']}`);
    logger.debug(`🔧 COURSE SERVICE: DB_NAME: ${process.env['DB_NAME']}`);
    logger.debug(`🔧 COURSE SERVICE: DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`);
    logger.debug(`🔧 COURSE SERVICE: MONGODB_URI: ${process.env['MONGODB_URI']}`);
    
    await connectDatabase();
    logger.info('✅ Course Service: Connected to MongoDB successfully');
  } catch (error) {
    logger.error('❌ Course Service: Failed to connect to MongoDB:', error);
    throw error; // Let the caller handle the error
  }
};

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json(
    ResponseHelper.success({
      service: 'course-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0'
    }, 'Course service is healthy')
  );
});

// API routes
app.use('/api/courses', courseRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json(
    ResponseHelper.success({
      service: 'course-service',
      version: process.env['npm_package_version'] || '1.0.0',
      description: 'Course management service for the Yggdrasil educational platform',
      endpoints: {
        health: '/health',
        courses: '/api/courses',
        docs: '/api/courses/docs'
      }
    }, 'Yggdrasil Course Service')
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
  logger.error('❌ Course Service Error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    res.status(400).json(
      ResponseHelper.badRequest('Validation error')
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
  logger.debug(`📚 Course Service: Received ${signal}, shutting down gracefully...`);
  
  // Close database connection
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Course Service: Uncaught Exception:', error);
  logger.error('❌ Course Service: Exception stack:', error.stack);
  logger.error('❌ Course Service: Exiting due to uncaught exception');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Course Service: Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('❌ Course Service: Rejection details:', {
    reason: reason,
    promise: promise.toString()
  });
  logger.error('❌ Course Service: Exiting due to unhandled promise rejection');
  process.exit(1);
});

export default app;