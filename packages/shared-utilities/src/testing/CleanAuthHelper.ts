// packages/shared-utilities/src/testing/CleanAuthHelper.ts
// Ultra-simplified authentication helper for clean architecture

import { Page } from '@playwright/test';
import { DemoUserManager } from './DemoUserManager';
import { LoggerFactory } from '../logging/logger';

const logger = LoggerFactory.createLogger('clean-auth-helper');
// import { type DemoUser } from './DemoUserManager'; // Unused import

export interface CleanAuthResult {
  success: boolean;
  error?: string;
  finalUrl?: string;
}

export class CleanAuthHelper {
  private page: Page;
  private demoUserManager: DemoUserManager;

  constructor(page: Page) {
    this.page = page;
    this.demoUserManager = DemoUserManager.getInstance();
  }

  /**
   * Authenticate as a specific user role using ultra-simple approach
   */
  async authenticateAs(role: 'admin' | 'teacher' | 'staff' | 'student'): Promise<CleanAuthResult> {
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
   * Ultra-simplified authentication with direct approach
   */
  async authenticateWithCredentials(email: string, password: string): Promise<CleanAuthResult> {
    try {
      logger.info(`🔐 CLEAN AUTH: Starting authentication for: ${email}`);

      // Navigate to login page
      await this.page.goto('http://localhost:3000/auth/login', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for login form
      await this.page.waitForSelector('form', { state: 'visible', timeout: 30000 });

      // Fill credentials
      await this.page.fill('#email', email);
      await this.page.fill('#password', password);

      // Submit form and wait for auth response
      const [authResponse] = await Promise.all([
        this.page.waitForResponse(
          response => response.url().includes('/api/auth/login') && response.request().method() === 'POST',
          { timeout: 30000 },
        ),
        this.page.click('button[type="submit"]'),
      ]);

      logger.info(`🔐 CLEAN AUTH: Auth response status: ${authResponse.status()}`);

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

      // Wait for navigation away from login page
      await this.page.waitForFunction(
        () => !window.location.pathname.includes('/auth/login'),
        { timeout: 30000 },
      );

      // Wait for Yggdrasil cookies to be set
      await this.page.waitForFunction(
        () => document.cookie.includes('yggdrasil_access_token') || document.cookie.includes('yggdrasil_refresh_token'),
        { timeout: 10000 },
      );

      logger.info('🔐 CLEAN AUTH: Authentication and navigation completed successfully');

      return {
        success: true,
        finalUrl: this.page.url(),
      };

    } catch (error: any) {
      logger.error('🔐 CLEAN AUTH: Authentication failed:', error);
      return {
        success: false,
        error: error.message || 'Authentication process failed',
      };
    }
  }

  /**
   * Clear authentication state - includes cookies, localStorage, and sessionStorage
   */
  async clearAuthState(): Promise<void> {
    // Clear cookies
    await this.page.context().clearCookies();
    
    // Clear localStorage and sessionStorage for complete isolation
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    }).catch(() => {
      // Ignore errors if page is not available
    });
  }

  /**
   * Verify authentication state using simple approach
   */
  async verifyAuthState(): Promise<boolean> {
    try {
      // Simple check: not on login page + has cookies
      const currentUrl = this.page.url();
      const notOnLoginPage = !currentUrl.includes('/auth/login');

      const cookies = await this.page.context().cookies();
      const hasYggdrasilCookies = cookies.some(cookie =>
        cookie.name.includes('yggdrasil_access_token') ||
        cookie.name.includes('yggdrasil_refresh_token'),
      );

      return notOnLoginPage && hasYggdrasilCookies;
    } catch (error) {
      logger.error('🔐 CLEAN AUTH: State verification failed:', error);
      return false;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<boolean> {
    try {
      await this.clearAuthState();
      await this.page.goto('http://localhost:3000/auth/login');
      return true;
    } catch (error) {
      logger.error('🔐 CLEAN AUTH: Logout failed:', error);
      return false;
    }
  }
}
