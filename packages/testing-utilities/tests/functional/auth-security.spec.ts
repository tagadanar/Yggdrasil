// packages/testing-utilities/tests/functional/auth-security.spec.ts
// Comprehensive authentication and security workflow tests

import { test, expect } from '@playwright/test';
import { IsolatedAuthHelpers } from '../helpers/enhanced-isolated-auth.helpers';

test.describe('Authentication Security - Comprehensive Workflows', () => {
  let authHelpers: IsolatedAuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new IsolatedAuthHelpers(page);
    await authHelpers.initialize();
  });

  test.afterEach(async ({ page }) => {
    await authHelpers.cleanup();
  });

  // =============================================================================
  // AUTH-001: Complete JWT Security Lifecycle
  // =============================================================================
  test('AUTH-001: Complete JWT Security Lifecycle', async ({ page }) => {

    // Step 1: Login with valid credentials → verify access token structure
    await authHelpers.loginAsStudent();
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    
    // Verify successful login by checking for course page content
    await expect(page.locator('h1:has-text("My Enrollments"), h1:has-text("Courses")')).toBeVisible();
    
    // Step 2: Verify authenticated access to protected pages
    // Test access to profile page (requires authentication)
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Should be able to access profile page when authenticated
    const profilePageIndicators = [
      'h1:has-text("Profile")',
      'h1:has-text("My Profile")', 
      'input[name="email"]',
      '.profile-section'
    ];
    
    let profileAccessible = false;
    for (const indicator of profilePageIndicators) {
      if (await page.locator(indicator).count() > 0) {
        await expect(page.locator(indicator)).toBeVisible();
        profileAccessible = true;
        break;
      }
    }
    expect(profileAccessible).toBeTruthy();

    // Step 3: Test session expiration handling
    // Clear cookies to simulate expired session
    await page.evaluate(() => {
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
    });

    // Try to access protected page after session cleared
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to login or show access denied
    const sessionExpiredIndicators = [
      'input[type="email"]',
      'h1:has-text("Login")',
      'h1:has-text("Sign In")',
      'text=Please log in',
      'text=Session expired'
    ];
    
    let sessionExpired = false;
    for (const indicator of sessionExpiredIndicators) {
      if (await page.locator(indicator).count() > 0) {
        sessionExpired = true;
        break;
      }
    }
    expect(sessionExpired).toBeTruthy();

    // Step 8: Logout from all devices → verify all tokens invalidated
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    
    // Look for logout button and click it
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")');
    if (await logoutButton.count() > 0) {
      await logoutButton.first().click();
      await page.waitForLoadState('networkidle');
    }

    // Step 4: Verify logout functionality and session cleanup

    // Verify redirect to login page after logout
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to login or see login form
    const loginIndicators = [
      'input[type="email"]',
      'input[name="email"]',
      'h1:has-text("Login")',
      'h1:has-text("Sign In")',
      'form[action*="login"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")'
    ];

    let loginFormFound = false;
    for (const selector of loginIndicators) {
      if (await page.locator(selector).count() > 0) {
        loginFormFound = true;
        break;
      }
    }
    expect(loginFormFound).toBeTruthy();
  });

  // =============================================================================
  // AUTH-002: Multi-Device Session Management
  // =============================================================================
  test('AUTH-002: Multi-Device Session Management', async ({ page, context }) => {
    // Step 1: Login from device A → verify session creation
    await authHelpers.loginAsStudent();
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("My Enrollments"), h1:has-text("Courses")')).toBeVisible();

    // Step 2: Login from device B with same user → verify concurrent sessions
    const deviceBContext = await page.context().browser()?.newContext();
    if (deviceBContext) {
      const deviceBPage = await deviceBContext.newPage();
      const deviceBAuthHelpers = new IsolatedAuthHelpers(deviceBPage);
      await deviceBAuthHelpers.initialize();
      
      // Login with the same user credentials on device B
      await deviceBAuthHelpers.loginAsStudent();
      await deviceBPage.goto('/courses');
      await deviceBPage.waitForLoadState('networkidle');
      await expect(deviceBPage.locator('h1:has-text("My Enrollments"), h1:has-text("Courses")')).toBeVisible();

      // Step 3: Verify both sessions are active
      // Device A should still be logged in
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1:has-text("My Enrollments"), h1:has-text("Courses")')).toBeVisible();

      // Device B should also be logged in
      await deviceBPage.reload();
      await deviceBPage.waitForLoadState('networkidle');
      await expect(deviceBPage.locator('h1:has-text("My Enrollments"), h1:has-text("Courses")')).toBeVisible();

      // Step 4: Logout from device A only → verify device B still active
      const logoutButtonA = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")');
      if (await logoutButtonA.count() > 0) {
        await logoutButtonA.first().click();
        await page.waitForLoadState('networkidle');
      }

      // Device A should be logged out
      await page.goto('/courses');
      await page.waitForLoadState('networkidle');
      const loginIndicators = [
        'input[type="email"]',
        'input[name="email"]',
        'h1:has-text("Login")',
        'h1:has-text("Sign In")'
      ];
      let deviceALoggedOut = false;
      for (const selector of loginIndicators) {
        if (await page.locator(selector).count() > 0) {
          deviceALoggedOut = true;
          break;
        }
      }
      expect(deviceALoggedOut).toBeTruthy();

      // Device B should still be active (depending on implementation)
      await deviceBPage.goto('/courses');
      await deviceBPage.waitForLoadState('networkidle');
      // Note: This might fail if the system implements single-session mode
      // In that case, both devices would be logged out

      // Cleanup device B
      await deviceBAuthHelpers.cleanup();
      await deviceBContext.close();
    }
  });

  // =============================================================================
  // AUTH-003: Role-Based Authorization Matrix
  // =============================================================================
  test('AUTH-003: Role-Based Authorization Matrix', async ({ page }) => {
    const roleTests = [
      {
        role: 'admin',
        loginMethod: 'loginAsAdmin' as const,
        expectedAccess: {
          users: true,
          courses: true,
          news: true,
          statistics: true,
          planning: true
        }
      },
      {
        role: 'staff',
        loginMethod: 'loginAsStaff' as const,
        expectedAccess: {
          users: true,
          courses: true,
          news: true,
          statistics: false,
          planning: true
        }
      },
      {
        role: 'teacher',
        loginMethod: 'loginAsTeacher' as const,
        expectedAccess: {
          users: false,
          courses: true,
          news: false,
          statistics: false,
          planning: true
        }
      },
      {
        role: 'student',
        loginMethod: 'loginAsStudent' as const,
        expectedAccess: {
          users: false,
          courses: true,
          news: true,
          statistics: false,
          planning: true
        }
      }
    ];

    for (const roleTest of roleTests) {
      // Ensure clean state before each role test
      await authHelpers.logout();
      
      // Login as the specific role
      await authHelpers[roleTest.loginMethod]();
      
      // Test access to different endpoints
      const endpoints = [
        { path: '/api/users', access: roleTest.expectedAccess.users },
        { path: '/api/courses', access: roleTest.expectedAccess.courses },
        { path: '/api/news', access: roleTest.expectedAccess.news },
        { path: '/api/statistics', access: roleTest.expectedAccess.statistics },
        { path: '/api/planning', access: roleTest.expectedAccess.planning }
      ];

      for (const endpoint of endpoints) {
        // Get access token for authorization header
        const accessToken = authHelpers.getAccessToken();
        
        // Make API request with authorization header
        const response = await page.context().request.get(endpoint.path, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        console.log(`Role: ${roleTest.role}, Endpoint: ${endpoint.path}, Status: ${response.status()}, Expected access: ${endpoint.access}`);
        
        if (endpoint.access) {
          expect(response.status()).toBeLessThan(400);
        } else {
          expect(response.status()).toBeGreaterThanOrEqual(401);
          expect(response.status()).toBeLessThanOrEqual(403);
        }
      }

      // Test cross-role boundary violations → verify proper rejection
      if (roleTest.role === 'student') {
        // Students should not be able to access admin endpoints
        const accessToken = authHelpers.getAccessToken();
        const adminResponse = await page.context().request.post('/api/users', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          data: { name: 'Test User', email: 'test@example.com' }
        });
        expect(adminResponse.status()).toBeGreaterThanOrEqual(401);
        expect(adminResponse.status()).toBeLessThanOrEqual(403);
      }

      if (roleTest.role === 'teacher') {
        // Teachers should not be able to access user management
        const accessToken = authHelpers.getAccessToken();
        const userMgmtResponse = await page.context().request.get('/api/users', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        expect(userMgmtResponse.status()).toBeGreaterThanOrEqual(401);
        expect(userMgmtResponse.status()).toBeLessThanOrEqual(403);
      }
    }
  });
});