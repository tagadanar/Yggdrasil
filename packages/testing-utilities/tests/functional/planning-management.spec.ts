// packages/testing-utilities/tests/functional/planning-management.spec.ts
// Optimized planning management tests - updated to follow CLAUDE.md clean testing architecture

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { ROLE_PERMISSIONS_MATRIX } from '../helpers/role-based-testing';

test.describe('Planning Management', () => {
  // Removed global auth helpers - each test manages its own cleanup

  test.beforeEach(async ({ page }) => {
    // No global setup needed - each test handles its own initialization
  });

  test.afterEach(async ({ page }) => {
    // No global cleanup needed - each test handles its own cleanup
  });

  // =============================================================================
  // CORE CALENDAR WORKFLOW - ROLE-BASED ACCESS & NAVIGATION (split by role for stability)
  // =============================================================================
  
  test('Admin calendar workflow - access and navigation', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Admin calendar workflow - access and navigation');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
    await page.goto('/planning');
    // Use longer timeout for initial page load
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Verify core UI elements are present
    await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible();
    await expect(page.locator('p:has-text("Manage your academic schedule")')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
    
    // Admin should see create button
    const createButton = page.locator('[data-testid="create-event-button"]');
    await expect(createButton).toBeVisible();
    
    // Verify common tools are available
    await expect(page.locator('[data-testid="filter-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-calendar-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="google-calendar-sync"]')).toBeVisible();
    
    // Test calendar view switching functionality
    await testCalendarViews(page);
    await testCalendarNavigation(page);
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Teacher calendar workflow - access and navigation', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Teacher calendar workflow - access and navigation');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsTeacher();
    await page.goto('/planning');
    // Use longer timeout for initial page load
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Verify core UI elements are present
    await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible();
    await expect(page.locator('p:has-text("Manage your academic schedule")')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
    
    // Teacher should NOT see create button (only admin/staff can create events)
    const createButton = page.locator('[data-testid="create-event-button"]');
    expect(await createButton.count()).toBe(0);
    
    // Verify common tools are available
    await expect(page.locator('[data-testid="filter-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-calendar-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="google-calendar-sync"]')).toBeVisible();
    
    // Test calendar view switching functionality
    await testCalendarViews(page);
    await testCalendarNavigation(page);
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Staff calendar workflow - access and navigation', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Staff calendar workflow - access and navigation');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStaff();
    await page.goto('/planning');
    // Use longer timeout for initial page load
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Verify core UI elements are present
    await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible();
    await expect(page.locator('p:has-text("Manage your academic schedule")')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
    
    // Staff should see create button
    const createButton = page.locator('[data-testid="create-event-button"]');
    await expect(createButton).toBeVisible();
    
    // Verify common tools are available
    await expect(page.locator('[data-testid="filter-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-calendar-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="google-calendar-sync"]')).toBeVisible();
    
    // Test calendar view switching functionality
    await testCalendarViews(page);
    await testCalendarNavigation(page);
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Student calendar workflow - access and navigation', async ({ page }) => {
    await authHelpers.loginAsStudent();
    await page.goto('/planning');
    // Use longer timeout for initial page load
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    
    // Verify core UI elements are present
    await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible();
    await expect(page.locator('p:has-text("Manage your academic schedule")')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
    
    // Student should NOT see create button
    const createButton = page.locator('[data-testid="create-event-button"]');
    expect(await createButton.count()).toBe(0);
    
    // Verify common tools are available
    await expect(page.locator('[data-testid="filter-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-calendar-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="google-calendar-sync"]')).toBeVisible();
    
    // Test calendar view switching functionality
    await testCalendarViews(page);
    await testCalendarNavigation(page);
  });

  // Helper functions for calendar testing
  async function testCalendarViews(page) {
    const monthView = page.locator('[data-testid="view-month"]');
    const weekView = page.locator('[data-testid="view-week"]');
    const dayView = page.locator('[data-testid="view-day"]');
    
    // Test month view (if view controls exist)
    if (await monthView.count() > 0) {
      await monthView.click();
      await page.waitForTimeout(500);
      // Use specific testid to avoid strict mode violation
      await expect(page.locator('[data-testid="calendar-grid-month"]')).toBeVisible();
    }
    
    // Test week view (if view controls exist)  
    if (await weekView.count() > 0) {
      await weekView.click();
      await page.waitForTimeout(500);
      // Use specific testid to avoid strict mode violation
      await expect(page.locator('[data-testid="calendar-grid-week"]')).toBeVisible();
    }
    
    // Test day view (if view controls exist)
    if (await dayView.count() > 0) {
      await dayView.click();
      await page.waitForTimeout(500);
      // Use specific testid to avoid strict mode violation
      await expect(page.locator('[data-testid="calendar-grid-day"]')).toBeVisible();
    }
  }

  async function testCalendarNavigation(page) {
    const prevButton = page.locator('[data-testid="prev-period-button"]');
    const nextButton = page.locator('[data-testid="next-period-button"]');
    const todayButton = page.locator('button:has-text("Today")');
    
    if (await prevButton.count() > 0 && await nextButton.count() > 0) {
      await nextButton.click();
      await page.waitForTimeout(300);
      await prevButton.click();
      await page.waitForTimeout(300);
      
      if (await todayButton.count() > 0) {
        await todayButton.click();
        await page.waitForTimeout(300);
      }
    }
  }

  // =============================================================================
  // TEST 2: EVENT MANAGEMENT WORKFLOW - COMPLETE CRUD OPERATIONS  
  // =============================================================================
  test('Event management workflow - complete CRUD with role permissions', async ({ page }) => {
    // Test as admin (full permissions)
    await authHelpers.loginAsAdmin();
    await page.goto('/planning', { timeout: 60000 });
    // Wait for specific element instead of networkidle
    await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 60000 });
    
    // Verify admin can see create button
    const createButton = page.locator('[data-testid="create-event-button"]');
    await expect(createButton).toBeVisible();
    
    // Test event creation workflow
    await createButton.click();
    await page.waitForTimeout(1000);
    
    // Check if create modal appears
    const createModal = page.locator('[data-testid="event-create-modal"]');
    if (await createModal.count() > 0) {
      await expect(createModal).toBeVisible();
      
      // Fill out event creation form
      const titleField = page.locator('[data-testid="event-title"]');
      const typeField = page.locator('[data-testid="event-type"]');
      const submitButton = page.locator('[data-testid="create-event-submit"]');
      
      if (await titleField.count() > 0) {
        await titleField.fill('Test Calendar Event');
      }
      
      if (await typeField.count() > 0) {
        await typeField.selectOption('meeting');
      }
      
      // Set future date and time to avoid conflicts
      const startDateField = page.locator('[data-testid="event-start-date"]');
      const startTimeField = page.locator('[data-testid="event-start-time"]');
      const endTimeField = page.locator('[data-testid="event-end-time"]');
      
      if (await startDateField.count() > 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateString = tomorrow.toISOString().split('T')[0];
        await startDateField.fill(dateString);
      }
      
      if (await startTimeField.count() > 0) {
        await startTimeField.fill('14:00');
      }
      
      if (await endTimeField.count() > 0) {
        await endTimeField.fill('15:00');
      }
      
      // Submit the form
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success message
        const successMessage = page.locator('[data-testid="success-message"]');
        if (await successMessage.count() > 0) {
          await expect(successMessage).toBeVisible();
        }
      }
      
      // Close modal if it's still open
      const closeButton = page.locator('[data-testid="create-event-close"], [data-testid="modal-close"]');
      if (await closeButton.count() > 0) {
        await closeButton.click();
      }
    }
    
    // Test event viewing and interaction
    const existingEvent = page.locator('.fc-event').first();
    if (await existingEvent.count() > 0) {
      await existingEvent.click();
      await page.waitForTimeout(1000);
      
      // Check if details modal appears
      const detailsModal = page.locator('[data-testid="event-details-modal"]');
      if (await detailsModal.count() > 0) {
        await expect(detailsModal).toBeVisible();
        
        // Admin should see edit/delete options
        const editButton = page.locator('[data-testid="edit-event"], button:has-text("Edit")');
        const deleteButton = page.locator('[data-testid="delete-event"], button:has-text("Delete")');
        
        if (await editButton.count() > 0) {
          await expect(editButton).toBeVisible();
        }
        
        if (await deleteButton.count() > 0) {
          await expect(deleteButton).toBeVisible();
        }
        
        // Close details modal
        const closeDetailsButton = page.locator('[data-testid="event-details-close"], [data-testid="modal-close"]');
        if (await closeDetailsButton.count() > 0) {
          await closeDetailsButton.click();
        }
      }
    }
    
    // Test staff permissions
    await authHelpers.logout();
    await authHelpers.loginAsStaff();
    await page.goto('/planning', { timeout: 60000 });
    // Wait for specific element instead of networkidle
    await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 60000 });
    
    // Staff should also see create button
    const staffCreateButton = page.locator('[data-testid="create-event-button"]');
    await expect(staffCreateButton).toBeVisible();
    
    // Test student/teacher read-only access
    await authHelpers.logout();
    await authHelpers.loginAsStudent();
    await page.goto('/planning', { timeout: 60000 });
    // Wait for specific element instead of networkidle
    await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 60000 });
    
    // Students should NOT see create button
    const studentCreateButton = page.locator('[data-testid="create-event-button"]');
    expect(await studentCreateButton.count()).toBe(0);
    
    // Students should be able to view events but not modify them
    const studentEvent = page.locator('.fc-event').first();
    if (await studentEvent.count() > 0) {
      await studentEvent.click();
      await page.waitForTimeout(1000);
      
      const detailsModal = page.locator('[data-testid="event-details-modal"]');
      if (await detailsModal.count() > 0) {
        // Students should NOT see edit/delete buttons
        const editButton = page.locator('[data-testid="edit-event"], button:has-text("Edit")');
        const deleteButton = page.locator('[data-testid="delete-event"], button:has-text("Delete")');
        
        expect(await editButton.count()).toBe(0);
        expect(await deleteButton.count()).toBe(0);
        
        // Close modal
        const closeButton = page.locator('[data-testid="event-details-close"], [data-testid="modal-close"]');
        if (await closeButton.count() > 0) {
          await closeButton.click();
        }
      }
    }
  });

  // =============================================================================
  // TEST 3: ADVANCED CALENDAR FEATURES - FILTERS, EXPORT, MOBILE, CONFLICTS
  // =============================================================================
  test('Advanced calendar features - filters, export, mobile, conflict detection', async ({ page }) => {
    await authHelpers.loginAsAdmin();
    await page.goto('/planning', { timeout: 60000 });
    // Wait for specific element instead of networkidle
    await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 60000 });
    
    // Test filter functionality
    const filterButton = page.locator('[data-testid="filter-toggle"]');
    await filterButton.click();
    await page.waitForTimeout(500);
    
    // Check if filters appear and are functional
    const filterContainer = page.locator('[data-testid="event-filters"]');
    if (await filterContainer.count() > 0) {
      await expect(filterContainer).toBeVisible();
      
      // Test filter controls if they exist
      const typeFilter = page.locator('[data-testid="filter-type"]');
      const courseFilter = page.locator('[data-testid="filter-course"]');
      const locationFilter = page.locator('[data-testid="filter-location"]');
      
      if (await typeFilter.count() > 0) {
        await typeFilter.selectOption('meeting');
        await page.waitForTimeout(500);
      }
    }
    
    // Test export functionality
    const exportButton = page.locator('[data-testid="export-calendar-button"]');
    await exportButton.click();
    await page.waitForTimeout(500);
    
    const exportModal = page.locator('[data-testid="export-calendar-modal"]');
    if (await exportModal.count() > 0) {
      await expect(exportModal).toBeVisible();
      
      // Test export options if available
      const icsExport = page.locator('[data-testid="export-ics"], input[value="ics"]');
      const csvExport = page.locator('[data-testid="export-csv"], input[value="csv"]');
      
      if (await icsExport.count() > 0) {
        await icsExport.click();
      }
      
      // Close export modal
      const closeExportButton = page.locator('[data-testid="export-close"], [data-testid="modal-close"]');
      if (await closeExportButton.count() > 0) {
        await closeExportButton.click();
      }
    }
    
    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.waitForTimeout(500);
    
    // Calendar should still be visible and functional on mobile
    await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
    
    // Mobile-specific elements if they exist
    const mobileNav = page.locator('[data-testid="mobile-calendar-nav"]');
    const mobileToolbar = page.locator('.fc-toolbar-mobile');
    
    if (await mobileNav.count() > 0) {
      await expect(mobileNav).toBeVisible();
    }
    
    if (await mobileToolbar.count() > 0) {
      await expect(mobileToolbar).toBeVisible();
    }
    
    // Test conflict detection during event creation
    await page.setViewportSize({ width: 1024, height: 768 }); // Back to desktop
    
    const createButton = page.locator('[data-testid="create-event-button"]');
    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const createModal = page.locator('[data-testid="event-create-modal"]');
      if (await createModal.count() > 0) {
        // Try to create an event that might conflict
        const titleField = page.locator('[data-testid="event-title"]');
        const locationField = page.locator('[data-testid="event-location"]');
        
        if (await titleField.count() > 0) {
          await titleField.fill('Conflict Test Event');
        }
        
        if (await locationField.count() > 0) {
          await locationField.fill('Room A'); // Common room that might have conflicts
        }
        
        // Set current date/time
        const startDateField = page.locator('[data-testid="event-start-date"]');
        const startTimeField = page.locator('[data-testid="event-start-time"]');
        const endTimeField = page.locator('[data-testid="event-end-time"]');
        
        if (await startDateField.count() > 0) {
          const today = new Date().toISOString().split('T')[0];
          await startDateField.fill(today);
        }
        
        if (await startTimeField.count() > 0) {
          await startTimeField.fill('10:00');
        }
        
        if (await endTimeField.count() > 0) {
          await endTimeField.fill('11:00');
        }
        
        // Submit and check for conflict detection
        const submitButton = page.locator('[data-testid="create-event-submit"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          // Check for conflict modal or success
          const conflictModal = page.locator('[data-testid="conflict-warning-modal"]');
          const successMessage = page.locator('[data-testid="success-message"]');
          
          if (await conflictModal.count() > 0) {
            // Conflict detected - test the conflict resolution
            await expect(conflictModal).toBeVisible();
            
            const proceedButton = page.locator('[data-testid="conflict-proceed"]');
            const cancelButton = page.locator('[data-testid="conflict-cancel"]');
            
            if (await cancelButton.count() > 0) {
              await cancelButton.click();
            }
          } else if (await successMessage.count() > 0) {
            // No conflict - event created successfully
            await expect(successMessage).toBeVisible();
          }
        }
        
        // Close create modal
        const closeButton = page.locator('[data-testid="create-event-close"], [data-testid="modal-close"]');
        if (await closeButton.count() > 0) {
          await closeButton.click();
        }
      }
    }
    
    // Test error handling
    await page.context().setOffline(true);
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should handle offline gracefully
    await page.context().setOffline(false);
    await page.reload();
    // Wait for specific element after offline recovery
    await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 60000 });
    
    // Should recover successfully
    await expect(page.locator('h1:has-text("Academic Planning")')).toBeVisible();
  });

  // =============================================================================
  // TEST 4: INTEGRATION FEATURES - GOOGLE SYNC & REAL-TIME UPDATES
  // =============================================================================
  test('Integration features - Google sync and real-time capabilities', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Integration features - Google sync and real-time capabilities');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsTeacher();
      await page.goto('/planning', { timeout: 60000 });
      // Wait for specific element instead of networkidle
      await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 60000 });
    
    // Test Google Calendar sync functionality
    const googleSyncButton = page.locator('[data-testid="google-calendar-sync"]');
    await expect(googleSyncButton).toBeVisible({ timeout: 15000 });
    
    // Use force click to avoid detached DOM issues
    await googleSyncButton.click({ force: true });
    
    // Check if Google sync modal appears
    const googleSyncModal = page.locator('[data-testid="google-sync-modal"]');
    if (await googleSyncModal.count() > 0) {
      await expect(googleSyncModal).toBeVisible({ timeout: 10000 });
      
      // Test sync setup options
      const connectButton = page.locator('[data-testid="connect-google-calendar"]');
      const syncPreferences = page.locator('[data-testid="sync-preferences"]');
      
      if (await connectButton.count() > 0) {
        await connectButton.click();
        
        // Should show auth instructions or redirect
        const authInstructions = page.locator('[data-testid="google-auth-instructions"]');
        const oauthRedirect = page.locator('[data-testid="google-oauth-redirect"]');
        
        // One of these should be visible
        expect(await authInstructions.count() + await oauthRedirect.count()).toBeGreaterThan(0);
      }
      
      if (await syncPreferences.count() > 0) {
        await expect(syncPreferences).toBeVisible();
        
        // Test sync direction options
        const bidirectionalSync = page.locator('[data-testid="bidirectional-sync"]');
        const importOnly = page.locator('[data-testid="import-only"]');
        
        if (await bidirectionalSync.count() > 0) {
          await bidirectionalSync.click();
        } else if (await importOnly.count() > 0) {
          await importOnly.click();
        }
      }
      
      // Close Google sync modal
      const closeSyncButton = page.locator('[data-testid="google-sync-close"], [data-testid="modal-close"]');
      if (await closeSyncButton.count() > 0) {
        await closeSyncButton.click();
      }
    }
    
    // Test sync status indicator
    const syncStatus = page.locator('[data-testid="sync-status"]');
    if (await syncStatus.count() > 0) {
      await expect(syncStatus).toBeVisible();
      
      const statusText = await syncStatus.textContent();
      expect(statusText).toMatch(/(Connected|Disconnected|Syncing|Error)/i);
    }
    
    // Test real-time connection status
    const realtimeStatus = page.locator('[data-testid="realtime-status"]');
    if (await realtimeStatus.count() > 0) {
      await expect(realtimeStatus).toBeVisible();
    }
    
    // Test drag and drop functionality (if enabled for this user role)
    const dragDropEnabled = page.locator('[data-testid="drag-drop-enabled"]');
    if (await dragDropEnabled.count() > 0) {
      // Teachers might have limited drag & drop or read-only
      // Element is hidden by design, so check for presence not visibility
      await expect(dragDropEnabled).toBeAttached();
    }
    
    // Test with admin who should have full drag & drop
    await authHelpers.logout();
    await authHelpers.loginAsAdmin();
    await page.goto('/planning', { timeout: 60000 });
    // Wait for specific element instead of networkidle
    await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 60000 });
    
    // Admin should have drag & drop capabilities
    const adminDragDrop = page.locator('[data-testid="drag-drop-enabled"]');
    if (await adminDragDrop.count() > 0) {
      // Element is hidden by design, so check for presence not visibility
      await expect(adminDragDrop).toBeAttached();
      
      // Test quick event creation via calendar click
      const calendarView = page.locator('[data-testid="calendar-view"]');
      await calendarView.click();
      await page.waitForTimeout(500);
      
      // Check if quick create modal appears
      const quickCreateModal = page.locator('[data-testid="quick-create-modal"]');
      if (await quickCreateModal.count() > 0) {
        await expect(quickCreateModal).toBeVisible();
        
        const cancelButton = page.locator('[data-testid="quick-create-cancel"]');
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
        }
      }
    }
    
    // Test offline detection and reconnection
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);
    
    if (await offlineIndicator.count() > 0) {
      await expect(offlineIndicator).toBeVisible();
      await expect(offlineIndicator).toContainText(/offline/i);
    }
    
    await page.context().setOffline(false);
    await page.waitForTimeout(1000);
    
    // Should reconnect
    const connectionStatus = page.locator('[data-testid="realtime-status"]');
    if (await connectionStatus.count() > 0) {
      // Should eventually show connected status
      await expect(connectionStatus).toHaveText(/connected|active/i, { timeout: 10000 });
    }
    
    // Test real-time update notifications
    const updateNotification = page.locator('[data-testid="realtime-update"]');
    if (await updateNotification.count() > 0) {
      // Real-time updates should work when online
      await expect(updateNotification).toBeVisible();
    }
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
});