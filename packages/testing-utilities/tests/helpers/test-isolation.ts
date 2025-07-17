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
  // NEW: Track test users per test ID for immediate cleanup
  private testUsers: Map<string, IsolatedTestUser[]> = new Map();
  // DEPRECATED: User pools replaced with fresh user creation
  private userPools: Map<string, IsolatedTestUser[]> = new Map();
  private usedUsers: Set<string> = new Set();
  private creationLock: Map<string, Promise<void>> = new Map();
  private batchSize = 50; // Pre-create users in batches - increased for full test suite

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
   * Get unique test user for this test run (ENHANCED: Fresh user creation)
   */
  async getUniqueTestUser(role: 'admin' | 'teacher' | 'staff' | 'student', testId: string): Promise<IsolatedTestUser> {
    // NEW: Create fresh user for each test instead of using pools
    const user = await this.createFreshTestUser(role, testId);
    
    // Track user for this specific test
    const testUsers = this.testUsers.get(testId) || [];
    testUsers.push(user);
    this.testUsers.set(testId, testUsers);
    
    return user;
  }

  /**
   * Ensure user pool exists and is populated
   */
  private async ensureUserPool(role: 'admin' | 'teacher' | 'staff' | 'student'): Promise<void> {
    const poolKey = role;
    
    if (!this.userPools.has(poolKey)) {
      this.userPools.set(poolKey, []);
    }
    
    const pool = this.userPools.get(poolKey)!;
    
    // If pool is empty or low, create batch
    if (pool.length === 0) {
      await this.createUserBatch(role);
    }
  }

  /**
   * Create batch of users for a role
   */
  private async createUserBatch(role: 'admin' | 'teacher' | 'staff' | 'student'): Promise<void> {
    const poolKey = role;
    
    // Prevent concurrent batch creation for same role
    if (this.creationLock.has(poolKey)) {
      await this.creationLock.get(poolKey);
      return;
    }
    
    const creationPromise = this.performBatchCreation(role);
    this.creationLock.set(poolKey, creationPromise);
    
    try {
      await creationPromise;
    } finally {
      this.creationLock.delete(poolKey);
    }
  }

  /**
   * Perform actual batch creation
   */
  private async performBatchCreation(role: 'admin' | 'teacher' | 'staff' | 'student'): Promise<void> {
    const poolKey = role;
    const pool = this.userPools.get(poolKey)!;
    
    const users: IsolatedTestUser[] = [];
    
    for (let i = 0; i < this.batchSize; i++) {
      const user = await this.createUniqueTestUser(role, pool.length + i);
      users.push(user);
    }
    
    // Add all users to pool at once
    pool.push(...users);
  }

  /**
   * Release test user back to pool
   */
  releaseTestUser(user: IsolatedTestUser): void {
    this.usedUsers.delete(user.id);
  }

  /**
   * Create fresh test user for specific test (ENHANCED: Per-test user creation with throttling)
   */
  private async createFreshTestUser(role: 'admin' | 'teacher' | 'staff' | 'student', testId: string): Promise<IsolatedTestUser> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    const userData = {
      id: `test-${role}-${testId}-${timestamp}-${randomId}`,
      email: `test-${role}-${testId}-${timestamp}-${randomId}@test.yggdrasil.local`,
      password: 'TestPassword123!',
      role: role,
      profile: {
        firstName: `Test${role.charAt(0).toUpperCase() + role.slice(1)}`,
        lastName: `${testId.substring(0, 8)}`
      }
    };

    try {
      // Connect to database if not already connected
      await connectDatabase();
      
      // Add small delay to prevent database overload in batch mode
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
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
      
      // Add small delay after creation to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return {
        ...userData,
        id: user._id.toString()
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create unique test user in database (DEPRECATED: Use createFreshTestUser)
   */
  private async createUniqueTestUser(role: 'admin' | 'teacher' | 'staff' | 'student', index: number): Promise<IsolatedTestUser> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    const userData = {
      id: `test-${role}-${timestamp}-${index}-${randomId}`,
      email: `test-${role}-${timestamp}-${index}-${randomId}@test.yggdrasil.local`,
      password: 'TestPassword123!',
      role: role,
      profile: {
        firstName: `Test${role.charAt(0).toUpperCase() + role.slice(1)}`,
        lastName: `User${index + 1}`
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
      this.userPools.clear();
      this.usedUsers.clear();
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
      
      // Remove from used users set
      users.forEach(user => this.usedUsers.delete(user.id));
      
    } catch (error) {
      console.error(`❌ Failed to cleanup test users for ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Verify cleanup completion (ENHANCED: Verification barrier)
   */
  private async verifyCleanupComplete(testId: string): Promise<void> {
    try {
      await connectDatabase();
      
      // Verify no test users remain for this test
      const remainingUsers = await UserModel.countDocuments({
        email: { $regex: new RegExp(`test-.*-${testId}-.*@test\.yggdrasil\.local$`) }
      });
      
      if (remainingUsers > 0) {
        throw new Error(`Test cleanup failed: ${remainingUsers} test users still exist for ${testId}`);
      }
    } catch (error) {
      console.error(`❌ Cleanup verification failed for ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Setup isolated test environment (ENHANCED: Initialize test tracking)
   */
  async setupIsolatedTest(page: Page, testId: string): Promise<void> {
    await this.createIsolatedContext(page);
    
    // Initialize empty user list for this test
    this.testUsers.set(testId, []);
  }

  /**
   * Cleanup isolated test environment (ENHANCED: Immediate cleanup with barriers)
   */
  async cleanupIsolatedTest(page: Page, testId: string): Promise<void> {
    try {
      // Step 1: Clear browser state
      await this.clearBrowserState(page);
      
      // Step 2: Clean up test users with verification
      await this.cleanupTestUsers(testId);
      
      // Step 3: Verify cleanup completion
      await this.verifyCleanupComplete(testId);
      
      // Step 4: Add synchronization delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Test cleanup failed for ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Clear browser state (ENHANCED: Comprehensive browser cleanup)
   */
  private async clearBrowserState(page: Page): Promise<void> {
    const context = page.context();
    
    // Clear all browser storage
    await context.clearCookies();
    await context.clearPermissions();
    
    // Clear storage with enhanced cleanup
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
    
    // Navigate to blank page to reset state
    await page.goto('about:blank');
    
    // Wait for state to settle
    await page.waitForTimeout(100);
  }
}

// Global cleanup for all tests
export async function globalTestCleanup(): Promise<void> {
  const manager = TestIsolationManager.getInstance();
  await manager.cleanup();
}

// Utility to generate unique test ID
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}