// packages/testing-utilities/tests/helpers/clean-auth.helpers.ts
// Clean authentication helper following CLAUDE.md clean testing architecture
// Uses TestCleanup pattern for proper state management

import { Page } from '@playwright/test';
import { AuthTestHelper, TestInitializer, QuickAuth, type AuthResult } from '@yggdrasil/shared-utilities/testing';

/**
 * CleanAuthHelper - Follows CLAUDE.md clean testing architecture
 * Manages authentication with proper cleanup and state isolation
 */
export class CleanAuthHelper {
  private authHelper: AuthTestHelper;
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.authHelper = new AuthTestHelper(page, {
      debug: true,
      timeout: 45000, // MANDATORY: 45s timeout per CLAUDE.md
    });
  }

  /**
   * Login as admin user with proper state tracking
   */
  async loginAsAdmin(): Promise<AuthResult> {
    await TestInitializer.quickSetup();
    const result = await this.authHelper.authenticateAs('admin');
    
    if (!result.success) {
      throw new Error(`🔐 CLEAN AUTH: Admin authentication failed: ${result.error}`);
    }
    
    console.log('🔐 CLEAN AUTH: Admin authentication successful');
    return result;
  }

  /**
   * Login as teacher user with proper state tracking
   */
  async loginAsTeacher(): Promise<AuthResult> {
    await TestInitializer.quickSetup();
    const result = await this.authHelper.authenticateAs('teacher');
    
    if (!result.success) {
      throw new Error(`🔐 CLEAN AUTH: Teacher authentication failed: ${result.error}`);
    }
    
    console.log('🔐 CLEAN AUTH: Teacher authentication successful');
    return result;
  }

  /**
   * Login as staff user with proper state tracking
   */
  async loginAsStaff(): Promise<AuthResult> {
    await TestInitializer.quickSetup();
    const result = await this.authHelper.authenticateAs('staff');
    
    if (!result.success) {
      throw new Error(`🔐 CLEAN AUTH: Staff authentication failed: ${result.error}`);
    }
    
    console.log('🔐 CLEAN AUTH: Staff authentication successful');
    return result;
  }

  /**
   * Login as student user with proper state tracking
   */
  async loginAsStudent(): Promise<AuthResult> {
    await TestInitializer.quickSetup();
    const result = await this.authHelper.authenticateAs('student');
    
    if (!result.success) {
      throw new Error(`🔐 CLEAN AUTH: Student authentication failed: ${result.error}`);
    }
    
    console.log('🔐 CLEAN AUTH: Student authentication successful');
    return result;
  }

  /**
   * Login with specific credentials
   */
  async loginWithCredentials(email: string, password: string): Promise<AuthResult> {
    await TestInitializer.quickSetup();
    const result = await this.authHelper.authenticateWithCredentials(email, password);
    
    if (!result.success) {
      throw new Error(`🔐 CLEAN AUTH: Authentication failed for ${email}: ${result.error}`);
    }
    
    console.log(`🔐 CLEAN AUTH: Authentication successful for ${email}`);
    return result;
  }

  /**
   * Login with custom user (alias for loginWithCredentials for test data factory compatibility)
   */
  async loginWithCustomUser(email: string, password: string): Promise<AuthResult> {
    return this.loginWithCredentials(email, password);
  }

  /**
   * Clear all authentication state - CRITICAL for test isolation
   */
  async clearAuthState(): Promise<void> {
    try {
      // Clear browser storage - handle SecurityError gracefully
      await this.page.evaluate(() => {
        try {
          // Clear localStorage if available
          if (typeof localStorage !== 'undefined' && localStorage) {
            localStorage.clear();
          }
          
          // Clear sessionStorage if available
          if (typeof sessionStorage !== 'undefined' && sessionStorage) {
            sessionStorage.clear();
          }
          
          // Clear all cookies
          if (document && document.cookie) {
            document.cookie.split(";").forEach(cookie => {
              const eqPos = cookie.indexOf("=");
              const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
              document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
              document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
            });
          }
        } catch (securityError) {
          // Ignore security errors for localStorage/sessionStorage access
          console.warn('Could not clear storage due to security restrictions:', securityError.message);
        }
      });

      // Use centralized auth helper cleanup
      await this.authHelper.clearAuthState();
      
      console.log('🔐 CLEAN AUTH: Authentication state cleared successfully');
    } catch (error) {
      console.error('🔐 CLEAN AUTH: Failed to clear auth state:', error);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<boolean> {
    try {
      const success = await this.authHelper.logout();
      if (success) {
        console.log('🔐 CLEAN AUTH: Logout successful');
      } else {
        console.warn('🔐 CLEAN AUTH: Logout may not have completed successfully');
      }
      return success;
    } catch (error) {
      console.error('🔐 CLEAN AUTH: Logout failed:', error);
      return false;
    }
  }

  /**
   * Verify current authentication state
   */
  async verifyAuthState(): Promise<boolean> {
    try {
      const isAuthenticated = await this.authHelper.verifyAuthState();
      console.log(`🔐 CLEAN AUTH: Authentication state verified: ${isAuthenticated}`);
      return isAuthenticated;
    } catch (error) {
      console.error('🔐 CLEAN AUTH: Failed to verify auth state:', error);
      return false;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<any> {
    try {
      return await this.authHelper.getCurrentUser();
    } catch (error) {
      console.error('🔐 CLEAN AUTH: Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Get access token for API requests
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await this.page.evaluate(() => {
        const tokens = localStorage.getItem('yggdrasil_tokens');
        if (tokens) {
          const parsed = JSON.parse(tokens);
          return parsed.accessToken || null;
        }
        return null;
      });
    } catch (error) {
      console.error('🔐 CLEAN AUTH: Failed to get access token:', error);
      return null;
    }
  }
}

/**
 * Quick authentication functions using CleanAuthHelper
 */
export class QuickCleanAuth {
  static async loginAsAdmin(page: Page): Promise<AuthResult> {
    const helper = new CleanAuthHelper(page);
    return await helper.loginAsAdmin();
  }

  static async loginAsTeacher(page: Page): Promise<AuthResult> {
    const helper = new CleanAuthHelper(page);
    return await helper.loginAsTeacher();
  }

  static async loginAsStaff(page: Page): Promise<AuthResult> {
    const helper = new CleanAuthHelper(page);
    return await helper.loginAsStaff();
  }

  static async loginAsStudent(page: Page): Promise<AuthResult> {
    const helper = new CleanAuthHelper(page);
    return await helper.loginAsStudent();
  }

  static async clearAuthState(page: Page): Promise<void> {
    const helper = new CleanAuthHelper(page);
    await helper.clearAuthState();
  }
}