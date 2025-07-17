// packages/api-services/course-service/src/app.ts
// Express application setup for course service

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDatabase } from '@yggdrasil/database-schemas';
import { ResponseHelper } from '@yggdrasil/shared-utilities';
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
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'http://localhost:3000']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined'));
}

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

// Connect to MongoDB
connectDatabase()
  .then(() => {
    console.log('📚 Course Service: Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('❌ Course Service: Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json(
    ResponseHelper.success({
      service: 'course-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    }, 'Course service is healthy')
  );
});

// API routes
app.use('/api/courses', courseRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json(
    ResponseHelper.success({
      service: 'course-service',
      version: process.env.npm_package_version || '1.0.0',
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
app.use((error: any, req: Request, res: Response, next: any) => {
  console.error('❌ Course Service Error:', error);
  
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
      process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    )
  );
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

const gracefulShutdown = (signal: string) => {
  console.log(`📚 Course Service: Received ${signal}, shutting down gracefully...`);
  
  // Close database connection
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Course Service: Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Course Service: Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;