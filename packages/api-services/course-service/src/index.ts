// packages/api-services/course-service/src/index.ts
// Entry point for the course service

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import app, { initializeDatabase } from './app';
import { logger, initializeJWT } from '@yggdrasil/shared-utilities';

// Load environment variables from project root
// Use absolute path resolution to find .env file regardless of working directory
const possiblePaths = [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../../../.env'),
  '/home/tagada/Desktop/Yggdrasil/.env',
];

const envPath = possiblePaths.find(p => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath });
  logger.info(`🔧 COURSE SERVICE: Loaded .env from ${envPath}`);
} else {
  logger.warn('⚠️ COURSE SERVICE: Could not find .env file, using existing environment variables');
}

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId =
    process.env['WORKER_ID'] ||
    process.env['PLAYWRIGHT_WORKER_ID'] ||
    process.env['TEST_WORKER_INDEX'] ||
    '0';
  const basePort = 3000 + parseInt(workerId, 10) * 10;
  const coursePort = basePort + 4; // Course service is always basePort + 4
  return coursePort;
}

const PORT =
  parseInt(process.env['COURSE_SERVICE_PORT'] || process.env['PORT'] || '0', 10) ||
  (process.env['NODE_ENV'] === 'test' ? getWorkerSpecificPort() : 3004);

// Start server after database initialization
async function startServer() {
  try {
    // Initialize JWT system first (same as auth service)
    logger.info('🔑 Initializing JWT system...');
    initializeJWT();

    // Wait for database connection first
    await initializeDatabase();

    // Only start server after database is ready - force IPv4 binding
    const server = app.listen(PORT, '127.0.0.1', () => {
      logger.debug(`📚 Course Service running on port ${PORT}`);
      logger.debug(`🔗 Health check: http://localhost:${PORT}/health`);
      logger.debug(`📖 API endpoint: http://localhost:${PORT}/api/courses`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('❌ Course Service: Server error:', error);
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
      logger.info(`🛑 ${signal} received, shutting down course service gracefully`);
      server.close(async () => {
        try {
          const { disconnectDatabase } = await import('@yggdrasil/database-schemas');
          await disconnectDatabase();
          logger.info('Course service database disconnected');
        } catch (error) {
          logger.error('Error disconnecting database:', error);
        }
        logger.info('✅ Course Service shut down successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('❌ Course Service: Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer()
  .then(() => {
    logger.info('✅ Course Service: Startup completed successfully');
  })
  .catch(error => {
    logger.error('❌ Course Service: Startup failed:', error);
    process.exit(1);
  });
