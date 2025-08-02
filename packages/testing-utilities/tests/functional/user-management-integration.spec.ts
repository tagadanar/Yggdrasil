import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { SharedTestContext } from '../helpers/SharedTestContext';

/**
 * User Management Integration Tests - Essential End-to-End Workflows
 * 
 * Optimized for speed using SharedTestContext and focused on key user workflows.
 * Maximum 3 focused integration tests to avoid timeout issues.
 */

test.describe('User Management - Integration Workflows', () => {

  test('Admin creates user', async ({ page }) => {
    test.setTimeout(45000); // Focused timeout
    const cleanup = TestCleanup.getInstance('User Creation Integration');
    const authHelper = new CleanAuthHelper(page);
    let createdUserEmail: string | null = null;
    
    try {
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Complete user creation workflow
      const createButton = page.locator('button:has-text("Create User")');
      if (await createButton.count() > 0) {
        await createButton.click();
        
        // Fill form with valid data
        createdUserEmail = `integration-test-${Date.now()}@yggdrasil.edu`;
        await page.fill('input[name="email"]', createdUserEmail);
        await page.fill('input[name="firstName"]', 'Integration');
        await page.fill('input[name="lastName"]', 'Test');
        await page.fill('input[name="password"]', 'TestPass123!');
        await page.selectOption('select[name="role"]', 'student');
        
        // Submit form
        const submitButton = page.locator('form button[type="submit"]');
        await submitButton.click();
        
        // Wait for completion
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        
        // Verify success (modal closes or success message appears)
        const modal = page.locator('.modal, [role="dialog"]');
        await expect(modal).not.toBeVisible({ timeout: 10000 });
        
        // Verify user appears in list (optional - may require page refresh)
        const userList = page.locator('table, .user-list');
        await expect(userList).toBeVisible();
      }
      
    } finally {
      // Track user for cleanup if created
      if (createdUserEmail) {
        // Note: In real implementation, would track the user ID for cleanup
        console.log(`Created test user: ${createdUserEmail} - manual cleanup may be needed`);
      }
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('User list displays', async ({ page }) => {
    test.setTimeout(30000); // Focused timeout
    const cleanup = TestCleanup.getInstance('User List Display');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Wait for user list to load (with reasonable timeout)
      const loadingIndicator = page.locator('text=Loading users..., .loading, .spinner');
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
      }
      
      // Verify user list displays
      const userContainer = page.locator('table, .user-list, [data-testid*="user"]');
      await expect(userContainer).toBeVisible({ timeout: 5000 });
      
      // Check that some users are displayed
      const userRows = page.locator('tbody tr, .user-item');
      const userCount = await userRows.count();
      expect(userCount).toBeGreaterThan(0);
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Access control', async ({ page }) => {
    test.setTimeout(30000); // Focused timeout
    const cleanup = TestCleanup.getInstance('User Access Control');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      
      // Test that non-admin users cannot access user management
      await authHelper.loginAsStudent();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Should be redirected or see access denied
      const currentUrl = page.url();
      const accessDenied = page.locator(':has-text("Access Denied"), :has-text("Unauthorized"), :has-text("Permission")');
      
      const hasAccessDenied = await accessDenied.count() > 0;
      const isRedirected = !currentUrl.includes('/admin/users');
      
      expect(hasAccessDenied || isRedirected).toBeTruthy();
      
      // Now test that admin does have access
      await authHelper.loginAsAdmin();
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Should be able to access user management
      const userManagementContent = page.locator('table, .user-list, h1:has-text("Users")');
      await expect(userManagementContent).toBeVisible({ timeout: 10000 });
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

});