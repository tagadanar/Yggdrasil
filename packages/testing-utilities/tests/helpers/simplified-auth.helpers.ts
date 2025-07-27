// packages/testing-utilities/tests/helpers/simplified-auth.helpers.ts
// Clean authentication helper using clean testing architecture
// Uses standard Playwright patterns with centralized utilities

import { Browser, Page, BrowserContext } from '@playwright/test';
import { AuthTestHelper, QuickAuth, TestInitializer, demoUserManager, type AuthResult } from '@yggdrasil/shared-utilities/testing';

export interface AuthUser {
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'staff' | 'student';
  expectedRoute: string;
}

export class SimplifiedAuthHelpers {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private browser: Browser;
  private authHelper: AuthTestHelper | null = null;
  private initialized = false;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  /**
   * Initialize the authentication system with clean architecture
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🔐 SIMPLIFIED AUTH: Initializing with clean architecture...');

    // Initialize clean test environment
    await TestInitializer.quickSetup();
    
    // Create clean browser context using standard Playwright patterns
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      acceptDownloads: true
    });
    
    this.page = await this.context.newPage();
    
    // Create centralized auth helper with CLAUDE.md timing
    this.authHelper = new AuthTestHelper(this.page, {
      timeout: 45000, // MANDATORY: 45s timeout for frontend auth flow per CLAUDE.md
      retries: 3,
      debug: true
    });

    this.initialized = true;
    console.log('🔐 SIMPLIFIED AUTH: Initialized successfully with clean architecture');
  }

  /**
   * Initialize with a fresh browser context using clean architecture
   */
  async initializeWithContext(_browser: Browser): Promise<Page> {
    await this.initialize();
    
    if (!this.page) {
      throw new Error('Failed to initialize page');
    }

    console.log('🔐 SIMPLIFIED AUTH: Clean initialization completed successfully');
    return this.page;
  }

  /**
   * Simplified login for admin user
   */
  async loginAsAdmin(): Promise<void> {
    await this.ensureInitialized();
    const result = await this.authHelper!.authenticateAs('admin');
    if (!result.success) {
      throw new Error(`🔐 SIMPLIFIED AUTH: Authentication failed for admin: ${result.error}`);
    }
    console.log('🔐 SIMPLIFIED AUTH: Admin authentication successful');
  }

  /**
   * Simplified login for teacher user
   */
  async loginAsTeacher(): Promise<void> {
    await this.ensureInitialized();
    const result = await this.authHelper!.authenticateAs('teacher');
    if (!result.success) {
      throw new Error(`🔐 SIMPLIFIED AUTH: Authentication failed for teacher: ${result.error}`);
    }
    console.log('🔐 SIMPLIFIED AUTH: Teacher authentication successful');
  }

  /**
   * Simplified login for staff user
   */
  async loginAsStaff(): Promise<void> {
    await this.ensureInitialized();
    const result = await this.authHelper!.authenticateAs('staff');
    if (!result.success) {
      throw new Error(`🔐 SIMPLIFIED AUTH: Authentication failed for staff: ${result.error}`);
    }
    console.log('🔐 SIMPLIFIED AUTH: Staff authentication successful');
  }

  /**
   * Simplified login for student user
   */
  async loginAsStudent(): Promise<void> {
    await this.ensureInitialized();
    const result = await this.authHelper!.authenticateAs('student');
    if (!result.success) {
      throw new Error(`🔐 SIMPLIFIED AUTH: Authentication failed for student: ${result.error}`);
    }
    console.log('🔐 SIMPLIFIED AUTH: Student authentication successful');
  }

  /**
   * Authenticate with specific credentials
   */
  async authenticateWithCredentials(email: string, password: string): Promise<void> {
    await this.ensureInitialized();
    const result = await this.authHelper!.authenticateWithCredentials(email, password);
    if (!result.success) {
      throw new Error(`🔐 SIMPLIFIED AUTH: Authentication failed for ${email}: ${result.error}`);
    }
    console.log(`🔐 SIMPLIFIED AUTH: Authentication successful for ${email}`);
  }

  /**
   * Clear authentication state
   */
  async clearAuthenticationState(): Promise<void> {
    if (this.authHelper) {
      await this.authHelper.clearAuthState();
    }
    console.log('🔐 SIMPLIFIED AUTH: Authentication state cleared');
  }

  /**
   * Verify current authentication state
   */
  async verifyAuthenticationState(): Promise<boolean> {
    if (!this.authHelper) {
      return false;
    }
    
    const isAuthenticated = await this.authHelper.verifyAuthState();
    console.log(`🔐 SIMPLIFIED AUTH: Authentication state verified: ${isAuthenticated}`);
    return isAuthenticated;
  }

  /**
   * Check if user is authenticated (alias for verifyAuthenticationState)
   */
  async isAuthenticated(): Promise<boolean> {
    return this.verifyAuthenticationState();
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    if (this.authHelper) {
      const success = await this.authHelper.logout();
      if (!success) {
        console.warn('🔐 SIMPLIFIED AUTH: Logout may not have completed successfully');
      } else {
        console.log('🔐 SIMPLIFIED AUTH: Logout successful');
      }
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<any> {
    if (!this.authHelper) {
      return null;
    }
    
    return await this.authHelper.getCurrentUser();
  }

  /**
   * Get page instance
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Cleanup resources using clean architecture
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    this.authHelper = null;
    this.initialized = false;
    console.log('🔐 SIMPLIFIED AUTH: Clean cleanup completed');
  }

  /**
   * Ensure the helper is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // Legacy compatibility methods for existing code
  
  // Removed deprecated _authenticateAs method

  /**
   * Get demo user credentials (for debugging/info purposes)
   */
  getDemoUsers(): Record<string, AuthUser> {
    const centralizedUsers = demoUserManager.getAllDemoUsers();
    const users: Record<string, AuthUser> = {};
    
    centralizedUsers.forEach(user => {
      users[user.role] = {
        email: user.email,
        password: user.password,
        role: user.role,
        expectedRoute: '/courses'
      };
    });
    
    return users;
  }
}

// Convenience functions using the centralized QuickAuth system
export class QuickSimplifiedAuth {
  /**
   * Quick admin login using centralized system
   */
  static async loginAsAdmin(page: Page): Promise<AuthResult> {
    await TestInitializer.quickSetup();
    return QuickAuth.loginAsAdmin(page, { debug: true });
  }

  /**
   * Quick teacher login using centralized system
   */
  static async loginAsTeacher(page: Page): Promise<AuthResult> {
    await TestInitializer.quickSetup();
    return QuickAuth.loginAsTeacher(page, { debug: true });
  }

  /**
   * Quick staff login using centralized system
   */
  static async loginAsStaff(page: Page): Promise<AuthResult> {
    await TestInitializer.quickSetup();
    return QuickAuth.loginAsStaff(page, { debug: true });
  }

  /**
   * Quick student login using centralized system
   */
  static async loginAsStudent(page: Page): Promise<AuthResult> {
    await TestInitializer.quickSetup();
    return QuickAuth.loginAsStudent(page, { debug: true });
  }
}