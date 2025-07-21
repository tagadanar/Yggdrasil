import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import newsRoutes from './routes/newsRoutes';
import { connectDatabase } from '@yggdrasil/database-schemas';

export const createApp = async (skipDbConnection = false) => {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  // Connect to database (skip for tests that manage their own connection)
  if (!skipDbConnection) {
    console.log(`🔧 NEWS SERVICE: Starting database initialization...`);
    console.log(`🔧 NEWS SERVICE: NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔧 NEWS SERVICE: Received DB_NAME: ${process.env.DB_NAME}`);
    console.log(`🔧 NEWS SERVICE: Received DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
    console.log(`🔧 NEWS SERVICE: Received PLAYWRIGHT_WORKER_ID: ${process.env.PLAYWRIGHT_WORKER_ID}`);
    console.log(`🔧 NEWS SERVICE: Received TEST_WORKER_INDEX: ${process.env.TEST_WORKER_INDEX}`);
    console.log(`🔧 NEWS SERVICE: Received WORKER_ID: ${process.env.WORKER_ID}`);
    
    // In test mode, use worker-specific database configuration (same as auth-service)
    if (process.env.NODE_ENV === 'test') {
      // Use the worker ID that's already been set by the service manager
      const receivedWorkerId = process.env.WORKER_ID;
      const workerId = receivedWorkerId || 
                      process.env.PLAYWRIGHT_WORKER_ID || 
                      process.env.TEST_WORKER_INDEX || 
                      '0'; // Default to worker 0 for single-worker tests
      
      // Set worker-specific database name only if not already set
      const workerPrefix = `w${workerId}`;
      const workerDatabase = process.env.DB_NAME || `yggdrasil_test_${workerPrefix}`;
      
      console.log(`🔧 NEWS SERVICE: Test mode detected`);
      console.log(`🔧 NEWS SERVICE: Using Worker ID: ${workerId}`);
      console.log(`🔧 NEWS SERVICE: Worker prefix: ${workerPrefix}`);
      console.log(`🔧 NEWS SERVICE: Worker database: ${workerDatabase}`);
      
      // Only set environment variables if they're not already set by service manager
      if (!process.env.DB_NAME) {
        process.env.DB_NAME = workerDatabase;
        console.log(`🔧 NEWS SERVICE: Set DB_NAME: ${process.env.DB_NAME}`);
      }
      if (!process.env.DB_COLLECTION_PREFIX) {
        process.env.DB_COLLECTION_PREFIX = `${workerPrefix}_`;
        console.log(`🔧 NEWS SERVICE: Set DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
      }
    }
    
    console.log(`🔧 NEWS SERVICE: Final environment before database connection:`);
    console.log(`🔧 NEWS SERVICE: NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔧 NEWS SERVICE: DB_NAME: ${process.env.DB_NAME}`);
    console.log(`🔧 NEWS SERVICE: DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
    console.log(`🔧 NEWS SERVICE: MONGODB_URI: ${process.env.MONGODB_URI}`);
    
    await connectDatabase();
  }

  // Routes
  app.use('/api/news', newsRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'news-service' });
  });

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  });

  return app;
};