// packages/testing-utilities/tests/helpers/database-isolation.ts
// Ultra-robust database isolation system for parallel testing

import mongoose from 'mongoose';
import { WorkerIsolationManager } from './worker-isolation';
import { UserSchema } from '@yggdrasil/database-schemas';

/**
 * Database Isolation Manager
 * Provides complete database isolation between test workers
 */
export class DatabaseIsolationManager {
  private static instances: Map<number, DatabaseIsolationManager> = new Map();
  private workerId: number;
  private workerPrefix: string;
  private connection: mongoose.Connection | null = null;
  private isolatedModels: Map<string, mongoose.Model<any>> = new Map();
  private transactionSessions: Map<string, mongoose.ClientSession> = new Map();

  private constructor(workerId: number) {
    this.workerId = workerId;
    this.workerPrefix = `w${workerId}`;
  }

  static getInstance(workerId?: number): DatabaseIsolationManager {
    const worker = WorkerIsolationManager.getInstance();
    const id = workerId || worker.getEnvironment().workerId;
    
    if (!DatabaseIsolationManager.instances.has(id)) {
      DatabaseIsolationManager.instances.set(id, new DatabaseIsolationManager(id));
    }
    return DatabaseIsolationManager.instances.get(id)!;
  }

  /**
   * Initialize isolated database connection for this worker
   */
  async initialize(): Promise<void> {
    if (this.connection) {
      return; // Already initialized
    }

    const worker = WorkerIsolationManager.getInstance();
    const env = worker.getEnvironment();
    
    try {
      console.log(`🔧 DB ISOLATION: Using connection string: ${env.database.connectionString}`);
      console.log(`🔧 DB ISOLATION: Expected database name: ${env.database.name}`);
      console.log(`🔧 DB ISOLATION: Collection prefix: ${env.database.collectionPrefix}`);
      
      // Create isolated connection
      this.connection = await mongoose.createConnection(env.database.connectionString, {
        maxPoolSize: 20, // Smaller pool per worker
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: true, // Enable buffering for initialization
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        // Worker-specific connection options
        appName: `YggdrasilTest_Worker${this.workerId}`,
        readPreference: 'primary',
        writeConcern: { w: 'majority', j: true }
      });

      // Setup connection event handlers
      this.setupConnectionHandlers();

      // Wait for connection to be ready
      await new Promise<void>((resolve, reject) => {
        if (this.connection!.readyState === 1) {
          resolve();
        } else {
          this.connection!.once('open', resolve);
          this.connection!.once('error', reject);
        }
      });

      // Initialize isolated models
      await this.initializeIsolatedModels();

      console.log(`✅ Worker ${this.workerId}: Database isolation initialized`);
    } catch (error) {
      console.error(`❌ Worker ${this.workerId}: Database initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.on('connected', () => {
      console.log(`🔗 Worker ${this.workerId}: Database connected`);
    });

    this.connection.on('error', (error) => {
      console.error(`❌ Worker ${this.workerId}: Database error:`, error);
    });

    this.connection.on('disconnected', () => {
      console.log(`🔌 Worker ${this.workerId}: Database disconnected`);
    });
  }

  /**
   * Initialize isolated models for this worker
   */
  private async initializeIsolatedModels(): Promise<void> {
    if (!this.connection) return;

    const modelDefinitions = [
      // Note: User model is imported from @yggdrasil/database-schemas to ensure password hashing
      { name: 'News', schema: this.getNewsSchema() },
      { name: 'Course', schema: this.getCourseSchema() },
      { name: 'Event', schema: this.getEventSchema() },
      { name: 'Enrollment', schema: this.getEnrollmentSchema() }
    ];

    for (const { name, schema } of modelDefinitions) {
      const collectionName = this.getCollectionName(name.toLowerCase() + 's');
      const model = this.connection.model(name, schema, collectionName);
      this.isolatedModels.set(name, model);
    }

    // Ensure indexes are created
    await this.createIndexes();
  }

  /**
   * Get worker-specific collection name
   */
  private getCollectionName(baseName: string): string {
    return `${this.workerPrefix}_${baseName}`;
  }

  /**
   * Get isolated model for this worker
   */
  getModel<T = any>(modelName: string): mongoose.Model<T> {
    const model = this.isolatedModels.get(modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found for worker ${this.workerId}`);
    }
    return model as mongoose.Model<T>;
  }

