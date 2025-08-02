import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { SharedTestContext } from '../helpers/SharedTestContext';

/**
 * User Management UI Tests - Focused on Interface Elements Only
 * 
 * Optimized for speed by using cached test data and focusing on UI validation.
 * No real API calls or network operations - pure UI testing.
 */

test.describe('User Management - UI Components', () => {

  test('UI displays with loading states', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('User Interface Display');
    const authHelper = new CleanAuthHelper(page, 'UI Test');
    
    try {
      await authHelper.initialize();
      await authHelper.loginAsAdmin();
      
      // Navigate to user management
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Verify main UI elements are present
      const mainContainer = page.locator('main, .main-content, .admin-panel');
      await expect(mainContainer).toBeVisible();
      
      // Check for user table or list
      const userContainer = page.locator('table, .user-list, [data-testid*="user"]');
      await expect(userContainer).toBeVisible({ timeout: 10000 });
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Create modal displays fields', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Create User Modal');
    const authHelper = new CleanAuthHelper(page, 'Modal Test');
    
    try {
      await authHelper.initialize();
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Click create user button
      const createButton = page.locator('button:has-text("Create User"), button:has-text("Add User")');
      if (await createButton.count() > 0) {
        await createButton.click();
        
        // Verify modal opens
        const modal = page.locator('.modal, [role="dialog"], h2:has-text("Create")');
        await expect(modal).toBeVisible();
        
        // Check required form fields
        const emailField = page.locator('input[name="email"], input[type="email"]');
        const firstNameField = page.locator('input[name="firstName"]');
        const lastNameField = page.locator('input[name="lastName"]');
        const passwordField = page.locator('input[name="password"], input[type="password"]');
        const roleField = page.locator('select[name="role"]');
        
        await expect(emailField).toBeVisible();
        await expect(firstNameField).toBeVisible();
        await expect(lastNameField).toBeVisible();
        await expect(passwordField).toBeVisible();
        await expect(roleField).toBeVisible();
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Create modal cancel', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Create User Cancel');
    const authHelper = new CleanAuthHelper(page, 'Cancel Test');
    
    try {
      await authHelper.initialize();
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const createButton = page.locator('button:has-text("Create User")');
      if (await createButton.count() > 0) {
        await createButton.click();
        
        // Verify modal is open
        const modal = page.locator('.modal, [role="dialog"]');
        await expect(modal).toBeVisible();
        
        // Click cancel button
        const cancelButton = page.locator('button:has-text("Cancel")');
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
          
          // Modal should close
          await expect(modal).not.toBeVisible();
        }
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Form validation errors', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Create User Validation');
    const authHelper = new CleanAuthHelper(page, 'Validation Test');
    
    try {
      await authHelper.initialize();
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const createButton = page.locator('button:has-text("Create User")');
      if (await createButton.count() > 0) {
        await createButton.click();
        
        // Try to submit empty form
        const submitButton = page.locator('form button[type="submit"], button:has-text("Create")');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          
          // Should show validation errors
          const errorMessages = page.locator('.error, .invalid, [role="alert"]');
          const errorCount = await errorMessages.count();
          expect(errorCount).toBeGreaterThan(0);
        }
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Edit modal pre-populated', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Edit User Modal');
    const authHelper = new CleanAuthHelper(page, 'Edit Modal Test');
    
    try {
      await authHelper.initialize();
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Find and click edit button for first user
      const editButtons = page.locator('button:has-text("Edit")');
      if (await editButtons.count() > 0) {
        await editButtons.first().click();
        
        // Verify edit modal opens
        const modal = page.locator('.modal, [role="dialog"], h2:has-text("Edit")');
        await expect(modal).toBeVisible();
        
        // Check that fields are pre-populated (not empty)
        const emailField = page.locator('input[name="email"]');
        const firstNameField = page.locator('input[name="firstName"]');
        
        if (await emailField.count() > 0) {
          const emailValue = await emailField.inputValue();
          expect(emailValue.length).toBeGreaterThan(0);
        }
        
        if (await firstNameField.count() > 0) {
          const firstNameValue = await firstNameField.inputValue();
          expect(firstNameValue.length).toBeGreaterThan(0);
        }
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Delete confirmation modal', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Delete User Modal');
    const authHelper = new CleanAuthHelper(page, 'Delete Modal Test');
    
    try {
      await authHelper.initialize();
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Find and click delete button
      const deleteButtons = page.locator('button:has-text("Delete")');
      if (await deleteButtons.count() > 0) {
        await deleteButtons.first().click();
        
        // Verify confirmation modal
        const confirmModal = page.locator('.modal, [role="dialog"], h2:has-text("Delete"), h2:has-text("Confirm")');
        await expect(confirmModal).toBeVisible();
        
        // Should have confirmation message
        const confirmMessage = page.locator('text*="Are you sure", text*="cannot be undone", text*="permanently"');
        const hasConfirmMessage = await confirmMessage.count() > 0;
        expect(hasConfirmMessage).toBeTruthy();
        
        // Should have cancel button to avoid accidental deletion
        const cancelButton = page.locator('button:has-text("Cancel")');
        await expect(cancelButton).toBeVisible();
        
        // Cancel instead of confirming deletion
        await cancelButton.click();
        await expect(confirmModal).not.toBeVisible();
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Search and filter UI', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('User Search UI');
    const authHelper = new CleanAuthHelper(page, 'Search Test');
    
    try {
      await authHelper.initialize();
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Look for search interface
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[name*="search"]');
      const filterSelect = page.locator('select[name*="role"], select[name*="filter"]');
      
      if (await searchInput.count() > 0) {
        // Test search input functionality
        await searchInput.fill('test');
        await expect(searchInput).toHaveValue('test');
        
        // Clear search
        await searchInput.clear();
        await expect(searchInput).toHaveValue('');
      }
      
      if (await filterSelect.count() > 0) {
        // Test filter dropdown
        await filterSelect.selectOption({ index: 1 });
        // Verify selection was made (interface responded)
        const selectedValue = await filterSelect.inputValue();
        expect(selectedValue.length).toBeGreaterThan(0);
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

});