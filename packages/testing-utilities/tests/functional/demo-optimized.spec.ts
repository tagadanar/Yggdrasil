import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { captureEnhancedError } from '../helpers/enhanced-error-context';

test.describe('Demo Optimized Test Suite', () => {
  test('DEMO-001: Quick Auth Verification (Admin & Student only)', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('DEMO-001');
    let context: any = undefined;
    let auth: CleanAuthHelper | undefined = undefined;
    
    try {
      context = await browser.newContext();
      cleanup.trackBrowserContext(context);
      const page = await context.newPage();
      auth = new CleanAuthHelper(page);
      
      // Testing authentication for key user roles
      
      // Test only admin and student roles for faster execution
      const roles = ['admin', 'student'] as const;
      
      for (const role of roles) {
        // Testing role authentication
        
        // Clear any previous auth state
        await auth.clearAuthState();
        
        // Authenticate as the role
        let result;
        if (role === 'admin') {
          result = await auth.loginAsAdmin();
        } else {
          result = await auth.loginAsStudent();
        }
        
        // OPTIMIZED: Simplified authentication verification  
        expect(result.success).toBeTruthy();
        
        // Role authentication successful
        
        // OPTIMIZED: Just verify we're authenticated, skip navigation
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/auth/login');
        
        // Role authenticated successfully
      }
      
    } finally {
      if (auth) await auth.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  test('DEMO-002: Quick Page Load Test', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('DEMO-002');
    let context: any = undefined;
    let auth: CleanAuthHelper | undefined = undefined;
    
    try {
      context = await browser.newContext();
      cleanup.trackBrowserContext(context);
      const page = await context.newPage();
      auth = new CleanAuthHelper(page);
      
      // Testing basic page loading
      
      // Login as student for faster test
      await auth.loginAsStudent();
      
      // Test only the home page loads without errors
      // Testing home page loading
      
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      
      // Basic check - we're not on login page
      expect(page.url()).not.toContain('/auth/login');
      
      // Home page loads successfully
      
    } finally {
      if (auth) await auth.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  test('DEMO-003: Authentication Performance Check', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('DEMO-003');
    let context: any = undefined;
    let auth: CleanAuthHelper | undefined = undefined;
    
    try {
      const startTime = Date.now();
      // Testing authentication performance
      
      context = await browser.newContext();
      cleanup.trackBrowserContext(context);
      const page = await context.newPage();
      auth = new CleanAuthHelper(page);
      
      // Quick auth test
      const authStart = Date.now();
      await auth.loginAsStudent();
      const authEnd = Date.now();
      
      // Verify we're authenticated
      expect(page.url()).not.toContain('/auth/login');
      
      const totalTime = Date.now() - startTime;
      const authTime = authEnd - authStart;
      
      // Authentication completed
      // Total test time measured
      
      // Authentication should be fast
      expect(authTime).toBeLessThan(5000); // 5 seconds max
      expect(totalTime).toBeLessThan(10000); // 10 seconds max for entire test
      
    } finally {
      if (auth) await auth.clearAuthState();
      await cleanup.cleanup();
    }
  });
});