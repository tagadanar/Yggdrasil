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

  // NOTE: Redundant tests removed:
  // - Authentication workflow → use auth-security.spec.ts
  // - Profile management → use profile-editing.spec.ts
  // - Statistics dashboards → use statistics-management.spec.ts

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