import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth.helpers';
import { TestUsers, TestScenarios } from '../helpers/test-data';

test.describe('Login Success Scenarios', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
  });

  test(TestScenarios.LOGIN_SUCCESS + ' - Admin Demo Account', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    // Use demo login button for admin
    await authHelpers.clickDemoLogin('admin');
    
    // Wait for any loading states to complete
    await authHelpers.waitForLoadingToFinish();
    
    // Should redirect to dashboard/home on success
    await authHelpers.expectLoginSuccess();
    
    // Verify we're actually logged in by checking for logged-in elements
    // The exact selectors will depend on your dashboard layout
    await expect(page.locator('body')).not.toContainText('Sign in to your account');
  });

  test(TestScenarios.LOGIN_SUCCESS + ' - Teacher Demo Account', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    await authHelpers.clickDemoLogin('teacher');
    await authHelpers.waitForLoadingToFinish();
    await authHelpers.expectLoginSuccess();
  });

  test(TestScenarios.LOGIN_SUCCESS + ' - Student Demo Account', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    await authHelpers.clickDemoLogin('student');
    await authHelpers.waitForLoadingToFinish();
    await authHelpers.expectLoginSuccess();
  });

  test(TestScenarios.LOGIN_SUCCESS + ' - Manual Form Entry', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    // Fill form manually instead of using demo button
    await authHelpers.fillLoginForm(
      TestUsers.DEMO_ADMIN.email,
      TestUsers.DEMO_ADMIN.password
    );
    
    await authHelpers.submitForm();
    await authHelpers.waitForLoadingToFinish();
    await authHelpers.expectLoginSuccess();
  });

  test('Login form has proper structure and labels', async ({ page }) => {
    await authHelpers.navigateToLogin();
    
    // Verify form elements exist and are properly labeled
    await expect(page.locator('label[for="email"]')).toContainText('Email address');
    await expect(page.locator('#email')).toHaveAttribute('type', 'email');
    await expect(page.locator('label[for="password"]')).toContainText('Password');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
    
    // Verify demo accounts are displayed
    await expect(page.locator('text=Admin Account')).toBeVisible();
    await expect(page.locator('text=Teacher Account')).toBeVisible();
    await expect(page.locator('text=Student Account')).toBeVisible();
    
    // Verify navigation links
    await expect(page.locator('a[href="/auth/register"]')).toContainText('create a new account');
    await expect(page.locator('a[href="/"]')).toContainText('Back to home');
  });
});