import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../helpers/auth.helpers';
import { TestUsers, TestScenarios, generateUniqueUser } from '../helpers/test-data';

test.describe('Account Creation Scenarios', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
  });

  test(TestScenarios.REGISTER_SUCCESS + ' - Student account', async ({ page }) => {
    await authHelpers.navigateToRegister();
    
    const newUser = generateUniqueUser('student');
    await authHelpers.fillRegisterForm(newUser);
    
    await authHelpers.submitForm();
    await authHelpers.waitForLoadingToFinish();
    
    // Should redirect to dashboard/home on success
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

  test(TestScenarios.REGISTER_SUCCESS + ' - Staff account', async ({ page }) => {
    await authHelpers.navigateToRegister();
    
    const newUser = generateUniqueUser('staff');
    await authHelpers.fillRegisterForm(newUser);
    
    await authHelpers.submitForm();
    await authHelpers.waitForLoadingToFinish();
    
    await authHelpers.expectRegisterSuccess();
  });

  test('Registration form has proper structure and labels', async ({ page }) => {
    await authHelpers.navigateToRegister();
    
    // Verify all form elements exist and are properly labeled
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
    
    // Verify password requirements text
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    
    await expect(page.locator('button[type="submit"]')).toContainText('Create account');
    
    // Verify navigation links
    await expect(page.locator('a[href="/auth/login"]')).toContainText('sign in to existing account');
    await expect(page.locator('a[href="/"]')).toContainText('Back to home');
  });

  test('Registration validates required fields', async ({ page }) => {
    await authHelpers.navigateToRegister();
    
    // Submit form without filling any fields
    await authHelpers.submitForm();
    
    // Should show validation errors for required fields
    await authHelpers.expectFormValidationError('firstName');
    await authHelpers.expectFormValidationError('lastName');
    await authHelpers.expectFormValidationError('email');
    await authHelpers.expectFormValidationError('password');
  });

  test('Registration validates email format', async ({ page }) => {
    await authHelpers.navigateToRegister();
    
    const invalidUser = {
      ...generateUniqueUser(),
      email: 'invalid-email-format'
    };
    
    await authHelpers.fillRegisterForm(invalidUser);
    await authHelpers.submitForm();
    
    await authHelpers.expectFormValidationError('email');
  });

  test('Registration validates password strength', async ({ page }) => {
    await authHelpers.navigateToRegister();
    
    const weakPasswordUser = {
      ...generateUniqueUser(),
      password: 'weak'  // Too short, no uppercase, no numbers
    };
    
    await authHelpers.fillRegisterForm(weakPasswordUser);
    await authHelpers.submitForm();
    
    await authHelpers.expectFormValidationError('password');
  });

  test('Registration fails with duplicate email', async ({ page }) => {
    await authHelpers.navigateToRegister();
    
    // Try to register with an existing demo account email
    const duplicateUser = {
      ...generateUniqueUser(),
      email: TestUsers.DEMO_ADMIN.email
    };
    
    await authHelpers.fillRegisterForm(duplicateUser);
    await authHelpers.submitForm();
    await authHelpers.waitForLoadingToFinish();
    
    // Should show error about email already being taken
    await authHelpers.expectRegisterError();
  });

  test('Form shows loading state during submission', async ({ page }) => {
    await authHelpers.navigateToRegister();
    
    const newUser = generateUniqueUser();
    await authHelpers.fillRegisterForm(newUser);
    
    // Submit form and immediately check for loading state
    await authHelpers.submitForm();
    
    // Should show loading spinner/text
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await expect(page.locator('text=Creating account...')).toBeVisible();
    
    // Wait for submission to complete
    await authHelpers.waitForLoadingToFinish();
  });

  test('Role selector has all expected options', async ({ page }) => {
    await authHelpers.navigateToRegister();
    
    const roleSelect = page.locator('#role');
    
    // Check that all role options are available
    await expect(roleSelect.locator('option[value="student"]')).toContainText('Student');
    await expect(roleSelect.locator('option[value="teacher"]')).toContainText('Teacher');
    await expect(roleSelect.locator('option[value="staff"]')).toContainText('Staff');
    
    // Check default selection
    await expect(roleSelect).toHaveValue('student');
  });

  test('Navigation between login and register works', async ({ page }) => {
    // Start on register page
    await authHelpers.navigateToRegister();
    
    // Click link to login page
    await page.click('a[href="/auth/login"]');
    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.locator('h2')).toContainText('Sign in to your account');
    
    // Click link back to register page
    await page.click('a[href="/auth/register"]');
    await expect(page).toHaveURL(/\/auth\/register$/);
    await expect(page.locator('h2')).toContainText('Create your account');
  });
});