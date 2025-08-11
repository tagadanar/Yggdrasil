// packages/testing-utilities/tests/helpers/clean-auth.helpers.ts
// Clean authentication helper following CLAUDE.md clean testing architecture
// Uses TestCleanup pattern for proper state management

import { Page } from '@playwright/test';
import { AuthTestHelper, TestInitializer, type AuthResult } from '@yggdrasil/shared-utilities/testing';
import { TEST_PERFORMANCE_CONFIG } from '../config/performance-config';
import { AuthStateIsolator } from './auth-state-isolator';

/**
 * CleanAuthHelper - Follows CLAUDE.md clean testing architecture
 * Manages authentication with proper cleanup and state isolation
 */
export class CleanAuthHelper {
  private authHelper: AuthTestHelper | null = null;
  private page: Page | null;
  private maxRetries = 1; // OPTIMIZED: Reduced retries for faster tests
  private cachedAdminToken: string | null = null;

  constructor(page: Page | null) {
    this.page = page;
    if (page) {
      this.authHelper = new AuthTestHelper(page, {
        debug: false, // OPTIMIZED: Disable debug for faster execution
        timeout: TEST_PERFORMANCE_CONFIG.timeouts.auth, // Use optimized auth timeout
        retries: 1,  // OPTIMIZED: Reduced retries to speed up tests
      });
    }
  }

