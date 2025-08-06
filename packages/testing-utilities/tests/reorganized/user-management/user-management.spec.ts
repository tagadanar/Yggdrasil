// packages/testing-utilities/tests/reorganized/user-management/user-management.spec.ts
// Consolidated user management test suite
// Combines: user-management.spec.ts + user-management-api.spec.ts + 
//           user-management-ui.spec.ts + user-management-integration.spec.ts

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../../helpers/clean-auth.helpers';
import { captureEnhancedError } from '../../helpers/enhanced-error-context';
import { setupTestLifecycle } from '../../helpers/test-lifecycle';
import { createIsolatedUser } from '../../helpers/test-data';

test.describe('User Management - Comprehensive Suite', () => {
  // Initialize test lifecycle for cascade prevention
  setupTestLifecycle('User Management');
  
  // =============================================================================
  // SECTION 1: Access Control (from user-management-integration.spec.ts)
  // =============================================================================
  
  test('Role-based access control', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('USER-ACCESS: Role-based Access Control');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Test 1: Student cannot access admin pages
      await authHelper.loginAsStudent();
      await page.goto('/admin/users');
      
      // Should redirect to unauthorized or dashboard
      await expect(page).not.toHaveURL(/.*\/admin\/users/);
      
      // Logout
      await authHelper.clearAuthState();
      
      // Test 2: Admin can access admin pages
      await authHelper.loginAsAdmin();
      await page.goto('/admin/users');
      
      // Should stay on admin page
      await expect(page).toHaveURL(/.*\/admin\/users/);
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible({
        timeout: 10000
      });
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Role-based Access Control');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // SECTION 2: Core Interface (merged from core + UI tests)
  // =============================================================================
  
  test('Admin interface and navigation', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('USER-UI: Admin Interface');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Verify main interface elements
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
      
      // Check for key UI components
      await expect(page.locator('button:has-text("Create User"), button:has-text("Add User")')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"], input[placeholder*="search"]')).toBeVisible();
      
      // Verify filter dropdown exists
      const filterDropdown = page.locator('select:has-text("All Roles"), select[data-testid="role-filter"]').first();
      await expect(filterDropdown).toBeVisible();
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Admin Interface');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('User list display and loading states', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('USER-UI: User List Display');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Check if we have either a table or cards (different UI implementations)
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasCards = await page.locator('[data-testid="user-card"]').first().isVisible().catch(() => false);
      
      expect(hasTable || hasCards).toBeTruthy();
      
      // Verify user data is displayed
      const userElements = page.locator('td:has-text("@"), [data-testid="user-email"]');
      const userCount = await userElements.count();
      expect(userCount).toBeGreaterThan(0);
      
    } catch (error) {
      await captureEnhancedError(page, error, 'User List Display');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // SECTION 3: User Creation (merged from all create tests)
  // =============================================================================
  
  test('Complete user creation workflow', async ({ page }) => {
    test.setTimeout(45000); // Integration test timeout
    const cleanup = TestCleanup.getInstance('USER-CREATE: Complete Workflow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Click create user button
      await page.click('button:has-text("Create User"), button:has-text("Add User")');
      
      // Wait for modal to appear
      await expect(page.locator('[role="dialog"], .modal, [data-testid="create-user-modal"]')).toBeVisible({
        timeout: 5000
      });
      
      // Fill in the form with unique test data
      const timestamp = Date.now();
      const testEmail = `test.user.${timestamp}@yggdrasil.edu`;
      
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      
      // Select role
      const roleSelect = page.locator('select[name="role"]');
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption('student');
      }
      
      // Track the created user for cleanup
      cleanup.trackTestEmail(testEmail);
      
      // Submit the form
      await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
      
      // Wait for success indication (modal closes or success message)
      await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({
        timeout: 10000
      });
      
      // Verify user appears in the list
      await page.waitForTimeout(1000); // Give time for list to update
      const userInList = page.locator(`text=${testEmail}`);
      await expect(userInList).toBeVisible({ timeout: 10000 });
      
    } catch (error) {
      await captureEnhancedError(page, error, 'User Creation Workflow');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Create form validation and errors', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('USER-CREATE: Form Validation');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      await page.goto('/admin/users');
      
      // Open create modal
      await page.click('button:has-text("Create User"), button:has-text("Add User")');
      await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
      
      // Test 1: Submit empty form
      await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
      
      // Should show validation errors
      await expect(page.locator('text=required, text=Required')).toBeVisible({
        timeout: 5000
      });
      
      // Test 2: Invalid email format
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'Pass123!');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=valid email, text=Invalid email')).toBeVisible({
        timeout: 5000
      });
      
      // Test 3: Weak password
      await page.fill('input[name="email"]', 'test@yggdrasil.edu');
      await page.fill('input[name="password"]', '123'); // Too short
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=password must, text=Password must')).toBeVisible({
        timeout: 5000
      });
      
      // Cancel to close modal
      await page.click('button:has-text("Cancel"), button[aria-label="Close"]');
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Form Validation');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // SECTION 4: User Editing (merged edit tests)
  // =============================================================================
  
  test('User edit workflow and validation', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('USER-EDIT: Edit Workflow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Find and click edit button for first user
      const editButton = page.locator('button:has-text("Edit")').first();
      await editButton.click();
      
      // Wait for edit modal
      await expect(page.locator('[role="dialog"], .modal, [data-testid="edit-user-modal"]')).toBeVisible({
        timeout: 5000
      });
      
      // Verify form is pre-populated (email should be disabled/readonly)
      const emailInput = page.locator('input[name="email"]');
      const emailValue = await emailInput.inputValue();
      expect(emailValue).toBeTruthy();
      
      // Update first name
      const firstNameInput = page.locator('input[name="firstName"]');
      await firstNameInput.clear();
      await firstNameInput.fill('Updated');
      
      // Save changes
      await page.click('button[type="submit"]:has-text("Save"), button:has-text("Update")');
      
      // Wait for modal to close
      await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible({
        timeout: 10000
      });
      
      // Verify update was successful (look for success message or updated data)
      await expect(page.locator('text=Updated')).toBeVisible({ timeout: 5000 });
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Edit Workflow');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // SECTION 5: User Deletion (merged delete tests)
  // =============================================================================
  
  test('User deletion with confirmation', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('USER-DELETE: Deletion Workflow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // First create a user to delete
      const userToDelete = await createIsolatedUser('student', 'USER-DELETE');
      cleanup.trackDocument('users', userToDelete._id);
      
      await authHelper.loginAsAdmin();
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Find the delete button for the test user
      const userRow = page.locator(`tr:has-text("${userToDelete.email}")`);
      const deleteButton = userRow.locator('button:has-text("Delete")');
      
      // Click delete
      await deleteButton.click();
      
      // Confirmation dialog should appear
      await expect(page.locator('text=confirm, text=Confirm')).toBeVisible({
        timeout: 5000
      });
      
      // Test cancel first
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('text=confirm')).not.toBeVisible();
      
      // Now actually delete
      await deleteButton.click();
      await expect(page.locator('text=confirm')).toBeVisible();
      await page.click('button:has-text("Delete"), button:has-text("Confirm")');
      
      // Wait for deletion to complete
      await page.waitForTimeout(2000);
      
      // Verify user is removed from list
      await expect(page.locator(`text=${userToDelete.email}`)).not.toBeVisible({
        timeout: 10000
      });
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Deletion Workflow');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // SECTION 6: Search and Filtering (merged search tests)
  // =============================================================================
  
  test('Search and filter functionality', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('USER-SEARCH: Search and Filter');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Test search functionality
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      await searchInput.fill('admin');
      await searchInput.press('Enter');
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Verify filtered results contain admin
      const visibleEmails = await page.locator('td:has-text("@"), [data-testid="user-email"]').allTextContents();
      const hasAdminEmail = visibleEmails.some(email => email.includes('admin'));
      expect(hasAdminEmail).toBeTruthy();
      
      // Clear search
      await searchInput.clear();
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
      
      // Test role filter
      const roleFilter = page.locator('select:has-text("All Roles"), select[data-testid="role-filter"]').first();
      if (await roleFilter.isVisible()) {
        await roleFilter.selectOption('student');
        await page.waitForTimeout(1000);
        
        // Verify only students are shown (this is a simplified check)
        const userCount = await page.locator('td:has-text("@"), [data-testid="user-email"]').count();
        expect(userCount).toBeGreaterThan(0);
      }
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Search and Filter');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // SECTION 7: API Layer Tests (from user-management-api.spec.ts)
  // =============================================================================
  
  test('User service API health check', async ({ request }) => {
    const cleanup = TestCleanup.getInstance('USER-API: Health Check');
    
    try {
      // Test service health endpoint
      const healthResponse = await request.get('http://localhost:3002/health');
      expect(healthResponse.status()).toBe(200);
      
      const healthData = await healthResponse.json();
      expect(healthData).toHaveProperty('service', 'user-service');
      expect(healthData).toHaveProperty('status', 'healthy');
      
      // Test unauthorized access to users endpoint
      const usersResponse = await request.get('http://localhost:3002/api/users');
      expect(usersResponse.status()).toBe(401); // Unauthorized without token
      
    } finally {
      await cleanup.cleanup();
    }
  });

  test('User creation API validation', async ({ request }) => {
    const cleanup = TestCleanup.getInstance('USER-API: Creation Validation');
    const authHelper = new CleanAuthHelper(null);
    
    try {
      // Get admin token for API access
      const adminToken = await authHelper.getAdminToken();
      
      // Test 1: Invalid email format
      const invalidEmailResponse = await request.post('http://localhost:3002/api/users', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          email: 'invalid-email',
          password: 'ValidPass123!',
          role: 'student',
          profile: {
            firstName: 'Test',
            lastName: 'User'
          }
        }
      });
      
      expect(invalidEmailResponse.status()).toBe(400);
      const errorData = await invalidEmailResponse.json();
      expect(errorData.error).toContain('email');
      
      // Test 2: Missing required fields
      const missingFieldsResponse = await request.post('http://localhost:3002/api/users', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          email: 'test@yggdrasil.edu'
          // Missing password and other required fields
        }
      });
      
      expect(missingFieldsResponse.status()).toBe(400);
      
    } finally {
      await cleanup.cleanup();
    }
  });

  test('User update API validation', async ({ request }) => {
    const cleanup = TestCleanup.getInstance('USER-API: Update Validation');
    const authHelper = new CleanAuthHelper(null);
    
    try {
      // Create a test user first
      const testUser = await createIsolatedUser('student', 'USER-API-UPDATE');
      cleanup.trackDocument('users', testUser._id);
      
      // Get admin token
      const adminToken = await authHelper.getAdminToken();
      
      // Test valid update
      const updateResponse = await request.put(`http://localhost:3002/api/users/${testUser._id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          profile: {
            firstName: 'Updated',
            lastName: 'Name'
          }
        }
      });
      
      expect(updateResponse.status()).toBe(200);
      
      // Test invalid update (changing email to existing one)
      const invalidUpdateResponse = await request.put(`http://localhost:3002/api/users/${testUser._id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          email: 'admin@yggdrasil.edu' // Trying to use existing email
        }
      });
      
      expect(invalidUpdateResponse.status()).toBe(400);
      
    } finally {
      await cleanup.cleanup();
    }
  });

  test('API error handling', async ({ request }) => {
    const cleanup = TestCleanup.getInstance('USER-API: Error Handling');
    const authHelper = new CleanAuthHelper(null);
    
    try {
      const adminToken = await authHelper.getAdminToken();
      
      // Test 1: Malformed JSON
      const malformedResponse = await request.post('http://localhost:3002/api/users', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: '{ invalid json'
      });
      
      expect(malformedResponse.status()).toBe(400);
      
      // Test 2: Invalid user ID format
      const invalidIdResponse = await request.get('http://localhost:3002/api/users/invalid-id-format', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      expect(invalidIdResponse.status()).toBe(400);
      
      // Test 3: Non-existent user
      const nonExistentResponse = await request.get('http://localhost:3002/api/users/507f1f77bcf86cd799439011', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      expect(nonExistentResponse.status()).toBe(404);
      
    } finally {
      await cleanup.cleanup();
    }
  });
});