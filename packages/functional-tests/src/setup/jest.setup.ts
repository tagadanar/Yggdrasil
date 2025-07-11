/**
 * Jest setup file for functional tests
 * Configures global test environment, database, and cleanup
 */

import dotenv from 'dotenv';
import { databaseHelper } from '../utils/DatabaseHelper';
import { authHelper } from '../utils/AuthHelper';
import { testEnvironment, validateEnvironment } from '../config/environment';

// Load environment variables
dotenv.config();

// Global test timeout
jest.setTimeout(30000);

// Global setup before all tests
beforeAll(async () => {
  try {
    // Only show setup messages in verbose mode
    if (testEnvironment.logging.level === 'debug') {
      console.log('🚀 Starting functional test suite setup...');
    }
    
    // Validate environment
    validateEnvironment();
    
    // Connect to test database
    await databaseHelper.connect();
    
    // Create test indexes
    await databaseHelper.createTestIndexes();
    
    // Initial cleanup (silent)
    if (testEnvironment.database.cleanup) {
      await databaseHelper.cleanupTestData(true);
    }
    
    if (testEnvironment.logging.level === 'debug') {
      console.log('✅ Functional test suite setup completed');
    }
  } catch (error: any) {
    console.error('❌ Functional test suite setup failed:', error.message);
    throw error;
  }
});

// Global cleanup after all tests
afterAll(async () => {
  try {
    if (testEnvironment.logging.level === 'debug') {
      console.log('🧹 Starting functional test suite cleanup...');
    }
    
    // Clean up auth helper
    await authHelper.cleanup();
    
    // Clean up database (silent)
    if (testEnvironment.database.cleanup) {
      await databaseHelper.cleanupTestData(true);
    }
    
    // Disconnect from database
    await databaseHelper.disconnect();
    
    if (testEnvironment.logging.level === 'debug') {
      console.log('✅ Functional test suite cleanup completed');
    }
  } catch (error: any) {
    console.error('❌ Functional test suite cleanup failed:', error.message);
    // Don't throw error in cleanup to avoid hiding original test failures
  }
});

// Setup before each test
beforeEach(async () => {
  // Clean up test data before each test to ensure isolation (silent to reduce noise)
  // NOTE: This is too aggressive and interferes with test setup in beforeAll
  // Individual test files should handle their own cleanup as needed
  // if (testEnvironment.database.cleanup) {
  //   await databaseHelper.cleanupTestData(true); // Silent cleanup
  // }
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidApiResponse(): R;
      toBeSuccessResponse(): R;
      toBeErrorResponse(): R;
      toHaveValidToken(): R;
      toHaveValidUser(): R;
      toBeOneOf(expected: any[]): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidApiResponse(received: any) {
    const pass = received && 
      typeof received === 'object' && 
      typeof received.success === 'boolean';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid API response with success field`,
        pass: false,
      };
    }
  },

  toBeSuccessResponse(received: any) {
    const pass = received && 
      typeof received === 'object' && 
      received.success === true &&
      received.data !== undefined;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a success response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a success response with data`,
        pass: false,
      };
    }
  },

  toBeErrorResponse(received: any) {
    const pass = received && 
      typeof received === 'object' && 
      received.success === false &&
      received.error !== undefined;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be an error response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be an error response with error field`,
        pass: false,
      };
    }
  },

  toHaveValidToken(received: any) {
    const pass = received && 
      typeof received === 'object' && 
      typeof received.accessToken === 'string' &&
      typeof received.refreshToken === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have valid tokens`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have valid token structure`,
        pass: false,
      };
    }
  },

  toHaveValidUser(received: any) {
    const pass = received && 
      typeof received === 'object' && 
      (typeof received.id === 'string' || typeof received._id === 'string') &&
      typeof received.email === 'string' &&
      typeof received.role === 'string' &&
      received.profile &&
      typeof received.profile.firstName === 'string' &&
      typeof received.profile.lastName === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have valid user structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have valid user structure`,
        pass: false,
      };
    }
  },
  
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${JSON.stringify(expected)}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${JSON.stringify(expected)}`,
        pass: false,
      };
    }
  },
});

// Test environment info - only show once and only in debug mode
if (typeof global !== 'undefined' && testEnvironment.logging.level === 'debug' && !(global as any).__YGGDRASIL_TEST_ENV_LOGGED) {
  console.log('🧪 Functional Test Environment Configuration:');
  console.log(`  Database: ${testEnvironment.database.uri}`);
  console.log(`  Auth Service: ${testEnvironment.services.auth}`);
  console.log(`  User Service: ${testEnvironment.services.user}`);
  console.log(`  Course Service: ${testEnvironment.services.course}`);
  console.log(`  Planning Service: ${testEnvironment.services.planning}`);
  console.log(`  News Service: ${testEnvironment.services.news}`);
  console.log(`  Statistics Service: ${testEnvironment.services.statistics}`);
  console.log(`  Notification Service: ${testEnvironment.services.notification}`);
  console.log(`  Frontend: ${testEnvironment.services.frontend}`);
  console.log(`  Cleanup: ${testEnvironment.database.cleanup ? 'enabled' : 'disabled'}`);
  console.log(`  Logging: ${testEnvironment.logging.level}`);
  console.log('');
  
  // Mark as logged to prevent duplicate output
  (global as any).__YGGDRASIL_TEST_ENV_LOGGED = true;
}

export {
  databaseHelper,
  authHelper,
  testEnvironment,
};