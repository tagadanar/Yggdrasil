// packages/testing-utilities/tests/helpers/isolated-auth.helpers.ts
// Isolated authentication helpers for parallel test execution

import { Page, expect } from '@playwright/test';
import { TestIsolationManager, IsolatedTestUser, generateTestId } from './test-isolation';

export class IsolatedAuthHelpers {
  private testId: string;
  private currentUser: IsolatedTestUser | null = null;
  private isolationManager: TestIsolationManager;

  constructor(private page: Page) {
    this.testId = generateTestId();
    this.isolationManager = TestIsolationManager.getInstance();
  }

  /**
   * Initialize isolated test environment
   */
  async initialize(): Promise<void> {
    await this.isolationManager.setupIsolatedTest(this.page, this.testId);
  }

  /**
   * Cleanup isolated test environment
   */
  async cleanup(): Promise<void> {
    // Release current user if any
    if (this.currentUser) {
      this.isolationManager.releaseTestUser(this.currentUser);
      this.currentUser = null;
    }
    
    await this.isolationManager.cleanupIsolatedTest(this.page, this.testId);
  }

  /**
   * Login as isolated admin user
   */
  async loginAsAdmin(): Promise<void> {
    this.currentUser = await this.isolationManager.getUniqueTestUser('admin', this.testId);
    await this.performLogin(this.currentUser);
  }

  /**
   * Login as isolated teacher user
   */
  async loginAsTeacher(): Promise<void> {
    this.currentUser = await this.isolationManager.getUniqueTestUser('teacher', this.testId);
    await this.performLogin(this.currentUser);
  }

  /**
   * Login as isolated staff user
   */
  async loginAsStaff(): Promise<void> {
    this.currentUser = await this.isolationManager.getUniqueTestUser('staff', this.testId);
    await this.performLogin(this.currentUser);
  }

  /**
   * Login as isolated student user
   */
  async loginAsStudent(): Promise<void> {
    this.currentUser = await this.isolationManager.getUniqueTestUser('student', this.testId);
    await this.performLogin(this.currentUser);
  }

