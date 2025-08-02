// Increase max listeners to prevent EventEmitter memory leak warnings
// News service needs listeners for: shutdown, database, testing framework
process.setMaxListeners(20);

import { createApp } from './app';
import { logger, initializeJWT } from '@yggdrasil/shared-utilities';

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId = process.env['WORKER_ID'] || process.env['PLAYWRIGHT_WORKER_ID'] || process.env['TEST_WORKER_INDEX'] || '0';
  const basePort = 3000 + (parseInt(workerId, 10) * 10);
  const newsPort = basePort + 3; // News service is always basePort + 3
  return newsPort;
}

const PORT = process.env['NEWS_SERVICE_PORT'] || 
            (process.env['NODE_ENV'] === 'test' ? getWorkerSpecificPort() : 3003);

logger.debug(`🔧 NEWS SERVICE: Worker ID: ${process.env['WORKER_ID'] || process.env['PLAYWRIGHT_WORKER_ID'] || '0'}`);
logger.debug(`🔧 NEWS SERVICE: Calculated PORT: ${PORT}`);

const startServer = async () => {
  try {
    // Initialize JWT system first (same as auth service)
    logger.info('🔑 Initializing JWT system...');
    initializeJWT();
    
    const app = await createApp();
    
    const server = app.listen(PORT, () => {
      logger.debug(`News service running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down news service...');
      server.close(async () => {
        try {
          // CRITICAL FIX: Disconnect from database to prevent connection leaks
          const { disconnectDatabase } = await import('@yggdrasil/database-schemas');
          await disconnectDatabase();
          logger.info('News service database disconnected');
        } catch (error) {
          logger.error('Error disconnecting database:', error);
        }
        logger.info('News service shut down');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start news service:', error);
    process.exit(1);
  }
};

startServer();