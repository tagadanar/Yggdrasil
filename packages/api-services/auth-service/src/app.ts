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
import { setupHealthChecks } from './health/setup';

export const createApp = (): express.Application => {
  const app = express();

  // Security middleware with enhanced configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for API service
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // CORS configuration with enhanced security
  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);

      // Get allowed origins from environment or use defaults for development
      const allowedOrigins = process.env['CORS_ALLOWED_ORIGINS']
        ? process.env['CORS_ALLOWED_ORIGINS'].split(',').map(url => url.trim())
        : ['http://localhost:3000', 'https://localhost:3000'];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      }
    },
    credentials: true,
    optionsSuccessStatus: 200, // Support legacy browsers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400, // 24 hours
  };

  app.use(cors(corsOptions));

  // Rate limiting - More permissive for test environments
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env['NODE_ENV'] === 'test' ? 10000 : 100, // Higher limit for tests
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for test environments
    skip: _req => process.env['NODE_ENV'] === 'test',
  });
  app.use(limiter);

  // Body parsing middleware with reasonable limits for auth service
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logging
  app.use(requestLogger);

  // Setup comprehensive health checks
  setupHealthChecks(app);

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
