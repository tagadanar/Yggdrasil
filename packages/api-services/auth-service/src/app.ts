import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { AuthController } from './controllers/AuthController';
import { DatabaseConnection } from '@101-school/database-schemas';
import { authMiddleware, requireRole } from './middleware/authMiddleware';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// More permissive CORS configuration for development
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

// Rate limiting for login attempts (temporarily disabled due to TypeScript issues)
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 login attempts per windowMs
//   message: { error: 'Too many login attempts, please try again later' },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// General rate limiting (temporarily disabled due to TypeScript issues)
// const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: { error: 'Too many requests from this IP, please try again later' }
// });

// Apply general rate limiting to all routes (temporarily disabled)
// app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'auth-service', timestamp: new Date().toISOString() });
});

// Auth routes (no authentication required)
app.post('/api/auth/register', AuthController.register);
app.post('/api/auth/login', AuthController.login);
app.post('/api/auth/refresh-token', AuthController.refreshToken);
app.post('/api/auth/forgot-password', AuthController.forgotPassword);
app.post('/api/auth/reset-password', AuthController.resetPassword);
app.post('/api/auth/logout', authMiddleware, AuthController.logout);

// Protected routes (require authentication)
app.post('/api/auth/change-password', authMiddleware, AuthController.changePassword);

// User profile routes (require authentication)
app.get('/api/auth/profile', authMiddleware, AuthController.getProfile);
app.put('/api/auth/profile', authMiddleware, AuthController.updateProfile);

// User management routes (require admin/staff role)
app.get('/api/auth/users', authMiddleware, requireRole(['admin', 'staff']), AuthController.getUsers);
app.get('/api/auth/users/students', authMiddleware, requireRole(['admin', 'staff', 'teacher']), AuthController.getStudents);
app.get('/api/auth/users/:userId', authMiddleware, AuthController.getUserById);

// Admin routes (require admin role)
app.post('/api/auth/admin/create-user', authMiddleware, requireRole(['admin']), AuthController.adminCreateUser);
app.get('/api/auth/admin/users', authMiddleware, requireRole(['admin']), AuthController.getAdminUsers);
app.put('/api/auth/admin/users/:userId', authMiddleware, requireRole(['admin']), AuthController.adminUpdateUser);
app.post('/api/auth/admin/users/:userId/deactivate', authMiddleware, requireRole(['admin']), AuthController.adminDeactivateUser);
app.get('/api/auth/admin/stats', authMiddleware, requireRole(['admin']), AuthController.getAdminStats);
app.get('/api/auth/admin/audit-logs', authMiddleware, requireRole(['admin']), AuthController.getAuditLogs);
app.post('/api/auth/admin/reset-user-password', authMiddleware, requireRole(['admin']), AuthController.adminResetPassword);

// Staff routes (require admin/staff role)
app.post('/api/auth/staff/create-student', authMiddleware, requireRole(['admin', 'staff']), AuthController.staffCreateStudent);
app.post('/api/auth/staff/create-user', authMiddleware, requireRole(['admin', 'staff']), AuthController.staffCreateUser);
app.post('/api/auth/staff/reset-password', authMiddleware, requireRole(['admin', 'staff']), AuthController.staffResetPassword);

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
    // Start server first, then try to connect to database
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Auth service running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
    });

    // Try to connect to database (don't fail if it's not available)
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://yggdrasil_app:app_password_2024@localhost:27017/yggdrasil-dev';
      await DatabaseConnection.connect(mongoUri);
      console.log('✅ Database connected');
    } catch (dbError: any) {
      console.warn('⚠️ Database connection failed, but server is still running:', dbError.message);
      console.log('📝 Start MongoDB to enable full functionality');
    }
  } catch (error) {
    console.error('❌ Failed to start auth service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down auth service...');
  await DatabaseConnection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Shutting down auth service...');
  await DatabaseConnection.disconnect();
  process.exit(0);
});

startServer();

export default app;