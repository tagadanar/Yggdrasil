// packages/api-services/auth-service/src/index.ts
// Main entry point for auth service

import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDatabase } from '@yggdrasil/database-schemas';

// Load environment variables from project root
dotenv.config({ path: '../../../.env' });

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId = process.env.WORKER_ID || process.env.PLAYWRIGHT_WORKER_ID || process.env.TEST_WORKER_INDEX || '0';
  const basePort = 3000 + (parseInt(workerId, 10) * 10);
  const authPort = basePort + 1; // Auth service is always basePort + 1
  return authPort;
}

// Respect PORT environment variable when provided by service manager
let calculatedPort;
if (process.env.NODE_ENV === 'test' && process.env.PORT) {
  // In test mode, prioritize PORT (set by service manager) over AUTH_SERVICE_PORT (from .env)
  calculatedPort = parseInt(process.env.PORT, 10);
  console.log(`🔧 AUTH SERVICE: Test mode - Using service manager PORT: ${calculatedPort}`);
} else if (process.env.AUTH_SERVICE_PORT) {
  calculatedPort = parseInt(process.env.AUTH_SERVICE_PORT, 10);
  console.log(`🔧 AUTH SERVICE: Using AUTH_SERVICE_PORT: ${calculatedPort}`);
} else if (process.env.PORT) {
  calculatedPort = parseInt(process.env.PORT, 10);
  console.log(`🔧 AUTH SERVICE: Using PORT: ${calculatedPort}`);
} else if (process.env.NODE_ENV === 'test') {
  calculatedPort = getWorkerSpecificPort();
  console.log(`🔧 AUTH SERVICE: Using calculated worker-specific port: ${calculatedPort}`);
} else {
  calculatedPort = 3001;
  console.log(`🔧 AUTH SERVICE: Using default port: ${calculatedPort}`);
}

const PORT = calculatedPort;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`🔧 AUTH SERVICE: Worker ID: ${process.env.WORKER_ID || process.env.PLAYWRIGHT_WORKER_ID || '0'}`);
console.log(`🔧 AUTH SERVICE: Environment PORT: '${process.env.PORT}'`);
console.log(`🔧 AUTH SERVICE: Environment AUTH_SERVICE_PORT: '${process.env.AUTH_SERVICE_PORT}'`);
console.log(`🔧 AUTH SERVICE: Final PORT: ${PORT}`);

async function startServer(): Promise<void> {
  try {
    console.log(`🔧 AUTH SERVICE: Starting server...`);
    console.log(`🔧 AUTH SERVICE: NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔧 AUTH SERVICE: Received DB_NAME: ${process.env.DB_NAME}`);
    console.log(`🔧 AUTH SERVICE: Received DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
    console.log(`🔧 AUTH SERVICE: Received PLAYWRIGHT_WORKER_ID: ${process.env.PLAYWRIGHT_WORKER_ID}`);
    console.log(`🔧 AUTH SERVICE: Received TEST_WORKER_INDEX: ${process.env.TEST_WORKER_INDEX}`);
    console.log(`🔧 AUTH SERVICE: Received WORKER_ID: ${process.env.WORKER_ID}`);
    
    // In test mode, use worker-specific database configuration
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
      
      console.log(`🔧 AUTH SERVICE: Test mode detected`);
      console.log(`🔧 AUTH SERVICE: Using Worker ID: ${workerId}`);
      console.log(`🔧 AUTH SERVICE: Worker prefix: ${workerPrefix}`);
      console.log(`🔧 AUTH SERVICE: Worker database: ${workerDatabase}`);
      
      // Only set environment variables if they're not already set by service manager
      if (!process.env.DB_NAME) {
        process.env.DB_NAME = workerDatabase;
        console.log(`🔧 AUTH SERVICE: Set DB_NAME: ${process.env.DB_NAME}`);
      }
      if (!process.env.DB_COLLECTION_PREFIX) {
        process.env.DB_COLLECTION_PREFIX = `${workerPrefix}_`;
        console.log(`🔧 AUTH SERVICE: Set DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
      }
    }
    
    // Connect to database
    console.log(`🔧 AUTH SERVICE: Final environment before database connection:`);
    console.log(`🔧 AUTH SERVICE: NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔧 AUTH SERVICE: DB_NAME: ${process.env.DB_NAME}`);
    console.log(`🔧 AUTH SERVICE: DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
    console.log(`🔧 AUTH SERVICE: MONGODB_URI: ${process.env.MONGODB_URI}`);
    
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Auth Service running on port ${PORT} in ${NODE_ENV} mode`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Auth Service shut down successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start auth service:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { createApp };
