// packages/testing-utilities/tests/helpers/enhanced-isolated-auth.helpers.ts
// Enhanced isolated authentication helpers for ultra-robust 4-worker parallelization

import { Page, expect } from '@playwright/test';
import { EnhancedAuthHelpers, EnhancedTestInfo, EnhancedIsolatedUser } from './enhanced-test-isolation';

/**
 * Enhanced Isolated Auth Helpers
 * Drop-in replacement for existing IsolatedAuthHelpers with enhanced isolation
 */
export class EnhancedIsolatedAuthHelpers {
  private enhancedAuthHelpers: EnhancedAuthHelpers;
  private currentUser: EnhancedIsolatedUser | null = null;
  private isInitialized = false;

  constructor(private page: Page) {
    this.enhancedAuthHelpers = new EnhancedAuthHelpers(page);
  }

  /**
   * Initialize isolated test environment
   */
  async initialize(testInfo?: Partial<EnhancedTestInfo>): Promise<void> {
    if (this.isInitialized) return;

    // Auto-detect test information from stack trace if not provided
    const detectedTestInfo = testInfo || this.detectTestInfo();
    
    await this.enhancedAuthHelpers.initialize({
      suiteName: detectedTestInfo.suiteName || 'Unknown Suite',
      testName: detectedTestInfo.testName || 'Unknown Test',
      testFile: detectedTestInfo.testFile || 'unknown.spec.ts',
      userRole: detectedTestInfo.userRole
    });

    this.isInitialized = true;
  }

  /**
   * Cleanup isolated test environment
   */
  async cleanup(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await this.enhancedAuthHelpers.cleanup();
      this.currentUser = null;
      this.isInitialized = false;
    } catch (error) {
      console.error('Enhanced auth helpers cleanup failed:', error);
      // Continue with cleanup to avoid hanging tests
    }
  }

  /**
   * Login as isolated admin user
   */
  async loginAsAdmin(): Promise<void> {
    await this.ensureInitialized();
    this.currentUser = await this.enhancedAuthHelpers.loginAsAdmin();
  }

  /**
   * Login as isolated teacher user
   */
  async loginAsTeacher(): Promise<void> {
    await this.ensureInitialized();
    this.currentUser = await this.enhancedAuthHelpers.loginAsTeacher();
  }

  /**
   * Login as isolated staff user
   */
  async loginAsStaff(): Promise<void> {
    await this.ensureInitialized();
    this.currentUser = await this.enhancedAuthHelpers.loginAsStaff();
  }

  /**
   * Login as isolated student user
   */
  async loginAsStudent(): Promise<void> {
    await this.ensureInitialized();
    this.currentUser = await this.enhancedAuthHelpers.loginAsStudent();
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    await this.ensureInitialized();
    await this.enhancedAuthHelpers.logout();
    this.currentUser = null;
  }

  /**
   * Get current user information
   */
  getCurrentUser(): EnhancedIsolatedUser | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser?.isAuthenticated || false;
  }

  /**
   * Get current user role
   */
  getCurrentUserRole(): string | null {
    return this.currentUser?.role || null;
  }

  /**
   * Get current user email
   */
  getCurrentUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  /**
   * Get worker ID for testing
   */
  getWorkerId(): number {
    return this.enhancedAuthHelpers.getWorkerId();
  }

  /**
   * Get database info for testing
   */
  getDatabaseInfo(): any {
    return this.enhancedAuthHelpers.getDatabaseInfo();
  }

  /**
   * Get test isolation manager for testing
   */
  get testIsolationManager(): any {
    return this.enhancedAuthHelpers.testIsolationManager;
  }

  /**
   * Ensure helpers are initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Auto-detect test information from stack trace
   */
  private detectTestInfo(): EnhancedTestInfo {
    const error = new Error();
    const stack = error.stack || '';
    
    // Try to extract test file and test name from stack trace
    const stackLines = stack.split('\n');
    let testFile = 'unknown.spec.ts';
    let suiteName = 'Unknown Suite';
    let testName = 'Unknown Test';
    
    // Look for .spec.ts files in the stack trace
    for (const line of stackLines) {
      const specMatch = line.match(/([^\/\\]+\.spec\.ts)/);
      if (specMatch) {
        testFile = specMatch[1];
        break;
      }
    }

    // Try to extract test name from the current test context
    // This is a best-effort approach
    if (typeof process !== 'undefined' && process.env.TEST_NAME) {
      testName = process.env.TEST_NAME;
    }

    if (typeof process !== 'undefined' && process.env.SUITE_NAME) {
      suiteName = process.env.SUITE_NAME;
    }

    return {
      suiteName,
      testName,
      testFile
    };
  }
}

