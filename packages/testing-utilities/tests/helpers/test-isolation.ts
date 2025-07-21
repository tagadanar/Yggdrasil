// packages/testing-utilities/tests/helpers/test-isolation.ts
// Test isolation utilities for parallel execution

import { Page, BrowserContext } from '@playwright/test';
import { connectDatabase, UserModel } from '@yggdrasil/database-schemas';

export interface IsolatedTestUser {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'staff' | 'student';
  profile: {
    firstName: string;
    lastName: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

export class TestIsolationManager {
  private static instance: TestIsolationManager;
  // Track test users per test ID for immediate cleanup
  private testUsers: Map<string, IsolatedTestUser[]> = new Map();

  static getInstance(): TestIsolationManager {
    if (!TestIsolationManager.instance) {
      TestIsolationManager.instance = new TestIsolationManager();
    }
    return TestIsolationManager.instance;
  }

  /**
   * Create isolated browser context with unique storage (ENHANCED: Better isolation)
   */
  async createIsolatedContext(page: Page): Promise<void> {
    const context = page.context();
    
    // Clear all existing storage
    await context.clearCookies();
    await context.clearPermissions();
    
    // Clear localStorage and sessionStorage with error handling
    await page.evaluate(() => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
      } catch (error) {
        console.log('Could not clear localStorage:', error);
      }
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      } catch (error) {
        console.log('Could not clear sessionStorage:', error);
      }
      try {
        // Clear any cached authentication state
        if (typeof window !== 'undefined' && window.caches) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
      } catch (error) {
        console.log('Could not clear caches:', error);
      }
    });
    
    // Disable token sync to prevent cross-test interference
    await page.addInitScript(() => {
      // Override token sync to be a no-op in tests
      if (typeof window !== 'undefined') {
        (window as any).tokenSyncDisabled = true;
      }
    });
    
    // Navigate to blank page to reset state
    await page.goto('about:blank');
    
    // Wait for state to settle
    await page.waitForTimeout(100);
  }

  /**
   * Get isolated test user for specific test
   */
  async getIsolatedTestUser(role: 'admin' | 'teacher' | 'staff' | 'student', testId: string): Promise<IsolatedTestUser> {
    // Create fresh user for this specific test
    const user = await this.createFreshTestUser(role, testId);
    
    // Track user for cleanup
    const testUsers = this.testUsers.get(testId) || [];
    testUsers.push(user);
    this.testUsers.set(testId, testUsers);
    
    return user;
  }

  /**
   * Create fresh test user for each test (Replaces deprecated user pool system)
   */
  private async createFreshTestUser(role: 'admin' | 'teacher' | 'staff' | 'student', testId: string): Promise<IsolatedTestUser> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    const userData = {
      id: `test-${testId}-${role}-${timestamp}-${randomId}`,
      email: `test-${testId}-${role}-${timestamp}-${randomId}@test.yggdrasil.local`,
      password: 'TestPassword123!',
      role: role,
      profile: {
        firstName: `Test${role.charAt(0).toUpperCase() + role.slice(1)}`,
        lastName: `User${testId}`
      }
    };

    try {
      // Connect to database if not already connected
      await connectDatabase();
      
      // Create user in database
      const user = new UserModel({
        email: userData.email,
        password: userData.password,
        role: userData.role,
        profile: userData.profile,
        isActive: true
      });
      
      await user.save();
      
      // Verify user was created and can be found
      const verifyUser = await UserModel.findByEmail(userData.email);
      if (!verifyUser) {
        throw new Error(`Test user not found after creation: ${userData.email}`);
      }
      
      return {
        ...userData,
        id: user._id.toString()
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clean up all test users (ENHANCED: Global cleanup with better tracking)
   */
  async cleanup(): Promise<void> {
    try {
      await connectDatabase();
      
      // Delete all test users
      const testEmailPattern = /^test-.*@test\.yggdrasil\.local$/;
      const deletedUsers = await UserModel.deleteMany({
        email: { $regex: testEmailPattern }
      });
      
      // Clear internal state
      this.testUsers.clear();
      
      console.log(`✅ Test isolation cleanup completed (deleted ${deletedUsers.deletedCount} users)`);
    } catch (error) {
      console.error('❌ Test isolation cleanup failed:', error);
    }
  }

  /**
   * Clean up test users for specific test (ENHANCED: Immediate cleanup)
   */
  private async cleanupTestUsers(testId: string): Promise<void> {
    const users = this.testUsers.get(testId) || [];
    
    if (users.length === 0) {
      return;
    }
    
    try {
      await connectDatabase();
      
      // Delete all test users for this specific test
      const userIds = users.map(user => user.id);
      await UserModel.deleteMany({ _id: { $in: userIds } });
      
      // Clear from memory
      this.testUsers.delete(testId);
      
      console.log(`✅ Test isolation: Cleaned up ${users.length} users for test ${testId}`);
    } catch (error) {
      console.error(`❌ Test isolation: Failed to clean up users for test ${testId}:`, error);
    }
  }

  /**
   * Prepare test environment (ENHANCED: Per-test isolation)
   */
  async prepareTestEnvironment(testId: string): Promise<void> {
    // Clear any existing users for this test ID
    await this.cleanupTestUsers(testId);
    
    // Initialize clean test user tracking
    this.testUsers.set(testId, []);
  }

  /**
   * Finalize test environment (ENHANCED: Immediate cleanup after test)
   */
  async finalizeTestEnvironment(testId: string): Promise<void> {
    await this.cleanupTestUsers(testId);
  }
}

// Export singleton instance
export const testIsolationManager = TestIsolationManager.getInstance();