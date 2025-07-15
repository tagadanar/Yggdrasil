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