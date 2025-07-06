// Path: packages/database-schemas/src/connection/database.ts
import mongoose from 'mongoose';

export class DatabaseConnection {
  private static isInitialized = false;
  
  private static get isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Connect to MongoDB database
   */
  static async connect(uri: string): Promise<boolean> {
    try {
      // Return true if already connected
      if (mongoose.connection.readyState === 1) {
        return true;
      }

      // In development mode, ensure MongoDB is required
      if (this.isDevelopment) {
        if (!uri || uri.includes('memory://') || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
          throw new Error('Development mode requires real MongoDB connection. In-memory databases not allowed.');
        }
      }

      const connectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: this.isDevelopment ? 10000 : 5000, // More time in dev
        socketTimeoutMS: 45000,
      };

      await mongoose.connect(uri, connectOptions);

      this.setupEventListeners();
      this.isInitialized = true;

      console.log('✅ Database connected successfully');
      
      // In development, verify the connection with a ping
      if (this.isDevelopment) {
        await this.validateDevelopmentConnection();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      
      // If it's a development validation error, re-throw it directly
      if (error instanceof Error && error.message.includes('Development mode requires real MongoDB connection')) {
        throw error;
      }
      
      // In development mode, provide helpful error messages
      if (this.isDevelopment) {
        console.error('🚨 Development Mode Error:');
        console.error('   MongoDB connection is required for development.');
        console.error('   Please ensure MongoDB is running via:');
        console.error('   npm run dev:mongodb');
        console.error('   or manually: docker-compose -f docker-compose.dev.yml up -d mongodb');
      }
      
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from MongoDB database
   */
  static async disconnect(): Promise<void> {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log('🔌 Database disconnected');
      }
      this.isInitialized = false;
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw new Error(`Database disconnection failed: ${error}`);
    }
  }

  /**
   * Check if database is connected
   */
  static isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get current connection state as string
   */
  static getConnectionState(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
  }

  /**
   * Create database indexes
   */
  static async createIndexes(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Database not connected');
    }

    try {
      const db = mongoose.connection.db;
      
      if (!db) {
        throw new Error('Database connection not established');
      }
      
      // Indexes are created by the mongo-init.js script
      // to avoid duplicate index creation conflicts
      console.log('📋 Database connection established (indexes handled by init script)');
    } catch (error) {
      console.error('❌ Failed to create indexes:', error);
      throw new Error(`Failed to create indexes: ${error}`);
    }
  }

  /**
   * Setup event listeners for connection monitoring
   */
  private static setupEventListeners(): void {
    if (this.isInitialized) {
      return;
    }

    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Validate development connection with comprehensive checks
   */
  private static async validateDevelopmentConnection(): Promise<void> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }

      // Ping the database
      await db.admin().ping();
      
      // Verify we can list collections
      const collections = await db.listCollections().toArray();
      
      console.log('🔍 Development connection validated:');
      console.log(`   📊 Database: ${mongoose.connection.name}`);
      console.log(`   🖥️  Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      console.log(`   📚 Collections: ${collections.length}`);
      
      // Warn if no collections exist (might be a fresh database)
      if (collections.length === 0) {
        console.log('⚠️  No collections found. Database may need initialization.');
        console.log('   Run: npm run setup:db');
      }
      
    } catch (error) {
      console.error('❌ Development connection validation failed:', error);
      throw new Error(`Development validation failed: ${error}`);
    }
  }

  /**
   * Enforce MongoDB connection for development operations
   */
  static enforceConnectionForDevelopment(): void {
    if (this.isDevelopment && !this.isConnected()) {
      throw new Error(
        'MongoDB connection required in development mode. ' +
        'Please run "npm run dev:mongodb" to start MongoDB before running services.'
      );
    }
  }

  /**
   * Health check for database connection
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: {
      state: string;
      host?: string;
      name?: string;
      collections?: number;
    };
  }> {
    const state = this.getConnectionState();
    
    if (!this.isConnected()) {
      return {
        status: 'unhealthy',
        details: { state }
      };
    }

    try {
      const db = mongoose.connection.db;
      
      if (!db) {
        throw new Error('Database connection not established');
      }
      
      const collections = await db.listCollections().toArray();
      
      return {
        status: 'healthy',
        details: {
          state,
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          collections: collections.length,
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { state }
      };
    }
  }
}

// Export alias for compatibility
export const Database = DatabaseConnection;