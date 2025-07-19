// packages/api-services/course-service/src/index.ts
// Entry point for the course service

import app from './app';

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId = process.env.WORKER_ID || process.env.PLAYWRIGHT_WORKER_ID || process.env.TEST_WORKER_INDEX || '0';
  const basePort = 3000 + (parseInt(workerId, 10) * 10);
  const coursePort = basePort + 4; // Course service is always basePort + 4
  return coursePort;
}

const PORT = process.env.COURSE_SERVICE_PORT || 
            process.env.PORT || 
            (process.env.NODE_ENV === 'test' ? getWorkerSpecificPort() : 3004);

console.log(`🔧 COURSE SERVICE: Worker ID: ${process.env.WORKER_ID || process.env.PLAYWRIGHT_WORKER_ID || '0'}`);
console.log(`🔧 COURSE SERVICE: Calculated PORT: ${PORT}`);

const server = app.listen(PORT, () => {
  console.log(`📚 Course Service running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📖 API endpoint: http://localhost:${PORT}/api/courses`);
});

// Handle server errors
server.on('error', (error: any) => {
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

export default server;