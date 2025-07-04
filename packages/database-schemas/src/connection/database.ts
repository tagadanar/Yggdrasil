// Path: packages/database-schemas/src/connection/database.ts
import mongoose from 'mongoose';

export class DatabaseConnection {
  private static isInitialized = false;

  /**
   * Connect to MongoDB database
   */
  static async connect(uri: string): Promise<boolean> {
    try {
      // Return true if already connected
      if (mongoose.connection.readyState === 1) {
        return true;
      }

      await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.setupEventListeners();
      this.isInitialized = true;

      console.log('✅ Database connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
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