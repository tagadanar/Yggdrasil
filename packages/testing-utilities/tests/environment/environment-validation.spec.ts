// packages/testing-utilities/tests/environment/environment-validation.spec.ts
// Consolidated environment validation and demo account testing
// Replaces: demo-accounts-validation.spec.ts, environment-check.spec.ts, homepage-availability.spec.ts

import { test, expect } from '@playwright/test';
import { IsolatedAuthHelpers } from '../helpers/isolated-auth.helpers';

test.describe.configure({ mode: 'serial' });

test.describe('Environment Validation - Live Dev Environment', () => {
  let authHelpers: IsolatedAuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new IsolatedAuthHelpers(page);
    await authHelpers.initialize();
  });

  test.afterEach(async ({ page }) => {
    await authHelpers.cleanup();
  });

  // =============================================================================
  // BACKEND SERVICE HEALTH
  // =============================================================================
  test.describe('Backend Service Health', () => {
    test('Backend services should connect to correct database', async ({ page }) => {
      const authHealthResponse = await page.request.get('http://localhost:3001/health');
      
      if (authHealthResponse.status() !== 200) {
      }
      
      expect(authHealthResponse.status()).toBe(200);
    });

    test('Frontend and backend services should be healthy', async ({ page }) => {
      const frontendResponse = await page.request.get('/');
      expect(frontendResponse.status()).toBeLessThan(400);
      
      const authHealthResponse = await page.request.get('http://localhost:3001/health');
      expect(authHealthResponse.status()).toBe(200);
      
      const userHealthResponse = await page.request.get('http://localhost:3002/health');
      expect(userHealthResponse.status()).toBe(200);
    });
  });

  // =============================================================================
  // DEMO ACCOUNT DATABASE VALIDATION
  // =============================================================================
  test.describe('Demo Account Database Validation', () => {
    test('All demo accounts should exist in database and be accessible', async ({ page }) => {
      const loginMethods = [
        { method: () => authHelpers.loginAsAdmin(), role: 'admin' },
        { method: () => authHelpers.loginAsTeacher(), role: 'teacher' },
        { method: () => authHelpers.loginAsStaff(), role: 'staff' },
        { method: () => authHelpers.loginAsStudent(), role: 'student' }
      ];
      
      for (const account of loginMethods) {
        await account.method();
        
        // Should redirect to news page
        await expect(page).toHaveURL('/news');
        await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
        
        // Logout between iterations
        await authHelpers.logout();
        await page.context().clearCookies();
        await page.evaluate(() => {
          if (typeof localStorage !== 'undefined') localStorage.clear();
          if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
        });
      }
    });

    test('Demo accounts should exist via API', async ({ page }) => {
      const accounts = [
        { email: 'admin@yggdrasil.edu', password: 'Admin123!' },
        { email: 'teacher@yggdrasil.edu', password: 'Admin123!' },
        { email: 'staff@yggdrasil.edu', password: 'Admin123!' },
        { email: 'student@yggdrasil.edu', password: 'Admin123!' }
      ];
      
      for (const account of accounts) {
        const response = await page.request.post('http://localhost:3001/api/auth/login', {
          data: account
        });
        
        
        if (response.status() !== 200) {
          const errorText = await response.text();
        }
        
        expect(response.status()).toBe(200);
        
        const loginData = await response.json();
        expect(loginData.success).toBe(true);
        expect(loginData.data.user.email).toBe(account.email);
      }
    });

    test('Should show proper error for non-existent demo account', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'nonexistent@yggdrasil.edu');
      await page.fill('input[name="password"]', 'Admin123!');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Invalid email or password')).toBeVisible();
      await expect(page).toHaveURL('/auth/login');
    });

    test('Should show proper error for wrong password on demo account', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'admin@yggdrasil.edu');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Invalid email or password')).toBeVisible();
      await expect(page).toHaveURL('/auth/login');
    });
  });

  // =============================================================================
  // DEMO ACCOUNT ROLE PERMISSIONS
  // =============================================================================
  test.describe('Demo Account Role Permissions', () => {
    test('Admin demo account should have admin permissions', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      await expect(page.locator('text=User Management')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar-nav"]')).toContainText('Users');
    });

    test('Teacher demo account should have teacher permissions', async ({ page }) => {
      await authHelpers.loginAsTeacher();
      
      await page.goto('/courses');
      await expect(page.locator('text=My Courses')).toBeVisible();
      
      // Should NOT be able to access admin features
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/news(\?error=access_denied)?/);
      await expect(page.locator('text=Access Denied')).toBeVisible();
    });

    test('Staff demo account should have staff permissions', async ({ page }) => {
      await authHelpers.loginAsStaff();
      
      await page.goto('/planning');
      await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible();
      
      // Should NOT be able to access admin features
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/news(\?error=access_denied)?/);
    });

    test('Student demo account should have student permissions', async ({ page }) => {
      await authHelpers.loginAsStudent();
      
      await page.goto('/courses');
      await expect(page.locator('h1:has-text("My Enrollments")')).toBeVisible();
      
      // Should NOT be able to access admin features
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/news(\?error=access_denied)?/);
    });
  });

  // =============================================================================
  // DEMO ACCOUNT PROFILE DATA
  // =============================================================================
  test.describe('Demo Account Profile Data', () => {
    test('Test accounts should have correct profile information', async ({ page }) => {
      const profiles = [
        {
          login: () => authHelpers.loginAsAdmin(),
          role: 'admin'
        },
        {
          login: () => authHelpers.loginAsTeacher(),
          role: 'teacher'
        },
        {
          login: () => authHelpers.loginAsStaff(),
          role: 'staff'
        },
        {
          login: () => authHelpers.loginAsStudent(),
          role: 'student'
        }
      ];
      
      for (const profile of profiles) {
        await profile.login();
        await page.goto('/profile');
        
        const user = authHelpers.getCurrentUser();
        await expect(page.locator('input[name="firstName"]')).toHaveValue(user?.profile.firstName || '');
        await expect(page.locator('input[name="lastName"]')).toHaveValue(user?.profile.lastName || '');
        await expect(page.locator('input[name="email"]')).toHaveValue(user?.email || '');
        await expect(page.locator('select[name="role"]')).toHaveValue(user?.role || '');
        
        // Clean up between iterations
        await authHelpers.logout();
      }
    });
  });

  // =============================================================================
  // DEMO ACCOUNT AUTHENTICATION FLOW
  // =============================================================================
  test.describe('Demo Account Authentication Flow', () => {
    test('Demo account tokens should be valid and functional', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      const response = await authHelpers.makeAuthenticatedRequest('GET', 'http://localhost:3001/api/auth/me');
      
      expect(response.status()).toBe(200);
      
      const userData = await response.json();
      expect(userData.success).toBe(true);
      expect(userData.data.user.email).toBe('admin@yggdrasil.edu');
      expect(userData.data.user.role).toBe('admin');
    });

    test('Demo account refresh tokens should work', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      const refreshToken = await authHelpers.getRefreshToken();
      
      const response = await authHelpers.makeAuthenticatedRequest('POST', 'http://localhost:3001/api/auth/refresh', {
        data: { refreshToken }
      });
      
      expect(response.status()).toBe(200);
      
      const tokenData = await response.json();
      expect(tokenData.success).toBe(true);
      expect(tokenData.data.tokens.accessToken).toBeDefined();
      expect(tokenData.data.tokens.refreshToken).toBeDefined();
    });
  });

  // =============================================================================
  // HOMEPAGE AND NAVIGATION VALIDATION
  // =============================================================================
  test.describe('Homepage and Navigation Validation', () => {
    test('Homepage should load successfully for unauthenticated users', async ({ page }) => {
      const response = await page.goto('/');
      expect(response?.status()).toBeLessThan(400);
      
      await expect(page).toHaveURL('/auth/login');
      await expect(page.locator('h2')).toContainText('Sign in to your account');
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('Homepage should load for authenticated users', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'admin@yggdrasil.edu');
      await page.fill('input[name="password"]', 'Admin123!');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL('/news');
      
      await page.goto('/');
      // Should redirect to news page as the new homepage
      await expect(page).toHaveURL('/news');
      await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
    });

    test('All main navigation pages should be accessible', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'admin@yggdrasil.edu');
      await page.fill('input[name="password"]', 'Admin123!');
      await page.click('button[type="submit"]');
      
      // Wait for login to complete and redirect to news page
      await expect(page).toHaveURL('/news');
      await expect(page.locator('h1')).toContainText('News & Announcements');
      
      // News is the new homepage - test homepage redirect
      await page.goto('/');
      await expect(page).toHaveURL('/news');
      await expect(page.locator('h1')).toContainText('News & Announcements');
      
      await page.goto('/news');
      await expect(page.locator('h1')).toContainText('News & Announcements');
      
      await page.goto('/admin/users');
      await expect(page.locator('h1')).toContainText('User Management');
    });

    test('Static assets and resources should load', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      
      const logs: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          logs.push(msg.text());
        }
      });
      
      await page.goto('/');
      await page.goto('/auth/login');
      
      const criticalErrors = logs.filter(log => 
        (log.includes('Failed to load') || 
        log.includes('404') || 
        log.includes('500') ||
        log.includes('TypeError')) &&
        !log.includes('React Query Devtools') &&
        !log.includes('React Dev Tools') &&
        !log.includes('devtools') &&
        !log.includes('RSC payload') &&
        !log.includes('fetch-server-response') &&
        !log.includes('router-reducer')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    test('Page performance should be acceptable', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(10000);
      
      const loginStartTime = Date.now();
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      const loginLoadTime = Date.now() - loginStartTime;
      
      expect(loginLoadTime).toBeLessThan(5000);
    });
  });
});