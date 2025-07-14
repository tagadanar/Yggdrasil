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
    email: string;
    password: string;
    role?: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  }) {
    await this.page.fill('#firstName', userData.profile.firstName);
    await this.page.fill('#lastName', userData.profile.lastName);
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
    await expect(this.page).toHaveURL(/http:\/\/localhost:3000\/(dashboard)?$/);
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
    await expect(this.page).toHaveURL(/http:\/\/localhost:3000\/(dashboard)?$/);
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

  // Demo account login methods
  async loginAsAdmin() {
    await this.page.goto('/auth/login');
    await this.page.fill('#email', 'admin@yggdrasil.edu');
    await this.page.fill('#password', 'Admin123!');
    await this.page.click('button[type="submit"]');
    await expect(this.page).toHaveURL('/dashboard');
  }

  async loginAsTeacher() {
    await this.page.goto('/auth/login');
    await this.page.fill('#email', 'teacher@yggdrasil.edu');
    await this.page.fill('#password', 'Admin123!');
    await this.page.click('button[type="submit"]');
    await expect(this.page).toHaveURL('/dashboard');
  }

  async loginAsStaff() {
    await this.page.goto('/auth/login');
    await this.page.fill('#email', 'staff@yggdrasil.edu');
    await this.page.fill('#password', 'Admin123!');
    await this.page.click('button[type="submit"]');
    await expect(this.page).toHaveURL('/dashboard');
  }

  async loginAsStudent() {
    await this.page.goto('/auth/login');
    await this.page.fill('#email', 'student@yggdrasil.edu');
    await this.page.fill('#password', 'Admin123!');
    await this.page.click('button[type="submit"]');
    await expect(this.page).toHaveURL('/dashboard');
  }

  async logout() {
    // Look for logout button or menu
    const logoutButton = this.page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out")');
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Check if there's a user menu to click first
      const userMenu = this.page.locator('[data-testid="user-menu"], .user-menu, button:has-text("Profile")');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await this.page.click('button:has-text("Logout"), a:has-text("Logout")');
      }
    }
    
    // Should redirect to login page
    await expect(this.page).toHaveURL('/auth/login');
  }

  async getAccessToken(): Promise<string> {
    // Get access token from localStorage or cookies
    const token = await this.page.evaluate(() => {
      return localStorage.getItem('accessToken') || 
             document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
    });
    
    if (!token) {
      throw new Error('No access token found');
    }
    
    return token;
  }

  async getRefreshToken(): Promise<string> {
    // Get refresh token from localStorage or cookies
    const token = await this.page.evaluate(() => {
      return localStorage.getItem('refreshToken') || 
             document.cookie.split('; ').find(row => row.startsWith('refreshToken='))?.split('=')[1];
    });
    
    if (!token) {
      throw new Error('No refresh token found');
    }
    
    return token;
  }
}