// packages/api-services/user-service/src/app.ts
// Express application setup for User Service

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { userRoutes } from './routes/userRoutes';
import { userServiceOpenAPI } from './openapi';
import { setupSwagger } from '@yggdrasil/shared-utilities';
import {
  performanceMonitor,
  requestSizeMonitor,
  getDetailedHealthCheck,
} from './middleware/monitoring';

export const createApp = (): express.Application => {
  const app = express();

  // Performance monitoring (before other middleware)
  app.use(performanceMonitor);
  app.use(requestSizeMonitor);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
      credentials: true,
    }),
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint with optional detailed metrics
  app.get('/health', async (req, res) => {
    const detailed = req.query['detailed'] === 'true';

    if (detailed) {
      try {
        const healthData = await getDetailedHealthCheck();
        res.status(200).json(healthData);
      } catch (error) {
        res.status(503).json({
          status: 'error',
          service: 'user-service',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    } else {
      res.status(200).json({
        status: 'ok',
        service: 'user-service',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // TDD GREEN: API routes demanded by functional tests
  app.use('/api/users', userRoutes);

  // Setup Swagger documentation (skip in test environment)
  if (process.env['NODE_ENV'] !== 'test') {
    setupSwagger(app, userServiceOpenAPI);
  }

  return app;
};
