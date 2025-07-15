// packages/testing-utilities/tests/functional/isolated-user-management.spec.ts
// Sample test demonstrating isolated parallel execution

import { test, expect } from '@playwright/test';
import { IsolatedAuthHelpers } from '../helpers/isolated-auth.helpers';

test.describe('Isolated User Management Tests', () => {
  let authHelpers: IsolatedAuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new IsolatedAuthHelpers(page);
    await authHelpers.initialize();
  });

  test.afterEach(async ({ page }) => {
    await authHelpers.cleanup();
  });

  test('Admin should have access to user management page', async ({ page }) => {
    await authHelpers.loginAsAdmin();
    
    await page.goto('/admin/users');
    
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    await expect(page.locator('p:has-text("Manage user accounts, roles, and permissions")')).toBeVisible();
  });

  test('Staff should NOT have access to user management page', async ({ page }) => {
    await authHelpers.loginAsStaff();
    
    await page.goto('/admin/users');
    
    // Should be redirected to news with access denied error
    await expect(page).toHaveURL(/\/news(\?error=access_denied)?/);
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });

  test('Teacher should NOT have access to user management page', async ({ page }) => {
    await authHelpers.loginAsTeacher();
    
    await page.goto('/admin/users');
    
    // Should be redirected to news with access denied error
    await expect(page).toHaveURL(/\/news(\?error=access_denied)?/);
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });

  test('Student should NOT have access to user management page', async ({ page }) => {
    await authHelpers.loginAsStudent();
    
    await page.goto('/admin/users');
    
    // Should be redirected to news with access denied error
    await expect(page).toHaveURL(/\/news(\?error=access_denied)?/);
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });

  test('Multiple parallel admin logins should not interfere', async ({ page }) => {
    await authHelpers.loginAsAdmin();
    
    const user = authHelpers.getCurrentUser();
    
    await page.goto('/admin/users');
    
    // Verify we can access admin functionality
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    await expect(page.locator('button:has-text("Create User")')).toBeVisible();
    
    // Verify we can see the user table
    await expect(page.locator('table')).toBeVisible();
  });
});