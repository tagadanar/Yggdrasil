// packages/api-services/auth-service/src/index.ts
// Main entry point for auth service

// Increase max listeners to prevent EventEmitter memory leak warnings
// Auth service needs listeners for: shutdown, database, JWT, testing framework
process.setMaxListeners(20);

import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDatabase } from '@yggdrasil/database-schemas';
import { config } from '@yggdrasil/shared-utilities/config';
import { initializeJWT } from '@yggdrasil/shared-utilities/jwt';
import { authLogger as logger } from '@yggdrasil/shared-utilities/logging';

// Load environment variables from project root
dotenv.config({ path: '../../../.env' });

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId = process.env['WORKER_ID'] || process.env['PLAYWRIGHT_WORKER_ID'] || process.env['TEST_WORKER_INDEX'] || '0';
  const basePort = 3000 + (parseInt(workerId, 10) * 10);
  const authPort = basePort + 1; // Auth service is always basePort + 1
  return authPort;
}

// Respect PORT environment variable when provided by service manager
let calculatedPort;
if (process.env['NODE_ENV'] === 'test' && process.env['PORT']) {
  // In test mode, prioritize PORT (set by service manager) over AUTH_SERVICE_PORT (from .env)
  calculatedPort = parseInt(process.env['PORT']!, 10);
  logger.debug(`🔧 AUTH SERVICE: Test mode - Using service manager PORT: ${calculatedPort}`);
} else if (config.AUTH_SERVICE_PORT) {
  calculatedPort = parseInt(config.AUTH_SERVICE_PORT, 10);
  logger.debug(`🔧 AUTH SERVICE: Using AUTH_SERVICE_PORT: ${calculatedPort}`);
} else if (process.env['PORT']) {
  calculatedPort = parseInt(process.env['PORT']!, 10);
  logger.debug(`🔧 AUTH SERVICE: Using PORT: ${calculatedPort}`);
} else if (process.env['NODE_ENV'] === 'test') {
  calculatedPort = getWorkerSpecificPort();
  logger.debug(`🔧 AUTH SERVICE: Using calculated worker-specific port: ${calculatedPort}`);
} else {
  calculatedPort = 3001;
  logger.debug(`🔧 AUTH SERVICE: Using default port: ${calculatedPort}`);
}

const PORT = calculatedPort;
// const _NODE_ENV = process.env['NODE_ENV'] || 'development';

logger.debug(`🔧 AUTH SERVICE: Worker ID: ${process.env['WORKER_ID'] || process.env['PLAYWRIGHT_WORKER_ID'] || '0'}`);
logger.debug(`🔧 AUTH SERVICE: Environment PORT: '${process.env['PORT']}'`);
logger.debug(`🔧 AUTH SERVICE: Environment AUTH_SERVICE_PORT: '${process.env['AUTH_SERVICE_PORT']}'`);
logger.debug(`🔧 AUTH SERVICE: Final PORT: ${PORT}`);

async function startServer(): Promise<void> {
  try {
    logger.info(`🚀 Starting Auth Service...`);
    
    // Step 1: Validate environment
    logger.debug(`🔐 Validating environment configuration...`);
    // config is already validated by import
    
    // Step 2: Initialize JWT system
    logger.info(`🔑 Initializing JWT system...`);
    initializeJWT();
    
    logger.debug(`🔧 AUTH SERVICE: NODE_ENV: ${config.NODE_ENV}`);
    logger.debug(`🔧 AUTH SERVICE: Received DB_NAME: ${process.env['DB_NAME']}`);
    logger.debug(`🔧 AUTH SERVICE: Received DB_COLLECTION_PREFIX: ${process.env['DB_COLLECTION_PREFIX']}`);
    logger.debug(`🔧 AUTH SERVICE: Received PLAYWRIGHT_WORKER_ID: ${process.env['PLAYWRIGHT_WORKER_ID']}`);
    logger.debug(`🔧 AUTH SERVICE: Received TEST_WORKER_INDEX: ${process.env['TEST_WORKER_INDEX']}`);
    logger.debug(`🔧 AUTH SERVICE: Received WORKER_ID: ${process.env['WORKER_ID']}`);
    
    // In test mode, use the dev database directly (no worker-specific naming)
    if (process.env['NODE_ENV'] === 'test') {
      logger.debug(`🔧 AUTH SERVICE: Test mode detected - using dev database directly`);
      logger.debug(`🔧 AUTH SERVICE: Clean testing approach - no worker isolation`);
      
      // Always use the dev database for testing
      // This ensures tests run against the same database structure as development
      if (!process.env['MONGODB_URI']) {
        process.env['MONGODB_URI'] = 'mongodb://localhost:27018/yggdrasil-dev';
      }
      
      logger.debug(`🔧 AUTH SERVICE: Using dev database for testing`);
    }
    
    // Step 3: Connect to database
    logger.info(`🗄️ Connecting to database...`);
    logger.debug(`🔧 AUTH SERVICE: Final environment before database connection:`);
    logger.debug(`🔧 AUTH SERVICE: NODE_ENV: ${config.NODE_ENV}`);
    logger.debug(`🔧 AUTH SERVICE: MONGODB_URI: ${process.env['MONGODB_URI']}`);
    
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Step 4: Start server
    const app = createApp();
    const server = app.listen(PORT, () => {
      logger.info(`✅ Auth Service running on port ${PORT}`);
      logger.debug(`📍 Environment: ${config.NODE_ENV}`);
      logger.debug(`🔐 Health check: http://localhost:${PORT}/health`);
      logger.debug(`🚀 Auth API: http://localhost:${PORT}/api/auth`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.debug('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('✅ Auth Service shut down successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('❌ Failed to start auth service:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { createApp };
