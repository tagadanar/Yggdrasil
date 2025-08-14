// packages/shared-utilities/src/testing/TestCleanup.ts
// Centralized test cleanup utilities for clean test execution

import mongoose from 'mongoose';
import { connectDatabase } from '@yggdrasil/database-schemas';
import { DemoUserManager } from './DemoUserManager';
import { BrowserContext, Page } from 'playwright';
import { LoggerFactory } from '../logging/logger';

const logger = LoggerFactory.createLogger('test-cleanup');

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
      pages: new Set(),
    };
  }

  /**
   * Get or create a TestCleanup instance for a specific test
   */
  static getInstance(testName: string): TestCleanup {
    // Clear stale instances periodically (every 50 instances)
    if (TestCleanup.instances.size > 50) {
      TestCleanup.clearStaleInstances();
    }

    if (!TestCleanup.instances.has(testName)) {
      TestCleanup.instances.set(testName, new TestCleanup(testName));
    }
    return TestCleanup.instances.get(testName)!;
  }

  /**
   * Clear stale instances from the Map to prevent memory accumulation
   */
  static clearStaleInstances(): void {
    const instanceCount = TestCleanup.instances.size;
    if (instanceCount > 0) {
      logger.info(`🧹 TEST CLEANUP: Clearing ${instanceCount} stale test cleanup instances`);
      TestCleanup.instances.clear();
    }
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
   * Track a document with cascading cleanup for related documents
   */
  trackDocumentWithCascade(collection: string, id: string): void {
    this.trackDocument(collection, id);

    // Add cascading cleanup based on collection type
    if (collection === 'courses') {
      this.addCustomCleanup(async () => {
        await this.cascadeCleanupCourse(id);
      });
    } else if (collection === 'users') {
      this.addCustomCleanup(async () => {
        await this.cascadeCleanupUser(id);
      });
    } else if (collection === 'promotions') {
      this.addCustomCleanup(async () => {
        await this.cascadeCleanupPromotion(id);
      });
    } else if (collection === 'events') {
      this.addCustomCleanup(async () => {
        await this.cascadeCleanupEvent(id);
      });
    }
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
    logger.info(`🧹 TEST CLEANUP [${this.testName}]: Starting cleanup...`);

    try {
      // Clean up browser contexts and pages first
      for (const page of this.tracker.pages) {
        try {
          if (!page.isClosed()) {
            await page.close();
            logger.info(`🧹 TEST CLEANUP [${this.testName}]: Closed tracked page`);
          }
        } catch (error) {
          logger.warn(`⚠️ TEST CLEANUP [${this.testName}]: Failed to close page:`, error);
        }
      }

      for (const context of this.tracker.browserContexts) {
        try {
          await context.close();
          logger.info(`🧹 TEST CLEANUP [${this.testName}]: Closed tracked browser context`);
        } catch (error) {
          logger.warn(`⚠️ TEST CLEANUP [${this.testName}]: Failed to close browser context:`, error);
        }
      }

      // Clean up tracked documents
      for (const [collectionName, ids] of this.tracker.collections) {
        if (ids.size > 0) {
          const collection = mongoose.connection.db!.collection(collectionName);
          const idsArray = Array.from(ids);

          // Convert string IDs to ObjectIds for proper deletion
          const objectIds: mongoose.Types.ObjectId[] = [];
          const stringIds: string[] = [];

          idsArray.forEach(id => {
            try {
              objectIds.push(new mongoose.Types.ObjectId(id));
            } catch (error) {
              logger.warn(`⚠️ TEST CLEANUP [${this.testName}]: Invalid ObjectId format: ${id}, trying as string`);
              stringIds.push(id);
            }
          });

          // Delete using ObjectIds first, then strings if any
          let deletedCount = 0;
          if (objectIds.length > 0) {
            const result = await collection.deleteMany({
              _id: { $in: objectIds },
            });
            deletedCount += result.deletedCount;
          }

          if (stringIds.length > 0) {
            const result = await collection.deleteMany({
              _id: { $in: stringIds as any },
            });
            deletedCount += result.deletedCount;
          }
          logger.info(`🧹 TEST CLEANUP [${this.testName}]: Deleted ${deletedCount} documents from ${collectionName}`);
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

      // CRITICAL FIX: Remove this instance from the static Map to prevent memory leak
      TestCleanup.instances.delete(this.testName);

      logger.info(`✅ TEST CLEANUP [${this.testName}]: Cleanup completed`);
    } catch (error) {
      logger.error(`❌ TEST CLEANUP [${this.testName}]: Cleanup failed:`, error);
      // Still remove instance even on error to prevent memory leak
      TestCleanup.instances.delete(this.testName);
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
   * Cascade cleanup for course-related documents
   */
  private async cascadeCleanupCourse(courseId: string): Promise<void> {
    try {
      const objectId = new mongoose.Types.ObjectId(courseId);

      // Clean up promotion progress entries that reference this course
      const promotionProgress = mongoose.connection.db!.collection('promotion_progress');
      // Use untyped operations to avoid TypeScript strict typing issues
      const progressUpdateResult = await promotionProgress.updateMany(
        { 'coursesProgress.courseId': objectId },
        {
          $pull: {
            coursesProgress: { courseId: objectId },
          } as any,
        },
      );
      
      // Pull from simple array fields
      const simpleProgressUpdateResult = await promotionProgress.updateMany(
        {},
        {
          $pull: {
            coursesCompleted: objectId,
            coursesInProgress: objectId,
            coursesNotStarted: objectId,
          } as any,
        },
      );
      if (progressUpdateResult.modifiedCount > 0 || simpleProgressUpdateResult.modifiedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Updated ${progressUpdateResult.modifiedCount + simpleProgressUpdateResult.modifiedCount} promotion progress records for course ${courseId}`);
      }

      // Clean up exercise submissions
      const submissions = mongoose.connection.db!.collection('exercisesubmissions');
      const submissionResult = await submissions.deleteMany({ courseId: objectId });
      if (submissionResult.deletedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Deleted ${submissionResult.deletedCount} exercise submissions for course ${courseId}`);
      }

      // Clean up course progress records
      const progress = mongoose.connection.db!.collection('courseprogress');
      const progressResult = await progress.deleteMany({ courseId: objectId });
      if (progressResult.deletedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Deleted ${progressResult.deletedCount} progress records for course ${courseId}`);
      }

    } catch (error) {
      logger.warn(`⚠️ CASCADE CLEANUP [${this.testName}]: Failed to cleanup course ${courseId}:`, error);
    }
  }

  /**
   * Cascade cleanup for user-related documents
   */
  private async cascadeCleanupUser(userId: string): Promise<void> {
    try {
      const objectId = new mongoose.Types.ObjectId(userId);

      // Clean up user from promotions
      const promotions = mongoose.connection.db!.collection('promotions');
      const promotionResult = await promotions.updateMany(
        { studentIds: objectId },
        { $pull: { studentIds: objectId } } as any
      );
      if (promotionResult.modifiedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Removed user ${userId} from ${promotionResult.modifiedCount} promotions`);
      }

      // Clean up user's promotion progress
      const promotionProgress = mongoose.connection.db!.collection('promotion_progress');
      const promotionProgressResult = await promotionProgress.deleteMany({ studentId: objectId });
      if (promotionProgressResult.deletedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Deleted ${promotionProgressResult.deletedCount} promotion progress records for user ${userId}`);
      }

      // Clean up event attendance
      const attendance = mongoose.connection.db!.collection('event_attendance');
      const attendanceResult = await attendance.deleteMany({ studentId: objectId });
      if (attendanceResult.deletedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Deleted ${attendanceResult.deletedCount} attendance records for user ${userId}`);
      }

      // Clean up user submissions
      const submissions = mongoose.connection.db!.collection('exercisesubmissions');
      const submissionResult = await submissions.deleteMany({ userId: objectId });
      if (submissionResult.deletedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Deleted ${submissionResult.deletedCount} submissions for user ${userId}`);
      }

      // Clean up user progress
      const progress = mongoose.connection.db!.collection('courseprogress');
      const progressResult = await progress.deleteMany({ userId: objectId });
      if (progressResult.deletedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Deleted ${progressResult.deletedCount} progress records for user ${userId}`);
      }

      // Clean up user sessions
      const sessions = mongoose.connection.db!.collection('sessions');
      const sessionResult = await sessions.deleteMany({ userId: objectId });
      if (sessionResult.deletedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Deleted ${sessionResult.deletedCount} sessions for user ${userId}`);
      }

    } catch (error) {
      logger.warn(`⚠️ CASCADE CLEANUP [${this.testName}]: Failed to cleanup user ${userId}:`, error);
    }
  }

  /**
   * Cascade cleanup for promotion-related documents
   */
  private async cascadeCleanupPromotion(promotionId: string): Promise<void> {
    try {
      const objectId = new mongoose.Types.ObjectId(promotionId);

      // Clean up promotion progress records
      const promotionProgress = mongoose.connection.db!.collection('promotion_progress');
      const progressResult = await promotionProgress.deleteMany({ promotionId: objectId });
      if (progressResult.deletedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Deleted ${progressResult.deletedCount} progress records for promotion ${promotionId}`);
      }

      // Clean up event attendance records
      const attendance = mongoose.connection.db!.collection('event_attendance');
      const attendanceResult = await attendance.deleteMany({ promotionId: objectId });
      if (attendanceResult.deletedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Deleted ${attendanceResult.deletedCount} attendance records for promotion ${promotionId}`);
      }

      // Remove promotion from events
      const events = mongoose.connection.db!.collection('events');
      const eventResult = await events.updateMany(
        { promotionIds: objectId },
        { $pull: { promotionIds: objectId } } as any
      );
      if (eventResult.modifiedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Removed promotion ${promotionId} from ${eventResult.modifiedCount} events`);
      }

      // Remove promotion from user history
      const users = mongoose.connection.db!.collection('users');
      const userResult = await users.updateMany(
        { currentPromotionId: objectId },
        { $unset: { currentPromotionId: 1 } }
      );
      if (userResult.modifiedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Removed current promotion from ${userResult.modifiedCount} users`);
      }

    } catch (error) {
      logger.warn(`⚠️ CASCADE CLEANUP [${this.testName}]: Failed to cleanup promotion ${promotionId}:`, error);
    }
  }

  /**
   * Cascade cleanup for event-related documents
   */
  private async cascadeCleanupEvent(eventId: string): Promise<void> {
    try {
      const objectId = new mongoose.Types.ObjectId(eventId);

      // Clean up event attendance records
      const attendance = mongoose.connection.db!.collection('event_attendance');
      const attendanceResult = await attendance.deleteMany({ eventId: objectId });
      if (attendanceResult.deletedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Deleted ${attendanceResult.deletedCount} attendance records for event ${eventId}`);
      }

      // Remove event from promotions
      const promotions = mongoose.connection.db!.collection('promotions');
      const promotionResult = await promotions.updateMany(
        { eventIds: objectId },
        { $pull: { eventIds: objectId } } as any
      );
      if (promotionResult.modifiedCount > 0) {
        logger.info(`🧹 CASCADE CLEANUP [${this.testName}]: Removed event ${eventId} from ${promotionResult.modifiedCount} promotions`);
      }

    } catch (error) {
      logger.warn(`⚠️ CASCADE CLEANUP [${this.testName}]: Failed to cleanup event ${eventId}:`, error);
    }
  }

  /**
   * Clean up all demo users (useful for auth tests)
   */
  static async cleanupDemoUsers(): Promise<void> {
    logger.info('🧹 TEST CLEANUP: Removing demo users...');

    const demoUserManager = DemoUserManager.getInstance();
    const demoUsers = demoUserManager.getAllDemoUsers();
    const collection = mongoose.connection.db!.collection('users');

    const emails = demoUsers.map(user => user.email);
    const result = await collection.deleteMany({ email: { $in: emails } });

    logger.info(`🧹 TEST CLEANUP: Removed ${result.deletedCount} demo users`);
  }

  /**
   * Clean up all test data (nuclear option - use with caution)
   */
  static async cleanupAllTestData(): Promise<void> {
    logger.info('🧹 TEST CLEANUP: Removing all test data...');

    // Ensure database connection before cleaning
    if (!(await TestCleanup.ensureDatabaseConnection())) {
      logger.warn('⚠️ TEST CLEANUP: Skipping cleanup - no database connection');
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
          logger.info(`🧹 TEST CLEANUP: Removed ${result.deletedCount} test documents from ${collectionName}`);
        }
      } catch (error) {
        logger.warn(`⚠️ TEST CLEANUP: Failed to clean ${collectionName}:`, error);
      }
    }
  }

  /**
   * Create a transaction-based test wrapper for automatic cleanup
   */
  static async withTransaction<T>(
    _testName: string,
    testFn: (session: mongoose.ClientSession) => Promise<T>,
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
        // Try to connect to the dev database if not connected (with authentication)
        await connectDatabase();
      }
      return mongoose.connection.db !== null;
    } catch (error) {
      logger.warn(`⚠️ DATABASE CONNECTION: Could not connect to database: ${error}`);
      return false;
    }
  }

  /**
   * Clean specific collection by pattern
   */
  static async cleanCollectionByPattern(
    collectionName: string,
    pattern: any,
  ): Promise<number> {
    if (!(await TestCleanup.ensureDatabaseConnection())) {
      logger.warn(`⚠️ DATABASE: Skipping cleanup for ${collectionName} - no database connection`);
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
    logger.info(`🔍 TEST VERIFICATION ${logPrefix}: Checking for leftover test data...`);

    try {
      // Ensure database connection before checking
      if (!(await TestCleanup.ensureDatabaseConnection())) {
        logger.warn(`⚠️ TEST VERIFICATION ${logPrefix}: Skipping verification - no database connection`);
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
            logger.warn(`⚠️ TEST VERIFICATION ${logPrefix}: Found ${count} leftover test records in ${collectionName}`);
            foundLeftovers = true;

            // Auto-cleanup leftover data
            const result = await collection.deleteMany(pattern);
            logger.info(`🧹 TEST VERIFICATION ${logPrefix}: Auto-cleaned ${result.deletedCount} leftover records from ${collectionName}`);
          }
        } catch (error) {
          logger.warn(`⚠️ TEST VERIFICATION ${logPrefix}: Failed to check ${collectionName}:`, error);
        }
      }

      if (!foundLeftovers) {
        logger.info(`✅ TEST VERIFICATION ${logPrefix}: Environment is clean`);
      } else {
        logger.debug(`🧹 TEST VERIFICATION ${logPrefix}: Environment cleaned of leftovers`);
      }

      return true; // Always return true after cleanup
    } catch (error) {
      logger.error(`❌ TEST VERIFICATION ${logPrefix}: Verification failed:`, error);
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
        logger.info(`⚡ FAST CLEANUP ${logPrefix}: Skipping - no database connection`);
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
              logger.info(`⚡ FAST CLEANUP ${logPrefix}: Removed ${result.deletedCount} test documents from ${collectionName}`);
            }
          }
        } catch (error) {
          logger.warn(`⚠️ FAST CLEANUP ${logPrefix}: Failed to check ${collectionName}:`, error);
        }
      }

      if (!hasAnyTestData) {
        logger.info(`⚡ FAST CLEANUP ${logPrefix}: Environment already clean`);
      }

    } catch (error) {
      logger.error(`❌ FAST CLEANUP ${logPrefix}: Failed:`, error);
      // Don't throw - fallback to continuing with test
    }
  }

  /**
   * Enhanced getInstance that ensures clean start (OPTIMIZED)
   */
  static async ensureCleanStart(testName: string): Promise<TestCleanup> {
    logger.debug(`🚀 TEST START [${testName}]: Ensuring clean test environment...`);

    // OPTIMIZATION: Use fast cleanup that only removes actual leftover data
    await TestCleanup.fastCleanup(testName);

    logger.info(`✅ TEST START [${testName}]: Clean environment verified`);
    return TestCleanup.getInstance(testName);
  }
}

/**
 * Test cleanup decorator for automatic cleanup after each test
 */
export function withCleanup(testName: string) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
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
    logger.debug('🧹 GLOBAL TEST CLEANUP: Ensuring clean test environment...');

    // Clear any stale TestCleanup instances from previous runs
    TestCleanup.clearStaleInstances();

    // Connect to dev database (with authentication)
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
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
    logger.info('🧹 GLOBAL TEST CLEANUP: Final cleanup...');

    // Remove demo users
    await TestCleanup.cleanupDemoUsers();

    // Clean any remaining test data
    await TestCleanup.cleanupAllTestData();

    // Clear all TestCleanup instances
    TestCleanup.clearStaleInstances();

    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  },
};
