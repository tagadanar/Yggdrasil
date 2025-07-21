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
        maxPoolSize: process.env.NODE_ENV === 'test' ? 50 : 10, // Higher pool size for tests
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        bufferCommands: false, // Disable mongoose buffering
        // Additional test optimizations
        minPoolSize: process.env.NODE_ENV === 'test' ? 5 : 0, // Minimum connections for tests
        maxIdleTimeMS: process.env.NODE_ENV === 'test' ? 30000 : 30000, // 30 seconds
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
  // Always use the dev database - no worker-specific naming
  const dbUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-dev';
  
  console.log('🔧 DATABASE: Connecting to database...');
  console.log('🔧 DATABASE: URI:', dbUri);
  console.log('🔧 DATABASE: NODE_ENV:', process.env.NODE_ENV);
  
  const config: DatabaseConfig = {
    uri: dbUri,
  };

  const db = DatabaseConnection.getInstance();
  await db.connect(config);
  
  console.log('🔧 DATABASE: Connected successfully');
  console.log('🔧 DATABASE: Database name:', db.getConnection().name);
  
  // Initialize UserModel with correct collection name after database connection
  console.log('🔧 DATABASE: Initializing UserModel with current environment...');
  
  try {
    console.log('🔧 DATABASE: Importing User model functions...');
    const userModulePath = require.resolve('../models/User');
    console.log('🔧 DATABASE: User module path:', userModulePath);
    
    const { createUserModel, setDefaultUserModel } = await import('../models/User');
    console.log('🔧 DATABASE: User model functions imported successfully');
    console.log('🔧 DATABASE: createUserModel type:', typeof createUserModel);
    console.log('🔧 DATABASE: setDefaultUserModel type:', typeof setDefaultUserModel);
    
    console.log('🔧 DATABASE: Creating UserModel...');
    const userModel = createUserModel();
    console.log('🔧 DATABASE: UserModel created, setting as default...');
    setDefaultUserModel(userModel);
    console.log('🔧 DATABASE: UserModel initialized successfully');
  } catch (error) {
    console.error('🔧 DATABASE: Error initializing UserModel:', error);
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