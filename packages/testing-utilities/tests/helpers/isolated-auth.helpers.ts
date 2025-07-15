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
   * Perform login with isolated user
   */
  private async performLogin(user: IsolatedTestUser): Promise<void> {
    await this.page.goto('/auth/login');
    
    // Wait for page to be fully loaded
    await this.page.waitForLoadState('networkidle');
    
    // Fill login form with isolated user credentials
    await this.page.fill('#email', user.email);
    await this.page.fill('#password', user.password);
    
    // Submit form
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect to news page
    await expect(this.page).toHaveURL('/news', { timeout: 10000 });
    
    // Wait for auth state to be initialized
    await this.page.waitForTimeout(200);
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
    // Get tokens from localStorage
    const tokens = await this.page.evaluate(() => {
      try {
        const tokenData = localStorage.getItem('tokens');
        return tokenData ? JSON.parse(tokenData) : null;
      } catch {
        return null;
      }
    });

    if (!tokens?.accessToken) {
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
   * Get refresh token from localStorage
   */
  async getRefreshToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      try {
        const tokenData = localStorage.getItem('tokens');
        const tokens = tokenData ? JSON.parse(tokenData) : null;
        return tokens?.refreshToken || null;
      } catch {
        return null;
      }
    });
  }
}