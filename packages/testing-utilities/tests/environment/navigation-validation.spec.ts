// packages/testing-utilities/tests/environment/navigation-validation.spec.ts
// Tests for the new sidebar navigation system

import { test, expect } from '@playwright/test';
import { IsolatedAuthHelpers } from '../helpers/isolated-auth.helpers';

test.describe('Navigation System Validation', () => {
  let authHelpers: IsolatedAuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new IsolatedAuthHelpers(page);
    await authHelpers.initialize();
  });

  test.afterEach(async ({ page }) => {
    await authHelpers.cleanup();
  });

  // =============================================================================
  // SIDEBAR NAVIGATION STRUCTURE
  // =============================================================================
  test.describe('Sidebar Navigation Structure', () => {
    test('Sidebar should be visible after login', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      // Should redirect to news page after login
      await expect(page).toHaveURL('/news');
      
      // Sidebar should be visible
      await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible();
    });

    test('Profile link in top right should navigate to profile page', async ({ page }) => {
      await authHelpers.loginAsStudent();
      
      // Click on profile name in top right
      await page.click('[data-testid="profile-link"]');
      await expect(page).toHaveURL('/profile');
      await expect(page.locator('h1:has-text("My Profile")')).toBeVisible();
    });
  });

  // =============================================================================
  // ROLE-BASED NAVIGATION ACCESS
  // =============================================================================
  test.describe('Role-Based Navigation Access', () => {
    test('Admin should see all navigation items', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      const sidebar = page.locator('[data-testid="sidebar-nav"]');
      await expect(sidebar.locator('text=News')).toBeVisible();
      await expect(sidebar.locator('text=Users')).toBeVisible();
      await expect(sidebar.locator('text=Courses')).toBeVisible();
      await expect(sidebar.locator('text=Planning')).toBeVisible();
      await expect(sidebar.locator('text=Statistics')).toBeVisible();
    });

    test('Teacher should not see Users management', async ({ page }) => {
      await authHelpers.loginAsTeacher();
      
      const sidebar = page.locator('[data-testid="sidebar-nav"]');
      await expect(sidebar.locator('text=News')).toBeVisible();
      await expect(sidebar.locator('text=Users')).not.toBeVisible();
      await expect(sidebar.locator('text=Courses')).toBeVisible();
      await expect(sidebar.locator('text=Planning')).toBeVisible();
      await expect(sidebar.locator('text=Statistics')).toBeVisible();
    });

    test('Staff should not see Users management', async ({ page }) => {
      await authHelpers.loginAsStaff();
      
      const sidebar = page.locator('[data-testid="sidebar-nav"]');
      await expect(sidebar.locator('text=News')).toBeVisible();
      await expect(sidebar.locator('text=Users')).not.toBeVisible();
      await expect(sidebar.locator('text=Courses')).toBeVisible();
      await expect(sidebar.locator('text=Planning')).toBeVisible();
      await expect(sidebar.locator('text=Statistics')).toBeVisible();
    });

    test('Student should not see Users management', async ({ page }) => {
      await authHelpers.loginAsStudent();
      
      const sidebar = page.locator('[data-testid="sidebar-nav"]');
      await expect(sidebar.locator('text=News')).toBeVisible();
      await expect(sidebar.locator('text=Users')).not.toBeVisible();
      await expect(sidebar.locator('text=Courses')).toBeVisible();
      await expect(sidebar.locator('text=Planning')).toBeVisible();
      await expect(sidebar.locator('text=Statistics')).toBeVisible();
    });
  });

  // =============================================================================
  // NAVIGATION FUNCTIONALITY
  // =============================================================================
  test.describe('Navigation Functionality', () => {
    test('News should be the default page after login', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      await expect(page).toHaveURL('/news');
      await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
    });

    test('Navigation links should work correctly', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      // Click News
      await page.click('[data-testid="nav-news"]');
      await expect(page).toHaveURL('/news');
      
      // Click Users (admin only)
      await page.click('[data-testid="nav-users"]');
      await expect(page).toHaveURL('/admin/users');
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
      
      // Click Courses
      await page.click('[data-testid="nav-courses"]');
      await expect(page).toHaveURL('/courses');
      await expect(page.locator('h1:has-text("Under Construction")')).toBeVisible();
      
      // Click Planning
      await page.click('[data-testid="nav-planning"]');
      await expect(page).toHaveURL('/planning');
      await expect(page.locator('h1:has-text("Under Construction")')).toBeVisible();
      
      // Click Statistics
      await page.click('[data-testid="nav-statistics"]');
      await expect(page).toHaveURL('/statistics');
      await expect(page.locator('h1:has-text("Under Construction")')).toBeVisible();
    });

    test('Non-admin users should be redirected when accessing user management', async ({ page }) => {
      await authHelpers.loginAsTeacher();
      
      // Try to access user management directly
      await page.goto('/admin/users');
      await expect(page).toHaveURL('/news?error=access_denied');
      await expect(page.locator('text=Access Denied')).toBeVisible();
    });
  });

  // =============================================================================
  // SIDEBAR BEHAVIOR
  // =============================================================================
  test.describe('Sidebar Behavior', () => {
    test('Active navigation item should be highlighted', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      // On news page
      await page.goto('/news');
      await expect(page.locator('[data-testid="nav-news"]')).toHaveClass(/active/);
      
      // Navigate to users
      await page.click('[data-testid="nav-users"]');
      await expect(page.locator('[data-testid="nav-users"]')).toHaveClass(/active/);
      await expect(page.locator('[data-testid="nav-news"]')).not.toHaveClass(/active/);
    });

    test('Sidebar should be responsive on mobile', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Sidebar should be hidden by default on mobile (check for transform class)
      const sidebar = page.locator('[data-testid="sidebar-nav"]');
      await expect(sidebar).toHaveClass(/-translate-x-full/);
      
      // Should have hamburger menu
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
      
      // Click hamburger to open sidebar
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(sidebar).toHaveClass(/translate-x-0/);
    });
  });
});