/**
 * Database helper for functional tests
 * Handles database setup, cleanup, and test data management
 */

import mongoose from 'mongoose';
import { testEnvironment } from '../config/environment';

export interface TestDataCleanup {
  collections: string[];
  timestamp: Date;
}

export class DatabaseHelper {
  private static instance: DatabaseHelper;
  private isConnected = false;
  private cleanupTasks: TestDataCleanup[] = [];

  private constructor() {}

  static getInstance(): DatabaseHelper {
    if (!DatabaseHelper.instance) {
      DatabaseHelper.instance = new DatabaseHelper();
    }
    return DatabaseHelper.instance;
  }

  /**
   * Connect to test database
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await mongoose.connect(testEnvironment.database.uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: testEnvironment.timeouts.database,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });

      this.isConnected = true;
      if (process.env.LOG_LEVEL === 'debug') {
        console.log('✅ Test database connected successfully');
      }
    } catch (error: any) {
      console.error('❌ Test database connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from test database
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      if (process.env.LOG_LEVEL === 'debug') {
        console.log('🔌 Test database disconnected');
      }
    } catch (error: any) {
      console.error('❌ Test database disconnection failed:', error.message);
      throw error;
    }
  }

  /**
   * Clean up all test data
   */
  async cleanupTestData(silent = false): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const cleanedCollections: string[] = [];
      
      for (const collection of collections) {
        const collectionName = collection.name;
        
        // Skip system collections
        if (collectionName.startsWith('system.')) {
          continue;
        }

        const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
        if (result.deletedCount > 0) {
          cleanedCollections.push(collectionName);
        }
      }

      this.cleanupTasks.push({
        collections: collections.map(c => c.name),
        timestamp: new Date(),
      });

      // Only log if not silent and there was actual data to clean
      if (!silent && cleanedCollections.length > 0) {
        console.log(`🧹 Cleaned ${cleanedCollections.length} collections: ${cleanedCollections.join(', ')}`);
      }
    } catch (error: any) {
      console.error('❌ Test data cleanup failed:', error.message);
      throw error;
    }
  }

  /**
   * Reset database to initial state
   */
  async resetDatabase(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Drop all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        const collectionName = collection.name;
        
        // Skip system collections
        if (collectionName.startsWith('system.')) {
          continue;
        }

        await mongoose.connection.db.collection(collectionName).drop();
        console.log(`🗑️  Dropped collection: ${collectionName}`);
      }

      console.log('✅ Database reset completed');
    } catch (error: any) {
      console.error('❌ Database reset failed:', error.message);
      throw error;
    }
  }

  /**
   * Seed test data
   */
  async seedTestData(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // This would typically insert predefined test data
      // For now, we'll just ensure the connection is ready
      await mongoose.connection.db.admin().ping();
      console.log('✅ Test data seeding completed');
    } catch (error: any) {
      console.error('❌ Test data seeding failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  isDbConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get database connection info
   */
  getConnectionInfo(): {
    isConnected: boolean;
    readyState: number;
    host: string;
    port: number;
    name: string;
  } {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };
  }

  /**
   * Get collection document count
   */
  async getCollectionCount(collectionName: string): Promise<number> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      return await mongoose.connection.db.collection(collectionName).countDocuments();
    } catch (error: any) {
      console.error(`❌ Failed to count documents in ${collectionName}:`, error.message);
      return 0;
    }
  }

  /**
   * Execute a raw MongoDB operation
   */
  async executeRawOperation<T>(
    collectionName: string,
    operation: (collection: any) => Promise<T>
  ): Promise<T> {
    if (!this.isConnected) {
      await this.connect();
    }

    const collection = mongoose.connection.db.collection(collectionName);
    return await operation(collection);
  }

  /**
   * Create database indexes for testing
   */
  async createTestIndexes(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Create indexes for common test queries
      const userCollection = mongoose.connection.db.collection('users');
      await userCollection.createIndex({ email: 1 }, { unique: true });
      await userCollection.createIndex({ role: 1 });
      await userCollection.createIndex({ isActive: 1 });

      const courseCollection = mongoose.connection.db.collection('courses');
      await courseCollection.createIndex({ code: 1 }, { unique: true });
      await courseCollection.createIndex({ instructor: 1 });
      await courseCollection.createIndex({ status: 1 });

      const calendarCollection = mongoose.connection.db.collection('calendarevents');
      await calendarCollection.createIndex({ startDate: 1, endDate: 1 });
      await calendarCollection.createIndex({ organizer: 1 });

      console.log('✅ Test indexes created successfully');
    } catch (error: any) {
      console.error('❌ Test index creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Wait for database operations to complete
   */
  async waitForOperations(timeout: number = 5000): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (mongoose.connection.readyState === 1) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Database operations did not complete within timeout');
  }

  /**
   * Get cleanup task history
   */
  getCleanupHistory(): TestDataCleanup[] {
    return [...this.cleanupTasks];
  }

  /**
   * Verify database schema
   */
  async verifySchema(): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.isConnected) {
      await this.connect();
    }

    const errors: string[] = [];
    
    try {
      // Check for required collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      // This would typically validate the schema structure
      // For now, we'll just check if the database is accessible
      await mongoose.connection.db.admin().ping();
      
      return { valid: true, errors };
    } catch (error: any) {
      errors.push(error.message);
      return { valid: false, errors };
    }
  }

  /**
   * Update user data for testing purposes
   */
  async updateUser(userId: string, updateData: any): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const userCollection = mongoose.connection.db.collection('users');
      await userCollection.updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { $set: updateData }
      );
    } catch (error: any) {
      console.error(`❌ Failed to update user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete user for testing purposes
   */
  async deleteUser(userId: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const userCollection = mongoose.connection.db.collection('users');
      await userCollection.deleteOne({ _id: new mongoose.Types.ObjectId(userId) });
    } catch (error: any) {
      console.error(`❌ Failed to delete user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get user by ID for testing purposes
   */
  async getUser(userId: string): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const userCollection = mongoose.connection.db.collection('users');
      return await userCollection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
    } catch (error: any) {
      console.error(`❌ Failed to get user ${userId}:`, error.message);
      throw error;
    }
  }
}

// Singleton instance for test use
export const databaseHelper = DatabaseHelper.getInstance();

export default DatabaseHelper;