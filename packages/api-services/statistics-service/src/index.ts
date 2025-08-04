// packages/api-services/statistics-service/src/index.ts
// Entry point for the statistics service

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import app from './app';
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
  console.log(`🔧 STATISTICS SERVICE: Loaded .env from ${envPath}`);
} else {
  console.warn('⚠️ STATISTICS SERVICE: Could not find .env file, using existing environment variables');
}

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId = process.env['WORKER_ID'] || process.env['PLAYWRIGHT_WORKER_ID'] || process.env['TEST_WORKER_INDEX'] || '0';
  const basePort = 3000 + (parseInt(workerId, 10) * 10);
  const statisticsPort = basePort + 6; // Statistics service is always basePort + 6
  return statisticsPort;
}

const PORT = process.env['STATISTICS_SERVICE_PORT'] || 
            process.env['PORT'] || 
            (process.env['NODE_ENV'] === 'test' ? getWorkerSpecificPort() : 3006);

logger.debug(`🔧 STATISTICS SERVICE: Worker ID: ${process.env['WORKER_ID'] || process.env['PLAYWRIGHT_WORKER_ID'] || '0'}`);
logger.debug(`🔧 STATISTICS SERVICE: Calculated PORT: ${PORT}`);

// Initialize JWT system first (same as other services)
logger.info('🔑 Initializing JWT system...');
initializeJWT();

const server = app.listen(PORT, () => {
  logger.debug(`📊 Statistics Service running on port ${PORT}`);
  logger.debug(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.debug(`📈 API endpoint: http://localhost:${PORT}/api/statistics`);
  logger.info(`📊 Dashboard endpoints:`);
  logger.debug(`   Student: http://localhost:${PORT}/api/statistics/dashboard/student/:userId`);
  logger.debug(`   Teacher: http://localhost:${PORT}/api/statistics/dashboard/teacher/:userId`);
  logger.debug(`   Admin: http://localhost:${PORT}/api/statistics/dashboard/admin`);
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      logger.error(`❌ ${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`❌ ${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// CRITICAL FIX: Add missing graceful shutdown handlers
const gracefulShutdown = async (signal: string) => {
  logger.info(`🛑 ${signal} received, shutting down statistics service gracefully`);
  server.close(async () => {
    try {
      const { disconnectDatabase } = await import('@yggdrasil/database-schemas');
      await disconnectDatabase();
      logger.info('Statistics service database disconnected');
    } catch (error) {
      logger.error('Error disconnecting database:', error);
    }
    logger.info('✅ Statistics Service shut down successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;