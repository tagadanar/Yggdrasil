// packages/shared-utilities/src/testing/AuthTestHelper.ts
// Centralized authentication testing utilities

import { Page, Browser } from '@playwright/test';
import { DemoUserManager, DEMO_USERS, type DemoUser } from './DemoUserManager';

export interface AuthTestOptions {
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  finalUrl?: string;
  cookies?: any[];
}

export class AuthTestHelper {
  private page: Page;
  private demoUserManager: DemoUserManager;
  private options: Required<AuthTestOptions>;

  constructor(page: Page, options: AuthTestOptions = {}) {
    this.page = page;
    this.demoUserManager = DemoUserManager.getInstance();
    this.options = {
      timeout: 30000,
      retries: 3,
      debug: false,
      ...options
    };
  }

  /**
   * Authenticate as a specific user role
   */
  async authenticateAs(role: 'admin' | 'teacher' | 'staff' | 'student'): Promise<AuthResult> {
    const demoUser = this.demoUserManager.getDemoUser(role);
    if (!demoUser) {
      return {
        success: false,
        error: `Demo user not found for role: ${role}`
      };
    }

    return this.authenticateWithCredentials(demoUser.email, demoUser.password);
  }

  /**
   * Authenticate with specific credentials
   */
  async authenticateWithCredentials(email: string, password: string): Promise<AuthResult> {
    try {
      if (this.options.debug) {
        console.log(`🔐 AUTH TEST HELPER: Starting authentication for: ${email}`);
      }

      // Clear any existing auth state
      await this.clearAuthState();

      // Navigate to login page
      await this.page.goto('http://localhost:3000/auth/login', { 
        waitUntil: 'networkidle',
        timeout: this.options.timeout 
      });

      // Wait for login form
      await this.page.waitForSelector('form', { 
        state: 'visible', 
        timeout: this.options.timeout 
      });

      // Fill credentials
      await this.page.fill('#email', email);
      await this.page.fill('#password', password);

      // Monitor network requests
      const authPromise = this.page.waitForResponse(
        response => response.url().includes('/api/auth/login') && response.request().method() === 'POST',
        { timeout: this.options.timeout }
      );

      // Submit form
      await this.page.click('button[type="submit"]');

      // Wait for auth response
      const authResponse = await authPromise;
      
      if (this.options.debug) {
        console.log(`🔐 AUTH TEST HELPER: Auth response status: ${authResponse.status()}`);
      }

      if (authResponse.status() !== 200) {
        const errorBody = await authResponse.text();
        return {
          success: false,
          error: `Auth API failed: ${authResponse.status()} - ${errorBody}`
        };
      }

      const authResult = await authResponse.json();
      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed'
        };
      }

      // Wait for navigation away from login page
      await this.page.waitForFunction(
        () => !window.location.pathname.includes('/auth/login'),
        { timeout: this.options.timeout }
      );

      // Wait for Yggdrasil authentication cookies to be set (critical for clean architecture)
      try {
        await this.page.waitForFunction(
          () => document.cookie.includes('yggdrasil_access_token') || document.cookie.includes('yggdrasil_refresh_token'),
          { timeout: this.options.timeout }
        );
        if (this.options.debug) {
          console.log('🔐 AUTH TEST HELPER: Yggdrasil cookies detected successfully');
        }
      } catch (cookieError) {
        if (this.options.debug) {
          console.log('🔐 AUTH TEST HELPER: Timeout waiting for Yggdrasil cookies, continuing...');
        }
      }

      // Wait for authentication state to fully establish
      await this.page.waitForTimeout(2000);

      // Simple authentication state verification (matching manual test approach)
      const isAuthenticated = await this.verifyAuthState();
      
      if (!isAuthenticated) {
        if (this.options.debug) {
          console.log('🔐 AUTH TEST HELPER: Auth state verification failed, but API succeeded');
          // Get current state for debugging
          const currentState = await this.page.evaluate(() => ({
            url: window.location.href,
            cookies: document.cookie,
            hasYggdrasil: document.cookie.includes('yggdrasil_')
          }));
          console.log('🔐 AUTH TEST HELPER: Current state:', JSON.stringify(currentState, null, 2));
        }
        
        return {
          success: false,
          error: `Authentication API succeeded but state verification failed`
        };
      }

      const finalUrl = this.page.url();
      const cookies = await this.page.context().cookies();

      if (this.options.debug) {
        console.log(`🔐 AUTH TEST HELPER: Authentication successful for: ${email}`);
        console.log(`🔐 AUTH TEST HELPER: Final URL: ${finalUrl}`);
      }

