import { Page, expect } from '@playwright/test';

export class AuthHelpers {
  constructor(private page: Page) {}

  async navigateToLogin() {
    await this.page.goto('/auth/login');
    await expect(this.page.locator('h2')).toContainText('Sign in to your account');
  }

  async navigateToRegister() {
    await this.page.goto('/auth/register');
    await expect(this.page.locator('h2')).toContainText('Create your account');
  }

  async fillLoginForm(email: string, password: string) {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
  }

  async fillRegisterForm(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
  }) {
    await this.page.fill('#firstName', userData.firstName);
    await this.page.fill('#lastName', userData.lastName);
    await this.page.fill('#email', userData.email);
    await this.page.fill('#password', userData.password);
    
    if (userData.role) {
      await this.page.selectOption('#role', userData.role);
    }
  }

  async submitForm() {
    await this.page.click('button[type="submit"]');
  }

  async clickDemoLogin(role: 'admin' | 'teacher' | 'student') {
    const roleSelectors = {
      admin: 'button:has-text("Admin Account")',
      teacher: 'button:has-text("Teacher Account")',
      student: 'button:has-text("Student Account")'
    };
    
    await this.page.click(roleSelectors[role]);
  }

  async expectLoginSuccess() {
    // After successful login, should redirect to home/dashboard
    await expect(this.page).toHaveURL(/^\/(dashboard)?$/);
  }

  async expectLoginError(errorMessage?: string) {
    // Should stay on login page and show error
    await expect(this.page).toHaveURL(/\/auth\/login$/);
    
    if (errorMessage) {
      await expect(this.page.locator('.bg-error-50')).toContainText(errorMessage);
    } else {
      await expect(this.page.locator('.bg-error-50')).toBeVisible();
    }
  }

  async expectRegisterSuccess() {
    // After successful registration, should redirect to home/dashboard
    await expect(this.page).toHaveURL(/^\/(dashboard)?$/);
  }

  async expectRegisterError(errorMessage?: string) {
    // Should stay on register page and show error
    await expect(this.page).toHaveURL(/\/auth\/register$/);
    
    if (errorMessage) {
      await expect(this.page.locator('.bg-error-50')).toContainText(errorMessage);
    } else {
      await expect(this.page.locator('.bg-error-50')).toBeVisible();
    }
  }

  async expectFormValidationError(fieldId: string, errorMessage?: string) {
    const field = this.page.locator(`#${fieldId}`);
    const errorElement = field.locator('+ .form-error, ~ .form-error').first();
    
    await expect(field).toHaveClass(/border-error-500/);
    await expect(errorElement).toBeVisible();
    
    if (errorMessage) {
      await expect(errorElement).toContainText(errorMessage);
    }
  }

  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(title);
  }

  async waitForLoadingToFinish() {
    // Wait for any loading spinners to disappear
    await this.page.waitForSelector('.animate-spin', { state: 'hidden' });
  }
}