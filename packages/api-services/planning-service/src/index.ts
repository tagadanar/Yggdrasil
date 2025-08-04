// Increase max listeners to prevent EventEmitter memory leak warnings
// Planning service needs listeners for: shutdown, database, testing framework
process.setMaxListeners(20);

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createApp } from './app';
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
  console.log(`🔧 PLANNING SERVICE: Loaded .env from ${envPath}`);
} else {
  console.warn('⚠️ PLANNING SERVICE: Could not find .env file, using existing environment variables');
}

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId = process.env['WORKER_ID'] || process.env['PLAYWRIGHT_WORKER_ID'] || process.env['TEST_WORKER_INDEX'] || '0';
  const basePort = 3000 + (parseInt(workerId, 10) * 10);
  const planningPort = basePort + 5; // Planning service is always basePort + 5
  return planningPort;
}

const PORT = process.env['PLANNING_SERVICE_PORT'] || 
            (process.env['NODE_ENV'] === 'test' ? getWorkerSpecificPort() : 3005);

logger.debug(`🔧 PLANNING SERVICE: Worker ID: ${process.env['WORKER_ID'] || process.env['PLAYWRIGHT_WORKER_ID'] || '0'}`);
logger.debug(`🔧 PLANNING SERVICE: Calculated PORT: ${PORT}`);

const startServer = async () => {
  try {
    // Initialize JWT system first (same as auth service)
    logger.info('🔑 Initializing JWT system...');
    initializeJWT();
    
    const app = await createApp();
    
    const server = app.listen(PORT, () => {
      logger.debug(`Planning service running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down planning service...');
      server.close(async () => {
        try {
          // CRITICAL FIX: Disconnect from database to prevent connection leaks
          const { disconnectDatabase } = await import('@yggdrasil/database-schemas');
          await disconnectDatabase();
          logger.info('Planning service database disconnected');
        } catch (error) {
          logger.error('Error disconnecting database:', error);
        }
        logger.info('Planning service shut down');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start planning service:', error);
    process.exit(1);
  }
};

startServer();