// packages/api-services/statistics-service/src/index.ts
// Entry point for the statistics service

import app from './app';

const PORT = process.env.PORT || 3006;

const server = app.listen(PORT, () => {
  console.log(`📊 Statistics Service running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 API endpoint: http://localhost:${PORT}/api/statistics`);
  console.log(`📊 Dashboard endpoints:`);
  console.log(`   Student: http://localhost:${PORT}/api/statistics/dashboard/student/:userId`);
  console.log(`   Teacher: http://localhost:${PORT}/api/statistics/dashboard/teacher/:userId`);
  console.log(`   Admin: http://localhost:${PORT}/api/statistics/dashboard/admin`);
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