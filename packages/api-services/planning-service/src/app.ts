import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import planningRoutes from './routes/planningRoutes';
import { connectDatabase } from '@yggdrasil/database-schemas';

export const createApp = async (skipDbConnection = false) => {
  const app = express();

  // Middleware
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
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'cache-control', 'pragma', 'expires']
  }));
  
  app.use(express.json());
  app.use(morgan('dev'));

  // Connect to database (skip for tests that manage their own connection)
  if (!skipDbConnection) {
    console.log(`🔧 PLANNING SERVICE: Starting database initialization...`);
    console.log(`🔧 PLANNING SERVICE: NODE_ENV: ${process.env.NODE_ENV}`);
    
    // In test mode, use worker-specific database configuration (same as auth-service)
    if (process.env.NODE_ENV === 'test') {
      const receivedWorkerId = process.env.WORKER_ID;
      const workerId = receivedWorkerId || 
                      process.env.PLAYWRIGHT_WORKER_ID || 
                      process.env.TEST_WORKER_INDEX || 
                      '0';
      
      const workerPrefix = `w${workerId}`;
      const workerDatabase = process.env.DB_NAME || `yggdrasil_test_${workerPrefix}`;
      
      console.log(`🔧 PLANNING SERVICE: Test mode detected, Worker ID: ${workerId}`);
      
      if (!process.env.DB_NAME) {
        process.env.DB_NAME = workerDatabase;
        console.log(`🔧 PLANNING SERVICE: Set DB_NAME: ${process.env.DB_NAME}`);
      }
      if (!process.env.DB_COLLECTION_PREFIX) {
        process.env.DB_COLLECTION_PREFIX = `${workerPrefix}_`;
        console.log(`🔧 PLANNING SERVICE: Set DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
      }
    }
    
    await connectDatabase();
  }

  // Routes
  app.use('/api/planning', planningRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'planning-service' });
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