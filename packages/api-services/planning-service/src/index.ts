// Path: packages/api-services/planning-service/src/index.ts
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the root .env file
config({ path: resolve(__dirname, '../../../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import calendarRoutes from './routes/calendarRoutes';

const app = express();
const PORT = process.env.PORT || 3004;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/yggdrasil-dev';

// Database connection - MongoDB is required
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Planning Service connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error);
    console.error('🚨 Planning Service requires MongoDB to function');
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
    service: 'planning-service',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/planning', calendarRoutes);

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
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
if (process.env.NODE_ENV !== 'test' || process.env.START_SERVER === 'true') {
  app.listen(PORT, () => {
    console.log(`Planning Service running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });
}

export default app;