import { createApp } from './app';

// Calculate worker-specific port for parallel testing
function getWorkerSpecificPort(): number {
  const workerId = process.env.WORKER_ID || process.env.PLAYWRIGHT_WORKER_ID || process.env.TEST_WORKER_INDEX || '0';
  const basePort = 3000 + (parseInt(workerId, 10) * 10);
  const newsPort = basePort + 3; // News service is always basePort + 3
  return newsPort;
}

const PORT = process.env.NEWS_SERVICE_PORT || 
            (process.env.NODE_ENV === 'test' ? getWorkerSpecificPort() : 3003);

console.log(`🔧 NEWS SERVICE: Worker ID: ${process.env.WORKER_ID || process.env.PLAYWRIGHT_WORKER_ID || '0'}`);
console.log(`🔧 NEWS SERVICE: Calculated PORT: ${PORT}`);

const startServer = async () => {
  try {
    const app = await createApp();
    
    const server = app.listen(PORT, () => {
      console.log(`News service running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('Shutting down news service...');
      server.close(() => {
        console.log('News service shut down');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to start news service:', error);
    process.exit(1);
  }
};

startServer();