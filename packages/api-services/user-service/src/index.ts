// packages/api-services/user-service/src/index.ts
// User Service entry point

import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDatabase } from '@yggdrasil/database-schemas';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-dev';

async function startServer() {
  try {
    // Connect to database
    await connectDatabase(MONGODB_URI);
    console.log('✅ Connected to MongoDB for User Service');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`👤 User API: http://localhost:${PORT}/api/users`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`🛑 ${signal} received, shutting down gracefully`);
      server.close(() => {
        console.log('✅ User Service shut down successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start User Service:', error);
    process.exit(1);
  }
}

startServer();