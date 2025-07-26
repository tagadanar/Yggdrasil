import { createApp } from './app';
import { logger } from '@yggdrasil/shared-utilities';

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
    const app = await createApp();
    
    const server = app.listen(PORT, () => {
      logger.debug(`Planning service running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down planning service...');
      server.close(() => {
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