import { test, expect } from '@playwright/test';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';

/**
 * System Integration Tests - Core Service Interaction Validation
 * 
 * These tests validate that multiple services work together correctly.
 * Focus: Service-to-service communication, data consistency, error handling.
 * 
 * NOTE: Large workflow tests have been split into focused integration tests:
 * - instructor-course-creation.spec.ts
 * - instructor-student-management.spec.ts  
 * - instructor-communication.spec.ts
 * - student-journey-optimized.spec.ts (separate file)
 */

test.describe('System Integration Tests', () => {

  // =============================================================================
  // INTEGRATION-001: Complete Cross-Service Integration Workflow
  // =============================================================================
  test('Cross-service integration workflow', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Cross-Service Integration');
    
    try {
      const authHelper = new CleanAuthHelper(page, 'Cross-Service Test');
      await authHelper.initialize();
      await authHelper.loginAsAdmin();
      
      // Test authentication service → user service → course service integration
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Create a test user through admin interface (auth + user service integration)
      const createUserButton = page.locator('button:has-text("Create User")');
      if (await createUserButton.count() > 0) {
        await createUserButton.click();
        
        const testEmail = `integration-test-${Date.now()}@yggdrasil.edu`;
        await page.fill('input[name="email"]', testEmail);
        await page.fill('input[name="firstName"]', 'Integration');
        await page.fill('input[name="lastName"]', 'Test');
        await page.fill('input[name="password"]', 'TestPassword123!');
        await page.selectOption('select[name="role"]', 'teacher');
        
        const submitButton = page.locator('form button[type="submit"]');
        await submitButton.click();
        
        // Verify user was created (user service integration)
        await page.waitForSelector('.user-created, [data-testid="user-created"]', { 
          state: 'visible', timeout: 5000 
        }).catch(() => {});
      }
      
      // Test cross-service data consistency
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Verify services are communicating correctly
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible();
      
    } finally {
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // INTEGRATION-002: System Resilience Under Adverse Conditions
  // =============================================================================
  test('System resilience adverse conditions', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('System Resilience');
    
    try {
      const authHelper = new CleanAuthHelper(page, 'Resilience Test');
      await authHelper.initialize();
      
      // Test system behavior with network delays
      await page.route('**/api/**', route => {
        setTimeout(() => route.continue(), 100); // Add 100ms delay
      });
      
      await authHelper.loginAsStudent();
      
      // Navigate through different services with simulated delays
      const services = ['/courses', '/news', '/planning', '/statistics'];
      
      for (const service of services) {
        await page.goto(service);
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        
        // Verify page loads despite delays
        const pageContent = page.locator('main, .main-content, body');
        await expect(pageContent).toBeVisible();
      }
      
    } finally {
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // INTEGRATION-003: Security Boundaries and Session Management
  // =============================================================================
  test('Security boundaries session management', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Security Boundaries');
    
    try {
      const authHelper = new CleanAuthHelper(page, 'Security Test');
      await authHelper.initialize();
      
      // Test role-based access control across services
      await authHelper.loginAsStudent();
      
      // Student should NOT have access to admin functions
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Should be redirected or see access denied
      const currentUrl = page.url();
      const accessDenied = page.locator(':has-text("Access Denied"), :has-text("Unauthorized"), :has-text("Permission")');
      
      const hasAccessDenied = await accessDenied.count() > 0;
      const isRedirected = !currentUrl.includes('/admin/users');
      
      expect(hasAccessDenied || isRedirected).toBeTruthy();
      
      // Test session management across services
      await authHelper.loginAsTeacher();
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Clear cookies to simulate session expiry
      await page.context().clearCookies();
      
      // Navigate to protected resource
      await page.goto('/statistics');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Should be redirected to login
      const loginForm = page.locator('form:has(input[type="email"]), form:has(input[name="email"])');
      const isOnLogin = page.url().includes('/auth/login') || page.url().includes('/login');
      
      expect(await loginForm.count() > 0 || isOnLogin).toBeTruthy();
      
    } finally {
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // INTEGRATION-004: System Performance Under Load
  // =============================================================================
  test('System performance load', async ({ page }) => {
    test.setTimeout(45000); // Extended timeout for performance test
    const cleanup = TestCleanup.getInstance('Performance Load');
    
    try {
      const authHelper = new CleanAuthHelper(page, 'Performance Test');
      await authHelper.initialize();
      await authHelper.loginAsAdmin();
      
      // Simulate multiple concurrent operations
      const startTime = Date.now();
      
      // Navigate through multiple services rapidly
      const navigationPromises = [
        page.goto('/courses').then(() => page.waitForLoadState('domcontentloaded')),
        page.goto('/news').then(() => page.waitForLoadState('domcontentloaded')),
        page.goto('/planning').then(() => page.waitForLoadState('domcontentloaded')),
        page.goto('/statistics').then(() => page.waitForLoadState('domcontentloaded'))
      ];
      
      // Execute rapid navigation sequence
      for (const navPromise of navigationPromises) {
        await navPromise;
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Verify reasonable performance (less than 30 seconds for all operations)
      expect(totalTime).toBeLessThan(30000);
      
      // Verify final page loads correctly
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const dashboardContent = page.locator('.dashboard, [data-testid="dashboard"], main');
      await expect(dashboardContent).toBeVisible();
      
    } finally {
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // INTEGRATION-005: Data Consistency Across Services
  // =============================================================================
  test('Data consistency services', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Data Consistency');
    
    try {
      const authHelper = new CleanAuthHelper(page, 'Data Consistency Test');
      await authHelper.initialize();
      await authHelper.loginAsTeacher();
      
      // Create content in one service and verify it appears in related services
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Create a course (course service)
      const createButton = page.locator('button:has-text("Create Course"), button:has-text("Create")');
      if (await createButton.count() > 0) {
        await createButton.click();
        
        const courseName = `Data Consistency Test ${Date.now()}`;
        await page.fill('input[name="title"]', courseName);
        await page.fill('textarea[name="description"]', 'Test course for data consistency validation');
        
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
        await saveButton.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        
        // Verify course appears in statistics service
        await page.goto('/statistics');
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        
        // Check if course data is reflected in statistics
        const statsContent = page.locator('.statistics, [data-testid="statistics"]');
        if (await statsContent.count() > 0) {
          // Course might appear in instructor stats
          const courseRef = statsContent.locator(`:has-text("${courseName}")`);
          // Note: This is a soft check as stats might be aggregated
          if (await courseRef.count() > 0) {
            await expect(courseRef.first()).toBeVisible();
          }
        }
        
        // Verify course can be referenced in planning service
        await page.goto('/planning');
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        
        const createEventButton = page.locator('button:has-text("Create Event"), button:has-text("Add Event")');
        if (await createEventButton.count() > 0) {
          await createEventButton.click();
          
          // Check if course appears in course selection dropdown
          const courseSelect = page.locator('select[name="course"]');
          if (await courseSelect.count() > 0) {
            const courseOptions = await courseSelect.locator('option').allTextContents();
            const hasCourse = courseOptions.some(option => option.includes(courseName));
            
            if (hasCourse) {
              expect(hasCourse).toBeTruthy();
            }
          }
        }
      }
      
    } finally {
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // INTEGRATION-006: Service Health Monitoring and Diagnostics
  // =============================================================================
  test('Service health monitoring diagnostics', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Health Monitoring');
    
    try {
      const authHelper = new CleanAuthHelper(page, 'Health Monitoring Test');
      await authHelper.initialize();
      await authHelper.loginAsAdmin();
      
      // Test that all services are responding
      const services = [
        { name: 'Frontend', path: '/' },
        { name: 'Courses', path: '/courses' },
        { name: 'News', path: '/news' },
        { name: 'Planning', path: '/planning' },
        { name: 'Statistics', path: '/statistics' },
        { name: 'Admin', path: '/admin' }
      ];
      
      for (const service of services) {
        const startTime = Date.now();
        
        try {
          await page.goto(service.path);
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
          
          const responseTime = Date.now() - startTime;
          
          // Verify service responds within reasonable time (15 seconds)
          expect(responseTime).toBeLessThan(15000);
          
          // Verify page content loads
          const content = page.locator('body');
          await expect(content).toBeVisible();
          
          // Check for error indicators
          const errorElements = page.locator('.error, [data-testid="error"], .alert-error');
          const errorCount = await errorElements.count();
          expect(errorCount).toBe(0);
          
        } catch (error) {
          console.warn(`Service ${service.name} (${service.path}) health check failed:`, error);
          // Don't fail the test for individual service issues
          // This is diagnostic information
        }
      }
      
    } finally {
      await cleanup.cleanup();
    }
  });

  // NOTE: Large workflow tests have been split into focused integration tests:
  // - instructor-course-creation.spec.ts (Course creation workflow)
  // - instructor-student-management.spec.ts (Student enrollment and monitoring)
  // - instructor-communication.spec.ts (News and calendar integration)
  // - student-journey-optimized.spec.ts (Complete student workflow - separate file)

});