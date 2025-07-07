// Path: packages/api-services/user-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import userRoutes from './routes/userRoutes';
import { DatabaseConnection } from '../../../database-schemas/src';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3002;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later' }
});
app.use(limiter as any);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'user-service', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
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
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 User service running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
    });

    // Try to connect to database
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://yggdrasil_app:app_password_2024@localhost:27017/yggdrasil-dev';
      await DatabaseConnection.connect(mongoUri);
      console.log('✅ Database connected');
    } catch (dbError: any) {
      console.warn('⚠️ Database connection failed, but server is still running:', dbError.message);
    }
  } catch (error) {
    console.error('❌ Failed to start user service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down user service...');
  await DatabaseConnection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Shutting down user service...');
  await DatabaseConnection.disconnect();
  process.exit(0);
});

startServer();

export default app;
export { UserService } from './services/UserService';
export { UserController } from './controllers/UserController';