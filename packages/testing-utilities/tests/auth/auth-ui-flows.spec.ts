// packages/testing-utilities/tests/auth/auth-ui-flows.spec.ts
// Consolidated UI testing for authentication flows (login + registration)
// Replaces: login-success.spec.ts, login-failure.spec.ts, register.spec.ts

import { test, expect } from '@playwright/test';
import { IsolatedAuthHelpers } from '../helpers/isolated-auth.helpers';
import { TestUsers, TestScenarios, generateUniqueUser } from '../helpers/test-data';

test.describe('Authentication UI Flows', () => {
  let authHelpers: IsolatedAuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new IsolatedAuthHelpers(page);
    await authHelpers.initialize();
  });

  test.afterEach(async ({ page }) => {
    await authHelpers.cleanup();
  });

  // =============================================================================
  // LOGIN SUCCESS SCENARIOS
  // =============================================================================
  test.describe('Login Success Flows', () => {
    test(TestScenarios.LOGIN_SUCCESS + ' - Admin Demo Account', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      await authHelpers.waitForLoadingToFinish();
      // Should redirect to news page after login
      await expect(page).toHaveURL('/news');
      await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
    });

    test(TestScenarios.LOGIN_SUCCESS + ' - Teacher Demo Account', async ({ page }) => {
      await authHelpers.loginAsTeacher();
      await authHelpers.waitForLoadingToFinish();
      // Should redirect to news page after login
      await expect(page).toHaveURL('/news');
    });

    test(TestScenarios.LOGIN_SUCCESS + ' - Student Demo Account', async ({ page }) => {
      await authHelpers.loginAsStudent();
      await authHelpers.waitForLoadingToFinish();
      // Should redirect to news page after login
      await expect(page).toHaveURL('/news');
    });

    test(TestScenarios.LOGIN_SUCCESS + ' - Manual Form Entry', async ({ page }) => {
      // Create a test user first
      const testUser = await authHelpers.getTestUser('admin');
      
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(testUser.email, testUser.password);
      await authHelpers.submitForm();
      await authHelpers.waitForLoadingToFinish();
      await authHelpers.expectLoginSuccess();
      // Should redirect to news page after login
      await expect(page).toHaveURL('/news');
      
      // Release the test user
      authHelpers.releaseTestUser(testUser);
    });

    test('Login form has proper structure and labels', async ({ page }) => {
      await authHelpers.navigateToLogin();
      
      await expect(page.locator('label[for="email"]')).toContainText('Email address');
      await expect(page.locator('#email')).toHaveAttribute('type', 'email');
      await expect(page.locator('label[for="password"]')).toContainText('Password');
      await expect(page.locator('#password')).toHaveAttribute('type', 'password');
      await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
      
      // Demo login buttons should still be visible for regular users
      await expect(page.locator('text=Admin Account')).toBeVisible();
      await expect(page.locator('text=Teacher Account')).toBeVisible();
      await expect(page.locator('text=Student Account')).toBeVisible();
      
      // Registration link should not exist
      await expect(page.locator('a[href="/auth/register"]')).not.toBeVisible();
      await expect(page.locator('a[href="/"]').filter({ hasText: 'Back to home' })).toBeVisible();
    });
  });

  // =============================================================================
  // LOGIN FAILURE SCENARIOS
  // =============================================================================
  test.describe('Login Failure Flows', () => {
    test(TestScenarios.LOGIN_FAILURE + ' - Invalid credentials', async ({ page }) => {
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(
        TestUsers.INVALID_USER.email,
        TestUsers.INVALID_USER.password
      );
      await authHelpers.submitForm();
      await authHelpers.waitForLoadingToFinish();
      await authHelpers.expectLoginError();
    });

    test('Login fails with empty email', async ({ page }) => {
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm('', 'somepassword');
      await authHelpers.submitForm();
      
      try {
        await authHelpers.expectFormValidationError('email');
      } catch (e) {
        await authHelpers.expectLoginError();
      }
    });

    test('Login fails with empty password', async ({ page }) => {
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm('test@example.com', '');
      await authHelpers.submitForm();
      
      try {
        await authHelpers.expectFormValidationError('password');
      } catch (e) {
        await authHelpers.expectLoginError();
      }
    });

    test('Login fails with invalid email format', async ({ page }) => {
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm('invalid-email', 'password123');
      await authHelpers.submitForm();
      
      // Check for validation error - could be form validation or server error
      try {
        await authHelpers.expectFormValidationError('email');
      } catch (e) {
        // Fallback: check for server-side validation error
        await authHelpers.expectLoginError();
      }
    });

    test('Login fails with both fields empty', async ({ page }) => {
      await authHelpers.navigateToLogin();
      await authHelpers.submitForm();
      
      try {
        await authHelpers.expectFormValidationError('email');
        await authHelpers.expectFormValidationError('password');
      } catch (e) {
        await authHelpers.expectLoginError();
      }
    });

    test('Login fails with wrong password for valid email', async ({ page }) => {
      // Create a test user first
      const testUser = await authHelpers.getTestUser('admin');
      
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(testUser.email, 'WrongPassword123!');
      await authHelpers.submitForm();
      await authHelpers.waitForLoadingToFinish();
      await authHelpers.expectLoginError('Invalid email or password');
      
      // Release the test user
      authHelpers.releaseTestUser(testUser);
    });

    test('Form shows loading state during submission', async ({ page }) => {
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(
        TestUsers.INVALID_USER.email,
        TestUsers.INVALID_USER.password
      );
      await authHelpers.submitForm();
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      await authHelpers.waitForLoadingToFinish();
    });

    test('Error message is cleared when user retries', async ({ page }) => {
      await authHelpers.navigateToLogin();
      
      // First attempt with invalid credentials
      await authHelpers.fillLoginForm(
        TestUsers.INVALID_USER.email,
        TestUsers.INVALID_USER.password
      );
      await authHelpers.submitForm();
      await authHelpers.waitForLoadingToFinish();
      await expect(page.locator('.bg-error-50')).toBeVisible();
      
      // Second attempt - error should be cleared
      await authHelpers.fillLoginForm(
        'different@example.com',
        'DifferentPassword123!'
      );
      await authHelpers.submitForm();
      await expect(page.locator('.bg-error-50')).toBeHidden();
    });
  });

  // =============================================================================
  // REGISTRATION DISABLED
  // =============================================================================
  test.describe('Registration Disabled', () => {
    test('Registration page should not be accessible', async ({ page }) => {
      // Try to navigate to register page
      const response = await page.goto('/auth/register');
      
      // Should redirect to login or show error
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('No registration link on login page', async ({ page }) => {
      await authHelpers.navigateToLogin();
      
      // Ensure no registration link exists
      await expect(page.locator('a[href="/auth/register"]')).not.toBeVisible();
      await expect(page.locator('text=create a new account')).not.toBeVisible();
      await expect(page.locator('text=Create account')).not.toBeVisible();
    });
  });
});