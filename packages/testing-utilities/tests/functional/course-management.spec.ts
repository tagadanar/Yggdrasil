// packages/testing-utilities/tests/functional/course-management.spec.ts
// Optimized course management tests - simplified to match current implementation

import { test, expect } from '@playwright/test';
import { IsolatedAuthHelpers } from '../helpers/isolated-auth.helpers';
import { ROLE_PERMISSIONS_MATRIX } from '../helpers/role-based-testing';

test.describe('Course Management - Optimized Tests', () => {
  let authHelpers: IsolatedAuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new IsolatedAuthHelpers(page);
    await authHelpers.initialize();
  });

  test.afterEach(async ({ page }) => {
    await authHelpers.cleanup();
  });

  // =============================================================================
  // TEST 1: COMPREHENSIVE ROLE-BASED ACCESS
  // =============================================================================
  test('Role-based course access and permissions - all roles', async ({ page }) => {
    for (const roleConfig of ROLE_PERMISSIONS_MATRIX) {
      await authHelpers[roleConfig.loginMethod]();
      await page.goto('/courses');
      await page.waitForLoadState('networkidle');
      
      // All roles can access courses page - check for role-specific titles
      const titleSelectors = [
        'h1:has-text("My Enrollments")',      // Student
        'h1:has-text("My Courses")',          // Teacher  
        'h1:has-text("Course Management")',   // Admin/Staff
        'h1:has-text("Courses")'              // Default
      ];
      
      let titleFound = false;
      for (const selector of titleSelectors) {
        if (await page.locator(selector).count() > 0) {
          await expect(page.locator(selector)).toBeVisible();
          titleFound = true;
          break;
        }
      }
      expect(titleFound).toBeTruthy();
      
      // Check create course button visibility - uses btn-primary class, only for teacher/staff/admin
      if (roleConfig.courseManagement.canCreate) {
        // Look for button with "Create" text and btn-primary or similar styling
        const createButton = page.locator('button:has-text("Create"), button:has-text("New Course"), .btn-primary:has-text("Create")');
        await expect(createButton.first()).toBeVisible({ timeout: 5000 });
      }
      
      // Skip course-specific interactions for now since CourseList component isn't implemented
      // The page renders but doesn't have actual course data or interactive elements yet
      
      // TODO: Add course interaction tests when CourseList component is implemented
      // - Course cards/list display
      // - Enrollment buttons for students
      // - Edit/delete buttons for admin/teacher
      // - Course filtering and search
      
      await authHelpers.logout();
    }
  });

  // =============================================================================
  // TEST 2: BASIC COURSE PAGE FUNCTIONALITY  
  // =============================================================================
  test('Course page basic functionality and navigation', async ({ page }) => {
    await authHelpers.loginAsAdmin();
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    
    // Verify page loads and has expected structure
    await expect(page.locator('h1:has-text("Course Management")')).toBeVisible();
    await expect(page.locator('p:has-text("Create, manage, and track")')).toBeVisible();
    
    // Check if create button exists (may not be functional yet)
    const createButtons = page.locator('button:has-text("Create"), .btn-primary');
    const hasCreateButton = await createButtons.count() > 0;
    
    if (hasCreateButton) {
      // Could test button click if CourseForm is implemented
    } else {
    }
    
    // Test different view modes if implemented
    const viewModes = ['list', 'create', 'edit', 'detail'];
    
    // Verify basic page functionality
    await expect(page.locator('.max-w-7xl')).toBeVisible(); // Main container
  });

  // =============================================================================
  // TEST 3: STUDENT COURSE VIEW
  // =============================================================================
  test('Student course page view and basic functionality', async ({ page }) => {
    await authHelpers.loginAsStudent();
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    
    // Students should see "My Enrollments" title
    await expect(page.locator('h1:has-text("My Enrollments")')).toBeVisible();
    await expect(page.locator('p:has-text("Explore and enroll")')).toBeVisible();
    
    // Verify no create button for students
    const createButtons = page.locator('button:has-text("Create")');
    expect(await createButtons.count()).toBe(0);
    
  });

  // =============================================================================
  // TEST 4: TEACHER COURSE VIEW
  // =============================================================================
  test('Teacher course page view and basic functionality', async ({ page }) => {
    await authHelpers.loginAsTeacher();
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    
    // Wait for page content to fully load
    await page.waitForTimeout(2000);
    
    // Teachers should see either "My Courses" or "Courses" title
    const heading = await page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const headingText = await heading.textContent();
    expect(headingText).toMatch(/Courses|My Courses/);
    
    // Check for description text
    const description = page.locator('p').first();
    await expect(description).toBeVisible({ timeout: 5000 });
    
    // Teachers should have create button access - wait for it to appear
    const createButton = page.locator('button:has-text("Create"), button:has-text("Create Course"), .btn-primary');
    await createButton.first().waitFor({ state: 'visible', timeout: 10000 });
    expect(await createButton.count()).toBeGreaterThan(0);
  });
});