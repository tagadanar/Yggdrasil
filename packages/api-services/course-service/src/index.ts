// Path: packages/api-services/course-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import courseRoutes from './routes/courseRoutes';
import { DatabaseConnection } from '../../../database-schemas/src';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const app = express();
const PORT = process.env.PORT || 3003;

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
    service: 'course-service',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/courses', courseRoutes);

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
async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`🚀 Course Service running on port ${PORT}`);
        console.log(`📍 Health check available at http://localhost:${PORT}/health`);
      });
    }

    // Try to connect to database
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://yggdrasil_app:app_password_2024@localhost:27017/yggdrasil-dev';
      await DatabaseConnection.connect(mongoUri);
      console.log('✅ Database connected');
    } catch (dbError: any) {
      console.warn('⚠️ Database connection failed, but server is still running:', dbError.message);
    }
  } catch (error) {
    console.error('❌ Failed to start course service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down course service...');
  await DatabaseConnection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Shutting down course service...');
  await DatabaseConnection.disconnect();
  process.exit(0);
});

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;