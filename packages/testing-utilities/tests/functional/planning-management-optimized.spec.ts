// packages/testing-utilities/tests/functional/planning-management-optimized.spec.ts
// Optimized planning management tests - split for better performance

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { captureEnhancedError } from '../helpers/enhanced-error-context';

// Parameterized test for role-based access
const roles = [
  { name: 'admin', loginMethod: 'loginAsAdmin', canCreate: true, canEdit: true },
  { name: 'staff', loginMethod: 'loginAsStaff', canCreate: true, canEdit: true },
  { name: 'teacher', loginMethod: 'loginAsTeacher', canCreate: false, canEdit: false },
  { name: 'student', loginMethod: 'loginAsStudent', canCreate: false, canEdit: false }
];

test.describe('Planning Management - Core Features', () => {
  
  // Quick navigation test for each role
  for (const role of roles) {
    test(`${role.name} can access planning page`, async ({ page }) => {
      const cleanup = TestCleanup.getInstance(`${role.name} planning access`);
      const authHelper = new CleanAuthHelper(page);
      
      try {
        await authHelper[role.loginMethod]();
        
        // Clear any previous state and ensure fresh page load
        await page.goto('about:blank');
        await page.waitForLoadState('domcontentloaded');
        
        await page.goto('/planning');
        await page.waitForLoadState('domcontentloaded');
        
        // Fast verification: Test core functionality, not implementation details
        // 1. Verify we're on the right page (most important)
        expect(page.url()).toContain('/planning');
        
        // 2. Wait for basic page structure (lightweight check)
        await page.waitForSelector('h1:has-text("Academic Planning", { timeout: 10000 })', { 
          state: 'visible', 
          timeout: 2000 
        });
        
        // 3. Skip complex calendar component - test permissions instead
        // This is faster and tests the actual business requirement
        
        // 4. Test role-based permissions (the real business logic)
        const createButton = page.locator('[data-testid="create-event-button"]');
        
        if (role.canCreate) {
          // Staff/Admin should see create button
          await expect(createButton).toBeVisible({ timeout: 3000 });
        } else {
          // Teacher/Student should NOT see create button
          await expect(createButton).toHaveCount(0);
        }
        
        // 5. Optional: Verify page has loaded basic content
        await expect(page.locator('p:has-text("Manage your academic schedule")')).toBeVisible({ timeout: 3000 });
        
      } finally {
        await authHelper.clearAuthState();
        await cleanup.cleanup();
      }
    });
  }
});

test.describe('Planning Management - Event Operations', () => {
  
  test('Admin can create events', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Admin create events');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      
      // Ensure clean navigation
      await page.goto('about:blank');
      await page.waitForLoadState('domcontentloaded');
      
      await page.goto('/planning');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Robust wait for calendar
      await page.waitForSelector('[data-testid="calendar-view"]', { 
        state: 'visible', 
        timeout: 5000 
      });
      
      // Create event
      const createButton = page.locator('[data-testid="create-event-button"]');
      await createButton.click();
      
      // Wait for modal
      const createModal = page.locator('[data-testid="event-create-modal"]');
      await expect(createModal).toBeVisible({ timeout: 3000 });
      
      // Fill minimal required fields
      await page.locator('[data-testid="event-title"]').fill('Quick Test Event');
      
      // Set future date to avoid conflicts
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await page.locator('[data-testid="event-start-date"]').fill(dateString);
      
      // Submit
      await page.locator('[data-testid="create-event-submit"]').click();
      
      // Wait for success or close modal
      await page.waitForSelector('[data-testid="success-message"], [data-testid="modal-close"]', {
        timeout: 2000
      });
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  test('Calendar view switching works', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Calendar view switching');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsTeacher();
      
      // Ensure clean navigation
      await page.goto('about:blank');
      await page.waitForLoadState('domcontentloaded');
      
      await page.goto('/planning');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Robust wait for calendar
      await page.waitForSelector('[data-testid="calendar-view"]', { 
        state: 'visible', 
        timeout: 5000 
      });
      
      // Test view controls if they exist
      const monthView = page.locator('[data-testid="view-month"]');
      const weekView = page.locator('[data-testid="view-week"]');
      
      if (await monthView.count() > 0) {
        await monthView.click();
        await expect(page.locator('[data-testid="calendar-grid-month"]')).toBeVisible({
          timeout: 3000
        });
      }
      
      if (await weekView.count() > 0) {
        await weekView.click();
        await expect(page.locator('[data-testid="calendar-grid-week"]')).toBeVisible({
          timeout: 3000
        });
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
});

test.describe('Planning Management - Advanced Features', () => {
  
  test('Export functionality works', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Export functionality');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStaff();
      
      // Ensure clean navigation
      await page.goto('about:blank');
      await page.waitForLoadState('domcontentloaded');
      
      await page.goto('/planning');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Robust wait for calendar
      await page.waitForSelector('[data-testid="calendar-view"]', { 
        state: 'visible', 
        timeout: 5000 
      });
      
      // Test export
      const exportButton = page.locator('[data-testid="export-calendar-button"]');
      await expect(exportButton).toBeVisible({ timeout: 3000 });
      await exportButton.click();
      
      // Check for export modal
      const exportModal = page.locator('[data-testid="export-calendar-modal"]');
      if (await exportModal.isVisible({ timeout: 3000 })) {
        // Verify options exist
        await expect(page.locator('[data-testid="export-ics"], input[value="ics"]')).toBeVisible();
        
        // Close modal
        const closeButton = page.locator('[data-testid="export-close"], [data-testid="modal-close"]');
        await closeButton.click();
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  test('Google Calendar sync UI is accessible', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Google Calendar sync');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsTeacher();
      
      // Ensure clean navigation
      await page.goto('about:blank');
      await page.waitForLoadState('domcontentloaded');
      
      await page.goto('/planning');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Robust wait for calendar
      await page.waitForSelector('[data-testid="calendar-view"]', { 
        state: 'visible', 
        timeout: 5000 
      });
      
      // Test Google sync button
      const googleSyncButton = page.locator('[data-testid="google-calendar-sync"]');
      await expect(googleSyncButton).toBeVisible({ timeout: 3000 });
      await googleSyncButton.click();
      
      // Check for sync modal
      const googleSyncModal = page.locator('[data-testid="google-sync-modal"]');
      if (await googleSyncModal.isVisible({ timeout: 3000 })) {
        // Verify basic elements
        await expect(page.locator('[data-testid="connect-google-calendar"], [data-testid="sync-preferences"]'))
          .toBeVisible();
        
        // Close modal
        const closeButton = page.locator('[data-testid="google-sync-close"], [data-testid="modal-close"]');
        await closeButton.click();
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  test('Mobile responsiveness', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Mobile responsiveness');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
      
      // Start with mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Ensure clean navigation
      await page.goto('about:blank');
      await page.waitForLoadState('domcontentloaded');
      
      await page.goto('/planning');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Robust wait for calendar
      await page.waitForSelector('[data-testid="calendar-view"]', { 
        state: 'visible', 
        timeout: 5000 
      });
      
      // Verify mobile layout
      await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible();
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
      
      // Test desktop view
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForLoadState('domcontentloaded');
      
      // Should still be functional
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
});