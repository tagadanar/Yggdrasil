// Path: packages/api-services/planning-service/src/index.ts
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
import calendarRoutes from './routes/calendarRoutes';

const app = express();
const PORT = process.env.PORT || 3004;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://yggdrasil_app:app_password_2024@localhost:27017/yggdrasil-dev';

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

// Debug endpoint to check environment variables (DEVELOPMENT ONLY)
app.get('/debug/env', (req, res) => {
  res.json({
    jwtSecretPreview: process.env.JWT_SECRET?.substring(0, 10) + '...',
    mongoUri: process.env.MONGODB_URI?.replace(/:[^@]*@/, ':***@'),
    nodeEnv: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/planning', calendarRoutes);

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
if (process.env.NODE_ENV !== 'test' || process.env.START_SERVER === 'true') {
  app.listen(PORT, () => {
    console.log(`Planning Service running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });
}

export default app;