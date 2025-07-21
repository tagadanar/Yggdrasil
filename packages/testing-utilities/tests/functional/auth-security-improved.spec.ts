// packages/testing-utilities/tests/functional/auth-security-improved.spec.ts
// Improved authentication tests with proper isolation

import { test, expect, Browser } from '@playwright/test';
import { SimplifiedAuthHelpers } from '../helpers/simplified-auth.helpers';

test.describe('Authentication Security', () => {
  // Removed auth helper setup since we're using direct demo button authentication

  test('IMPROVED-AUTH-001: Admin Authentication Flow', async ({ page }) => {
    console.log('🧪 TEST: Starting admin authentication test...');
    
    // Go to login page
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Use demo button for authentication (proven to work)
    const demoButton = page.locator('[data-testid="demo-admin-button"]');
    await demoButton.waitFor({ state: 'visible', timeout: 10000 });
    await demoButton.click();
    
    // Wait for navigation to news page
    await page.waitForFunction(
      () => window.location.pathname.includes('/news'),
      { timeout: 30000 }
    );
    
    console.log('🧪 TEST: Navigated to:', page.url());
    
    // Verify we can access protected content
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // Should not redirect to login
    expect(page.url()).toContain('/news');
    expect(page.url()).not.toContain('/auth/login');
    
    console.log('🧪 TEST: Admin authentication test completed successfully');
  });

  test('IMPROVED-AUTH-002: Teacher Authentication Flow', async ({ page }) => {
    console.log('🧪 TEST: Starting teacher authentication test...');
    
    // Go to login page and use demo button
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    
    const demoButton = page.locator('[data-testid="demo-teacher-button"]');
    await demoButton.waitFor({ state: 'visible', timeout: 10000 });
    await demoButton.click();
    
    // Wait for navigation to news page
    await page.waitForFunction(
      () => window.location.pathname.includes('/news'),
      { timeout: 30000 }
    );
    
    // Verify we can access protected content
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // Should not redirect to login
    expect(page.url()).toContain('/news');
    expect(page.url()).not.toContain('/auth/login');
    
    console.log('🧪 TEST: Teacher authentication test completed successfully');
  });

  test('IMPROVED-AUTH-003: Staff Authentication Flow', async ({ page }) => {
    console.log('🧪 TEST: Starting staff authentication test...');
    
    // Go to login page and use demo button
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    
    const demoButton = page.locator('[data-testid="demo-staff-button"]');
    await demoButton.waitFor({ state: 'visible', timeout: 10000 });
    await demoButton.click();
    
    // Wait for navigation to news page
    await page.waitForFunction(
      () => window.location.pathname.includes('/news'),
      { timeout: 30000 }
    );
    
    // Verify we can access protected content
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // Should not redirect to login
    expect(page.url()).toContain('/news');
    expect(page.url()).not.toContain('/auth/login');
    
    console.log('🧪 TEST: Staff authentication test completed successfully');
  });

  test('IMPROVED-AUTH-004: Student Authentication Flow', async ({ page }) => {
    console.log('🧪 TEST: Starting student authentication test...');
    
    // Go to login page and use demo button
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    
    const demoButton = page.locator('[data-testid="demo-student-button"]');
    await demoButton.waitFor({ state: 'visible', timeout: 10000 });
    await demoButton.click();
    
    // Wait for navigation to news page
    await page.waitForFunction(
      () => window.location.pathname.includes('/news'),
      { timeout: 30000 }
    );
    
    // Verify we can access protected content
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // Should not redirect to login
    expect(page.url()).toContain('/news');
    expect(page.url()).not.toContain('/auth/login');
    
    console.log('🧪 TEST: Student authentication test completed successfully');
  });

  test('IMPROVED-AUTH-005: Sequential Authentication Test', async () => {
    console.log('🧪 TEST: Starting sequential authentication test...');
    
    const page = authHelpers.getPage();
    
    // Test multiple authentications in sequence to verify isolation
    const users = ['admin', 'teacher', 'staff', 'student'] as const;
    
    for (const userType of users) {
      console.log(`🧪 TEST: Testing ${userType} authentication in sequence...`);
      
      // Clear state before each authentication
      await authHelpers.clearAuthenticationState();
      
      // Authenticate as the user
      if (userType === 'admin') await authHelpers.loginAsAdmin();
      else if (userType === 'teacher') await authHelpers.loginAsTeacher();
      else if (userType === 'staff') await authHelpers.loginAsStaff();
      else if (userType === 'student') await authHelpers.loginAsStudent();
      
      // Verify authentication
      const isAuth = await authHelpers.isAuthenticated();
      expect(isAuth).toBe(true);
      
      // Verify access to protected content
      await page.goto('/courses');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/courses');
      
      console.log(`🧪 TEST: ${userType} sequential authentication successful`);
    }
    
    console.log('🧪 TEST: Sequential authentication test completed successfully');
  });

  test('IMPROVED-AUTH-006: Cookie Persistence Test', async () => {
    console.log('🧪 TEST: Starting cookie persistence test...');
    
    const page = authHelpers.getPage();
    
    // Authenticate as admin
    await authHelpers.loginAsAdmin();
    
    // Verify cookies are set
    const cookies = await page.evaluate(() => document.cookie);
    expect(cookies).toContain('yggdrasil_access_token');
    expect(cookies).toContain('yggdrasil_refresh_token');
    
    // Navigate to different pages and verify cookies persist
    const testRoutes = ['/courses', '/news', '/planning', '/statistics'];
    
    for (const route of testRoutes) {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState('networkidle');
      
      // Check cookies still exist
      const persistentCookies = await page.evaluate(() => document.cookie);
      expect(persistentCookies).toContain('yggdrasil_access_token');
      expect(persistentCookies).toContain('yggdrasil_refresh_token');
      
      // Should not redirect to login
      expect(page.url()).not.toContain('/auth/login');
      
      console.log(`🧪 TEST: Cookies persisted correctly on ${route}`);
    }
    
    console.log('🧪 TEST: Cookie persistence test completed successfully');
  });

  test('IMPROVED-AUTH-007: Authentication State Isolation', async () => {
    console.log('🧪 TEST: Starting authentication state isolation test...');
    
    const page = authHelpers.getPage();
    
    // Start with clean state
    let isAuth = await authHelpers.isAuthenticated();
    expect(isAuth).toBe(false);
    
    // Should redirect to login when accessing protected content
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    
    // Verify we get redirected to login
    await page.waitForFunction(() => 
      window.location.pathname.includes('/auth/login'), 
      { timeout: 10000 }
    );
    expect(page.url()).toContain('/auth/login');
    
    // Now authenticate
    await authHelpers.loginAsAdmin();
    
    // Verify authentication worked
    isAuth = await authHelpers.isAuthenticated();
    expect(isAuth).toBe(true);
    
    // Clear state
    await authHelpers.clearAuthenticationState();
    
    // Verify state is cleared
    isAuth = await authHelpers.isAuthenticated();
    expect(isAuth).toBe(false);
    
    // Should redirect to login again
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    
    await page.waitForFunction(() => 
      window.location.pathname.includes('/auth/login'), 
      { timeout: 10000 }
    );
    expect(page.url()).toContain('/auth/login');
    
    console.log('🧪 TEST: Authentication state isolation test completed successfully');
  });
});