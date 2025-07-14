// packages/api-services/auth-service/src/index.ts
// Main entry point for auth service

import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDatabase } from '@yggdrasil/database-schemas';

// Load environment variables from project root
dotenv.config({ path: '../../../.env' });

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Auth Service running on port ${PORT} in ${NODE_ENV} mode`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Auth Service shut down successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start auth service:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { createApp };