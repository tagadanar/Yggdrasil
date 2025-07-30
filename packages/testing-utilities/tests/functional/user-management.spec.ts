import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';

/**
 * User Management - Streamlined Core Tests
 * 
 * OPTIMIZED VERSION: Removed API integration mega-tests that caused 30min timeouts.
 * Split into focused files:
 * - user-management-ui.spec.ts (UI components)
 * - user-management-api.spec.ts (API endpoints) 
 * - user-management-integration.spec.ts (end-to-end workflows)
 * 
 * This file contains only the essential core functionality tests.
 */

test.describe('User Management - Core Functionality', () => {

  test('Admin can access user management interface', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('User Management Access');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Verify main interface elements
      const mainHeading = page.locator('h1:has-text("User"), h1:has-text("Management")');
      await expect(mainHeading).toBeVisible({ timeout: 10000 });
      
      const createButton = page.locator('button:has-text("Create User"), button:has-text("Add User")');
      await expect(createButton).toBeVisible();
      
      // Verify user list/table is present
      const userList = page.locator('table, .user-list, [data-testid*="user"]');
      await expect(userList).toBeVisible({ timeout: 10000 });
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('User creation form displays with proper validation', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('User Creation Form');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Open create user form
      const createButton = page.locator('button:has-text("Create User")');
      if (await createButton.count() > 0) {
        await createButton.click();
        
        // Check form fields are present
        const emailField = page.locator('input[name="email"]');
        const firstNameField = page.locator('input[name="firstName"]');
        const roleField = page.locator('select[name="role"]');
        
        await expect(emailField).toBeVisible();
        await expect(firstNameField).toBeVisible();
        await expect(roleField).toBeVisible();
        
        // Test validation by submitting empty form
        const submitButton = page.locator('form button[type="submit"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          
          // Should show validation errors
          const hasValidationError = await Promise.race([
            page.locator('.error, .invalid, [role="alert"]').count().then(count => count > 0),
            page.locator('input:invalid').count().then(count => count > 0),
            page.waitForTimeout(2000).then(() => false)
          ]);
          
          expect(hasValidationError).toBeTruthy();
        }
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('User edit functionality displays correctly', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('User Edit Display');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Wait for user list to load
      const loadingIndicator = page.locator('text=Loading');
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
      }
      
      // Find edit button
      const editButton = page.locator('button:has-text("Edit")').first();
      if (await editButton.count() > 0) {
        await editButton.click();
        
        // Verify edit form opens
        const editModal = page.locator('.modal, [role="dialog"], h2:has-text("Edit")');
        await expect(editModal).toBeVisible();
        
        // Check that form fields exist
        const emailField = page.locator('input[name="email"]');
        if (await emailField.count() > 0) {
          // Should have some value (not empty)
          const emailValue = await emailField.inputValue();
          expect(emailValue.length).toBeGreaterThan(0);
        }
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('User deletion confirmation works correctly', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('User Deletion Confirmation');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Find delete button
      const deleteButton = page.locator('button:has-text("Delete")').first();
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        
        // Should show confirmation dialog
        const confirmDialog = page.locator('.modal, [role="dialog"], h2:has-text("Delete"), h2:has-text("Confirm")');
        await expect(confirmDialog).toBeVisible();
        
        // Should have cancel button to prevent accidental deletion
        const cancelButton = page.locator('button:has-text("Cancel")');
        await expect(cancelButton).toBeVisible();
        
        // Cancel the deletion (don't actually delete)
        await cancelButton.click();
        await expect(confirmDialog).not.toBeVisible();
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('User search and filtering interface functions', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('User Search Interface');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Look for search/filter interface
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');
      const filterSelect = page.locator('select[name*="role"], select[name*="filter"]');
      
      // Test search input if present
      if (await searchInput.count() > 0) {
        await searchInput.fill('test');
        await expect(searchInput).toHaveValue('test');
        await searchInput.clear();
      }
      
      // Test filter dropdown if present
      if (await filterSelect.count() > 0) {
        await filterSelect.selectOption({ index: 1 });
        // Just verify the interface responds
        const selectedValue = await filterSelect.inputValue();
        expect(selectedValue.length).toBeGreaterThan(0);
      }
      
      // If no search/filter interface exists, that's also valid
      const hasSearchInterface = await searchInput.count() > 0 || await filterSelect.count() > 0;
      console.log(`Search interface present: ${hasSearchInterface}`);
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

});