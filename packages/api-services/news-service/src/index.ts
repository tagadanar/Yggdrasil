// Path: packages/api-services/news-service/src/index.ts
// CRITICAL: Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Now import everything else
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import newsRoutes from './routes/newsRoutes';
// import './types/express';

const app = express();
const PORT = process.env.PORT || 3005;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://yggdrasil_app:app_password_2024@localhost:27017/yggdrasil-dev';

// Database connection - MongoDB is required
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ News Service connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error);
    console.error('🚨 News Service requires MongoDB to function');
    process.exit(1);
  });

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting (temporarily disabled for development)
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'news-service',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/news', newsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction): void => {
  console.error('Error:', err);
  
  // Handle JSON parsing errors
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON format'
    });
    return;
  }
  
  // Handle other client errors
  if (err.status >= 400 && err.status < 500) {
    res.status(err.status).json({
      success: false,
      error: err.message || 'Bad request'
    });
    return;
  }
  
  // Handle server errors
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`News Service running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });
}

export default app;