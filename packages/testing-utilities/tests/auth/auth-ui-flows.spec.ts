// packages/testing-utilities/tests/auth/auth-ui-flows.spec.ts
// Consolidated UI testing for authentication flows (login + registration)
// Replaces: login-success.spec.ts, login-failure.spec.ts, register.spec.ts

import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth.helpers';
import { TestUsers, TestScenarios, generateUniqueUser } from '../helpers/test-data';

test.describe('Authentication UI Flows', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
  });

  // =============================================================================
  // LOGIN SUCCESS SCENARIOS
  // =============================================================================
  test.describe('Login Success Flows', () => {
    test(TestScenarios.LOGIN_SUCCESS + ' - Admin Demo Account', async ({ page }) => {
      await authHelpers.navigateToLogin();
      await authHelpers.clickDemoLogin('admin');
      await authHelpers.waitForLoadingToFinish();
      await authHelpers.expectLoginSuccess();
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
      
      await expect(page.locator('label[for="email"]')).toContainText('Email address');
      await expect(page.locator('#email')).toHaveAttribute('type', 'email');
      await expect(page.locator('label[for="password"]')).toContainText('Password');
      await expect(page.locator('#password')).toHaveAttribute('type', 'password');
      await expect(page.locator('button[type="submit"]')).toContainText('Sign in');
      
      await expect(page.locator('text=Admin Account')).toBeVisible();
      await expect(page.locator('text=Teacher Account')).toBeVisible();
      await expect(page.locator('text=Student Account')).toBeVisible();
      
      await expect(page.locator('a[href="/auth/register"]')).toContainText('create a new account');
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
      await authHelpers.navigateToLogin();
      await authHelpers.fillLoginForm(
        TestUsers.DEMO_ADMIN.email,
        'WrongPassword123!'
      );
      await authHelpers.submitForm();
      await authHelpers.waitForLoadingToFinish();
      await authHelpers.expectLoginError('Invalid email or password');
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
  // REGISTRATION FLOWS (SIMPLIFIED - FOCUS ON UI/UX)
  // =============================================================================
  test.describe('Registration UI Flows', () => {
    test(TestScenarios.REGISTER_SUCCESS + ' - Student account', async ({ page }) => {
      await authHelpers.navigateToRegister();
      const newUser = generateUniqueUser('student');
      await authHelpers.fillRegisterForm(newUser);
      await authHelpers.submitForm();
      await authHelpers.waitForLoadingToFinish();
      await authHelpers.expectRegisterSuccess();
    });

    test(TestScenarios.REGISTER_SUCCESS + ' - Teacher account', async ({ page }) => {
      await authHelpers.navigateToRegister();
      const newUser = generateUniqueUser('teacher');
      await authHelpers.fillRegisterForm(newUser);
      await authHelpers.submitForm();
      await authHelpers.waitForLoadingToFinish();
      await authHelpers.expectRegisterSuccess();
    });

    test('Registration form has proper structure and labels', async ({ page }) => {
      await authHelpers.navigateToRegister();
      
      await expect(page.locator('label[for="firstName"]')).toContainText('First Name');
      await expect(page.locator('#firstName')).toHaveAttribute('type', 'text');
      await expect(page.locator('label[for="lastName"]')).toContainText('Last Name');
      await expect(page.locator('#lastName')).toHaveAttribute('type', 'text');
      await expect(page.locator('label[for="email"]')).toContainText('Email address');
      await expect(page.locator('#email')).toHaveAttribute('type', 'email');
      await expect(page.locator('label[for="password"]')).toContainText('Password');
      await expect(page.locator('#password')).toHaveAttribute('type', 'password');
      await expect(page.locator('label[for="role"]')).toContainText('Role');
      await expect(page.locator('#role')).toBeVisible();
      
      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Create account');
      await expect(page.locator('a[href="/auth/login"]')).toContainText('sign in to existing account');
      await expect(page.locator('a[href="/"]').filter({ hasText: 'Back to home' })).toBeVisible();
    });

    test('Registration validates required fields', async ({ page }) => {
      await authHelpers.navigateToRegister();
      await authHelpers.submitForm();
      
      // Check for validation errors - may be client or server side
      try {
        await authHelpers.expectFormValidationError('firstName');
        await authHelpers.expectFormValidationError('lastName');
        await authHelpers.expectFormValidationError('email');
        await authHelpers.expectFormValidationError('password');
      } catch (e) {
        // Fallback: check for server-side validation
        await authHelpers.expectRegisterError();
      }
    });

    test('Registration validates email format', async ({ page }) => {
      await authHelpers.navigateToRegister();
      const invalidUser = {
        ...generateUniqueUser(),
        email: 'invalid-email-format'
      };
      await authHelpers.fillRegisterForm(invalidUser);
      await authHelpers.submitForm();
      
      try {
        await authHelpers.expectFormValidationError('email');
      } catch (e) {
        await authHelpers.expectRegisterError();
      }
    });

    test('Registration validates password strength', async ({ page }) => {
      await authHelpers.navigateToRegister();
      const weakPasswordUser = {
        ...generateUniqueUser(),
        password: 'weak'
      };
      await authHelpers.fillRegisterForm(weakPasswordUser);
      await authHelpers.submitForm();
      
      try {
        await authHelpers.expectFormValidationError('password');
      } catch (e) {
        await authHelpers.expectRegisterError();
      }
    });

    test('Registration fails with duplicate email', async ({ page }) => {
      await authHelpers.navigateToRegister();
      const duplicateUser = {
        ...generateUniqueUser(),
        email: TestUsers.DEMO_ADMIN.email
      };
      await authHelpers.fillRegisterForm(duplicateUser);
      await authHelpers.submitForm();
      await authHelpers.waitForLoadingToFinish();
      await authHelpers.expectRegisterError();
    });

    test('Form shows loading state during submission', async ({ page }) => {
      await authHelpers.navigateToRegister();
      const newUser = generateUniqueUser();
      await authHelpers.fillRegisterForm(newUser);
      await authHelpers.submitForm();
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      await expect(page.locator('text=Creating account...')).toBeVisible();
      await authHelpers.waitForLoadingToFinish();
    });

    test('Role selector has all expected options', async ({ page }) => {
      await authHelpers.navigateToRegister();
      const roleSelect = page.locator('#role');
      await expect(roleSelect.locator('option[value="student"]')).toContainText('Student');
      await expect(roleSelect.locator('option[value="teacher"]')).toContainText('Teacher');
      await expect(roleSelect.locator('option[value="staff"]')).toContainText('Staff');
      await expect(roleSelect).toHaveValue('student');
    });
  });

  // =============================================================================
  // NAVIGATION AND INTEGRATION
  // =============================================================================
  test.describe('Auth Navigation Flows', () => {
    test('Navigation between login and register works', async ({ page }) => {
      await authHelpers.navigateToRegister();
      await page.click('a[href="/auth/login"]');
      await expect(page).toHaveURL(/\/auth\/login$/);
      await expect(page.locator('h2')).toContainText('Sign in to your account');
      
      await page.click('a[href="/auth/register"]');
      await expect(page).toHaveURL(/\/auth\/register$/);
      await expect(page.locator('h2')).toContainText('Create your account');
    });
  });
});