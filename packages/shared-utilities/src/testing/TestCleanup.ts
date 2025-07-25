// packages/shared-utilities/src/testing/TestCleanup.ts
// Centralized test cleanup utilities for clean test execution

import mongoose from 'mongoose';
import { DemoUserManager } from './DemoUserManager';
import { BrowserContext, Page } from 'playwright';

export interface CleanupTracker {
  collections: Map<string, Set<string>>; // collection -> ids to delete
  customCleanups: Array<() => Promise<void>>;
  browserContexts: Set<BrowserContext>; // browser contexts to close
  pages: Set<Page>; // additional pages to close
}

export class TestCleanup {
  private static instances = new Map<string, TestCleanup>();
  private tracker: CleanupTracker;
  private testName: string;
  
  private constructor(testName: string) {
    this.testName = testName;
    this.tracker = {
      collections: new Map(),
      customCleanups: [],
      browserContexts: new Set(),
      pages: new Set()
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
   * Track a browser context for cleanup
   */
  trackBrowserContext(context: BrowserContext): void {
    this.tracker.browserContexts.add(context);
  }

  /**
   * Track a page for cleanup
   */
  trackPage(page: Page): void {
    this.tracker.pages.add(page);
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
      // Clean up browser contexts and pages first
      for (const page of this.tracker.pages) {
        try {
          if (!page.isClosed()) {
            await page.close();
            console.log(`🧹 TEST CLEANUP [${this.testName}]: Closed tracked page`);
          }
        } catch (error) {
          console.warn(`⚠️ TEST CLEANUP [${this.testName}]: Failed to close page:`, error);
        }
      }

      for (const context of this.tracker.browserContexts) {
        try {
          await context.close();
          console.log(`🧹 TEST CLEANUP [${this.testName}]: Closed tracked browser context`);
        } catch (error) {
          console.warn(`⚠️ TEST CLEANUP [${this.testName}]: Failed to close browser context:`, error);
        }
      }

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
      this.tracker.browserContexts.clear();
      this.tracker.pages.clear();
      
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
    this.tracker.browserContexts.clear();
    this.tracker.pages.clear();
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
    
    // Ensure database connection before cleaning
    if (!(await TestCleanup.ensureDatabaseConnection())) {
      console.warn(`⚠️ TEST CLEANUP: Skipping cleanup - no database connection`);
      return;
    }
    
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
   * Ensure database connection is available
   */
  private static async ensureDatabaseConnection(): Promise<boolean> {
    try {
      if (mongoose.connection.readyState !== 1) {
        // Try to connect to the dev database if not connected
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-dev';
        await mongoose.connect(mongoUri);
      }
      return mongoose.connection.db !== null;
    } catch (error) {
      console.warn(`⚠️ DATABASE CONNECTION: Could not connect to database: ${error}`);
      return false;
    }
  }

  /**
   * Clean specific collection by pattern
   */
  static async cleanCollectionByPattern(
    collectionName: string, 
    pattern: any
  ): Promise<number> {
    if (!(await TestCleanup.ensureDatabaseConnection())) {
      console.warn(`⚠️ DATABASE: Skipping cleanup for ${collectionName} - no database connection`);
      return 0;
    }
    
    const collection = mongoose.connection.db!.collection(collectionName);
    const result = await collection.deleteMany(pattern);
    return result.deletedCount;
  }

  /**
   * Verify clean test environment before test starts
   */
  static async verifyCleanEnvironment(testName?: string): Promise<boolean> {
    const logPrefix = testName ? `[${testName}]` : '';
    console.log(`🔍 TEST VERIFICATION ${logPrefix}: Checking for leftover test data...`);
    
    try {
      // Ensure database connection before checking
      if (!(await TestCleanup.ensureDatabaseConnection())) {
        console.warn(`⚠️ TEST VERIFICATION ${logPrefix}: Skipping verification - no database connection`);
        return true; // Consider it clean if we can't check
      }

      // Define patterns that identify test data
      const testPatterns = {
        users: { email: /@test\./ },
        news: { title: /^TEST:/ },
        courses: { name: /^TEST:/ },
        events: { title: /^TEST:/ },
      };

      let foundLeftovers = false;
      for (const [collectionName, pattern] of Object.entries(testPatterns)) {
        try {
          const collection = mongoose.connection.db!.collection(collectionName);
          const count = await collection.countDocuments(pattern);
          if (count > 0) {
            console.warn(`⚠️ TEST VERIFICATION ${logPrefix}: Found ${count} leftover test records in ${collectionName}`);
            foundLeftovers = true;
            
            // Auto-cleanup leftover data
            const result = await collection.deleteMany(pattern);
            console.log(`🧹 TEST VERIFICATION ${logPrefix}: Auto-cleaned ${result.deletedCount} leftover records from ${collectionName}`);
          }
        } catch (error) {
          console.warn(`⚠️ TEST VERIFICATION ${logPrefix}: Failed to check ${collectionName}:`, error);
        }
      }

      if (!foundLeftovers) {
        console.log(`✅ TEST VERIFICATION ${logPrefix}: Environment is clean`);
      } else {
        console.log(`🧹 TEST VERIFICATION ${logPrefix}: Environment cleaned of leftovers`);
      }

      return true; // Always return true after cleanup
    } catch (error) {
      console.error(`❌ TEST VERIFICATION ${logPrefix}: Verification failed:`, error);
      return false;
    }
  }

  /**
   * Get or create a TestCleanup instance with clean environment verification
   */
  static async getInstanceWithVerification(testName: string): Promise<TestCleanup> {
    await TestCleanup.verifyCleanEnvironment(testName);
    return TestCleanup.getInstance(testName);
  }

  /**
   * Fast cleanup - only removes actual leftover data without full scans (OPTIMIZED)
   */
  static async fastCleanup(testName?: string): Promise<void> {
    const logPrefix = testName ? `[${testName}]` : '';
    
    try {
      // Quick database connection check
      if (!(await TestCleanup.ensureDatabaseConnection())) {
        console.log(`⚡ FAST CLEANUP ${logPrefix}: Skipping - no database connection`);
        return;
      }

      // OPTIMIZATION: Use limit(1) for quick existence checks instead of full counts
      const testPatterns = {
        users: { email: /@test\./ },
        news: { title: /^TEST:/ },
        courses: { name: /^TEST:/ },
        events: { title: /^TEST:/ },
      };

      let hasAnyTestData = false;
      
      // Quick check: do we have any test data at all?
      for (const [collectionName, pattern] of Object.entries(testPatterns)) {
        try {
          const collection = mongoose.connection.db!.collection(collectionName);
          const hasTestData = await collection.findOne(pattern, { projection: { _id: 1 } });
          
          if (hasTestData) {
            hasAnyTestData = true;
            // Only clean this specific collection if it has test data
            const result = await collection.deleteMany(pattern);
            if (result.deletedCount > 0) {
              console.log(`⚡ FAST CLEANUP ${logPrefix}: Removed ${result.deletedCount} test documents from ${collectionName}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ FAST CLEANUP ${logPrefix}: Failed to check ${collectionName}:`, error);
        }
      }

      if (!hasAnyTestData) {
        console.log(`⚡ FAST CLEANUP ${logPrefix}: Environment already clean`);
      }
      
    } catch (error) {
      console.error(`❌ FAST CLEANUP ${logPrefix}: Failed:`, error);
      // Don't throw - fallback to continuing with test
    }
  }

  /**
   * Enhanced getInstance that ensures clean start (OPTIMIZED)
   */
  static async ensureCleanStart(testName: string): Promise<TestCleanup> {
    console.log(`🚀 TEST START [${testName}]: Ensuring clean test environment...`);
    
    // OPTIMIZATION: Use fast cleanup that only removes actual leftover data
    await TestCleanup.fastCleanup(testName);
    
    console.log(`✅ TEST START [${testName}]: Clean environment verified`);
    return TestCleanup.getInstance(testName);
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