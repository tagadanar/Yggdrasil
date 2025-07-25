// packages/api-services/course-service/src/index.ts
// Entry point for the course service

import app, { initializeDatabase } from './app';

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId = process.env.WORKER_ID || process.env.PLAYWRIGHT_WORKER_ID || process.env.TEST_WORKER_INDEX || '0';
  const basePort = 3000 + (parseInt(workerId, 10) * 10);
  const coursePort = basePort + 4; // Course service is always basePort + 4
  return coursePort;
}

const PORT = parseInt(process.env.COURSE_SERVICE_PORT || process.env.PORT || '0', 10) || 
            (process.env.NODE_ENV === 'test' ? getWorkerSpecificPort() : 3004);

// Start server after database initialization
async function startServer() {
  try {
    // Wait for database connection first
    await initializeDatabase();
    
    // Only start server after database is ready - force IPv4 binding
    const server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`📚 Course Service running on port ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📖 API endpoint: http://localhost:${PORT}/api/courses`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      console.error(`❌ Course Service: Server error:`, error);
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

      switch (error.code) {
        case 'EACCES':
          console.error(`❌ ${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`❌ ${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    return server;
  } catch (error) {
    console.error('❌ Course Service: Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer().then(() => {
  console.log('✅ Course Service: Startup completed successfully');
}).catch((error) => {
  console.error('❌ Course Service: Startup failed:', error);
  process.exit(1);
});