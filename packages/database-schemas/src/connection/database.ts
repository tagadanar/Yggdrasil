// packages/database-schemas/src/connection/database.ts
// MongoDB connection setup and management

import mongoose from 'mongoose';
import { config } from '@yggdrasil/shared-utilities';

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

  async connect(dbConfig: DatabaseConfig): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const defaultOptions: mongoose.ConnectOptions = {
        // Connection optimization options - Reduced for test stability
        maxPoolSize: process.env['NODE_ENV'] === 'test' ? 15 : 10,  // Reduced from 50 to prevent exhaustion
        serverSelectionTimeoutMS: process.env['NODE_ENV'] === 'test' ? 3000 : 5000,  // Faster timeout in tests
        socketTimeoutMS: process.env['NODE_ENV'] === 'test' ? 30000 : 45000,  // Reduced for tests
        bufferCommands: false,
        minPoolSize: process.env['NODE_ENV'] === 'test' ? 2 : 0,  // Keep minimum alive
        maxIdleTimeMS: process.env['NODE_ENV'] === 'test' ? 5000 : 30000,  // Faster cleanup in tests

        // New options for connection stability
        connectTimeoutMS: 10000,
        family: 4,  // Force IPv4 to avoid IPv6 issues

        // Authentication options
        authSource: config.MONGO_DATABASE || 'yggdrasil-dev',
        retryWrites: true,
        w: 'majority',
      };

      // Add replica set config for production
      if (config.NODE_ENV === 'production') {
        defaultOptions.replicaSet = 'yggdrasil-rs';
        defaultOptions.readPreference = 'secondaryPreferred';
      }

      const options = { ...defaultOptions, ...dbConfig.options };

      await mongoose.connect(dbConfig.uri, options);

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

// Function to build authenticated MongoDB connection string
function buildAuthenticatedConnectionString(): string {
  let uri = config.MONGODB_URI;

  // If URI already contains authentication, return it as-is
  if (uri.includes('@')) {
    return uri;
  }

  // If authentication credentials are provided, add them to the connection string
  if (config.MONGO_APP_USERNAME && config.MONGO_APP_PASSWORD) {
    try {
      const url = new URL(uri);
      url.username = config.MONGO_APP_USERNAME;
      url.password = config.MONGO_APP_PASSWORD;
      uri = url.toString();
    } catch (error) {
      // If URL parsing fails, assume it's already a complete connection string
    }
  }

  return uri;
}

// Utility functions for database operations
export const connectDatabase = async (uri?: string): Promise<void> => {
  // Build authenticated connection string or use provided URI
  const dbUri = uri || buildAuthenticatedConnectionString();

  const dbConfig: DatabaseConfig = {
    uri: dbUri,
  };

  const db = DatabaseConnection.getInstance();

  // Connect with retry logic
  let retries = 5;
  while (retries > 0) {
    try {
      await db.connect(dbConfig);
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Initialize UserModel with correct collection name after database connection
  try {
    const { createUserModel, setDefaultUserModel } = await import('../models/User');
    const userModel = createUserModel();
    setDefaultUserModel(userModel);
  } catch (error) {
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  const db = DatabaseConnection.getInstance();
  await db.disconnect();
};

export const isDatabaseConnected = (): boolean => {
  const db = DatabaseConnection.getInstance();
  return db.isConnectedToDatabase();
};
