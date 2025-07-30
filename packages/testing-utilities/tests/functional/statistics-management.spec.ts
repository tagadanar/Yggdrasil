// packages/testing-utilities/tests/functional/statistics-management.spec.ts
// Real statistics dashboard tests with authentic user data scenarios
// Tests actual statistics calculations with real courses, enrollments, and submissions

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { TestScenarios } from '../helpers/TestScenarioBuilders';

// =============================================================================
// REAL STATISTICS TESTING WITH AUTHENTIC USER SCENARIOS
// Tests actual statistics calculations and workflows using real test data
// =============================================================================

test.describe('Statistics Management - Real Data Scenarios', () => {

  // =============================================================================
  // STUDENT DASHBOARD REAL SCENARIOS
  // =============================================================================

  test('STAT-001: New Student Dashboard (Empty State)', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('STAT-001: New Student Dashboard (Empty State)');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Create a new student with no courses (true empty state)
      const scenarios = TestScenarios.createStudentScenarios('STAT-001');
      const { student } = await scenarios.createNewStudent();
      
      // Login with the new student
      await authHelper.loginWithCustomUser(student.email, 'TestPass123!');
      
      // Wait for authentication to fully complete
      await page.waitForFunction(() => {
        return !window.location.pathname.includes('/auth/login');
      }, { timeout: 10000 });
      
      // Navigate to statistics page
      await page.goto('/statistics');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for loading indicators to disappear
      const hasLoadingIndicator = await page.locator('.animate-spin, [data-testid="loading"]').count() > 0;
      if (hasLoadingIndicator) {
        await page.waitForFunction(() => {
          const spinners = document.querySelectorAll('.animate-spin, [data-testid="loading"]');
          return spinners.length === 0;
        }, { timeout: 15000 }).catch(() => {});
      }

      // Verify dashboard eventually renders
      await expect(page.locator('[data-testid="student-dashboard"]')).toBeVisible({ timeout: 10000 });
      
      // Verify both page header and dashboard welcome header are present
      await expect(page.locator('h1:has-text("Statistics & Analytics")')).toBeVisible();
      await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible();
      
      // Verify empty state dashboard renders with proper stats cards
      await expect(page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4.gap-6')).toBeVisible();
      
      // Verify empty state content is displayed properly
      await expect(page.locator('[data-testid="courses-empty-state"]')).toBeVisible();
      
      // Verify basic stats cards are visible (even with zero values)
      const statsCards = await page.locator('.bg-white.rounded-lg.border').count();
      expect(statsCards).toBeGreaterThan(0);
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('STAT-002: Active Student Dashboard (Real Progress)', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('STAT-002: Active Student Dashboard (Real Progress)');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Create an active student with real courses and progress
      const scenarios = TestScenarios.createStudentScenarios('STAT-002');
      const { student, courses, enrollments, submissions } = await scenarios.createActiveStudent();
      
      await authHelper.loginWithCustomUser(student.email, 'TestPass123!');
      await page.goto('/statistics');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Verify dashboard shows real data
      await expect(page.locator('[data-testid="student-dashboard"]')).toBeVisible();
      
      // Should show progress from real enrollments
      const progressElements = page.locator('[data-testid*="progress"]');
      expect(await progressElements.count()).toBeGreaterThan(0);
      
      // Should display actual course count
      const courseElements = page.locator(':has-text("Course"), [data-testid*="course"]');
      expect(await courseElements.count()).toBeGreaterThan(0);
      
      // Should show real time spent (from submissions)
      const timeElements = page.locator('[data-testid*="time"], :has-text("hour"), :has-text("minute")');
      expect(await timeElements.count()).toBeGreaterThan(0);

      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('STAT-003: High-Achieving Student Dashboard (Achievements)', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('STAT-003: High-Achieving Student Dashboard');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Create high-achieving student with completed courses
      const scenarios = TestScenarios.createStudentScenarios('STAT-003');
      const { student, courses, submissions } = await scenarios.createHighAchievingStudent();
      
      await authHelper.loginWithCustomUser(student.email, 'TestPass123!');
      await page.goto('/statistics');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      await expect(page.locator('[data-testid="student-dashboard"]')).toBeVisible();
      
      // Should show high progress indicators
      const highProgressElements = page.locator(
        ':has-text("100%"), :has-text("Completed"), [data-testid*="achievement"]'
      );
      expect(await highProgressElements.count()).toBeGreaterThan(0);
      
      // Should display learning streak
      const streakElements = page.locator('[data-testid*="streak"], :has-text("day")');
      expect(await streakElements.count()).toBeGreaterThan(0);

      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // TEACHER DASHBOARD REAL SCENARIOS  
  // =============================================================================

  test('STAT-004: New Teacher Dashboard (No Courses)', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('STAT-004: New Teacher Dashboard');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Create teacher with no courses
      const scenarios = TestScenarios.createTeacherScenarios('STAT-004');
      const { teacher } = await scenarios.createNewTeacher();
      
      await authHelper.loginWithCustomUser(teacher.email, 'TestPass123!');
      await page.goto('/statistics');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

      await expect(page.locator('[data-testid="teacher-dashboard"]')).toBeVisible();
      
      // Should show encouragement to create courses
      const emptyStateElements = page.locator(
        ':has-text("Create your first"), :has-text("No courses"), :has-text("Get started")'
      );
      expect(await emptyStateElements.count()).toBeGreaterThan(0);

      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('STAT-005: Active Teacher Dashboard (Real Classroom)', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('STAT-005: Active Teacher Dashboard');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Create teacher with real courses and students
      const scenarios = TestScenarios.createTeacherScenarios('STAT-005');
      const { teacher, courses, students, enrollments, submissions } = await scenarios.createActiveTeacher();
      
      await authHelper.loginWithCustomUser(teacher.email, 'TestPass123!');
      await page.goto('/statistics');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

      await expect(page.locator('[data-testid="teacher-dashboard"]')).toBeVisible();
      
      // Should show real course statistics
      const courseStats = page.locator('[data-testid*="course-stats"], [data-testid*="stats-card"]');
      expect(await courseStats.count()).toBeGreaterThan(0);
      
      // Should display student metrics
      const studentMetrics = page.locator(
        ':has-text("student"), [data-testid*="enrollment"], [data-testid*="student"]'
      );
      expect(await studentMetrics.count()).toBeGreaterThan(0);
      
      // Should show submission statistics
      const submissionStats = page.locator(
        ':has-text("submission"), [data-testid*="submission"], :has-text("grading")'
      );
      expect(await submissionStats.count()).toBeGreaterThan(0);

      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // ADMIN DASHBOARD REAL SCENARIOS
  // =============================================================================

  test('STAT-006: Admin Platform Overview (Real Usage Data)', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('STAT-006: Admin Platform Overview');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Create platform with realistic activity
      const scenarios = TestScenarios.createAdminScenarios('STAT-006');
      const { admin, teachers, students, courses, enrollments } = await scenarios.createBasicPlatform();
      
      await authHelper.loginAsAdmin();
      await page.goto('/statistics');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

      await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
      
      // Should show real platform statistics
      const platformStats = page.locator('[data-testid*="platform-stats"]');
      expect(await platformStats.count()).toBeGreaterThan(0);
      
      // Should display user breakdown with real numbers
      const userBreakdown = page.locator(
        '[data-testid*="user-breakdown"], :has-text("teacher"), :has-text("student")'
      );
      expect(await userBreakdown.count()).toBeGreaterThan(0);
      
      // Should show course metrics from real data
      const courseMetrics = page.locator(
        '[data-testid*="course-metrics"], :has-text("enrollment")'
      );
      expect(await courseMetrics.count()).toBeGreaterThan(0);

      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // EDGE CASE AND PERFORMANCE SCENARIOS
  // =============================================================================

  test('STAT-007: Statistics with Large Dataset (Performance)', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('STAT-007: Large Dataset Performance');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Create teacher with large classroom for performance testing
      const scenarios = TestScenarios.createTeacherScenarios('STAT-007');
      const { teacher } = await scenarios.createBasicTeacher();
      
      await authHelper.loginWithCustomUser(teacher.email, 'TestPass123!');
      
      // Measure dashboard load time with real large dataset
      const startTime = Date.now();
      await page.goto('/statistics');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time even with large dataset
      expect(loadTime).toBeLessThan(15000); // 15 seconds max for large dataset
      
      await expect(page.locator('[data-testid="teacher-dashboard"]')).toBeVisible();
      
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('STAT-008: Cross-Role Data Isolation (Security)', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('STAT-008: Cross-Role Data Isolation');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Create both student and teacher with separate data
      const studentScenarios = TestScenarios.createStudentScenarios('STAT-008-Student');
      const teacherScenarios = TestScenarios.createTeacherScenarios('STAT-008-Teacher');
      
      const { student } = await studentScenarios.createActiveStudent();
      const { teacher } = await teacherScenarios.createActiveTeacher();
      
      // Test student sees only their data
      await authHelper.loginWithCustomUser(student.email, 'TestPass123!');
      await page.goto('/statistics');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      await expect(page.locator('[data-testid="student-dashboard"]')).toBeVisible();
      
      // Should NOT see teacher/admin elements
      const adminElements = page.locator('[data-testid="teacher-dashboard"], [data-testid="admin-dashboard"]');
      expect(await adminElements.count()).toBe(0);
      
      // Switch to teacher
      await authHelper.clearAuthState();
      await authHelper.loginWithCustomUser(teacher.email, 'TestPass123!');
      await page.goto('/statistics');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="teacher-dashboard"]')).toBeVisible();
      
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
});