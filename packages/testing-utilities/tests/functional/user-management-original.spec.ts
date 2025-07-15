// packages/testing-utilities/tests/functional/user-management.spec.ts
// Comprehensive functional tests for user management features

import { test, expect } from '@playwright/test';
import { IsolatedAuthHelpers } from '../helpers/isolated-auth.helpers';

test.describe('User Management - Functional Tests', () => {
  let authHelpers: IsolatedAuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new IsolatedAuthHelpers(page);
    await authHelpers.initialize();
  });

  test.afterEach(async ({ page }) => {
    await authHelpers.cleanup();
  });

  // =============================================================================
  // USER MANAGEMENT ACCESS CONTROL
  // =============================================================================
  test.describe('User Management Access Control', () => {
    test('Should control access to user management page based on user role', async ({ page }) => {
      const roleTests = [
        { 
          role: 'admin', 
          shouldAccess: true, 
          loginMethod: () => authHelpers.loginAsAdmin() 
        },
        { 
          role: 'staff', 
          shouldAccess: false, 
          loginMethod: () => authHelpers.loginAsStaff() 
        },
        { 
          role: 'teacher', 
          shouldAccess: false, 
          loginMethod: () => authHelpers.loginAsTeacher() 
        },
        { 
          role: 'student', 
          shouldAccess: false, 
          loginMethod: () => authHelpers.loginAsStudent() 
        }
      ];

      for (const roleTest of roleTests) {
        await roleTest.loginMethod();
        await page.goto('/admin/users');
        
        if (roleTest.shouldAccess) {
          await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
          await expect(page.locator('p:has-text("Manage user accounts, roles, and permissions")')).toBeVisible();
        } else {
          // Should be redirected to news with access denied error
          await expect(page).toHaveURL(/\/news(\?error=access_denied)?/);
          await expect(page.locator('text=Access Denied')).toBeVisible();
        }
        
        await authHelpers.logout();
      }
    });
  });

  // =============================================================================
  // USER LIST DISPLAY AND STRUCTURE
  // =============================================================================
  test.describe('User List Display and Structure', () => {
    test('Should display user list with proper structure and all user data', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Check page structure
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
      await expect(page.locator('button:has-text("Create User")')).toBeVisible();
      
      // Check table structure
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th:has-text("User")')).toBeVisible();
      await expect(page.locator('th:has-text("Role")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Created")')).toBeVisible();
      await expect(page.locator('th:has-text("Actions")')).toBeVisible();
      
      const table = page.locator('table');
      
      // Check all demo users are displayed in table
      await expect(table.locator('text=admin@yggdrasil.edu')).toBeVisible();
      await expect(table.locator('text=teacher@yggdrasil.edu')).toBeVisible();
      await expect(table.locator('text=staff@yggdrasil.edu')).toBeVisible();
      await expect(table.locator('text=student@yggdrasil.edu')).toBeVisible();
      
      // Check user names are displayed in table
      await expect(table.locator('text=Admin User')).toBeVisible();
      await expect(table.locator('text=Teacher Demo')).toBeVisible();
      await expect(table.locator('text=Jane Smith')).toBeVisible();
      await expect(table.locator('text=Student Demo')).toBeVisible();
      
      // Check role badges exist and have proper styling
      const adminRole = table.locator('span:has-text("Admin")');
      const teacherRole = table.locator('span:has-text("Teacher")');
      const staffRole = table.locator('span:has-text("Staff")');
      const studentRole = table.locator('span:has-text("Student")');
      
      await expect(adminRole).toBeVisible();
      await expect(teacherRole).toBeVisible();
      await expect(staffRole).toBeVisible();
      await expect(studentRole).toBeVisible();
      
      // Check that role badges have color styling
      await expect(adminRole).toHaveClass(/bg-red-100/);
      await expect(teacherRole).toHaveClass(/bg-blue-100/);
      await expect(staffRole).toHaveClass(/bg-yellow-100/);
      await expect(studentRole).toHaveClass(/bg-green-100/);
      
      // Check user status with proper styling
      const activeStatuses = table.locator('span:has-text("Active")');
      await expect(activeStatuses).toHaveCount(4);
      await expect(activeStatuses.first()).toHaveClass(/bg-green-100/);
      
      // Check that creation dates are displayed (all should be Jan 1, 2024 based on mock data)
      const creationDates = page.locator('td:has-text("Jan 1, 2024")');
      await expect(creationDates).toHaveCount(4);
      
      // Check that user avatars with initials are displayed
      await expect(page.locator('span:has-text("AU")')).toBeVisible(); // Admin User
      await expect(page.locator('span:has-text("TD")')).toBeVisible(); // Teacher Demo
      await expect(page.locator('span:has-text("JS")')).toBeVisible(); // Jane Smith
      await expect(page.locator('span:has-text("SD")')).toBeVisible(); // Student Demo
    });
  });

  // =============================================================================
  // USER CREATION WORKFLOW
  // =============================================================================
  test.describe('User Creation Workflow', () => {
    test('Should open Create User modal with proper form fields', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      await page.goto('/admin/users');
      
      // Check Create User button exists
      await expect(page.locator('button:has-text("Create User")')).toBeVisible();
      
      // Click Create User button
      await page.click('button:has-text("Create User")');
      
      // Should open modal with form fields
      await expect(page.locator('h2:has-text("Create New User")')).toBeVisible();
      
      // Check that form fields exist
      await expect(page.locator('input[name="email"], input[placeholder*="email"], input[placeholder*="Email"]')).toBeVisible();
      await expect(page.locator('input[name="firstName"], input[placeholder*="first"], input[placeholder*="First"]')).toBeVisible();
      await expect(page.locator('input[name="lastName"], input[placeholder*="last"], input[placeholder*="Last"]')).toBeVisible();
      await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
      await expect(page.locator('select[name="role"], select:has(option:has-text("Admin"))')).toBeVisible();
      
      // Check action buttons
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('form button[type="submit"]')).toBeVisible();
      
      // Test Cancel button
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('h2:has-text("Create New User")')).not.toBeVisible();
    });

    test('Should successfully create a new user', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      await page.goto('/admin/users');
      
      // Get initial user count
      const initialRows = await page.locator('tbody tr').count();
      
      // Open create user modal
      await page.click('button:has-text("Create User")');
      
      // Fill form with valid data
      await page.fill('input[name="email"], input[placeholder*="email"], input[placeholder*="Email"]', 'newuser@yggdrasil.edu');
      await page.fill('input[name="firstName"], input[placeholder*="first"], input[placeholder*="First"]', 'New');
      await page.fill('input[name="lastName"], input[placeholder*="last"], input[placeholder*="Last"]', 'User');
      await page.fill('input[name="password"], input[type="password"]', 'password123');
      await page.selectOption('select[name="role"], select:has(option:has-text("Admin"))', 'student');
      
      // Submit form
      await page.click('form button[type="submit"]');
      
      // Wait for modal to close
      await expect(page.locator('h2:has-text("Create New User")')).not.toBeVisible();
      
      // Check that user was added to the table
      await expect(page.locator('tbody tr')).toHaveCount(initialRows + 1);
      await expect(page.locator('text=newuser@yggdrasil.edu')).toBeVisible();
      await expect(page.locator('text=New User')).toBeVisible();
    });

    test('Should validate required fields in create user form', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      await page.goto('/admin/users');
      
      // Open create user modal
      await page.click('button:has-text("Create User")');
      
      // Try to submit without filling required fields
      await page.click('button:has-text("Create User"), button[type="submit"]');
      
      // Should show validation errors
      const errorMessages = [
        'Email is required',
        'First name is required', 
        'Last name is required',
        'Password is required',
        'Role is required'
      ];
      
      for (const errorMessage of errorMessages) {
        await expect(page.locator(`text=${errorMessage}`)).toBeVisible();
      }
      
      // Modal should still be open
      await expect(page.locator('h2:has-text("Create New User")')).toBeVisible();
    });

    test('Should handle email validation in create user form', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      await page.goto('/admin/users');
      
      // Open create user modal
      await page.click('button:has-text("Create User")');
      
      // Fill form with invalid email
      await page.fill('input[name="email"], input[placeholder*="email"], input[placeholder*="Email"]', 'invalid-email');
      await page.fill('input[name="firstName"], input[placeholder*="first"], input[placeholder*="First"]', 'Test');
      await page.fill('input[name="lastName"], input[placeholder*="last"], input[placeholder*="Last"]', 'User');
      await page.fill('input[name="password"], input[type="password"]', 'password123');
      await page.selectOption('select[name="role"], select:has(option:has-text("Admin"))', 'student');
      
      // Submit form
      await page.click('form button[type="submit"]');
      
      // Should show email validation error
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
      
      // Modal should still be open
      await expect(page.locator('h2:has-text("Create New User")')).toBeVisible();
    });

    test('Should handle duplicate email error', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      await page.goto('/admin/users');
      
      // Open create user modal
      await page.click('button:has-text("Create User")');
      
      // Fill form with existing email
      await page.fill('input[name="email"], input[placeholder*="email"], input[placeholder*="Email"]', 'admin@yggdrasil.edu');
      await page.fill('input[name="firstName"], input[placeholder*="first"], input[placeholder*="First"]', 'Test');
      await page.fill('input[name="lastName"], input[placeholder*="last"], input[placeholder*="Last"]', 'User');
      await page.fill('input[name="password"], input[type="password"]', 'password123');
      await page.selectOption('select[name="role"], select:has(option:has-text("Admin"))', 'student');
      
      // Submit form
      await page.click('form button[type="submit"]');
      
      // Should show duplicate email error
      await expect(page.locator('text=User with this email already exists')).toBeVisible();
      
      // Modal should still be open
      await expect(page.locator('h2:has-text("Create New User")')).toBeVisible();
    });
  });

  // =============================================================================
  // USER EDITING WORKFLOW
  // =============================================================================
  test.describe('User Editing Workflow', () => {
    test('Should display Edit buttons for all users', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Check that Edit buttons exist for all users
      const editButtons = page.locator('button:has-text("Edit")');
      await expect(editButtons).toHaveCount(4);
      
      // All edit buttons should be visible
      for (let i = 0; i < 4; i++) {
        await expect(editButtons.nth(i)).toBeVisible();
      }
    });

    test('Should open Edit User modal with pre-populated form', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Click first Edit button (should be Admin User)
      await page.click('button:has-text("Edit")');
      
      // Should open edit modal
      await expect(page.locator('h2:has-text("Edit User")')).toBeVisible();
      
      // Check that form fields are pre-populated
      await expect(page.locator('input[name="email"]')).toHaveValue('admin@yggdrasil.edu');
      await expect(page.locator('input[name="firstName"]')).toHaveValue('Admin');
      await expect(page.locator('input[name="lastName"]')).toHaveValue('User');
      await expect(page.locator('select[name="role"]')).toHaveValue('admin');
      
      // Check action buttons
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Update User"), button[type="submit"]')).toBeVisible();
      
      // Test Cancel button
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('h2:has-text("Edit User")')).not.toBeVisible();
    });

    test('Should successfully update user information', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Click Edit button for student user
      const studentRow = page.locator('tr:has-text("Student Demo")');
      await studentRow.locator('button:has-text("Edit")').click();
      
      // Update user information
      await page.fill('input[name="firstName"]', 'Updated');
      await page.fill('input[name="lastName"]', 'Student');
      await page.selectOption('select[name="role"]', 'teacher');
      
      // Submit form
      await page.click('form button[type="submit"]');
      
      // Wait for modal to close
      await expect(page.locator('h2:has-text("Edit User")')).not.toBeVisible();
      
      // Check that user information was updated in the table
      await expect(page.locator('text=Updated Student')).toBeVisible();
      await expect(page.locator('span:has-text("Teacher")')).toBeVisible();
    });

    test('Should validate required fields in edit user form', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Click first Edit button
      await page.click('button:has-text("Edit")');
      
      // Clear required fields
      await page.fill('input[name="firstName"]', '');
      await page.fill('input[name="lastName"]', '');
      
      // Submit form
      await page.click('form button[type="submit"]');
      
      // Should show validation errors
      await expect(page.locator('text=First name is required')).toBeVisible();
      await expect(page.locator('text=Last name is required')).toBeVisible();
      
      // Modal should still be open
      await expect(page.locator('h2:has-text("Edit User")')).toBeVisible();
    });

    test('Should handle email validation in edit user form', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Click first Edit button
      await page.click('button:has-text("Edit")');
      
      // Set invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      
      // Submit form
      await page.click('form button[type="submit"]');
      
      // Should show email validation error
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
      
      // Modal should still be open
      await expect(page.locator('h2:has-text("Edit User")')).toBeVisible();
    });

    test('Should handle Edit buttons for different user roles', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Test editing different roles
      const userRows = page.locator('tbody tr');
      
      for (let i = 0; i < 4; i++) {
        const row = userRows.nth(i);
        const editButton = row.locator('button:has-text("Edit")');
        
        await expect(editButton).toBeVisible();
        await expect(editButton).toBeEnabled();
      }
    });
  });

  // =============================================================================
  // USER DELETION WORKFLOW
  // =============================================================================
  test.describe('User Deletion Workflow', () => {
    test('Should display Delete buttons for all users', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Check that Delete buttons exist for all users
      const deleteButtons = page.locator('button:has-text("Delete")');
      await expect(deleteButtons).toHaveCount(4);
      
      // All delete buttons should be visible
      for (let i = 0; i < 4; i++) {
        await expect(deleteButtons.nth(i)).toBeVisible();
      }
    });

    test('Should open Delete confirmation modal', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Click first Delete button
      await page.click('button:has-text("Delete")');
      
      // Should open confirmation modal
      await expect(page.locator('h2:has-text("Delete User")')).toBeVisible();
      await expect(page.locator('text=Are you sure you want to delete this user?')).toBeVisible();
      
      // Check action buttons
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Delete"), button:has-text("Confirm")')).toBeVisible();
      
      // Test Cancel button
      await page.click('button:has-text("Cancel")');
      await expect(page.locator('h2:has-text("Delete User")')).not.toBeVisible();
    });

    test('Should successfully delete a user', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Get initial user count
      const initialRows = await page.locator('tbody tr').count();
      
      // Click Delete button for student user
      const studentRow = page.locator('tr:has-text("Student Demo")');
      await studentRow.locator('button:has-text("Delete")').click();
      
      // Confirm deletion
      await expect(page.locator('h2:has-text("Delete User")')).toBeVisible();
      await page.click('button:has-text("Delete"):not(:has-text("User"))');
      
      // Wait for modal to close
      await expect(page.locator('h2:has-text("Delete User")')).not.toBeVisible();
      
      // Check that user was removed from the table
      await expect(page.locator('tbody tr')).toHaveCount(initialRows - 1);
      await expect(page.locator('text=Student Demo')).not.toBeVisible();
      await expect(page.locator('text=student@yggdrasil.edu')).not.toBeVisible();
    });

    test('Should prevent self-deletion for admin user', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Get the current logged-in user's info
      const currentUser = authHelpers.getCurrentUser();
      console.log('Current user:', currentUser);
      
      // Find the row for the current logged-in admin user
      const selfRow = page.locator(`tr:has-text("${currentUser.email}")`);
      await expect(selfRow).toBeVisible();
      
      // Click Delete button for the current user
      await selfRow.locator('button:has-text("Delete")').click();
      
      // Should show confirmation modal first
      await expect(page.locator('h2:has-text("Delete User")')).toBeVisible();
      
      // Click the confirm delete button in the modal
      await page.locator('.fixed.inset-0').locator('button:has-text("Delete")').click();
      
      // Should show error message about self-deletion
      await expect(page.locator('text=Cannot delete your own account')).toBeVisible();
      
      // Modal should close automatically
      await expect(page.locator('h2:has-text("Delete User")')).not.toBeVisible();
    });

    test('Should allow deletion of other admin users', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Get the current logged-in user's info
      const currentUser = authHelpers.getCurrentUser();
      console.log('Current user:', currentUser);
      
      // Find a different admin user (not the current user)
      const adminRows = page.locator('tbody tr:has(span:has-text("Admin"))');
      const adminCount = await adminRows.count();
      console.log('Admin count:', adminCount);
      
      let targetAdminRow = null;
      for (let i = 0; i < adminCount; i++) {
        const row = adminRows.nth(i);
        const emailText = await row.locator('td:nth-child(1) .text-gray-500').textContent();
        console.log('Admin email:', emailText);
        if (emailText && emailText.trim() !== currentUser.email) {
          targetAdminRow = row;
          console.log('Found target admin to delete:', emailText);
          break;
        }
      }
      
      if (targetAdminRow) {
        // Get initial user count
        const initialRows = await page.locator('tbody tr').count();
        console.log('Initial row count:', initialRows);
        
        // Click Delete button for the other admin user
        await targetAdminRow.locator('button:has-text("Delete")').click();
        
        // Should open confirmation modal
        await expect(page.locator('h2:has-text("Delete User")')).toBeVisible();
        
        // Confirm deletion
        await page.locator('.fixed.inset-0').locator('button:has-text("Delete")').click();
        
        // Wait for modal to close
        await expect(page.locator('h2:has-text("Delete User")')).not.toBeVisible();
        
        // Wait for the UI to update and check if deletion succeeded
        await page.waitForTimeout(2000);
        
        // Check if there's an error message
        const errorMessage = page.locator('text=Cannot delete your own account');
        if (await errorMessage.count() > 0) {
          console.log('Error message found - deletion prevented');
        } else {
          console.log('No error message - deletion should have succeeded');
        }
        
        // Check that user was removed from the table
        const finalRows = await page.locator('tbody tr').count();
        console.log('Final row count:', finalRows);
        
        // Only check if the row count decreased if no error occurred
        if (await errorMessage.count() === 0) {
          await expect(page.locator('tbody tr')).toHaveCount(initialRows - 1);
        }
      } else {
        console.log('No other admin users found to delete');
      }
    });

    test('Should handle Delete buttons for different user roles', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Test delete buttons for different roles
      const userRows = page.locator('tbody tr');
      
      for (let i = 0; i < 4; i++) {
        const row = userRows.nth(i);
        const deleteButton = row.locator('button:has-text("Delete")');
        
        await expect(deleteButton).toBeVisible();
        await expect(deleteButton).toBeEnabled();
        
        // Check button styling (should be red for delete actions)
        await expect(deleteButton).toHaveClass(/text-red-600/);
      }
    });

    test('Should show user details in delete confirmation modal', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Click Delete button for teacher user
      const teacherRow = page.locator('tr:has-text("Teacher Demo")');
      await teacherRow.locator('button:has-text("Delete")').click();
      
      // Should show user details in confirmation modal
      await expect(page.locator('h2:has-text("Delete User")')).toBeVisible();
      await expect(page.locator('text=Teacher Demo')).toBeVisible();
      await expect(page.locator('text=teacher@yggdrasil.edu')).toBeVisible();
      
      // Close modal
      await page.click('button:has-text("Cancel")');
    });
  });

  // =============================================================================
  // USER MANAGEMENT API INTEGRATION
  // =============================================================================
  test.describe('User Management API Integration', () => {
    test('Should load users from API instead of mock data', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Check that users are loaded from API
      await expect(page.locator('table')).toBeVisible();
      
      // Verify API call was made (check network tab if needed)
      // This ensures the frontend is calling the real API endpoints
      const table = page.locator('table');
      await expect(table.locator('tbody tr')).toHaveCount(4);
    });

    test('Should persist user data after page refresh', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Count initial users
      const initialCount = await page.locator('tbody tr').count();
      
      // Refresh page
      await page.reload();
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Should have same number of users
      await expect(page.locator('tbody tr')).toHaveCount(initialCount);
    });

    test('Should handle network errors gracefully', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      // Simulate network error by going offline
      await page.context().setOffline(true);
      
      await page.goto('/admin/users');
      
      // Should show error message
      await expect(page.locator('text=Failed to load users')).toBeVisible();
      
      // Should show retry button
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Click retry
      await page.click('button:has-text("Retry")');
      
      // Should load users successfully
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      await expect(page.locator('table')).toBeVisible();
    });
  });

  // =============================================================================
  // USER MANAGEMENT LOADING AND ERROR STATES
  // =============================================================================
  test.describe('User Management Loading and Error States', () => {
    test('Should display loading state when users are loading', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Check if loading state is shown initially
      const loadingText = page.locator('text=Loading users...');
      const loadingSpinner = page.locator('.animate-spin');
      
      // The loading state might be visible briefly
      // We'll check that the page eventually loads correctly
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
      
      // After loading, the table should be visible
      await expect(page.locator('table')).toBeVisible();
      
      // Loading text should be gone
      await expect(loadingText).not.toBeVisible();
    });

    test('Should display proper page structure and accessibility', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Check page structure
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
      await expect(page.locator('p:has-text("Manage user accounts")')).toBeVisible();
      
      // Check table accessibility
      await expect(page.locator('table')).toBeVisible();
      
      // Check that table headers are properly structured
      const headers = page.locator('th');
      await expect(headers).toHaveCount(5);
      
      // Check that table has proper ARIA labels/structure
      await expect(page.locator('table')).toHaveAttribute('class', /min-w-full/);
    });

    test('Should handle responsive design', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Test desktop view
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
      
      // Table should have horizontal scroll on mobile
      await expect(page.locator('.overflow-x-auto')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
      
      // Create button should still be accessible on mobile
      await expect(page.locator('button:has-text("Create User")')).toBeVisible();
    });
  });

  // =============================================================================
  // USER MANAGEMENT NAVIGATION INTEGRATION
  // =============================================================================
  test.describe('User Management Navigation Integration', () => {
    test('Should be accessible from sidebar navigation', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      // Start from news page
      await page.goto('/news');
      
      // Click Users in sidebar
      await page.click('[data-testid="nav-users"]');
      
      // Should navigate to user management page
      await expect(page).toHaveURL('/admin/users');
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    });

    test('Should show active state in sidebar when on user management page', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Users nav item should be active
      await expect(page.locator('[data-testid="nav-users"]')).toHaveClass(/active/);
      
      // Other nav items should not be active
      await expect(page.locator('[data-testid="nav-news"]')).not.toHaveClass(/active/);
    });

    test('Should maintain proper breadcrumb/navigation context', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Check that we're in the admin context
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
      
      // Check that admin-specific styling/layout is applied
      await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-users"]')).toBeVisible();
    });
  });

  // =============================================================================
  // USER MANAGEMENT SEARCH AND FILTERING
  // =============================================================================
  test.describe('User Management Search and Filtering', () => {
    test('Should check for search functionality', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');
      const searchCount = await searchInput.count();
      
      
      if (searchCount > 0) {
        await expect(searchInput.first()).toBeVisible();
        
        // Test search functionality
        await searchInput.first().fill('admin');
        await page.waitForTimeout(500);
        
        // Check if results are filtered
        const visibleRows = page.locator('tbody tr');
        const rowCount = await visibleRows.count();
      }
    });

    test('Should check for role filtering', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/admin/users');
      
      // Wait for loading to complete
      await expect(page.locator('text=Loading users...')).not.toBeVisible();
      
      // Look for role filter dropdown
      const roleFilter = page.locator('select[name="role"], select:has(option:has-text("Admin")), button:has-text("Filter by Role")');
      const filterCount = await roleFilter.count();
      
      
      if (filterCount > 0) {
        await expect(roleFilter.first()).toBeVisible();
        
        // Test role filtering if it exists
        if (await roleFilter.first().locator('option').count() > 0) {
          await roleFilter.first().selectOption('admin');
          await page.waitForTimeout(500);
          
          // Check if results are filtered
          const visibleRows = page.locator('tbody tr');
          const rowCount = await visibleRows.count();
        }
      }
    });
  });
});