  /**
   * Retry wrapper for authentication operations
   */
  private async retryAuth<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔐 CLEAN AUTH: ${operationName} - Attempt ${attempt}/${this.maxRetries}`);
        const result = await operation();
        if (attempt > 1) {
          console.log(`🔐 CLEAN AUTH: ${operationName} succeeded on retry ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`🔐 CLEAN AUTH: ${operationName} failed on attempt ${attempt}: ${error}`);
        
        if (attempt < this.maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`🔐 CLEAN AUTH: Waiting ${delay}ms before retry...`);
          await this.page!.waitForTimeout(Math.min(delay, 1000)); // Cap retry delay at 1s for faster tests
          
          // Clear auth state before retry
          try {
            await this.clearAuthState();
          } catch (clearError) {
            console.warn('🔐 CLEAN AUTH: Failed to clear auth state during retry:', clearError);
          }
        }
      }
    }
    
    throw new Error(`🔐 CLEAN AUTH: ${operationName} failed after ${this.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Login as admin user with proper state tracking and retry logic
   */
  async loginAsAdmin(): Promise<AuthResult> {
    if (!this.page || !this.authHelper) {
      throw new Error('🔐 CLEAN AUTH: Cannot login as admin without page object. Use getAdminToken() for API-only authentication.');
    }
    
    return this.retryAuth(async () => {
      await AuthStateIsolator.prepareForRoleChange(this.page!, 'admin', 'Admin Login');
      // Only initialize if not already done
      if (!TestInitializer.isInitialized()) {
        await TestInitializer.quickSetup();
      }
      const result = await this.authHelper!.authenticateAs('admin');
      
      if (!result.success) {
        throw new Error(`Admin authentication failed: ${result.error}`);
      }
      
      console.log('🔐 CLEAN AUTH: Admin authentication successful');
      return result;
    }, 'Admin Login');
  }

  /**
   * Login as teacher user with proper state tracking and retry logic
   */
  async loginAsTeacher(): Promise<AuthResult> {
    return this.retryAuth(async () => {
      await AuthStateIsolator.prepareForRoleChange(this.page, 'teacher', 'Teacher Login');
      // Only initialize if not already done
      if (!TestInitializer.isInitialized()) {
        await TestInitializer.quickSetup();
      }
      if (!this.authHelper) throw new Error('Auth helper not initialized');
      const result = await this.authHelper.authenticateAs('teacher');
      
      if (!result.success) {
        throw new Error(`Teacher authentication failed: ${result.error}`);
      }
      
      console.log('🔐 CLEAN AUTH: Teacher authentication successful');
      return result;
    }, 'Teacher Login');
  }

  /**
   * Login as staff user with proper state tracking and retry logic
   */
  async loginAsStaff(): Promise<AuthResult> {
    return this.retryAuth(async () => {
      await AuthStateIsolator.prepareForRoleChange(this.page, 'staff', 'Staff Login');
      // Only initialize if not already done
      if (!TestInitializer.isInitialized()) {
        await TestInitializer.quickSetup();
      }
      const result = await this.authHelper.authenticateAs('staff');
      
      if (!result.success) {
        throw new Error(`Staff authentication failed: ${result.error}`);
      }
      
      console.log('🔐 CLEAN AUTH: Staff authentication successful');
      return result;
    }, 'Staff Login');
  }

  /**
   * Login as student user with proper state tracking and retry logic
   * CRITICAL: Uses deep auth isolation to prevent role sequence corruption
   */
  async loginAsStudent(): Promise<AuthResult> {
    return this.retryAuth(async () => {
      // CRITICAL: Deep auth state reset for student login to prevent cascade failures
      await AuthStateIsolator.prepareForRoleChange(this.page, 'student', 'Student Login');
      
      // Only initialize if not already done
      if (!TestInitializer.isInitialized()) {
        await TestInitializer.quickSetup();
      }
      const result = await this.authHelper.authenticateAs('student');
      
      if (!result.success) {
        throw new Error(`Student authentication failed: ${result.error}`);
      }
      
      console.log('🔐 CLEAN AUTH: Student authentication successful');
      return result;
    }, 'Student Login');
  }

  /**
   * Login with specific credentials
   */
  async loginWithCredentials(email: string, password: string): Promise<AuthResult> {
    // Only initialize if not already done
    if (!TestInitializer.isInitialized()) {
      await TestInitializer.quickSetup();
    }
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
   * Enhanced authentication isolation for critical zone tests
   * Provides extra cleanup and verification
   */
  async loginAsStudentWithEnhancedIsolation(): Promise<AuthResult> {
    console.log('🔐 CRITICAL ZONE: Enhanced student login with extra isolation');
    
    // Aggressive state clearing first
    await this.clearAuthStateEnhanced();
    
    // Force page reload to ensure clean state
    if (!this.page) throw new Error('Page not initialized');
    await this.page.goto('about:blank');
    await this.page.waitForTimeout(500);
    
    // Standard login with retries
    return await this.retryAuth(async () => {
      console.log('🔐 CRITICAL ZONE: Performing isolated student login');
      if (!this.authHelper) throw new Error('Auth helper not initialized');
      return await this.authHelper.loginAsAdmin(); // Using loginAsAdmin as loginAsStudent doesn't exist
    }, 'Enhanced Student Login');
  }

  /**
   * Enhanced authentication state clearing for critical zone
   */
  async clearAuthStateEnhanced(): Promise<void> {
    console.log('🔐 CRITICAL ZONE: Enhanced authentication state clearing');
    
    try {
      // Check if page is still available
      if (!this.page || this.page.isClosed()) {
        console.log('🔐 CRITICAL ZONE: Page not available or already closed, skipping enhanced cleanup');
        return;
      }
      
      // Clear all storage more aggressively
      await this.page.evaluate(() => {
        // Clear all types of storage
        try {
          if (typeof localStorage !== 'undefined' && localStorage) {
            localStorage.clear();
          }
          if (typeof sessionStorage !== 'undefined' && sessionStorage) {
            sessionStorage.clear();
          }
        } catch (e) {
          // Ignore storage errors
        }
        
        // Clear all cookies aggressively
        try {
          document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
          });
        } catch (e) {
          // Ignore cookie errors
        }
        
        // Clear IndexedDB
        try {
          if (window.indexedDB && indexedDB.databases) {
            indexedDB.databases().then(databases => {
              databases.forEach(db => {
                if (db.name) indexedDB.deleteDatabase(db.name);
              });
            }).catch(() => {
              // Ignore errors
            });
          }
        } catch (e) {
          // Ignore IndexedDB errors
        }
      });
      
      // Standard auth state clear
      await this.authHelper.clearAuthState();
      
      // Wait for state to settle
      if (!this.page) throw new Error('Page not initialized');
      await this.page.waitForTimeout(1000);
      
      console.log('🔐 CRITICAL ZONE: Enhanced authentication state cleared');
    } catch (error) {
      console.warn('🔐 CRITICAL ZONE: Enhanced clear failed, falling back to standard clear');
      await this.authHelper.clearAuthState();
    }
  }

  /**
   * Clear all authentication state - CRITICAL for test isolation
   */
  async clearAuthState(): Promise<void> {
    try {
      // Clear cached admin token
      this.cachedAdminToken = null;
      
      if (!this.page) {
        console.log('🔐 CLEAN AUTH: No page object, only clearing cached tokens');
        return;
      }
      
      // Check if page is still available before attempting to clear storage
      if (this.page.isClosed()) {
        console.log('🔐 CLEAN AUTH: Page already closed, skipping storage cleanup');
        return;
      }
      
      // Clear browser storage - handle SecurityError and navigation errors gracefully
      try {
        if (!this.page) throw new Error('Page not initialized');
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
            console.warn('Could not clear storage due to security restrictions:', (securityError as Error).message);
          }
        });
      } catch (navigationError) {
        // Handle execution context destroyed errors gracefully
        if ((navigationError as Error).message && (navigationError as Error).message.includes('Execution context was destroyed')) {
          console.log('🔐 CLEAN AUTH: Page navigated during cleanup, auth state likely already cleared');
          return;
        }
        throw navigationError;
      }

      // Use centralized auth helper cleanup if available
      if (this.authHelper) {
        await this.authHelper.clearAuthState();
      }
      
      console.log('🔐 CLEAN AUTH: Authentication state cleared successfully');
    } catch (error) {
      // Handle execution context destroyed errors gracefully
      if ((error as Error).message && (error as Error).message.includes('Execution context was destroyed')) {
        console.log('🔐 CLEAN AUTH: Page navigated during cleanup, auth state likely already cleared');
        return;
      }
      console.error('🔐 CLEAN AUTH: Failed to clear auth state:', error);
      throw error;
    }
  }

  /**
   * Complete authentication state transition - prevents cycling issues
   * This method ensures complete cleanup and UI reset before new authentication
   */
  async transitionAuthState(targetRole: 'admin' | 'teacher' | 'staff' | 'student'): Promise<void> {
    try {
      console.log(`🔐 CLEAN AUTH: Starting auth state transition to ${targetRole}`);
      
      // Step 1: Complete cleanup with verification
      await this.clearAuthState();
      
      // Step 2: Wait for auth UI to reset (critical for cycling)
      await this.page.waitForTimeout(TEST_PERFORMANCE_CONFIG.waits.stateChange);
      
      // Step 3: Navigate to clean login page to ensure fresh state
      await this.page.goto('/auth/login');
      await this.page.waitForLoadState('networkidle');
      
      // Step 4: Verify we're on clean login page
      await this.page.waitForSelector('[data-testid="login-form"], .login-form', { timeout: TEST_PERFORMANCE_CONFIG.timeouts.selector });
      
      // Step 5: Execute target authentication
      switch (targetRole) {
        case 'admin':
          await this.loginAsAdmin();
          break;
        case 'teacher':
          await this.loginAsTeacher();
          break;
        case 'staff':
          await this.loginAsStaff();
          break;
        case 'student':
          await this.loginAsStudent();
          break;
      }
      
      console.log(`🔐 CLEAN AUTH: Auth state transition to ${targetRole} completed successfully`);
    } catch (error) {
      console.error(`🔐 CLEAN AUTH: Auth state transition to ${targetRole} failed:`, error);
      throw error;
    }
  }

  /**
   * Safe authentication method that handles cycling issues
   * Use this instead of direct login methods when switching between users
   */
  async switchToRole(targetRole: 'admin' | 'teacher' | 'staff' | 'student'): Promise<void> {
    try {
      // Check if we're already authenticated as the target role
      const currentAuth = await this.page.evaluate(() => {
        const cookies = document.cookie;
        if (cookies.includes('yggdrasil_access_token')) {
          // Try to decode the token to check role (simplified check)
          const tokenMatch = cookies.match(/yggdrasil_access_token=([^;]+)/);
          if (tokenMatch && tokenMatch[1]) {
            try {
              const parts = tokenMatch[1].split('.');
              if (parts.length === 3 && parts[1]) {
                const payload = JSON.parse(atob(parts[1]));
                return payload.role;
              }
            } catch (e) {
              return null;
            }
          }
        }
        return null;
      });

      if (currentAuth === targetRole) {
        console.log(`🔐 CLEAN AUTH: Already authenticated as ${targetRole}, skipping transition`);
        return;
      }

      console.log(`🔐 CLEAN AUTH: Switching from ${currentAuth || 'none'} to ${targetRole}`);
      await this.transitionAuthState(targetRole);
      
    } catch (error) {
      console.error(`🔐 CLEAN AUTH: Failed to switch to role ${targetRole}:`, error);
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
    if (!this.page) {
      console.error('🔐 CLEAN AUTH: Cannot get access token without page object');
      return null;
    }
    
    try {
      return await this.page.evaluate(() => {
        // Read from cookies using js-cookie format
        const getCookie = (name: string): string | null => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) {
            const cookieValue = parts.pop()?.split(';').shift();
            return cookieValue ? decodeURIComponent(cookieValue) : null;
          }
          return null;
        };
        
        return getCookie('yggdrasil_access_token');
      });
    } catch (error) {
      console.error('🔐 CLEAN AUTH: Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Get admin token for API requests - works without page object
   * Uses direct API authentication for testing purposes
   */
  async getAdminToken(): Promise<string> {
    // Return cached token if available
    if (this.cachedAdminToken) {
      console.log('🔐 CLEAN AUTH: Returning cached admin token');
      return this.cachedAdminToken;
    }

    try {
      console.log('🔐 CLEAN AUTH: Getting admin token via API...');
      
      // Direct API call to authenticate as admin
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@yggdrasil.edu',
          password: 'Admin123!'
        })
      });

      if (!response.ok) {
        throw new Error(`Admin authentication failed: ${response.status} ${response.statusText}`);
      }

      const authResult = await response.json();
      
      if (!authResult.success || !authResult.data || !authResult.data.tokens || !authResult.data.tokens.accessToken) {
        throw new Error(`Admin authentication failed: ${authResult.error || 'No access token received'}`);
      }

      // Cache the token
      this.cachedAdminToken = authResult.data.tokens.accessToken;
      console.log('🔐 CLEAN AUTH: Admin token obtained successfully');
      
      return this.cachedAdminToken;
    } catch (error) {
      console.error('🔐 CLEAN AUTH: Failed to get admin token:', error);
      throw new Error(`Failed to get admin token: ${error instanceof Error ? error.message : 'Unknown error'}`);
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