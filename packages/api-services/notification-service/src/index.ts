// Path: packages/api-services/notification-service/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import notificationRoutes from './routes/notificationRoutes';
import { WebSocketService } from './services/WebSocketService';

const app = express();
const PORT = process.env.PORT || 3007;

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
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

// Initialize WebSocket service
WebSocketService.initialize(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/notifications', notificationRoutes);

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
  httpServer.listen(PORT, () => {
    console.log(`Notification Service running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`WebSocket server ready for real-time notifications`);
  });
}

export default app;