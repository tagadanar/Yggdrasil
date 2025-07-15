import { createApp } from './app';

const PORT = process.env.NEWS_SERVICE_PORT || 3003;

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