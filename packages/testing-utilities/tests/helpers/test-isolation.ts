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
}

export class TestIsolationManager {
  private static instance: TestIsolationManager;
  private userPools: Map<string, IsolatedTestUser[]> = new Map();
  private usedUsers: Set<string> = new Set();
  private creationLock: Map<string, Promise<void>> = new Map();
  private batchSize = 10; // Pre-create users in batches

  static getInstance(): TestIsolationManager {
    if (!TestIsolationManager.instance) {
      TestIsolationManager.instance = new TestIsolationManager();
    }
    return TestIsolationManager.instance;
  }

  /**
   * Create isolated browser context with unique storage
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
    });
    
    // Disable token sync to prevent cross-test interference
    await page.addInitScript(() => {
      // Override token sync to be a no-op in tests
      if (typeof window !== 'undefined') {
        (window as any).tokenSyncDisabled = true;
      }
    });
  }

  /**
   * Get unique test user for this test run
   */
  async getUniqueTestUser(role: 'admin' | 'teacher' | 'staff' | 'student', testId: string): Promise<IsolatedTestUser> {
    const poolKey = `${role}`;
    
    // Ensure we have a pool for this role
    await this.ensureUserPool(role);
    
    const pool = this.userPools.get(poolKey)!;
    
    // Find available user
    let user = pool.find(u => !this.usedUsers.has(u.id));
    
    if (!user) {
      // If no users available, create more in batch
      await this.createUserBatch(role);
      user = pool.find(u => !this.usedUsers.has(u.id));
      
      if (!user) {
        throw new Error(`No available users for role: ${role}`);
      }
    }
    
    this.usedUsers.add(user.id);
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
   * Create unique test user in database
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
      
      return {
        ...userData,
        id: user._id.toString()
      };
    } catch (error) {
      console.error(`❌ Error creating test user ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Clean up all test users
   */
  async cleanup(): Promise<void> {
    try {
      await connectDatabase();
      
      // Delete all test users
      const testEmailPattern = /^test-.*@test\.yggdrasil\.local$/;
      await UserModel.deleteMany({
        email: { $regex: testEmailPattern }
      });
      
      // Clear internal state
      this.userPools.clear();
      this.usedUsers.clear();
      
      console.log('✅ Test isolation cleanup completed');
    } catch (error) {
      console.error('❌ Test isolation cleanup failed:', error);
    }
  }

  /**
   * Setup isolated test environment
   */
  async setupIsolatedTest(page: Page, testId: string): Promise<void> {
    await this.createIsolatedContext(page);
    // Additional setup can be added here
  }

  /**
   * Cleanup isolated test environment
   */
  async cleanupIsolatedTest(page: Page, testId: string): Promise<void> {
    const context = page.context();
    
    // Clear all browser storage
    await context.clearCookies();
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
    });
    
    // Release any users used by this test
    // This would be called from the test cleanup
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