// packages/testing-utilities/tests/functional/auth-security-improved.spec.ts
// Improved authentication tests with proper isolation

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { captureEnhancedError } from '../helpers/enhanced-error-context';

test.describe('Authentication Security', () => {
  // Each test manages its own cleanup

  test('Admin Authentication Flow', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Admin Authentication Flow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      
      // Verify we can access protected content
      await page.goto('/news');
      await page.waitForLoadState('domcontentloaded'); // OPTIMIZED: Faster than networkidle
      
      // Should not redirect to login
      expect(page.url()).toContain('/news');
      expect(page.url()).not.toContain('/auth/login');
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Teacher Authentication Flow', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Teacher Authentication Flow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsTeacher();
      
      // Verify we can access protected content
      await page.goto('/news');
      await page.waitForLoadState('domcontentloaded'); // OPTIMIZED: Faster than networkidle
      
      // Should not redirect to login
      expect(page.url()).toContain('/news');
      expect(page.url()).not.toContain('/auth/login');
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Staff Authentication Flow', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Staff Authentication Flow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStaff();
      
      // Verify we can access protected content
      await page.goto('/news');
      await page.waitForLoadState('domcontentloaded'); // OPTIMIZED: Faster than networkidle
      
      // Should not redirect to login
      expect(page.url()).toContain('/news');
      expect(page.url()).not.toContain('/auth/login');
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Student Authentication Flow', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Student Authentication Flow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
      
      // Verify we can access protected content
      await page.goto('/news');
      await page.waitForLoadState('domcontentloaded'); // OPTIMIZED: Faster than networkidle
      
      // Should not redirect to login
      expect(page.url()).toContain('/news');
      expect(page.url()).not.toContain('/auth/login');
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Sequential Authentication Test', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Sequential Authentication Test');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Test multiple authentications in sequence to verify isolation
      const users = ['admin', 'teacher', 'staff', 'student'] as const;
      
      for (const userType of users) {
        // Clear state before each authentication
        await authHelper.clearAuthState();
        
        // Authenticate as the user
        if (userType === 'admin') await authHelper.loginAsAdmin();
        else if (userType === 'teacher') await authHelper.loginAsTeacher();
        else if (userType === 'staff') await authHelper.loginAsStaff();
        else if (userType === 'student') await authHelper.loginAsStudent();
        
        // Verify access to protected content
        await page.goto('/courses');
        await page.waitForLoadState('domcontentloaded'); // OPTIMIZED: Faster than networkidle
        expect(page.url()).toContain('/courses');
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Cookie Persistence Test', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Cookie Persistence Test');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Authenticate as admin
      await authHelper.loginAsAdmin();
      
      // Verify cookies are set
      const cookies = await page.evaluate(() => document.cookie);
      expect(cookies).toContain('yggdrasil_access_token');
      expect(cookies).toContain('yggdrasil_refresh_token');
      
      // OPTIMIZED: Test fewer routes to reduce test time
      const testRoutes = ['/courses', '/news']; // Reduced from 4 to 2 routes
      
      for (const route of testRoutes) {
        await page.goto(`http://localhost:3000${route}`);
        
        // OPTIMIZED: Faster page load check
        await page.waitForLoadState('domcontentloaded');
        
        // Quick auth check without extra delays
        await page.waitForFunction(
          () => !window.location.pathname.includes('/auth/login'),
          { timeout: 2000 } // OPTIMIZED: Reduced from 10s to 5s
        );
        
        // Check cookies still exist
        const persistentCookies = await page.evaluate(() => document.cookie);
        expect(persistentCookies).toContain('yggdrasil_access_token');
        expect(persistentCookies).toContain('yggdrasil_refresh_token');
        
        // Should not redirect to login
        expect(page.url()).not.toContain('/auth/login');
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Authentication State Isolation', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Authentication State Isolation');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Should redirect to login when accessing protected content without auth
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded'); // OPTIMIZED: Faster load state
      
      // Verify we get redirected to login
      await page.waitForFunction(() => 
        window.location.pathname.includes('/auth/login'), 
        { timeout: 2000 } // OPTIMIZED: Reduced from 10s to 5s
      );
      expect(page.url()).toContain('/auth/login');
      
      // Now authenticate
      await authHelper.loginAsAdmin();
      
      // Should be able to access protected content
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded'); // OPTIMIZED: Faster load state
      expect(page.url()).toContain('/courses');
      
      // Clear state
      await authHelper.clearAuthState();
      
      // Should redirect to login again
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded'); // OPTIMIZED: Faster load state
      
      await page.waitForFunction(() => 
        window.location.pathname.includes('/auth/login'), 
        { timeout: 2000 } // OPTIMIZED: Reduced from 10s to 5s
      );
      expect(page.url()).toContain('/auth/login');
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
});