      return {
        success: true,
        finalUrl,
        cookies
      };

    } catch (error) {
      if (this.options.debug) {
        console.error(`🔐 AUTH TEST HELPER: Authentication failed for: ${email}`, error);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown authentication error'
      };
    }
  }

  /**
   * Verify current authentication state
   */
  async verifyAuthState(): Promise<boolean> {
    try {
      if (this.options.debug) {
        console.log('🔐 AUTH TEST HELPER: Starting auth state verification...');
        console.log('🔐 AUTH TEST HELPER: Current page URL:', this.page.url());
      }
      
      // Check multiple indicators of authentication with proper function evaluation and error handling
      let checks;
      try {
        checks = await this.page.evaluate(() => {
          try {
            // Check if we're not on login page
            const notOnLoginPage = !window.location.pathname.includes('/auth/login');
            
            // Enhanced cookie checking - look for Yggdrasil-specific cookie names
            const allCookies = document.cookie;
            const hasYggdrasilAccessToken = document.cookie.includes('yggdrasil_access_token');
            const hasYggdrasilRefreshToken = document.cookie.includes('yggdrasil_refresh_token');
            const hasAuthTokens = document.cookie.includes('authTokens');
            const hasAnyAuthCookie = hasYggdrasilAccessToken || hasYggdrasilRefreshToken || hasAuthTokens;
            
            // Enhanced localStorage checking - look for multiple possible storage keys
            let localStorageData: any = {};
            let hasLocalStorageAuth = false;
            try {
              if (typeof localStorage !== 'undefined') {
                const yggdrasilTokens = localStorage.getItem('yggdrasil_tokens');
                const authTokens = localStorage.getItem('authTokens');
                const userToken = localStorage.getItem('user');
                const accessToken = localStorage.getItem('accessToken');
                
                localStorageData = {
                  yggdrasil_tokens: yggdrasilTokens,
                  authTokens: authTokens,
                  user: userToken,
                  accessToken: accessToken
                };
                
                hasLocalStorageAuth = !!(yggdrasilTokens || authTokens || userToken || accessToken);
              }
            } catch (e) {
              console.log('LocalStorage access failed:', e);
            }
            
            // Check for React auth state (if available)
            const hasReactAuth = !!((window as any).__REACT_AUTH_STATE__ || (window as any)._REACT_AUTH_CONTEXT_);

            return {
              notOnLoginPage,
              currentPath: window.location.pathname,
              currentUrl: window.location.href,
              
              // Cookie details
              hasYggdrasilAccessToken,
              hasYggdrasilRefreshToken, 
              hasAuthTokens,
              hasAnyAuthCookie,
              allCookies: allCookies,
              cookieCount: allCookies.split(';').length,
              
              // LocalStorage details
              hasLocalStorageAuth,
              localStorageData,
              
              // React state
              hasReactAuth
            };
          } catch (error) {
            console.error('Browser evaluation error:', error);
            return {
              notOnLoginPage: false,
              currentPath: 'unknown',
              currentUrl: 'unknown',
              hasYggdrasilAccessToken: false,
              hasYggdrasilRefreshToken: false,
              hasAuthTokens: false,
              hasAnyAuthCookie: false,
              allCookies: '',
              cookieCount: 0,
              hasLocalStorageAuth: false,
              localStorageData: {},
              hasReactAuth: false,
              error: error instanceof Error ? error.message : String(error)
            };
          }
        });
      } catch (evaluationError) {
        if (this.options.debug) {
          console.log('🔐 AUTH TEST HELPER: Page evaluation failed:', evaluationError);
        }
        return false;
      }

      // Ensure checks is valid with detailed debugging
      if (!checks || typeof checks !== 'object') {
        if (this.options.debug) {
          console.log('🔐 AUTH TEST HELPER: Invalid checks result:', typeof checks, checks);
          console.log('🔐 AUTH TEST HELPER: Page URL:', this.page.url());
          
          // Try to get basic page info for debugging
          try {
            const basicInfo = await this.page.evaluate(() => ({
              url: window.location.href,
              pathname: window.location.pathname,
              cookies: document.cookie,
              ready: document.readyState
            }));
            console.log('🔐 AUTH TEST HELPER: Basic page info:', JSON.stringify(basicInfo, null, 2));
          } catch (e) {
            console.log('🔐 AUTH TEST HELPER: Failed to get basic page info:', e);
          }
        }
        return false;
      }

      // Simplified authentication validation matching manual test success
      // Primary indicators: not on login page AND has Yggdrasil cookies
      const isAuthenticated = checks.notOnLoginPage && 
                             (checks.hasYggdrasilAccessToken || checks.hasYggdrasilRefreshToken);

      if (this.options.debug) {
        console.log('🔐 AUTH TEST HELPER: Enhanced auth state check:', JSON.stringify(checks, null, 2));
        console.log('🔐 AUTH TEST HELPER: Authentication decision:');
        console.log(`  - Not on login page: ${checks.notOnLoginPage}`);
        console.log(`  - Has any auth cookie: ${checks.hasAnyAuthCookie}`);
        console.log(`  - Has localStorage auth: ${checks.hasLocalStorageAuth}`);
        console.log(`  - Final result: ${isAuthenticated}`);
      }

      return isAuthenticated;

    } catch (error) {
      if (this.options.debug) {
        console.error('🔐 AUTH TEST HELPER: Auth state verification failed:', error);
      }
      return false;
    }
  }

  /**
   * Clear authentication state
   */
  async clearAuthState(): Promise<void> {
    try {
      // Clear cookies
      await this.page.context().clearCookies();
      
      // Clear local storage
      await this.page.evaluate(`() => {
        if (typeof localStorage !== 'undefined') localStorage.clear();
        if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
      }`);

      if (this.options.debug) {
        console.log('🔐 AUTH TEST HELPER: Auth state cleared');
      }

    } catch (error) {
      if (this.options.debug) {
        console.error('🔐 AUTH TEST HELPER: Failed to clear auth state:', error);
      }
    }
  }

  /**
   * Wait for authentication to complete
   */
  async waitForAuthentication(timeoutMs: number = this.options.timeout): Promise<boolean> {
    try {
      await this.page.waitForFunction(
        `() => {
          const notOnLoginPage = !window.location.pathname.includes('/auth/login');
          const hasAuthData = document.cookie.includes('yggdrasil_access_token') || 
                             (typeof localStorage !== 'undefined' && localStorage.getItem('yggdrasil_tokens') !== null);
          return notOnLoginPage && hasAuthData;
        }`,
        { timeout: timeoutMs }
      );
      return true;
    } catch (error) {
      if (this.options.debug) {
        console.error('🔐 AUTH TEST HELPER: Wait for authentication failed:', error);
      }
      return false;
    }
  }

  /**
   * Get current user info from the page
   */
  async getCurrentUser(): Promise<any> {
    try {
      return await this.page.evaluate(`() => {
        // Try to get user from React context or global state
        return window.__CURRENT_USER__ || null;
      }`);
    } catch (error) {
      if (this.options.debug) {
        console.error('🔐 AUTH TEST HELPER: Failed to get current user:', error);
      }
      return null;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<boolean> {
    try {
      // Try to find and click logout button
      const logoutButton = this.page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }

      // Clear auth state manually as fallback
      await this.clearAuthState();

      // Verify we're back to login page or home
      await this.page.waitForFunction(
        `() => window.location.pathname.includes('/auth/login') || window.location.pathname === '/'`,
        { timeout: this.options.timeout }
      );

      if (this.options.debug) {
        console.log('🔐 AUTH TEST HELPER: Logout successful');
      }

      return true;

    } catch (error) {
      if (this.options.debug) {
        console.error('🔐 AUTH TEST HELPER: Logout failed:', error);
      }
      return false;
    }
  }
}

/**
 * Convenience functions for quick authentication
 */
export class QuickAuth {
  /**
   * Quick admin authentication
   */
  static async loginAsAdmin(page: Page, options?: AuthTestOptions): Promise<AuthResult> {
    const helper = new AuthTestHelper(page, options);
    return helper.authenticateAs('admin');
  }

  /**
   * Quick teacher authentication
   */
  static async loginAsTeacher(page: Page, options?: AuthTestOptions): Promise<AuthResult> {
    const helper = new AuthTestHelper(page, options);
    return helper.authenticateAs('teacher');
  }

  /**
   * Quick staff authentication
   */
  static async loginAsStaff(page: Page, options?: AuthTestOptions): Promise<AuthResult> {
    const helper = new AuthTestHelper(page, options);
    return helper.authenticateAs('staff');
  }

  /**
   * Quick student authentication
   */
  static async loginAsStudent(page: Page, options?: AuthTestOptions): Promise<AuthResult> {
    const helper = new AuthTestHelper(page, options);
    return helper.authenticateAs('student');
  }
}