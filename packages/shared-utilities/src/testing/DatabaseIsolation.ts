// packages/shared-utilities/src/testing/DatabaseIsolation.ts
// Centralized database isolation and management for test infrastructure

import { MongoClient, Db, Collection } from 'mongodb';
import { WorkerConfigManager, WorkerConfig } from './WorkerConfig';

export interface DatabaseIsolationOptions {
  workerId?: number;
  connectionUri?: string;
  cleanupOnStart?: boolean;
  logLevel?: 'verbose' | 'normal' | 'quiet';
}

export interface TestUserData {
  _id: string;
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  preferences: {
    theme: string;
    language: string;
  };
}

export class DatabaseIsolationManager {
  private workerConfig: WorkerConfig;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private options: Required<DatabaseIsolationOptions>;
  private isInitialized = false;

  constructor(options: DatabaseIsolationOptions = {}) {
    this.workerConfig = WorkerConfigManager.generateWorkerConfig(
      options.workerId ?? WorkerConfigManager.detectWorkerId()
    );
    
    this.options = {
      workerId: this.workerConfig.workerId,
      connectionUri: options.connectionUri ?? this.workerConfig.database.connectionUri,
      cleanupOnStart: options.cleanupOnStart ?? true,
      logLevel: options.logLevel ?? 'normal'
    };

    this.log(`🔧 DATABASE ISOLATION: Initialized for Worker ${this.workerConfig.workerId}`);
    this.log(`🔧 DATABASE ISOLATION: Database ${this.workerConfig.database.name}`);
  }

  private log(message: string, level: 'verbose' | 'normal' | 'error' = 'normal'): void {
    if (level === 'error' || this.options.logLevel === 'verbose' || 
        (this.options.logLevel === 'normal' && level === 'normal')) {
      console.log(message);
    }
  }

  /**
   * Initialize database connection and setup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.log('📊 DATABASE ISOLATION: Already initialized', 'verbose');
      return;
    }

    this.log('🔧 DATABASE ISOLATION: Initializing database connection...');
    
    try {
      // Connect to MongoDB
      this.client = new MongoClient(this.options.connectionUri);
      await this.client.connect();
      this.db = this.client.db(this.workerConfig.database.name);
      
      this.log(`✅ DATABASE ISOLATION: Connected to ${this.workerConfig.database.name}`);
      
      // Cleanup if requested
      if (this.options.cleanupOnStart) {
        await this.cleanup();
      }
      
      // Setup collections with proper indexing
      await this.setupCollections();
      
      this.isInitialized = true;
      this.log('✅ DATABASE ISOLATION: Initialization complete');
      
    } catch (error) {
      this.log(`❌ DATABASE ISOLATION: Failed to initialize: ${error}`, 'error');
      throw error;
    }
  }

  /**
   * Setup collections with proper indexing
   */
  private async setupCollections(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const collections = [
      `${this.workerConfig.database.collectionPrefix}users`,
      `${this.workerConfig.database.collectionPrefix}courses`,
      `${this.workerConfig.database.collectionPrefix}news`,
      `${this.workerConfig.database.collectionPrefix}planning`,
      `${this.workerConfig.database.collectionPrefix}statistics`
    ];

    for (const collectionName of collections) {
      const collection = this.db.collection(collectionName);
      
      // Create indexes based on collection type
      if (collectionName.includes('users')) {
        await collection.createIndex({ email: 1 }, { unique: true });
        await collection.createIndex({ role: 1 });
      } else if (collectionName.includes('courses')) {
        await collection.createIndex({ title: 1 });
        await collection.createIndex({ instructor: 1 });
      } else if (collectionName.includes('news')) {
        await collection.createIndex({ title: 1 });
        await collection.createIndex({ publishedAt: -1 });
      }
      
      this.log(`📋 DATABASE ISOLATION: Setup collection ${collectionName}`, 'verbose');
    }
  }

  /**
   * Clean up all worker-specific data
   */
  async cleanup(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    this.log('🧹 DATABASE ISOLATION: Cleaning up worker data...');
    
    try {
      // List all collections
      const collections = await this.db.listCollections().toArray();
      const workerCollections = collections
        .map(c => c.name)
        .filter(name => name.startsWith(this.workerConfig.database.collectionPrefix));

      // Drop worker-specific collections
      for (const collectionName of workerCollections) {
        await this.db.collection(collectionName).drop();
        this.log(`🗑️ DATABASE ISOLATION: Dropped collection ${collectionName}`, 'verbose');
      }
      
      this.log('✅ DATABASE ISOLATION: Cleanup complete');
      
    } catch (error) {
      // Ignore errors if collections don't exist
      this.log('✅ DATABASE ISOLATION: Cleanup complete (no existing data)', 'verbose');
    }
  }

