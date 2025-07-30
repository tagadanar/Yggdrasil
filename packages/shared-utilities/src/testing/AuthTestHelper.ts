// packages/shared-utilities/src/testing/AuthTestHelper.ts
// Centralized authentication testing utilities

import { Page } from '@playwright/test';
// import { Browser } from '@playwright/test'; // Unused import
import { DemoUserManager } from './DemoUserManager';
import { LoggerFactory } from '../logging/logger';

const logger = LoggerFactory.createLogger('auth-test-helper');
// import { DEMO_USERS, type DemoUser } from './DemoUserManager'; // Unused imports

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
      timeout: 45000, // 🔧 FIXED TIMING: Increased from 30s to 45s for frontend auth flow
      retries: 3,
      debug: false,
      ...options,
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
        error: `Demo user not found for role: ${role}`,
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
        logger.info(`🔐 AUTH TEST HELPER: Starting authentication for: ${email}`);
      }

      // Clear any existing auth state
      await this.clearAuthState();

      // Navigate to login page
      await this.page.goto('http://localhost:3000/auth/login', {
        waitUntil: 'networkidle',
        timeout: this.options.timeout,
      });

      // Wait for login form
      await this.page.waitForSelector('form', {
        state: 'visible',
        timeout: this.options.timeout,
      });

      // 🔧 ENHANCED FORM INTERACTION: Ensure React hydration is complete
      await this.page.waitForTimeout(1000); // Wait for React hydration

      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Waiting for form to be ready...');
      }

      // 🔧 SIMPLIFIED: Always use demo button for demo credentials (preserves React flow)
      const isDemoUser = this.isDemoCredentials(email, password);

      if (isDemoUser) {
        if (this.options.debug) {
          logger.info(`🔐 AUTH TEST HELPER: Using demo button authentication path for ${email}`);
        }
        return this.authenticateWithDemoButton(email, password);
      } else {
        if (this.options.debug) {
          logger.info(`🔐 AUTH TEST HELPER: Using form submission authentication path for ${email}`);
        }
      }

      // 🔧 ENHANCED FORM INTERACTION: Check if form is interactive
      await this.page.waitForFunction(
        () => {
          const emailInput = document.querySelector('#email') as HTMLInputElement;
          const passwordInput = document.querySelector('#password') as HTMLInputElement;
          const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
          return emailInput && passwordInput && submitButton && !submitButton.disabled;
        },
        { timeout: this.options.timeout },
      );

      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Form ready, filling credentials...');
      }

      // Fill credentials with enhanced interaction
      await this.page.fill('#email', email);
      await this.page.fill('#password', password);

      // 🔧 ENHANCED FORM INTERACTION: Trigger change events to ensure React state updates
      await this.page.dispatchEvent('#email', 'change');
      await this.page.dispatchEvent('#password', 'change');

      // Small wait to ensure React state has updated
      await this.page.waitForTimeout(500);

      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Credentials filled, triggering form submission...');
      }

      // Monitor network requests
      const authPromise = this.page.waitForResponse(
        response => response.url().includes('/api/auth/login') && response.request().method() === 'POST',
        { timeout: this.options.timeout },
      );

      // 🔧 FIXED: Enhanced form submission that properly triggers React onSubmit handler
      const submitButton = this.page.locator('button[type="submit"]');

      // Ensure button is ready and clickable
      await submitButton.waitFor({ state: 'visible', timeout: this.options.timeout });

      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Submit button is visible, triggering React onClick...');
      }

      // Use dispatchEvent to ensure React's onClick handler is triggered
      await submitButton.click({ force: false }); // Don't force - let React handle it naturally

      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Submit button clicked, waiting for network request...');
      }

      // Wait for auth response
      const authResponse = await authPromise;

      if (this.options.debug) {
        logger.info(`🔐 AUTH TEST HELPER: Auth response status: ${authResponse.status()}`);
      }

      if (authResponse.status() !== 200) {
        const errorBody = await authResponse.text();
        return {
          success: false,
          error: `Auth API failed: ${authResponse.status()} - ${errorBody}`,
        };
      }

      const authResult = await authResponse.json();
      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed',
        };
      }

      // 🔧 CLAUDE.MD TIMING: Wait for BOTH navigation AND cookies together (MANDATORY pattern)
      await this.page.waitForFunction(
        () => {
          const notOnLoginPage = !window.location.pathname.includes('/auth/login');
          const hasCookies = document.cookie.includes('yggdrasil_access_token') ||
                            document.cookie.includes('yggdrasil_refresh_token');
          return notOnLoginPage && hasCookies;
        },
        { timeout: this.options.timeout }, // MANDATORY: Use 45s timeout for frontend auth flow
      );

      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Navigation and cookies completed successfully');
      }

      // 🔧 CLAUDE.MD TIMING: Additional wait for frontend state synchronization
      await this.page.waitForTimeout(2000); // Increased from 1000ms to 2000ms for better stability

      // 🔧 ENHANCED: Additional wait for complete auth state propagation
      try {
        await this.page.waitForFunction(
          () => {
            // Check that we're fully authenticated:
            // 1. Not on login page
            // 2. Have cookies
            // 3. Page is fully loaded
            const notOnLoginPage = !window.location.pathname.includes('/auth/login');
            const hasAccessToken = document.cookie.includes('yggdrasil_access_token');
            const hasRefreshToken = document.cookie.includes('yggdrasil_refresh_token');
            const pageReady = document.readyState === 'complete';

            return notOnLoginPage && hasAccessToken && hasRefreshToken && pageReady;
          },
          { timeout: 10000 }, // 10 second timeout for this final check
        );
      } catch (waitError) {
        if (this.options.debug) {
          logger.error('🔐 AUTH TEST HELPER: Extended auth state wait failed:', waitError);
        }
      }

      // Simple authentication state verification (should now pass reliably)
      const isAuthenticated = await this.verifyAuthState();

      if (!isAuthenticated) {
        if (this.options.debug) {
          logger.error('🔐 AUTH TEST HELPER: Auth state verification failed after extended wait');
          // Get current state for debugging
          const currentState = await this.page.evaluate(() => ({
            url: window.location.href,
            pathname: window.location.pathname,
            cookies: document.cookie,
            hasAccessToken: document.cookie.includes('yggdrasil_access_token'),
            hasRefreshToken: document.cookie.includes('yggdrasil_refresh_token'),
            readyState: document.readyState,
          }));
          logger.info('🔐 AUTH TEST HELPER: Current state:', JSON.stringify(currentState, null, 2));
        }

        // Instead of failing, let's retry the verification once more after additional wait
        await this.page.waitForTimeout(1000);
        const retryAuth = await this.verifyAuthState();

        if (!retryAuth) {
          return {
            success: false,
            error: 'Authentication API succeeded but state verification failed after retry',
          };
        }

        if (this.options.debug) {
          logger.info('🔐 AUTH TEST HELPER: Auth state verification succeeded on retry');
        }
      }

      const finalUrl = this.page.url();
      const cookies = await this.page.context().cookies();

      if (this.options.debug) {
        logger.info(`🔐 AUTH TEST HELPER: Authentication successful for: ${email}`);
        logger.info(`🔐 AUTH TEST HELPER: Final URL: ${finalUrl}`);
      }

      return {
        success: true,
        finalUrl,
        cookies,
      };

    } catch (error) {
      if (this.options.debug) {
        logger.error(`🔐 AUTH TEST HELPER: Authentication failed for: ${email}`, error);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown authentication error',
      };
    }
  }

  /**
   * Verify current authentication state
   */
  async verifyAuthState(): Promise<boolean> {
    try {
      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Starting auth state verification...');
        logger.info('🔐 AUTH TEST HELPER: Current page URL:', this.page.url());
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
                  accessToken: accessToken,
                };

                hasLocalStorageAuth = !!(yggdrasilTokens || authTokens || userToken || accessToken);
              }
            } catch (e) {
              logger.error('LocalStorage access failed:', e);
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
              hasReactAuth,
            };
          } catch (error) {
            logger.error('Browser evaluation error:', error);
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
              error: error instanceof Error ? error.message : String(error),
            };
          }
        });
      } catch (evaluationError) {
        if (this.options.debug) {
          logger.error('🔐 AUTH TEST HELPER: Page evaluation failed:', evaluationError);
        }
        return false;
      }

      // Ensure checks is valid with detailed debugging
      if (!checks || typeof checks !== 'object') {
        if (this.options.debug) {
          logger.info('🔐 AUTH TEST HELPER: Invalid checks result:', typeof checks, checks);
          logger.info('🔐 AUTH TEST HELPER: Page URL:', this.page.url());

          // Try to get basic page info for debugging
          try {
            const basicInfo = await this.page.evaluate(() => ({
              url: window.location.href,
              pathname: window.location.pathname,
              cookies: document.cookie,
              ready: document.readyState,
            }));
            logger.info('🔐 AUTH TEST HELPER: Basic page info:', JSON.stringify(basicInfo, null, 2));
          } catch (e) {
            logger.error('🔐 AUTH TEST HELPER: Failed to get basic page info:', e);
          }
        }
        return false;
      }

      // Simplified authentication validation matching manual test success
      // Primary indicators: not on login page AND has Yggdrasil cookies
      const isAuthenticated = checks.notOnLoginPage &&
                             (checks.hasYggdrasilAccessToken || checks.hasYggdrasilRefreshToken);

      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Enhanced auth state check:', JSON.stringify(checks, null, 2));
        logger.info('🔐 AUTH TEST HELPER: Authentication decision:');
        logger.info(`  - Not on login page: ${checks.notOnLoginPage}`);
        logger.info(`  - Has any auth cookie: ${checks.hasAnyAuthCookie}`);
        logger.info(`  - Has localStorage auth: ${checks.hasLocalStorageAuth}`);
        logger.info(`  - Final result: ${isAuthenticated}`);
      }

      return isAuthenticated;

    } catch (error) {
      if (this.options.debug) {
        logger.error('🔐 AUTH TEST HELPER: Auth state verification failed:', error);
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
        logger.info('🔐 AUTH TEST HELPER: Auth state cleared');
      }

    } catch (error) {
      if (this.options.debug) {
        logger.error('🔐 AUTH TEST HELPER: Failed to clear auth state:', error);
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
        { timeout: timeoutMs },
      );
      return true;
    } catch (error) {
      if (this.options.debug) {
        logger.error('🔐 AUTH TEST HELPER: Wait for authentication failed:', error);
      }
      return false;
    }
  }

  /**
   * Get current user info from the page
   */
  async getCurrentUser(): Promise<any> {
    try {
      // First try the window global variable approach
      const userFromWindow = await this.page.evaluate(`() => {
        return window.__CURRENT_USER__ || null;
      }`);
      
      if (userFromWindow) {
        return userFromWindow;
      }
      
      // If window approach fails, try to get user via API call using stored tokens
      return await this.page.evaluate(async () => {
        try {
          // Get tokens from cookies
          const cookieString = document.cookie;
          const accessTokenMatch = cookieString.match(/yggdrasil_access_token=([^;]+)/);
          
          if (!accessTokenMatch) {
            console.log('🔍 DEBUG: No access token found in cookies');
            return null;
          }
          
          const accessToken = accessTokenMatch[1];
          
          // Make API call to get current user
          const response = await fetch('http://localhost:3001/auth/me', {
            headers: {
              'Authorization': 'Bearer ' + accessToken,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.log('🔍 DEBUG: API call failed with status:', response.status);
            return null;
          }
          
          const result = await response.json();
          console.log('🔍 DEBUG: API response:', result);
          
          return result.success ? result.user : null;
        } catch (error) {
          console.log('🔍 DEBUG: Error getting user via API:', error);
          return null;
        }
      });
    } catch (error) {
      if (this.options.debug) {
        logger.error('🔐 AUTH TEST HELPER: Failed to get current user:', error);
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
        '() => window.location.pathname.includes(\'/auth/login\') || window.location.pathname === \'/\'',
        { timeout: this.options.timeout },
      );

      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Logout successful');
      }

      return true;

    } catch (error) {
      if (this.options.debug) {
        logger.error('🔐 AUTH TEST HELPER: Logout failed:', error);
      }
      return false;
    }
  }

  /**
   * Check if credentials match demo user credentials
   */
  private isDemoCredentials(email: string, password: string): boolean {
    const demoCredentials = [
      { email: 'admin@yggdrasil.edu', password: 'Admin123!' },
      { email: 'teacher@yggdrasil.edu', password: 'Admin123!' },
      { email: 'staff@yggdrasil.edu', password: 'Admin123!' },
      { email: 'student@yggdrasil.edu', password: 'Admin123!' },
    ];

    return demoCredentials.some(cred => cred.email === email && cred.password === password);
  }

  /**
   * Authenticate using demo button (preserves full React flow)
   */
  private async authenticateWithDemoButton(email: string, _password: string): Promise<AuthResult> {
    try {
      if (this.options.debug) {
        logger.info(`🔐 AUTH TEST HELPER: Using demo button for: ${email}`);
      }

      // Map emails to demo button test IDs
      const demoButtonMap: Record<string, string> = {
        'admin@yggdrasil.edu': 'demo-admin-button',
        'teacher@yggdrasil.edu': 'demo-teacher-button',
        'staff@yggdrasil.edu': 'demo-staff-button',
        'student@yggdrasil.edu': 'demo-student-button',
      };

      const buttonTestId = demoButtonMap[email];
      if (!buttonTestId) {
        throw new Error(`No demo button found for email: ${email}`);
      }

      // Wait for demo button to be ready
      const demoButton = this.page.locator(`[data-testid="${buttonTestId}"]`);
      await demoButton.waitFor({ state: 'visible', timeout: this.options.timeout });

      if (this.options.debug) {
        logger.info(`🔐 AUTH TEST HELPER: Demo button ready: ${buttonTestId}`);
      }

      // Monitor network request
      const authPromise = this.page.waitForResponse(
        response => response.url().includes('/api/auth/login') && response.request().method() === 'POST',
        { timeout: this.options.timeout },
      );

      // Click demo button (this triggers the full React flow)
      await demoButton.click();

      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Demo button clicked, waiting for network request...');
      }

      // Wait for auth response
      const authResponse = await authPromise;

      if (this.options.debug) {
        logger.info(`🔐 AUTH TEST HELPER: Auth response status: ${authResponse.status()}`);
      }

      if (authResponse.status() !== 200) {
        const errorBody = await authResponse.text();
        return {
          success: false,
          error: `Auth API failed: ${authResponse.status()} - ${errorBody}`,
        };
      }

      const authResult = await authResponse.json();
      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed',
        };
      }

      // 🔧 CRITICAL: Wait for navigation (demo button triggers full React auth flow)
      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Waiting for navigation after demo button click...');
      }

      // Wait for BOTH navigation AND cookies together (MANDATORY pattern)
      await this.page.waitForFunction(
        () => {
          const notOnLoginPage = !window.location.pathname.includes('/auth/login');
          const hasCookies = document.cookie.includes('yggdrasil_access_token') ||
                            document.cookie.includes('yggdrasil_refresh_token');
          return notOnLoginPage && hasCookies;
        },
        { timeout: this.options.timeout },
      );

      if (this.options.debug) {
        logger.info('🔐 AUTH TEST HELPER: Navigation and cookies completed successfully via demo button');
      }

      // Additional wait for frontend state synchronization
      await this.page.waitForTimeout(2000);

      // Verify authentication state
      const isAuthenticated = await this.verifyAuthState();

      if (!isAuthenticated) {
        if (this.options.debug) {
          logger.error('🔐 AUTH TEST HELPER: Auth state verification failed after demo button');
        }

        return {
          success: false,
          error: 'Demo button authentication completed but state verification failed',
        };
      }

      const finalUrl = this.page.url();
      const cookies = await this.page.context().cookies();

      if (this.options.debug) {
        logger.info(`🔐 AUTH TEST HELPER: Demo button authentication successful for: ${email}`);
        logger.info(`🔐 AUTH TEST HELPER: Final URL: ${finalUrl}`);
      }

      return {
        success: true,
        finalUrl,
        cookies,
      };

    } catch (error) {
      if (this.options.debug) {
        logger.error(`🔐 AUTH TEST HELPER: Demo button authentication failed for: ${email}`, error);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown demo button authentication error',
      };
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