/**
 * Enhanced Auth Helpers Factory
 * Creates enhanced auth helpers with better error handling
 */
export class EnhancedAuthHelpersFactory {
  /**
   * Create enhanced auth helpers with automatic initialization
   */
  static async create(page: Page, testInfo?: Partial<EnhancedTestInfo>): Promise<EnhancedIsolatedAuthHelpers> {
    const helpers = new EnhancedIsolatedAuthHelpers(page);
    await helpers.initialize(testInfo);
    return helpers;
  }

  /**
   * Create enhanced auth helpers with custom configuration
   */
  static async createWithConfig(
    page: Page,
    config: {
      suiteName: string;
      testName: string;
      testFile: string;
      userRole?: string;
      autoCleanup?: boolean;
    }
  ): Promise<EnhancedIsolatedAuthHelpers> {
    const helpers = new EnhancedIsolatedAuthHelpers(page);
    
    await helpers.initialize({
      suiteName: config.suiteName,
      testName: config.testName,
      testFile: config.testFile,
      userRole: config.userRole
    });

    // Setup auto-cleanup if requested
    if (config.autoCleanup !== false) {
      // Add cleanup handler for page close
      page.on('close', async () => {
        await helpers.cleanup();
      });
    }

    return helpers;
  }
}

/**
 * Enhanced Test Utilities
 * Additional utilities for enhanced testing
 */
export class EnhancedTestUtils {
  /**
   * Create test context from Playwright test info
   */
  static createTestContext(testInfo: any): EnhancedTestInfo {
    return {
      suiteName: testInfo.titlePath[0] || 'Unknown Suite',
      testName: testInfo.title || 'Unknown Test',
      testFile: testInfo.file?.split('/').pop() || 'unknown.spec.ts'
    };
  }

  /**
   * Wrap test function with enhanced isolation
   */
  static withEnhancedIsolation(
    testFn: (helpers: EnhancedIsolatedAuthHelpers) => Promise<void>
  ) {
    return async (page: Page, testInfo?: any) => {
      const helpers = await EnhancedAuthHelpersFactory.create(
        page,
        testInfo ? EnhancedTestUtils.createTestContext(testInfo) : undefined
      );

      try {
        await testFn(helpers);
      } finally {
        await helpers.cleanup();
      }
    };
  }

  /**
   * Create role-based test matrix
   */
  static createRoleTestMatrix(
    roles: Array<'admin' | 'teacher' | 'staff' | 'student'>,
    testFn: (helpers: EnhancedIsolatedAuthHelpers, role: string) => Promise<void>
  ) {
    return roles.map(role => ({
      role,
      test: async (page: Page, testInfo?: any) => {
        const helpers = await EnhancedAuthHelpersFactory.create(
          page,
          testInfo ? { ...EnhancedTestUtils.createTestContext(testInfo), userRole: role } : undefined
        );

        try {
          // Login as the specified role
          switch (role) {
            case 'admin':
              await helpers.loginAsAdmin();
              break;
            case 'teacher':
              await helpers.loginAsTeacher();
              break;
            case 'staff':
              await helpers.loginAsStaff();
              break;
            case 'student':
              await helpers.loginAsStudent();
              break;
          }

          await testFn(helpers, role);
        } finally {
          await helpers.cleanup();
        }
      }
    }));
  }
}

// Export for backward compatibility
export { EnhancedIsolatedAuthHelpers as IsolatedAuthHelpers };