  /**
   * Create test user with proper worker-specific data
   */
  async createTestUser(userData: Partial<TestUserData> & { email: string; password: string }): Promise<TestUserData> {
    if (!this.db) throw new Error('Database not connected');

    const collectionName = `${this.workerConfig.database.collectionPrefix}users`;
    const collection = this.db.collection(collectionName);

    // Generate full user data with defaults
    const testUser: TestUserData = {
      _id: userData._id || `${this.workerConfig.database.collectionPrefix}${Date.now()}`,
      email: userData.email,
      password: userData.password, // Should be pre-hashed
      role: userData.role || 'student',
      firstName: userData.firstName || 'Test',
      lastName: userData.lastName || 'User',
      isActive: userData.isActive ?? true,
      preferences: userData.preferences || {
        theme: 'light',
        language: 'en'
      }
    };

    // Remove existing user with same email
    await collection.deleteMany({ email: testUser.email });
    
    // Insert new user (cast to any to handle MongoDB type conflicts)
    await collection.insertOne(testUser as any);
    
    this.log(`👤 DATABASE ISOLATION: Created test user ${testUser.email}`, 'verbose');
    
    return testUser;
  }

  /**
   * Find user by email across worker collections (for authentication)
   */
  async findUserByEmail(email: string): Promise<TestUserData | null> {
    if (!this.db) throw new Error('Database not connected');

    // First try the current worker's collection
    const workerCollection = `${this.workerConfig.database.collectionPrefix}users`;
    const workerUser = await this.db.collection(workerCollection).findOne({ email });
    
    if (workerUser) {
      this.log(`👤 DATABASE ISOLATION: Found user ${email} in worker collection`, 'verbose');
      return workerUser as any as TestUserData;
    }

    // If not found and it's a test user, search across all worker collections
    if (email.includes('@test.yggdrasil.local')) {
      const collections = await this.db.listCollections().toArray();
      const userCollections = collections
        .map(c => c.name)
        .filter(name => name === 'users' || name.match(/^w\d+_users$/));
      
      for (const collectionName of userCollections) {
        const user = await this.db.collection(collectionName).findOne({ email });
        if (user) {
          this.log(`👤 DATABASE ISOLATION: Found user ${email} in ${collectionName}`, 'verbose');
          return user as any as TestUserData;
        }
      }
    }

    this.log(`👤 DATABASE ISOLATION: User ${email} not found`, 'verbose');
    return null;
  }

  /**
   * Get collection for a specific data type
   */
  getCollection<T = any>(type: 'users' | 'courses' | 'news' | 'planning' | 'statistics'): Collection<any> {
    if (!this.db) throw new Error('Database not connected');
    
    const collectionName = `${this.workerConfig.database.collectionPrefix}${type}`;
    return this.db.collection(collectionName);
  }

  /**
   * Get database instance
   */
  getDatabase(): Db {
    if (!this.db) throw new Error('Database not connected');
    return this.db;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    this.log('🛑 DATABASE ISOLATION: Shutting down...');
    
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
    
    this.isInitialized = false;
    this.log('✅ DATABASE ISOLATION: Shutdown complete');
  }

  /**
   * Get isolation statistics
   */
  getStatistics(): {
    workerId: number;
    databaseName: string;
    collectionPrefix: string;
    isInitialized: boolean;
    connectionUri: string;
  } {
    return {
      workerId: this.workerConfig.workerId,
      databaseName: this.workerConfig.database.name,
      collectionPrefix: this.workerConfig.database.collectionPrefix,
      isInitialized: this.isInitialized,
      connectionUri: this.options.connectionUri
    };
  }

  /**
   * Create database isolation manager for specific worker
   */
  static createForWorker(workerId: number, options: Omit<DatabaseIsolationOptions, 'workerId'> = {}): DatabaseIsolationManager {
    return new DatabaseIsolationManager({ ...options, workerId });
  }

  /**
   * Get current worker's database isolation manager
   */
  static getCurrent(options: DatabaseIsolationOptions = {}): DatabaseIsolationManager {
    return new DatabaseIsolationManager(options);
  }
}