  /**
   * Perform login with isolated user (ENHANCED: Resilient to service load)
   */
  private async performLogin(user: IsolatedTestUser): Promise<void> {
    const maxRetries = 3;
    let lastError: string | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add jitter to prevent thundering herd in batch mode
        if (attempt > 1) {
          const jitter = Math.random() * 1000; // 0-1000ms jitter
          await new Promise(resolve => setTimeout(resolve, jitter));
        }
        
        await this.page.goto('/auth/login');
        
        // Wait for page to be fully loaded with longer timeout
        await this.page.waitForLoadState('networkidle', { timeout: 15000 });
        
        // Fill login form with isolated user credentials
        await this.page.fill('#email', user.email);
        await this.page.fill('#password', user.password);
        
        // Submit form
        await this.page.click('button[type="submit"]');
        
        // Wait for either success redirect or error message with longer timeout
        const result = await Promise.race([
          this.page.waitForURL('/news', { timeout: 20000 }).then(() => ({ success: true })),
          this.page.waitForSelector('[data-testid="error-message"], .form-error, .bg-error-50', { timeout: 20000 })
            .then(async (errorElement) => {
              const errorText = await errorElement.textContent();
              return { success: false, error: errorText };
            })
        ]).catch(async (error) => {
          // If neither redirect nor error occurs, check current URL and page state
          const currentURL = this.page.url();
          return { success: false, error: `Login timeout. Current URL: ${currentURL}` };
        });
        
        // Handle login result
        if (result.success) {
          // Complete authentication setup
          await this.completeAuthSetup(user);
          return; // Success - exit retry loop
        } else {
          lastError = result.error || 'Unknown login error';
          
          // If this is a temporary service issue, retry
          if (attempt < maxRetries && (lastError.includes('timeout') || lastError.includes('Login failed'))) {
            console.log(`⚠️  Login attempt ${attempt} failed for ${user.email}: ${lastError}. Retrying...`);
            continue;
          }
          
          // If it's a permanent error or final attempt, throw
          throw new Error(`Login failed for user ${user.email}: ${lastError}`);
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.log(`⚠️  Login attempt ${attempt} failed for ${user.email}: ${lastError}. Retrying...`);
      }
    }
  }

  /**
   * Complete authentication setup after successful login
   */
  private async completeAuthSetup(user: IsolatedTestUser): Promise<void> {
    // Verify we're on the news page
    await expect(this.page).toHaveURL('/news', { timeout: 5000 });
    
    // Wait for auth state to be initialized
    await this.page.waitForLoadState('networkidle');
    
    // Capture authentication tokens from cookies (not localStorage)
    const tokens = await this.page.evaluate(() => {
      // Helper function to get cookie value
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
      };
      
      const accessToken = getCookie('yggdrasil_access_token');
      const refreshToken = getCookie('yggdrasil_refresh_token');
      
      if (accessToken && refreshToken) {
        return {
          accessToken,
          refreshToken
        };
      }
      return null;
    });
    
    // Store tokens in the user object
    if (tokens) {
      user.tokens = tokens;
    } else {
      console.warn('No tokens found in localStorage after login');
    }
  }

  /**
   * Get current user's access token
   */
  getAccessToken(): string | null {
    return this.currentUser?.tokens?.accessToken || null;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Look for logout button
      const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("Sign out")');
      
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        // Wait for redirect to login page
        await expect(this.page).toHaveURL('/auth/login');
      }
    } catch (error) {
      // Ignore logout errors - might already be logged out
    }
    
    // Clear authentication state
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
      } catch (error) {
        // Silent fail - not critical
      }
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      } catch (error) {
        // Silent fail - not critical
      }
    });
    
    // Release current user
    if (this.currentUser) {
      this.isolationManager.releaseTestUser(this.currentUser);
      this.currentUser = null;
    }
  }

  /**
   * Get current isolated user
   */
  getCurrentUser(): IsolatedTestUser | null {
    return this.currentUser;
  }

  /**
   * Get a unique test user for manual testing
   */
  async getTestUser(role: 'admin' | 'teacher' | 'staff' | 'student'): Promise<IsolatedTestUser> {
    return await this.isolationManager.getUniqueTestUser(role, this.testId);
  }

  /**
   * Release a test user back to the pool
   */
  releaseTestUser(user: IsolatedTestUser): void {
    this.isolationManager.releaseTestUser(user);
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin(): Promise<void> {
    await this.page.goto('/auth/login');
    await expect(this.page.locator('h2')).toContainText('Sign in to your account');
  }

  /**
   * Navigate to register page
   */
  async navigateToRegister(): Promise<void> {
    await this.page.goto('/auth/register');
    await expect(this.page.locator('h2')).toContainText('Create your account');
  }

  /**
   * Fill login form with custom credentials
   */
  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
  }

  /**
   * Submit authentication form
   */
  async submitForm(): Promise<void> {
    await this.page.click('button[type="submit"]');
  }

  /**
   * Expect login success
   */
  async expectLoginSuccess(): Promise<void> {
    await expect(this.page).toHaveURL('/news');
  }

  /**
   * Expect login error
   */
  async expectLoginError(errorMessage?: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/auth\/login$/);
    
    if (errorMessage) {
      await expect(this.page.locator('.bg-error-50')).toContainText(errorMessage);
    } else {
      await expect(this.page.locator('.bg-error-50')).toBeVisible();
    }
  }

  /**
   * Wait for loading to finish
   */
  async waitForLoadingToFinish(): Promise<void> {
    await this.page.waitForSelector('.animate-spin', { state: 'hidden' });
  }

  /**
   * Expect form validation error
   */
  async expectFormValidationError(fieldId: string, errorMessage?: string): Promise<void> {
    const field = this.page.locator(`#${fieldId}`);
    const errorElement = field.locator('+ .form-error, ~ .form-error').first();
    
    await expect(field).toHaveClass(/border-error-500/);
    await expect(errorElement).toBeVisible();
    
    if (errorMessage) {
      await expect(errorElement).toContainText(errorMessage);
    }
  }

  /**
   * Get all cookies from the page context
   */
  async getCookies(): Promise<{ name: string; value: string }[]> {
    const cookies = await this.page.context().cookies();
    return cookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value
    }));
  }

  /**
   * Make authenticated request using stored tokens
   */
  async makeAuthenticatedRequest(method: string, url: string, options?: any): Promise<any> {
    // Get tokens from cookies
    const tokens = await this.page.evaluate(() => {
      try {
        const cookies = document.cookie.split('; ');
        const accessTokenCookie = cookies.find(cookie => cookie.startsWith('yggdrasil_access_token='));
        const refreshTokenCookie = cookies.find(cookie => cookie.startsWith('yggdrasil_refresh_token='));
        
        let accessToken = null;
        let refreshToken = null;
        
        if (accessTokenCookie) {
          accessToken = decodeURIComponent(accessTokenCookie.split('=')[1]);
        }
        if (refreshTokenCookie) {
          refreshToken = decodeURIComponent(refreshTokenCookie.split('=')[1]);
        }
        
        return { accessToken, refreshToken };
      } catch {
        return null;
      }
    });

    if (!tokens?.accessToken) {
      // Try to get current user tokens if direct access fails
      const currentUser = this.getCurrentUser();
      if (currentUser?.tokens?.accessToken) {
        return await this.page.request.fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${currentUser.tokens.accessToken}`,
            'Content-Type': 'application/json',
            ...options?.headers
          },
          ...options
        });
      }
      throw new Error('No access token found');
    }

    return await this.page.request.fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    });
  }

  /**
   * Get refresh token from cookies
   */
  async getRefreshToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      try {
        // Get refresh token from cookies using the cookie name used by the app
        const cookies = document.cookie.split('; ');
        const refreshTokenCookie = cookies.find(cookie => cookie.startsWith('yggdrasil_refresh_token='));
        
        if (refreshTokenCookie) {
          const refreshToken = refreshTokenCookie.split('=')[1];
          return decodeURIComponent(refreshToken);
        }
        
        return null;
      } catch {
        return null;
      }
    });
  }
}