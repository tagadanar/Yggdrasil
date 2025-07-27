// packages/testing-utilities/tests/functional/calendar-loading-bug-reproduction.spec.ts
// Focused test to reproduce and validate the staff calendar loading bug

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { captureEnhancedError } from '../helpers/enhanced-error-context';

test.describe('Calendar Loading Bug - Staff Users', () => {
  
  test('REPRO: Staff user calendar loading hangs due to auth middleware bug', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Staff calendar loading bug reproduction');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Step 1: Login as staff user
      await authHelper.loginAsStaff();
      
      // Step 2: Navigate to planning page
      await page.goto('/planning');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Step 3: Verify basic page elements load (these should work)
      await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible({
        timeout: 2000
      });
      
      // Step 4: This is where the bug manifests - calendar should load but doesn't for staff
      console.log('⏳ Testing calendar loading for staff user...');
      
      // Use a shorter timeout to demonstrate the hang
      const calendarSelector = '[data-testid="calendar-view"]';
      
      try {
        await page.waitForSelector(calendarSelector, { 
          state: 'visible', 
          timeout: 3000 // Shorter timeout to demonstrate the issue
        });
        
        // If we reach here, the calendar loaded successfully
        console.log('✅ Calendar loaded successfully for staff user');
        expect(true).toBe(true); // Test passes if calendar loads
        
      } catch (timeoutError) {
        // This is the expected failure - calendar hangs for staff users
        console.log('❌ Calendar failed to load for staff user (reproducing bug)');
        console.log('⚠️  This is the expected behavior due to planning service auth middleware bug');
        
        // Verify the page structure is there but calendar isn't loading
        await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible();
        
        // The calendar container might be present but the actual calendar component fails to load
        const calendarContainer = page.locator('[data-testid="calendar-view"]');
        const containerExists = await calendarContainer.count() > 0;
        
        if (containerExists) {
          // Container exists but content isn't loading
          console.log('📋 Calendar container exists but content failed to load');
        } else {
          // Entire calendar component failed to render
          console.log('📋 Calendar component completely failed to render');
        }
        
        // This test documents the bug - it should fail until the fix is applied
        throw new Error('Calendar loading bug reproduced: Staff users cannot load calendar due to planning service authentication middleware using verifyToken instead of authenticateToken');
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  test('CONTROL: Admin user calendar loads correctly', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Admin calendar loading control test');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Step 1: Login as admin user
      await authHelper.loginAsAdmin();
      
      // Step 2: Navigate to planning page
      await page.goto('/planning');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Step 3: Verify admin calendar loads correctly
      console.log('⏳ Testing calendar loading for admin user...');
      
      await page.waitForSelector('[data-testid="calendar-view"]', { 
        state: 'visible', 
        timeout: 5000 
      });
      
      console.log('✅ Calendar loaded successfully for admin user');
      
      // Verify calendar is functional
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
      
      // Verify admin has create permissions (this should work)
      const createButton = page.locator('[data-testid="create-event-button"]');
      await expect(createButton).toBeVisible({ timeout: 3000 });
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  test('DIAGNOSTIC: Check planning API response for staff vs admin', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Planning API diagnostic test');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Test staff API access
      await authHelper.loginAsStaff();
      
      // Intercept planning API calls
      const staffApiResponses: any[] = [];
      
      page.on('response', async (response) => {
        if (response.url().includes('/api/planning/events')) {
          console.log(`🔍 Staff API Response: ${response.status()} ${response.url()}`);
          try {
            const responseBody = await response.text();
            staffApiResponses.push({
              status: response.status(),
              url: response.url(),
              body: responseBody
            });
          } catch (e) {
            console.log('Could not read response body:', e.message);
          }
        }
      });
      
      await page.goto('/planning');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Wait a bit for API calls to complete
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
      
      console.log(`📊 Staff API calls captured: ${staffApiResponses.length}`);
      
      // Now test admin API access
      await authHelper.loginAsAdmin();
      
      const adminApiResponses: any[] = [];
      
      page.on('response', async (response) => {
        if (response.url().includes('/api/planning/events')) {
          console.log(`🔍 Admin API Response: ${response.status()} ${response.url()}`);
          try {
            const responseBody = await response.text();
            adminApiResponses.push({
              status: response.status(),
              url: response.url(),
              body: responseBody
            });
          } catch (e) {
            console.log('Could not read response body:', e.message);
          }
        }
      });
      
      await page.goto('/planning');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Wait a bit for API calls to complete
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
      
      console.log(`📊 Admin API calls captured: ${adminApiResponses.length}`);
      
      // Compare responses
      if (staffApiResponses.length === 0) {
        console.log('⚠️  No planning API calls made for staff user - this indicates the bug');
      }
      
      if (adminApiResponses.length > 0) {
        console.log('✅ Planning API calls successful for admin user');
      }
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
});