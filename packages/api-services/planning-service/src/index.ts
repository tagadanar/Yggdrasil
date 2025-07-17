import { createApp } from './app';

const PORT = process.env.PLANNING_SERVICE_PORT || 3005;

const startServer = async () => {
  try {
    const app = await createApp();
    
    const server = app.listen(PORT, () => {
      console.log(`Planning service running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('Shutting down planning service...');
      server.close(() => {
        console.log('Planning service shut down');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to start planning service:', error);
    process.exit(1);
  }
};

startServer();