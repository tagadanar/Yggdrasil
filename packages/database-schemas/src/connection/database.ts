// packages/database-schemas/src/connection/database.ts
// MongoDB connection setup and management

import mongoose from 'mongoose';

export interface DatabaseConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(config: DatabaseConfig): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const defaultOptions: mongoose.ConnectOptions = {
        // Connection optimization options
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
      };

      const options = { ...defaultOptions, ...config.options };

      await mongoose.connect(config.uri, options);
      
      this.isConnected = true;
      
      // Handle connection events
      this.setupEventHandlers();
      
    } catch (error) {
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
    } catch (error) {
      throw error;
    }
  }

  isConnectedToDatabase(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  getConnection(): mongoose.Connection {
    return mongoose.connection;
  }

  private setupEventHandlers(): void {
    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
    });
  }
}

// Utility functions for database operations
export const connectDatabase = async (uri?: string): Promise<void> => {
  const dbUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-dev';
  
  const config: DatabaseConfig = {
    uri: dbUri,
  };

  const db = DatabaseConnection.getInstance();
  await db.connect(config);
};

export const disconnectDatabase = async (): Promise<void> => {
  const db = DatabaseConnection.getInstance();
  await db.disconnect();
};

export const isDatabaseConnected = (): boolean => {
  const db = DatabaseConnection.getInstance();
  return db.isConnectedToDatabase();
};