// packages/shared-utilities/src/testing/TestCleanup.ts
// Centralized test cleanup utilities for clean test execution

import mongoose from 'mongoose';
import { DemoUserManager } from './DemoUserManager';

export interface CleanupTracker {
  collections: Map<string, Set<string>>; // collection -> ids to delete
  customCleanups: Array<() => Promise<void>>;
}

export class TestCleanup {
  private static instances = new Map<string, TestCleanup>();
  private tracker: CleanupTracker;
  private testName: string;
  
  private constructor(testName: string) {
    this.testName = testName;
    this.tracker = {
      collections: new Map(),
      customCleanups: []
    };
  }

  /**
   * Get or create a TestCleanup instance for a specific test
   */
  static getInstance(testName: string): TestCleanup {
    if (!TestCleanup.instances.has(testName)) {
      TestCleanup.instances.set(testName, new TestCleanup(testName));
    }
    return TestCleanup.instances.get(testName)!;
  }

  /**
   * Track a document for cleanup
   */
  trackDocument(collection: string, id: string): void {
    if (!this.tracker.collections.has(collection)) {
      this.tracker.collections.set(collection, new Set());
    }
    this.tracker.collections.get(collection)!.add(id);
  }

  /**
   * Track multiple documents for cleanup
   */
  trackDocuments(collection: string, ids: string[]): void {
    ids.forEach(id => this.trackDocument(collection, id));
  }

  /**
   * Add a custom cleanup function
   */
  addCustomCleanup(cleanup: () => Promise<void>): void {
    this.tracker.customCleanups.push(cleanup);
  }

  /**
   * Execute all cleanup operations
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 TEST CLEANUP [${this.testName}]: Starting cleanup...`);
    
    try {
      // Clean up tracked documents
      for (const [collectionName, ids] of this.tracker.collections) {
        if (ids.size > 0) {
          const collection = mongoose.connection.db!.collection(collectionName);
          const idsArray = Array.from(ids);
          const result = await collection.deleteMany({
            _id: { $in: idsArray as any }
          });
          console.log(`🧹 TEST CLEANUP [${this.testName}]: Deleted ${result.deletedCount} documents from ${collectionName}`);
        }
      }

      // Execute custom cleanups in reverse order (LIFO)
      for (const cleanup of this.tracker.customCleanups.reverse()) {
        await cleanup();
      }

      // Clear the tracker
      this.tracker.collections.clear();
      this.tracker.customCleanups = [];
      
      console.log(`✅ TEST CLEANUP [${this.testName}]: Cleanup completed`);
    } catch (error) {
      console.error(`❌ TEST CLEANUP [${this.testName}]: Cleanup failed:`, error);
      throw error;
    }
  }

  /**
   * Reset the instance (for test isolation)
   */
  reset(): void {
    this.tracker.collections.clear();
    this.tracker.customCleanups = [];
    TestCleanup.instances.delete(this.testName);
  }

  /**
   * Clean up all demo users (useful for auth tests)
   */
  static async cleanupDemoUsers(): Promise<void> {
    console.log('🧹 TEST CLEANUP: Removing demo users...');
    
    const demoUserManager = DemoUserManager.getInstance();
    const demoUsers = demoUserManager.getAllDemoUsers();
    const collection = mongoose.connection.db!.collection('users');
    
    const emails = demoUsers.map(user => user.email);
    const result = await collection.deleteMany({ email: { $in: emails } });
    
    console.log(`🧹 TEST CLEANUP: Removed ${result.deletedCount} demo users`);
  }

  /**
   * Clean up all test data (nuclear option - use with caution)
   */
  static async cleanupAllTestData(): Promise<void> {
    console.log('🧹 TEST CLEANUP: Removing all test data...');
    
    // Define patterns that identify test data
    const testPatterns = {
      users: { email: /@test\./ },
      news: { title: /^TEST:/ },
      courses: { name: /^TEST:/ },
      events: { title: /^TEST:/ },
    };

    for (const [collectionName, pattern] of Object.entries(testPatterns)) {
      try {
        const collection = mongoose.connection.db!.collection(collectionName);
        const result = await collection.deleteMany(pattern);
        if (result.deletedCount > 0) {
          console.log(`🧹 TEST CLEANUP: Removed ${result.deletedCount} test documents from ${collectionName}`);
        }
      } catch (error) {
        console.warn(`⚠️ TEST CLEANUP: Failed to clean ${collectionName}:`, error);
      }
    }
  }

  /**
   * Create a transaction-based test wrapper for automatic cleanup
   */
  static async withTransaction<T>(
    testName: string,
    testFn: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();
    
    try {
      let result: T;
      
      await session.withTransaction(async () => {
        result = await testFn(session);
      });
      
      return result!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Ensure demo users exist for testing
   */
  static async ensureDemoUsers(): Promise<void> {
    const demoUserManager = DemoUserManager.getInstance();
    await demoUserManager.initializeDemoUsers();
  }

  /**
   * Clean specific collection by pattern
   */
  static async cleanCollectionByPattern(
    collectionName: string, 
    pattern: any
  ): Promise<number> {
    const collection = mongoose.connection.db!.collection(collectionName);
    const result = await collection.deleteMany(pattern);
    return result.deletedCount;
  }
}

/**
 * Test cleanup decorator for automatic cleanup after each test
 */
export function withCleanup(testName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cleanup = TestCleanup.getInstance(testName);
      
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        await cleanup.cleanup();
      }
    };
    
    return descriptor;
  };
}

/**
 * Global test hooks for Playwright
 */
export const testCleanupHooks = {
  /**
   * Setup before all tests
   */
  async beforeAll(): Promise<void> {
    console.log('🧹 GLOBAL TEST CLEANUP: Ensuring clean test environment...');
    
    // Connect to dev database
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-dev');
    }
    
    // Clean any leftover test data
    await TestCleanup.cleanupAllTestData();
    
    // Ensure demo users exist
    await TestCleanup.ensureDemoUsers();
  },
  
  /**
   * Cleanup after all tests
   */
  async afterAll(): Promise<void> {
    console.log('🧹 GLOBAL TEST CLEANUP: Final cleanup...');
    
    // Remove demo users
    await TestCleanup.cleanupDemoUsers();
    
    // Clean any remaining test data
    await TestCleanup.cleanupAllTestData();
    
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
};