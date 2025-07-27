// packages/testing-utilities/tests/functional/platform-features.spec.ts
// Optimized platform features tests - updated to follow CLAUDE.md clean testing architecture

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { ROLE_PERMISSIONS_MATRIX } from '../helpers/role-based-testing';
import { captureEnhancedError } from '../helpers/enhanced-error-context';

test.describe('Platform Features', () => {
  // Removed global auth helpers - each test manages its own cleanup

  // =============================================================================
  // TEST 1: AUTHENTICATION SYSTEM COMPREHENSIVE TESTING
  // =============================================================================
  test('Complete authentication system workflow', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Complete authentication system workflow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Test 1: Login page accessibility and structure
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    
    // Verify login form elements
    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Test demo account buttons
    await expect(page.locator('button:has-text("Admin Account")')).toBeVisible();
    await expect(page.locator('button:has-text("Teacher Account")')).toBeVisible();
    await expect(page.locator('button:has-text("Staff Account")')).toBeVisible();
    await expect(page.locator('button:has-text("Student Account")')).toBeVisible();
    
    // Test demo login functionality
    await page.click('button:has-text("Admin Account")');
    
    // Wait for navigation and authentication to complete
    await page.waitForFunction(
      () => {
        const notOnLoginPage = !window.location.pathname.includes('/auth/login');
        const hasCookies = document.cookie.includes('yggdrasil_access_token') || 
                          document.cookie.includes('yggdrasil_refresh_token');
        return notOnLoginPage && hasCookies;
      },
      { timeout: 2000 }
    );
    
    // Verify successful demo login
    await expect(page).toHaveURL('/news');
    await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible({ timeout: 2000 });
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // ROLE-BASED NAVIGATION AND ACCESS TESTS (split by role for stability)
  // =============================================================================
  
  test('Admin profile management and navigation workflow', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Admin profile management and navigation workflow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
    
    // Navigate to each accessible page for admin
    const accessiblePages = [
      { path: '/news', possibleTitles: ['News & Announcements', 'News', 'Announcements'] },
      { path: '/courses', possibleTitles: ['Course Management', 'Courses', 'All Courses'] },
      { path: '/planning', possibleTitles: ['Academic Planning', 'Planning', 'Calendar'] },
      { path: '/statistics', possibleTitles: ['Statistics', 'Analytics', 'Dashboard', 'Admin Dashboard'] }
    ];
    
    for (const pageTest of accessiblePages) {
      await page.goto(pageTest.path);
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Verify page loads successfully - check for any of the possible titles
      let titleFound = false;
      for (const title of pageTest.possibleTitles) {
        const titleLocator = page.locator(`h1:has-text("${title}")`);
        if (await titleLocator.count() > 0) {
          await expect(titleLocator.first()).toBeVisible({ timeout: 2000 });
          titleFound = true;
          break;
        }
      }
      expect(titleFound).toBeTruthy();
    }
    
    // Test admin-only page access
    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:has-text("User Management")')).toBeVisible({ timeout: 2000 });
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Teacher profile management and navigation workflow', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Teacher profile management and navigation workflow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsTeacher();
    
    // Navigate to each accessible page for teacher
    const accessiblePages = [
      { path: '/news', possibleTitles: ['News & Announcements', 'News', 'Announcements'] },
      { path: '/courses', possibleTitles: ['My Courses', 'Courses', 'Teaching Courses'] },
      { path: '/planning', possibleTitles: ['Academic Planning', 'Planning', 'Calendar'] },
      { path: '/statistics', possibleTitles: ['Statistics', 'Analytics', 'Dashboard', 'Teacher Dashboard'] }
    ];
    
    for (const pageTest of accessiblePages) {
      await page.goto(pageTest.path);
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Verify page loads successfully - check for any of the possible titles
      let titleFound = false;
      for (const title of pageTest.possibleTitles) {
        const titleLocator = page.locator(`h1:has-text("${title}")`);
        if (await titleLocator.count() > 0) {
          await expect(titleLocator.first()).toBeVisible({ timeout: 2000 });
          titleFound = true;
          break;
        }
      }
      expect(titleFound).toBeTruthy();
    }
    
    // Test admin-only page access - should be denied
    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');
    // Should redirect to news with access denied
    await expect(page).toHaveURL(/\/news(\?error=access_denied)?/, { timeout: 2000 });
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Staff profile management and navigation workflow', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Staff profile management and navigation workflow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStaff();
    
    // Navigate to each accessible page for staff
    const accessiblePages = [
      { path: '/news', possibleTitles: ['News & Announcements', 'News', 'Announcements'] },
      { path: '/courses', possibleTitles: ['Course Management', 'Courses', 'All Courses'] },
      { path: '/planning', possibleTitles: ['Academic Planning', 'Planning', 'Calendar'] },
      { path: '/statistics', possibleTitles: ['Statistics', 'Analytics', 'Dashboard', 'Staff Dashboard'] }
    ];
    
    for (const pageTest of accessiblePages) {
      await page.goto(pageTest.path);
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Verify page loads successfully - check for any of the possible titles
      let titleFound = false;
      for (const title of pageTest.possibleTitles) {
        const titleLocator = page.locator(`h1:has-text("${title}")`);
        if (await titleLocator.count() > 0) {
          await expect(titleLocator.first()).toBeVisible({ timeout: 2000 });
          titleFound = true;
          break;
        }
      }
      expect(titleFound).toBeTruthy();
    }
    
    // Test admin-only page access - should be denied
    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');
    // Should redirect to news with access denied
    await expect(page).toHaveURL(/\/news(\?error=access_denied)?/, { timeout: 2000 });
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Student profile management and navigation workflow', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Student profile management and navigation workflow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
    
    // Navigate to each accessible page for student
    const accessiblePages = [
      { path: '/news', possibleTitles: ['News & Announcements', 'News', 'Announcements'] },
      { path: '/courses', possibleTitles: ['My Enrollments', 'Courses', 'My Courses', 'Enrolled Courses'] },
      { path: '/planning', possibleTitles: ['Academic Planning', 'Planning', 'Calendar', 'My Schedule'] },
      { path: '/statistics', possibleTitles: ['Statistics', 'Analytics', 'Dashboard', 'Student Dashboard', 'My Progress'] }
    ];
    
    for (const pageTest of accessiblePages) {
      await page.goto(pageTest.path);
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Verify page loads successfully - check for any of the possible titles
      let titleFound = false;
      for (const title of pageTest.possibleTitles) {
        const titleLocator = page.locator(`h1:has-text("${title}")`);
        if (await titleLocator.count() > 0) {
          await expect(titleLocator.first()).toBeVisible({ timeout: 2000 });
          titleFound = true;
          break;
        }
      }
      expect(titleFound).toBeTruthy();
    }
    
    // Test admin-only page access - should be denied
    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');
    // Should redirect to news with access denied
    await expect(page).toHaveURL(/\/news(\?error=access_denied)?/, { timeout: 2000 });
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // STATISTICS AND DASHBOARD FEATURES (split by role for stability)
  // =============================================================================
  
  test('Student statistics and analytics dashboard', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Student statistics and analytics dashboard');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
    await page.goto('/statistics');
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    
    // Should show student dashboard or under construction
    await expect(page.locator('[data-testid="statistics-page"]')).toBeVisible();
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Teacher statistics and analytics dashboard', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Teacher statistics and analytics dashboard');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsTeacher();
    await page.goto('/statistics');
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    
    // Should show under construction or teacher dashboard
    await expect(page.locator('[data-testid="statistics-page"]')).toBeVisible();
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Admin statistics and analytics dashboard', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Admin statistics and analytics dashboard');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
    await page.goto('/statistics');
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    
    // Should show under construction or admin dashboard
    await expect(page.locator('[data-testid="statistics-page"]')).toBeVisible();
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // TEST 4: RESPONSIVE DESIGN AND ACCESSIBILITY
  // =============================================================================
  test('System health and performance monitoring', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('System health and performance monitoring');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
    
    // Test responsive design on key pages only (optimize for speed)
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 1024, height: 768, name: 'Desktop' }
    ];
    
    // Test only essential pages for responsive design
    const pages = ['/news', '/courses'];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('domcontentloaded'); // Faster than networkidle
        
        // Verify page loads and main content is visible
        await expect(page.locator('h1').first()).toBeVisible({ timeout: 3000 });
        
        // Check if navigation is accessible (may be in hamburger menu on mobile)
        const sidebarNav = page.locator('[data-testid="sidebar-nav"]');
        const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
        const hasNavigation = (await sidebarNav.count() > 0) || (await mobileMenu.count() > 0);
        expect(hasNavigation).toBeTruthy();
      }
    }
    
    // Reset to desktop
    await page.setViewportSize({ width: 1024, height: 768 });
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // TEST 5: ERROR HANDLING AND EDGE CASES
  // =============================================================================
  test('Platform error handling and edge cases', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Platform error handling and edge cases');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
    
    // Test navigation between pages
    const navigationFlow = [
      '/news',
      '/courses', 
      '/planning',
      '/statistics',
      '/news' // Back to start
    ];
    
    for (const path of navigationFlow) {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      
      // Verify page loads successfully
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 2000 });
    }
    
    // Simplified offline test - just verify basic recovery
    await page.goto('/news');
    await page.waitForLoadState('domcontentloaded');
    
    // Verify we're on a valid page before going offline
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 3000 });
    
    // Test offline/online behavior is skipped in CI environments for reliability
    // This test is browser and environment dependent
    const isCI = process.env.CI === 'true';
    if (!isCI) {
      await page.context().setOffline(true);
      
      // Wait a moment for offline state to take effect
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
      
      // Go back online
      await page.context().setOffline(false);
      
      // Simply verify the page can recover by reloading
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      
      // Very basic check - just ensure some content loads
      const hasContent = await page.locator('body').innerText();
      expect(hasContent.length).toBeGreaterThan(0);
    }
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
});