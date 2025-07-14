import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth.helpers';
import { TestUsers, TestScenarios } from '../helpers/test-data';

test.describe('Login Failure Scenarios', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
  });

  test(TestScenarios.LOGIN_FAILURE + ' - Invalid credentials', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    // Try to login with invalid credentials
    await authHelpers.fillLoginForm(
      TestUsers.INVALID_USER.email,
      TestUsers.INVALID_USER.password
    );
    
    await authHelpers.submitForm();
    await authHelpers.waitForLoadingToFinish();
    
    // Should show error and stay on login page
    await authHelpers.expectLoginError();
  });

  test('Login fails with empty email', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    // Leave email empty, fill password
    await authHelpers.fillLoginForm('', 'somepassword');
    await authHelpers.submitForm();
    
    // Should show validation error for email field
    await authHelpers.expectFormValidationError('email');
  });

  test('Login fails with empty password', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    // Fill email, leave password empty
    await authHelpers.fillLoginForm('test@example.com', '');
    await authHelpers.submitForm();
    
    // Should show validation error for password field
    await authHelpers.expectFormValidationError('password');
  });

  test('Login fails with invalid email format', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    // Use invalid email format
    await authHelpers.fillLoginForm('invalid-email', 'password123');
    await authHelpers.submitForm();
    
    // Should show validation error for email field
    await authHelpers.expectFormValidationError('email');
  });

  test('Login fails with both fields empty', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    // Submit form without filling any fields
    await authHelpers.submitForm();
    
    // Should show validation errors for both fields
    await authHelpers.expectFormValidationError('email');
    await authHelpers.expectFormValidationError('password');
  });

  test('Login fails with wrong password for valid email', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    // Use valid demo email but wrong password
    await authHelpers.fillLoginForm(
      TestUsers.DEMO_ADMIN.email,
      'WrongPassword123!'
    );
    
    await authHelpers.submitForm();
    await authHelpers.waitForLoadingToFinish();
    
    // Should show login error (not validation error)
    await authHelpers.expectLoginError('Invalid credentials');
  });

  test('Form shows loading state during submission', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    await authHelpers.fillLoginForm(
      TestUsers.INVALID_USER.email,
      TestUsers.INVALID_USER.password
    );
    
    // Submit form and immediately check for loading state
    await authHelpers.submitForm();
    
    // Should show loading spinner/text
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    
    // Wait for submission to complete
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
    
    // Verify error is shown
    await expect(page.locator('.bg-error-50')).toBeVisible();
    
    // Second attempt with different credentials
    await authHelpers.fillLoginForm(
      'different@example.com',
      'DifferentPassword123!'
    );
    await authHelpers.submitForm();
    
    // Error should be cleared during new submission
    await expect(page.locator('.bg-error-50')).toBeHidden();
  });
});