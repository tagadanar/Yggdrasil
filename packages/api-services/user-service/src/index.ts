// packages/api-services/user-service/src/index.ts
// User Service entry point

// Increase max listeners to prevent EventEmitter memory leak warnings
// User service needs listeners for: shutdown, database, testing framework
process.setMaxListeners(20);

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createApp } from './app';
import { connectDatabase } from '@yggdrasil/database-schemas';
import { logger, initializeJWT } from '@yggdrasil/shared-utilities';

// Load environment variables from project root
// Use absolute path resolution to find .env file regardless of working directory
const possiblePaths = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../../../.env'),
  '/home/tagada/Desktop/Yggdrasil/.env'
];

const envPath = possiblePaths.find(p => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath });
  console.log(`🔧 USER SERVICE: Loaded .env from ${envPath}`);
} else {
  console.warn('⚠️ USER SERVICE: Could not find .env file, using existing environment variables');
}

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId =
    process.env['WORKER_ID'] ||
    process.env['PLAYWRIGHT_WORKER_ID'] ||
    process.env['TEST_WORKER_INDEX'] ||
    '0';
  const basePort = 3000 + parseInt(workerId, 10) * 10;
  const userPort = basePort + 2; // User service is always basePort + 2
  return userPort;
}

// Respect PORT environment variable when provided by service manager
let calculatedPort;
if (process.env['NODE_ENV'] === 'test' && process.env['PORT']) {
  // In test mode, prioritize PORT (set by service manager) over USER_SERVICE_PORT (from .env)
  calculatedPort = parseInt(process.env['PORT'], 10);
  logger.debug(`🔧 USER SERVICE: Test mode - Using service manager PORT: ${calculatedPort}`);
} else if (process.env['USER_SERVICE_PORT']) {
  calculatedPort = parseInt(process.env['USER_SERVICE_PORT'], 10);
  logger.debug(`🔧 USER SERVICE: Using USER_SERVICE_PORT: ${calculatedPort}`);
} else if (process.env['PORT']) {
  calculatedPort = parseInt(process.env['PORT'], 10);
  logger.debug(`🔧 USER SERVICE: Using PORT: ${calculatedPort}`);
} else if (process.env['NODE_ENV'] === 'test') {
  calculatedPort = getWorkerSpecificPort();
  logger.debug(`🔧 USER SERVICE: Using calculated worker-specific port: ${calculatedPort}`);
} else {
  calculatedPort = 3002;
  logger.debug(`🔧 USER SERVICE: Using default port: ${calculatedPort}`);
}

const PORT = calculatedPort;

logger.debug(
  `🔧 USER SERVICE: Worker ID: ${process.env['WORKER_ID'] || process.env['PLAYWRIGHT_WORKER_ID'] || '0'}`,
);
logger.debug(`🔧 USER SERVICE: Environment PORT: '${process.env['PORT']}'`);
logger.debug(
  `🔧 USER SERVICE: Environment USER_SERVICE_PORT: '${process.env['USER_SERVICE_PORT']}'`,
);
logger.debug(`🔧 USER SERVICE: Final PORT: ${PORT}`);

async function startServer() {
  try {
    logger.info('🔧 USER SERVICE: Starting server...');
    
    // Initialize JWT system first (same as auth service)
    logger.info('🔑 Initializing JWT system...');
    initializeJWT();
    
    logger.debug(`🔧 USER SERVICE: NODE_ENV: ${process.env['NODE_ENV']}`);
    logger.debug(`🔧 USER SERVICE: Received DB_NAME: ${process.env['DB_NAME']}`);
    logger.debug(
      `🔧 USER SERVICE: Received DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`,
    );
    logger.debug(
      `🔧 USER SERVICE: Received PLAYWRIGHT_WORKER_ID: ${process.env['PLAYWRIGHT_WORKER_ID']}`,
    );
    logger.debug(
      `🔧 USER SERVICE: Received TEST_WORKER_INDEX: ${process.env['TEST_WORKER_INDEX']}`,
    );
    logger.debug(`🔧 USER SERVICE: Received WORKER_ID: ${process.env['WORKER_ID']}`);

    // In test mode, use worker-specific database configuration (same as auth-service)
    if (process.env['NODE_ENV'] === 'test') {
      // Use the worker ID that's already been set by the service manager
      const receivedWorkerId = process.env['WORKER_ID'];
      const workerId =
        receivedWorkerId ||
        process.env['PLAYWRIGHT_WORKER_ID'] ||
        process.env['TEST_WORKER_INDEX'] ||
        '0'; // Default to worker 0 for single-worker tests

      // Set worker-specific database name only if not already set
      const workerPrefix = `w${workerId}`;
      const workerDatabase = process.env['DB_NAME'] || `yggdrasil_test_${workerPrefix}`;

      logger.debug('🔧 USER SERVICE: Test mode detected');
      logger.debug(`🔧 USER SERVICE: Using Worker ID: ${workerId}`);
      logger.debug(`🔧 USER SERVICE: Worker prefix: ${workerPrefix}`);
      logger.debug(`🔧 USER SERVICE: Worker database: ${workerDatabase}`);

      // Only set environment variables if they're not already set by service manager
      if (!process.env['DB_NAME']) {
        process.env['DB_NAME'] = workerDatabase;
        logger.debug(`🔧 USER SERVICE: Set DB_NAME: ${process.env['DB_NAME']}`);
      }
      if (!process.env['DB_COLLECTION_PREFIX']) {
        process.env['DB_COLLECTION_PREFIX'] = `${workerPrefix}_`;
        logger.debug(
          `🔧 USER SERVICE: Set DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`,
        );
      }
    }

    // Connect to database
    logger.debug('🔧 USER SERVICE: Final environment before database connection:');
    logger.debug(`🔧 USER SERVICE: NODE_ENV: ${process.env['NODE_ENV']}`);
    logger.debug(`🔧 USER SERVICE: DB_NAME: ${process.env['DB_NAME']}`);
    logger.debug(`🔧 USER SERVICE: DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`);
    logger.debug(`🔧 USER SERVICE: MONGODB_URI: ${process.env['MONGODB_URI']}`);

    await connectDatabase();
    logger.info('✅ Connected to MongoDB for User Service');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      logger.debug(`🚀 User Service running on port ${PORT}`);
      logger.debug(`📊 Health check: http://localhost:${PORT}/health`);
      logger.debug(`👤 User API: http://localhost:${PORT}/api/users`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.debug(`🛑 ${signal} received, shutting down gracefully`);
      server.close(async () => {
        try {
          // CRITICAL FIX: Disconnect from database to prevent connection leaks
          const { disconnectDatabase } = await import('@yggdrasil/database-schemas');
          await disconnectDatabase();
          logger.info('User service database disconnected');
        } catch (error) {
          logger.error('Error disconnecting database:', error);
        }
        logger.info('✅ User Service shut down successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start User Service:', error);
    process.exit(1);
  }
}

startServer();
