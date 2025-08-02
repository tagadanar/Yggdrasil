// packages/shared-utilities/src/testing/TestInitializer.ts
// Centralized test initialization with automatic setup

import { DemoUserManager } from './DemoUserManager';
import { LoggerFactory } from '../logging/logger';
import { getTestDatabaseConnectionString } from '../database/test-database-manager';

const logger = LoggerFactory.createLogger('test-initializer');

export interface TestInitializationOptions {
  ensureDemoUsers?: boolean;
  verifyDemoUsers?: boolean;
  connectionString?: string;
  debug?: boolean;
}

export class TestInitializer {
  private static initialized = false;
  private static initializationPromise: Promise<void> | null = null;

  /**
   * Initialize test environment with all necessary setup
   */
  static async initialize(options: TestInitializationOptions = {}): Promise<void> {
    // Prevent multiple simultaneous initializations
    if (TestInitializer.initializationPromise) {
      return TestInitializer.initializationPromise;
    }

    if (TestInitializer.initialized && !options.verifyDemoUsers) {
      return;
    }

    TestInitializer.initializationPromise = TestInitializer.performInitialization(options);
    await TestInitializer.initializationPromise;
    TestInitializer.initializationPromise = null;
  }

  private static async performInitialization(options: TestInitializationOptions): Promise<void> {
    const {
      ensureDemoUsers = true,
      verifyDemoUsers = true,
      connectionString, // Use environment-based authenticated connection
      debug = false,
    } = options;

    // Always use authenticated connection string for tests
    const dbConnectionString = connectionString || getTestDatabaseConnectionString();

    try {
      if (debug) {
        logger.info('🚀 TEST INITIALIZER: Starting test environment initialization...');
      }

      if (ensureDemoUsers || verifyDemoUsers) {
        const demoUserManager = DemoUserManager.getInstance();

        if (debug) {
          console.log('🚀 TEST INITIALIZER: Database setup:', {
            connectionString: dbConnectionString,
            usingAuthenticated: !connectionString, // True if we're using our authenticated connection
          });
        }

        if (ensureDemoUsers) {
          if (debug) {
            logger.info('🚀 TEST INITIALIZER: Ensuring demo users are set up...');
          }
          await demoUserManager.initializeDemoUsers(dbConnectionString);
        }

        if (verifyDemoUsers) {
          if (debug) {
            logger.info('🚀 TEST INITIALIZER: Verifying demo users...');
          }
          const allValid = await demoUserManager.verifyDemoUsers(dbConnectionString);

          if (!allValid) {
            if (debug) {
              logger.error('🚀 TEST INITIALIZER: Demo user verification failed, re-initializing...');
            }
            await demoUserManager.initializeDemoUsers(dbConnectionString);

            // Verify again
            const reVerified = await demoUserManager.verifyDemoUsers(dbConnectionString);
            if (!reVerified) {
              throw new Error('Demo user setup failed after re-initialization');
            }
          }
        }
      }

      TestInitializer.initialized = true;

      if (debug) {
        logger.info('✅ TEST INITIALIZER: Test environment initialization completed successfully');
      }

    } catch (error) {
      TestInitializer.initialized = false;
      logger.error('❌ TEST INITIALIZER: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Reset initialization status (for testing or forced re-initialization)
   */
  static reset(): void {
    TestInitializer.initialized = false;
    TestInitializer.initializationPromise = null;
  }

  /**
   * Check if test environment has been initialized
   */
  static isInitialized(): boolean {
    return TestInitializer.initialized;
  }

  /**
   * Quick setup for common test scenarios
   */
  static async quickSetup(debug: boolean = false): Promise<void> {
    await TestInitializer.initialize({
      ensureDemoUsers: true,
      verifyDemoUsers: true,
      debug,
    });
  }

  /**
   * Setup for global test initialization (called once per test run)
   */
  static async globalSetup(debug: boolean = false): Promise<void> {
    await TestInitializer.initialize({
      ensureDemoUsers: true,
      verifyDemoUsers: true,
      debug,
    });
  }

  /**
   * Minimal setup for tests that don't need demo users
   */
  static async minimalSetup(): Promise<void> {
    await TestInitializer.initialize({
      ensureDemoUsers: false,
      verifyDemoUsers: false,
      debug: false,
    });
  }
}