  /**
   * Start atomic transaction for test operations
   */
  async startTransaction(testId: string): Promise<mongoose.ClientSession> {
    if (!this.connection) {
      throw new Error('Database not initialized');
    }

    const session = await this.connection.startSession();
    session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority', j: true }
    });

    this.transactionSessions.set(testId, session);
    return session;
  }

  /**
   * Commit transaction for test
   */
  async commitTransaction(testId: string): Promise<void> {
    const session = this.transactionSessions.get(testId);
    if (!session) {
      throw new Error(`No transaction session found for test ${testId}`);
    }

    try {
      await session.commitTransaction();
    } finally {
      await session.endSession();
      this.transactionSessions.delete(testId);
    }
  }

  /**
   * Rollback transaction for test
   */
  async rollbackTransaction(testId: string): Promise<void> {
    const session = this.transactionSessions.get(testId);
    if (!session) {
      return; // No transaction to rollback
    }

    try {
      await session.abortTransaction();
    } finally {
      await session.endSession();
      this.transactionSessions.delete(testId);
    }
  }

  /**
   * Create isolated user for this worker
   */
  async createIsolatedUser(userData: IsolatedUserData, testId: string): Promise<any> {
    // Create User model with the real schema (including password hashing) but using test database connection
    const collectionName = this.getCollectionName('users');
    const UserModel = this.connection!.model('User', UserSchema, collectionName);
    const session = this.transactionSessions.get(testId);

    // Add worker prefix to ensure isolation (only if not already prefixed)
    // Preserve the original _id for JWT authentication consistency
    const isolatedUserData = {
      ...userData,
      email: userData.email.startsWith(this.workerPrefix) ? userData.email : `${this.workerPrefix}_${userData.email}`
    };
    
    // Keep the original _id if provided - this is crucial for JWT authentication
    // The _id field is used in JWT tokens and must match the database record

    console.log(`🔧 DB ISOLATION: Creating isolated user for worker ${this.workerId}`);
    console.log(`🔧 DB ISOLATION: Original userData:`, {
      email: userData.email,
      _id: userData._id,
      role: userData.role,
      hasPassword: !!userData.password,
      passwordLength: userData.password?.length || 0
    });

    console.log(`🔧 DB ISOLATION: Isolated userData:`, {
      email: isolatedUserData.email,
      _id: isolatedUserData._id,
      role: isolatedUserData.role,
      hasPassword: !!isolatedUserData.password,
      passwordLength: isolatedUserData.password?.length || 0,
      password: isolatedUserData.password // Show the actual password for debugging
    });

    try {
      console.log(`🔧 DB ISOLATION: Creating user with UserModel...`);
      
      // For test users with string IDs, use insertOne directly to bypass Mongoose ObjectId validation
      if (isolatedUserData._id && typeof isolatedUserData._id === 'string') {
        console.log(`🔧 DB ISOLATION: Creating test user with string ID using insertOne...`);
        
        // Hash the password manually since we're bypassing Mongoose middleware
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(isolatedUserData.password, 12);
        
        // Add timestamps and default values that Mongoose would normally handle
        const userDocumentData = {
          ...isolatedUserData,
          password: hashedPassword, // Use the hashed password
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: isolatedUserData.isActive !== undefined ? isolatedUserData.isActive : true,
          tokenVersion: isolatedUserData.tokenVersion || 0,
          profile: isolatedUserData.profile || {
            firstName: isolatedUserData.firstName || 'Test',
            lastName: isolatedUserData.lastName || 'User'
          },
          preferences: isolatedUserData.preferences || {
            language: 'fr',
            notifications: {
              scheduleChanges: true,
              newAnnouncements: true,
              assignmentReminders: true
            },
            accessibility: {
              colorblindMode: false,
              fontSize: 'medium',
              highContrast: false
            }
          }
        };
        
        // Use MongoDB collection directly to bypass Mongoose validation
        const collection = this.connection!.db.collection(collectionName);
        const result = await collection.insertOne(userDocumentData, { session: session || undefined });
        
        console.log(`🔧 DB ISOLATION: User inserted directly with string ID: ${result.insertedId}`);
        
        // Retrieve the user using MongoDB collection directly to avoid ObjectId casting
        const insertedDoc = await collection.findOne({ _id: isolatedUserData._id }, { session: session || undefined });
        
        if (!insertedDoc) {
          throw new Error('Failed to retrieve inserted user');
        }
        
        // Create a minimal user object that matches the expected interface
        const userDoc = {
          ...insertedDoc,
          // Add Mongoose-like methods if needed
          save: async () => insertedDoc,
          toJSON: () => ({
            ...insertedDoc,
            _id: insertedDoc._id.toString()
          }),
          toObject: () => insertedDoc
        };
        
        console.log(`🔧 DB ISOLATION: User saved successfully with email: ${userDoc.email}`);
        console.log(`🔧 DB ISOLATION: Saved user details:`, {
          email: userDoc.email,
          role: userDoc.role,
          isActive: userDoc.isActive,
          hasPassword: !!userDoc.password,
          passwordLength: userDoc.password?.length || 0
        });
        
        return userDoc;
      } else {
        // For regular users (with ObjectId), use normal Mongoose flow
        console.log(`🔧 DB ISOLATION: Creating regular user with Mongoose...`);
        const user = new UserModel(isolatedUserData);
        
        console.log(`🔧 DB ISOLATION: User created, saving to database...`);
        console.log(`🔧 DB ISOLATION: Session exists: ${!!session}`);
        
        await user.save({ session });
        
        console.log(`🔧 DB ISOLATION: User saved successfully with email: ${user.email}`);
        console.log(`🔧 DB ISOLATION: Saved user details:`, {
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          hasPassword: !!user.password,
          passwordLength: user.password?.length || 0
        });
        
        return user;
      }
    } catch (error) {
      console.error(`❌ Worker ${this.workerId}: Failed to create user:`, error);
      throw error;
    }
  }

  /**
   * Find isolated users for this worker
   */
  async findIsolatedUsers(query: any, testId: string): Promise<any[]> {
    // Create User model with the real schema but using test database connection
    const collectionName = this.getCollectionName('users');
    const UserModel = this.connection!.model('User', UserSchema, collectionName);
    const session = this.transactionSessions.get(testId);

    // Add worker prefix to query
    const isolatedQuery = {
      ...query,
      email: query.email ? `${this.workerPrefix}_${query.email}` : { $regex: `^${this.workerPrefix}_` }
    };

    return await UserModel.find(isolatedQuery).session(session || null);
  }

  /**
   * Clean up all data for this worker
   */
  async cleanupWorkerData(): Promise<void> {
    if (!this.connection) return;

    try {
      // Clean up all collections for this worker
      for (const [modelName, model] of this.isolatedModels) {
        await model.deleteMany({});
        console.log(`🧹 Worker ${this.workerId}: Cleaned ${modelName} collection`);
      }

      // Clean up any remaining transactions
      for (const [testId, session] of this.transactionSessions) {
        try {
          await session.abortTransaction();
          await session.endSession();
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
      this.transactionSessions.clear();

      console.log(`✅ Worker ${this.workerId}: Database cleanup completed`);
    } catch (error) {
      console.error(`❌ Worker ${this.workerId}: Database cleanup failed:`, error);
      throw error;
    }
  }

  /**
   * Disconnect database for this worker
   */
  async disconnect(): Promise<void> {
    if (!this.connection) return;

    try {
      await this.cleanupWorkerData();
      await this.connection.close();
      this.connection = null;
      this.isolatedModels.clear();
      console.log(`🔌 Worker ${this.workerId}: Database disconnected`);
    } catch (error) {
      console.error(`❌ Worker ${this.workerId}: Database disconnect failed:`, error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  isConnectedToDatabase(): boolean {
    return this.connection?.readyState === 1;
  }

  /**
   * Create database indexes for performance
   */
  private async createIndexes(): Promise<void> {
    // Create User model with the real schema but using test database connection
    const collectionName = this.getCollectionName('users');
    const UserModel = this.connection!.model('User', UserSchema, collectionName);
    const NewsModel = this.getModel('News');
    const CourseModel = this.getModel('Course');

    await Promise.all([
      UserModel.createIndexes(),
      NewsModel.createIndexes(),
      CourseModel.createIndexes()
    ]);
  }

  /**
   * Database Schema Definitions
   * Note: User schema is imported from @yggdrasil/database-schemas to ensure password hashing
   */

  private getNewsSchema(): mongoose.Schema {
    return new mongoose.Schema({
      title: { type: String, required: true },
      content: { type: String, required: true },
      category: { type: String, required: true },
      author: {
        id: String,
        name: String,
        email: String
      },
      publishedAt: { type: Date, default: Date.now },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
  }

  private getCourseSchema(): mongoose.Schema {
    return new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      instructor: {
        id: String,
        name: String,
        email: String
      },
      schedule: {
        days: [String],
        time: String,
        location: String
      },
      capacity: Number,
      enrolled: [String],
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
  }

  private getEventSchema(): mongoose.Schema {
    return new mongoose.Schema({
      title: { type: String, required: true },
      description: String,
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      location: String,
      organizer: {
        id: String,
        name: String,
        email: String
      },
      attendees: [String],
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
  }

  private getEnrollmentSchema(): mongoose.Schema {
    return new mongoose.Schema({
      userId: { type: String, required: true },
      courseId: { type: String, required: true },
      enrolledAt: { type: Date, default: Date.now },
      status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
      progress: {
        completedLessons: [String],
        currentLesson: String,
        grade: Number
      }
    });
  }
}

/**
 * Isolated User Data Interface
 */
export interface IsolatedUserData {
  _id?: string;
  email: string;
  password: string;
  role: 'admin' | 'staff' | 'teacher' | 'student';
  profile: {
    firstName: string;
    lastName: string;
    department?: string;
    bio?: string;
    contactInfo?: {
      phone?: string;
      office?: string;
    };
    studentId?: string;
    officeHours?: string;
    specialties?: string[];
  };
  isActive?: boolean;
}

/**
 * Database Transaction Manager
 * Handles atomic operations for tests
 */
export class DatabaseTransactionManager {
  private dbManager: DatabaseIsolationManager;
  private activeTransactions: Map<string, mongoose.ClientSession> = new Map();

  constructor(workerId?: number) {
    this.dbManager = DatabaseIsolationManager.getInstance(workerId);
  }

  /**
   * Execute test operation in transaction
   */
  async executeInTransaction<T>(
    testId: string,
    operation: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    let session: mongoose.ClientSession;

    try {
      session = await this.dbManager.startTransaction(testId);
      const result = await operation(session);
      await this.dbManager.commitTransaction(testId);
      return result;
    } catch (error) {
      await this.dbManager.rollbackTransaction(testId);
      throw error;
    }
  }

  /**
   * Execute multiple operations atomically
   */
  async executeAtomicOperations<T>(
    testId: string,
    operations: Array<(session: mongoose.ClientSession) => Promise<any>>
  ): Promise<T[]> {
    return await this.executeInTransaction(testId, async (session) => {
      const results: T[] = [];
      for (const operation of operations) {
        const result = await operation(session);
        results.push(result);
      }
      return results;
    });
  }
}

// Export singleton factory
export const createDatabaseManager = (workerId?: number) => {
  return DatabaseIsolationManager.getInstance(workerId);
};

export const createTransactionManager = (workerId?: number) => {
  return new DatabaseTransactionManager(workerId);
};