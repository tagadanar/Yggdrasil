import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import planningRoutes from './routes/planningRoutes';
import promotionRoutes from './routes/promotionRoutes';
import progressRoutes from './routes/progressRoutes';
import { systemRoutes } from './routes/systemRoutes';
import { connectDatabase } from '@yggdrasil/database-schemas';
import { logger } from '@yggdrasil/shared-utilities';

export const createApp = async (skipDbConnection = false) => {
  const app = express();

  // Middleware
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
  
  app.use(express.json());
  app.use(morgan('dev'));

  // Connect to database (skip for tests that manage their own connection)
  if (!skipDbConnection) {
    logger.info(`🔧 PLANNING SERVICE: Starting database initialization...`);
    logger.debug(`🔧 PLANNING SERVICE: NODE_ENV: ${process.env['NODE_ENV']}`);
    
    // In test mode, use worker-specific database configuration (same as auth-service)
    if (process.env['NODE_ENV'] === 'test') {
      const receivedWorkerId = process.env['WORKER_ID'];
      const workerId = receivedWorkerId || 
                      process.env['PLAYWRIGHT_WORKER_ID'] || 
                      process.env['TEST_WORKER_INDEX'] || 
                      '0';
      
      const workerPrefix = `w${workerId}`;
      const workerDatabase = process.env['DB_NAME'] || `yggdrasil_test_${workerPrefix}`;
      
      logger.debug(`🔧 PLANNING SERVICE: Test mode detected, Worker ID: ${workerId}`);
      
      if (!process.env['DB_NAME']) {
        process.env['DB_NAME'] = workerDatabase;
        logger.debug(`🔧 PLANNING SERVICE: Set DB_NAME: ${process.env['DB_NAME']}`);
      }
      if (!process.env['DB_COLLECTION_PREFIX']) {
        process.env['DB_COLLECTION_PREFIX'] = `${workerPrefix}_`;
        logger.debug(`🔧 PLANNING SERVICE: Set DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`);
      }
    }
    
    await connectDatabase();
  }

  // Routes
  app.use('/api/planning', planningRoutes);
  app.use('/api/promotions', promotionRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/system', systemRoutes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'planning-service' });
  });

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  });

  return app;
};