// packages/testing-utilities/tests/helpers/auth-state-isolator.ts
// Deep auth state isolation to prevent role transition corruption

import { Page } from '@playwright/test';
import { LoggerFactory } from '@yggdrasil/shared-utilities';

const logger = LoggerFactory.createLogger('auth-state-isolator');

/**
 * AuthStateIsolator - Prevents auth state corruption between role changes
 * 
 * Addresses the specific issue where Admin→Admin→Staff→Student sequence
 * corrupts authentication state causing cascade failures.
 */
export class AuthStateIsolator {
  private static lastRole: string | null = null;
  private static roleChangeCount = 0;
  
  /**
   * Prepare page for role change with deep state reset
   */
  static async prepareForRoleChange(page: Page, newRole: string, testName: string): Promise<void> {
    const previousRole = this.lastRole;
    this.roleChangeCount++;
    
    logger.info(`🔄 Auth state transition: ${previousRole || 'none'} → ${newRole} (test: ${testName})`);
    logger.info(`📊 Role change count: ${this.roleChangeCount}`);
    
    // Critical sequence that causes issues: Admin→Admin→Staff→Student
    const isCriticalSequence = this.roleChangeCount >= 4 && newRole === 'student';
    
    if (isCriticalSequence || this.needsDeepReset(previousRole, newRole)) {
      logger.warn(`🚨 Critical auth sequence detected - performing deep reset`);
      await this.performDeepAuthReset(page, testName);
    } else {
      await this.performStandardReset(page);
    }
    
    this.lastRole = newRole;
  }
  
  /**
   * Check if role transition needs deep reset
   */
  private static needsDeepReset(previousRole: string | null, newRole: string): boolean {
    // Deep reset scenarios
    const criticalTransitions = [
      'staff→student',     // Staff to Student (most problematic)
      'admin→student',     // Admin to Student  
    ];
    
    const transition = `${previousRole}→${newRole}`;
    const needsReset = criticalTransitions.includes(transition) || this.roleChangeCount >= 4;
    
    if (needsReset) {
      logger.warn(`⚠️ Problematic transition detected: ${transition}`);
    }
    
    return needsReset;
  }
  
  /**
   * Perform deep authentication state reset
   */
  private static async performDeepAuthReset(page: Page, testName: string): Promise<void> {
    logger.info(`🧹 Starting deep auth reset for: ${testName}`);
    
    try {
      // 1. Navigate to clean base page first
      await page.goto('about:blank');
      await page.waitForTimeout(500);
      
      // 2. Aggressive storage cleanup
      await page.evaluate(() => {
        try {
          // Clear all storage types
          if (typeof localStorage !== 'undefined') {
            localStorage.clear();
          }
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
          }
          
          // Clear IndexedDB if available
          if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
            indexedDB.databases().then(databases => {
              databases.forEach(db => {
                if (db.name) {
                  indexedDB.deleteDatabase(db.name);
                }
              });
            });
          }
          
          // Clear all cookies manually
          document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name) {
              // Clear for current domain
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`;
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.localhost`;
            }
          });
          
        } catch (error) {
          console.warn('Storage cleanup error:', error);
        }
      });
      
      // 3. Clear browser context storage
      const context = page.context();
      await context.clearCookies();
      await context.clearPermissions();
      
      // 4. Wait for cleanup to settle
      await page.waitForTimeout(1000);
      
      // 5. Navigate to login page with fresh state
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      
      // 6. Verify clean state
      const hasTokens = await page.evaluate(() => {
        const localStorage = window.localStorage || {};
        const sessionStorage = window.sessionStorage || {};
        const cookies = document.cookie;
        
        return {
          localStorage: Object.keys(localStorage).filter(k => k.includes('yggdrasil')),
          sessionStorage: Object.keys(sessionStorage).filter(k => k.includes('yggdrasil')),
          cookies: cookies.includes('yggdrasil_'),
        };
      });
      
      logger.info(`✅ Deep auth reset completed. Remaining tokens: ${JSON.stringify(hasTokens)}`);
      
    } catch (error) {
      logger.error(`❌ Deep auth reset failed: ${error}`);
      throw error;
    }
  }
  
  /**
   * Perform standard authentication reset
   */
  private static async performStandardReset(page: Page): Promise<void> {
    try {
      // Standard cleanup
      await page.evaluate(() => {
        try {
          if (typeof localStorage !== 'undefined') localStorage.clear();
          if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
        } catch (e) {}
      });
      
      const context = page.context();
      await context.clearCookies();
      
      await page.waitForTimeout(200);
      
    } catch (error) {
      logger.warn(`Standard reset error: ${error}`);
    }
  }
  
  /**
   * Reset role tracking (for test suite boundaries)
   */
  static resetRoleTracking(): void {
    logger.info('🔄 Resetting role tracking for new test suite');
    this.lastRole = null;
    this.roleChangeCount = 0;
  }
  
  /**
   * Get current state info
   */
  static getStateInfo(): { lastRole: string | null; roleChangeCount: number } {
    return {
      lastRole: this.lastRole,
      roleChangeCount: this.roleChangeCount,
    };
  }
}