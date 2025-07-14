// packages/testing-utilities/tests/environment/environment-validation.spec.ts
// Consolidated environment validation and demo account testing
// Replaces: demo-accounts-validation.spec.ts, environment-check.spec.ts, homepage-availability.spec.ts

import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth.helpers';

test.describe('Environment Validation - Live Dev Environment', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
  });

  // =============================================================================
  // BACKEND SERVICE HEALTH
  // =============================================================================
  test.describe('Backend Service Health', () => {
    test('Backend services should connect to correct database', async ({ page }) => {
      const authHealthResponse = await page.request.get('http://localhost:3001/health');
      console.log('Auth Service Health Status:', authHealthResponse.status());
      
      if (authHealthResponse.status() !== 200) {
        console.log('Auth Service Health Response:', await authHealthResponse.text());
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
      const accounts = [
        { email: 'admin@yggdrasil.edu', password: 'Admin123!', expectedDashboard: 'Admin Dashboard' },
        { email: 'teacher@yggdrasil.edu', password: 'Admin123!', expectedDashboard: 'Teacher Dashboard' },
        { email: 'staff@yggdrasil.edu', password: 'Admin123!', expectedDashboard: 'Staff Dashboard' },
        { email: 'student@yggdrasil.edu', password: 'Admin123!', expectedDashboard: 'Student Dashboard' }
      ];
      
      for (const account of accounts) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', account.email);
        await page.fill('input[name="password"]', account.password);
        await page.click('button[type="submit"]');
        
        await expect(page).toHaveURL('/dashboard');
        await expect(page.locator(`text=${account.expectedDashboard}`)).toBeVisible();
        
        await authHelpers.logout();
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
        
        console.log(`${account.email} - Status: ${response.status()}`);
        
        if (response.status() !== 200) {
          const errorText = await response.text();
          console.log(`${account.email} - Error: ${errorText}`);
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
      await expect(page.locator('nav')).toContainText('System Administration');
    });

    test('Teacher demo account should have teacher permissions', async ({ page }) => {
      await authHelpers.loginAsTeacher();
      
      await page.goto('/courses');
      await expect(page.locator('text=My Courses')).toBeVisible();
      
      // Should NOT be able to access admin features
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/dashboard(\?error=access_denied)?$/);
      await expect(page.locator('text=Access Denied')).toBeVisible();
    });

    test('Staff demo account should have staff permissions', async ({ page }) => {
      await authHelpers.loginAsStaff();
      
      await page.goto('/planning');
      await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible();
      
      // Should NOT be able to access admin features
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/dashboard(\?error=access_denied)?$/);
    });

    test('Student demo account should have student permissions', async ({ page }) => {
      await authHelpers.loginAsStudent();
      
      await page.goto('/courses');
      await expect(page.locator('h1:has-text("My Enrollments")')).toBeVisible();
      
      // Should NOT be able to access admin features
      await page.goto('/admin/users');
      await expect(page).toHaveURL(/\/dashboard(\?error=access_denied)?$/);
    });
  });

  // =============================================================================
  // DEMO ACCOUNT PROFILE DATA
  // =============================================================================
  test.describe('Demo Account Profile Data', () => {
    test('Demo accounts should have correct profile information', async ({ page }) => {
      const profiles = [
        {
          login: () => authHelpers.loginAsAdmin(),
          expectedData: { firstName: 'Admin', lastName: 'User', email: 'admin@yggdrasil.edu', role: 'admin' }
        },
        {
          login: () => authHelpers.loginAsTeacher(),
          expectedData: { firstName: 'Teacher', lastName: 'Demo', email: 'teacher@yggdrasil.edu', role: 'teacher' }
        },
        {
          login: () => authHelpers.loginAsStaff(),
          expectedData: { firstName: 'Jane', lastName: 'Smith', email: 'staff@yggdrasil.edu', role: 'staff' }
        },
        {
          login: () => authHelpers.loginAsStudent(),
          expectedData: { firstName: 'Student', lastName: 'Demo', email: 'student@yggdrasil.edu', role: 'student' }
        }
      ];
      
      for (const profile of profiles) {
        await profile.login();
        await page.goto('/profile');
        
        await expect(page.locator('input[name="firstName"]')).toHaveValue(profile.expectedData.firstName);
        await expect(page.locator('input[name="lastName"]')).toHaveValue(profile.expectedData.lastName);
        await expect(page.locator('input[name="email"]')).toHaveValue(profile.expectedData.email);
        await expect(page.locator('select[name="role"]')).toHaveValue(profile.expectedData.role);
        
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
      
      const response = await page.request.get('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${await authHelpers.getAccessToken()}`
        }
      });
      
      expect(response.status()).toBe(200);
      
      const userData = await response.json();
      expect(userData.success).toBe(true);
      expect(userData.user.email).toBe('admin@yggdrasil.edu');
      expect(userData.user.role).toBe('admin');
    });

    test('Demo account refresh tokens should work', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      const refreshToken = await authHelpers.getRefreshToken();
      
      const response = await page.request.post('/api/auth/refresh', {
        data: { refreshToken }
      });
      
      expect(response.status()).toBe(200);
      
      const tokenData = await response.json();
      expect(tokenData.success).toBe(true);
      expect(tokenData.tokens.accessToken).toBeDefined();
      expect(tokenData.tokens.refreshToken).toBeDefined();
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
      
      await expect(page).toHaveURL('/dashboard');
      
      await page.goto('/');
      await expect(page.locator('text=Welcome to Yggdrasil Educational Platform')).toBeVisible();
      await expect(page.locator('text=Authentication Information')).toBeVisible();
      await expect(page.locator('text=Admin')).toBeVisible();
      await expect(page.locator('text=admin@yggdrasil.edu')).toBeVisible();
    });

    test('All main navigation pages should be accessible', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'admin@yggdrasil.edu');
      await page.fill('input[name="password"]', 'Admin123!');
      await page.click('button[type="submit"]');
      
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('Welcome to Yggdrasil');
      
      await page.goto('/dashboard');
      await expect(page.locator('h2')).toContainText('Admin Dashboard');
      
      await page.goto('/auth/login');
      await expect(page.locator('h2')).toContainText('Sign in to your account');
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
        log.includes('Failed to load') || 
        log.includes('404') || 
        log.includes('500') ||
        log.includes('TypeError')
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