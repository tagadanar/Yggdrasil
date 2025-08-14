import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import newsRoutes from './routes/newsRoutes';
import { connectDatabase } from '@yggdrasil/database-schemas';
import { logger, setupSwagger } from '@yggdrasil/shared-utilities';
import { createNewsServiceOpenAPI } from './openapi';

export const createApp = async (skipDbConnection = false) => {
  const app = express();

  // Rate limiting (production only)
  if (process.env['NODE_ENV'] === 'production') {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

    app.use(limiter);

    // Stricter limits for write operations
    const writeOperationsLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 write operations per windowMs
      message: {
        success: false,
        error: 'Too many write operations, please try again later.',
      },
      skip: req => req.method === 'GET', // Only apply to non-GET requests
    });

    app.use('/api/news/articles', writeOperationsLimiter);
    logger.info('Rate limiting configured for production');
  }

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  // Connect to database (skip for tests that manage their own connection)
  if (!skipDbConnection) {
    logger.info('🔧 NEWS SERVICE: Starting database initialization...');
    logger.debug(`🔧 NEWS SERVICE: NODE_ENV: ${process.env['NODE_ENV']}`);
    logger.debug(`🔧 NEWS SERVICE: Received DB_NAME: ${process.env['DB_NAME']}`);
    logger.debug(
      `🔧 NEWS SERVICE: Received DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`,
    );
    logger.debug(
      `🔧 NEWS SERVICE: Received PLAYWRIGHT_WORKER_ID: ${process.env['PLAYWRIGHT_WORKER_ID']}`,
    );
    logger.debug(
      `🔧 NEWS SERVICE: Received TEST_WORKER_INDEX: ${process.env['TEST_WORKER_INDEX']}`,
    );
    logger.debug(`🔧 NEWS SERVICE: Received WORKER_ID: ${process.env['WORKER_ID']}`);

    // In test mode, use worker-specific database configuration (same as auth-service)
    if (process.env['NODE_ENV'] === 'test') {
      // Use the worker ID that's already been set by the service manager
      const receivedWorkerId = process.env['WORKER_ID'];
      const workerId =
        receivedWorkerId ||
        process.env['PLAYWRIGHT_WORKER_ID'] ||
        process.env['TEST_WORKER_INDEX'] ||
        '0'; // Default to worker 0 for single-worker tests

      // Set worker-specific database name only if not already set
      const workerPrefix = `w${workerId}`;
      const workerDatabase = process.env['DB_NAME'] || `yggdrasil_test_${workerPrefix}`;

      logger.debug('🔧 NEWS SERVICE: Test mode detected');
      logger.debug(`🔧 NEWS SERVICE: Using Worker ID: ${workerId}`);
      logger.debug(`🔧 NEWS SERVICE: Worker prefix: ${workerPrefix}`);
      logger.debug(`🔧 NEWS SERVICE: Worker database: ${workerDatabase}`);

      // Only set environment variables if they're not already set by service manager
      if (!process.env['DB_NAME']) {
        process.env['DB_NAME'] = workerDatabase;
        logger.debug(`🔧 NEWS SERVICE: Set DB_NAME: ${process.env['DB_NAME']}`);
      }
      if (!process.env['DB_COLLECTION_PREFIX']) {
        process.env['DB_COLLECTION_PREFIX'] = `${workerPrefix}_`;
        logger.debug(
          `🔧 NEWS SERVICE: Set DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`,
        );
      }
    }

    logger.debug('🔧 NEWS SERVICE: Final environment before database connection:');
    logger.debug(`🔧 NEWS SERVICE: NODE_ENV: ${process.env['NODE_ENV']}`);
    logger.debug(`🔧 NEWS SERVICE: DB_NAME: ${process.env['DB_NAME']}`);
    logger.debug(`🔧 NEWS SERVICE: DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`);
    logger.debug(`🔧 NEWS SERVICE: MONGODB_URI: ${process.env['MONGODB_URI']}`);

    await connectDatabase();
  }

  // OpenAPI documentation (skip in test environment)
  if (process.env['NODE_ENV'] !== 'test') {
    const openApiDoc = createNewsServiceOpenAPI();
    setupSwagger(app, openApiDoc);
    logger.info('News service OpenAPI documentation available at /api-docs');
  }

  // Routes
  logger.info('News service routes mounted successfully');
  app.use('/api/news', newsRoutes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'news-service' });
  });

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  });

  return app;
};
