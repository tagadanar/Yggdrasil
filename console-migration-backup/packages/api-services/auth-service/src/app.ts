// packages/api-services/auth-service/src/app.ts
// Express application setup

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRoutes } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { setupSwagger } from '@yggdrasil/shared-utilities';
import { createAuthServiceOpenAPI } from './openapi';

export const createApp = (): express.Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(cors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
    credentials: true,
  }));

  // Rate limiting - More permissive for test environments
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env['NODE_ENV'] === 'test' ? 10000 : 100, // Higher limit for tests
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for test environments
    skip: (_req) => process.env['NODE_ENV'] === 'test',
  });
  app.use(limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    });
  });

  // Setup OpenAPI documentation
  if (process.env['NODE_ENV'] !== 'test') {
    const openApiDoc = createAuthServiceOpenAPI();
    setupSwagger(app, openApiDoc);
  }

  // API routes
  app.use('/api/auth', authRoutes);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};