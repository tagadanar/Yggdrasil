// packages/api-services/user-service/src/index.ts
// User Service entry point

import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDatabase } from '@yggdrasil/database-schemas';

// Load environment variables from project root
dotenv.config({ path: '../../../.env' });

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId = process.env.WORKER_ID || process.env.PLAYWRIGHT_WORKER_ID || process.env.TEST_WORKER_INDEX || '0';
  const basePort = 3000 + (parseInt(workerId, 10) * 10);
  const userPort = basePort + 2; // User service is always basePort + 2
  return userPort;
}

// Respect PORT environment variable when provided by service manager
let calculatedPort;
if (process.env.NODE_ENV === 'test' && process.env.PORT) {
  // In test mode, prioritize PORT (set by service manager) over USER_SERVICE_PORT (from .env)
  calculatedPort = parseInt(process.env.PORT, 10);
  console.log(`🔧 USER SERVICE: Test mode - Using service manager PORT: ${calculatedPort}`);
} else if (process.env.USER_SERVICE_PORT) {
  calculatedPort = parseInt(process.env.USER_SERVICE_PORT, 10);
  console.log(`🔧 USER SERVICE: Using USER_SERVICE_PORT: ${calculatedPort}`);
} else if (process.env.PORT) {
  calculatedPort = parseInt(process.env.PORT, 10);
  console.log(`🔧 USER SERVICE: Using PORT: ${calculatedPort}`);
} else if (process.env.NODE_ENV === 'test') {
  calculatedPort = getWorkerSpecificPort();
  console.log(`🔧 USER SERVICE: Using calculated worker-specific port: ${calculatedPort}`);
} else {
  calculatedPort = 3002;
  console.log(`🔧 USER SERVICE: Using default port: ${calculatedPort}`);
}

const PORT = calculatedPort;

console.log(`🔧 USER SERVICE: Worker ID: ${process.env.WORKER_ID || process.env.PLAYWRIGHT_WORKER_ID || '0'}`);
console.log(`🔧 USER SERVICE: Environment PORT: '${process.env.PORT}'`);
console.log(`🔧 USER SERVICE: Environment USER_SERVICE_PORT: '${process.env.USER_SERVICE_PORT}'`);
console.log(`🔧 USER SERVICE: Final PORT: ${PORT}`);

async function startServer() {
  try {
    console.log(`🔧 USER SERVICE: Starting server...`);
    console.log(`🔧 USER SERVICE: NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔧 USER SERVICE: Received DB_NAME: ${process.env.DB_NAME}`);
    console.log(`🔧 USER SERVICE: Received DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
    console.log(`🔧 USER SERVICE: Received PLAYWRIGHT_WORKER_ID: ${process.env.PLAYWRIGHT_WORKER_ID}`);
    console.log(`🔧 USER SERVICE: Received TEST_WORKER_INDEX: ${process.env.TEST_WORKER_INDEX}`);
    console.log(`🔧 USER SERVICE: Received WORKER_ID: ${process.env.WORKER_ID}`);
    
    // In test mode, use worker-specific database configuration (same as auth-service)
    if (process.env.NODE_ENV === 'test') {
      // Use the worker ID that's already been set by the service manager
      const receivedWorkerId = process.env.WORKER_ID;
      const workerId = receivedWorkerId || 
                      process.env.PLAYWRIGHT_WORKER_ID || 
                      process.env.TEST_WORKER_INDEX || 
                      '0'; // Default to worker 0 for single-worker tests
      
      // Set worker-specific database name only if not already set
      const workerPrefix = `w${workerId}`;
      const workerDatabase = process.env.DB_NAME || `yggdrasil_test_${workerPrefix}`;
      
      console.log(`🔧 USER SERVICE: Test mode detected`);
      console.log(`🔧 USER SERVICE: Using Worker ID: ${workerId}`);
      console.log(`🔧 USER SERVICE: Worker prefix: ${workerPrefix}`);
      console.log(`🔧 USER SERVICE: Worker database: ${workerDatabase}`);
      
      // Only set environment variables if they're not already set by service manager
      if (!process.env.DB_NAME) {
        process.env.DB_NAME = workerDatabase;
        console.log(`🔧 USER SERVICE: Set DB_NAME: ${process.env.DB_NAME}`);
      }
      if (!process.env.DB_COLLECTION_PREFIX) {
        process.env.DB_COLLECTION_PREFIX = `${workerPrefix}_`;
        console.log(`🔧 USER SERVICE: Set DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
      }
    }
    
    // Connect to database
    console.log(`🔧 USER SERVICE: Final environment before database connection:`);
    console.log(`🔧 USER SERVICE: NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔧 USER SERVICE: DB_NAME: ${process.env.DB_NAME}`);
    console.log(`🔧 USER SERVICE: DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
    console.log(`🔧 USER SERVICE: MONGODB_URI: ${process.env.MONGODB_URI}`);
    
    await connectDatabase();
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