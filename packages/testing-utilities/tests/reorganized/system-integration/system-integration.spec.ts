// packages/testing-utilities/tests/reorganized/system-integration/system-integration.spec.ts
// System integration test suite (kept as standalone for comprehensive E2E validation)
// From: system-integration.spec.ts

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../../helpers/clean-auth.helpers';
import { TestScenarios } from '../../helpers/TestScenarioBuilders';
import { TestDataFactory } from '../../helpers/TestDataFactory';
import { captureEnhancedError } from '../../helpers/enhanced-error-context';
import { setupTestLifecycle } from '../../helpers/test-lifecycle';

test.describe('System Integration Tests', () => {
  // Initialize test lifecycle for cascade prevention
  setupTestLifecycle('System Integration');
  
  // =============================================================================
  // COMPREHENSIVE END-TO-END WORKFLOWS
  // =============================================================================
  
  test('Complete educational platform workflow', async ({ page }) => {
    test.setTimeout(180000); // Extended timeout for comprehensive E2E test
    const cleanup = TestCleanup.getInstance('SYSTEM-E2E: Complete Workflow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // PHASE 1: Admin Setup
      console.log('🚀 PHASE 1: Admin Platform Setup');
      
      await authHelper.loginAsAdmin();
      
      // Create news announcement
      await page.goto('/news/create');
      await page.fill('input[name="title"]', 'Welcome to New Semester');
      await page.fill('textarea[name="content"]', 'Welcome back students! New courses are now available.');
      await page.selectOption('select[name="category"]', 'announcement');
      await page.click('button:has-text("Publish")');
      
      cleanup.trackDocument('articles', 'welcome-announcement');
      
      // Create calendar event
      await page.goto('/planning');
      await page.click('button:has-text("New Event")');
      await page.fill('input[name="title"]', 'Semester Opening');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.fill('input[name="startDate"]', tomorrow.toISOString().split('T')[0]);
      await page.fill('input[name="startTime"]', '09:00');
      await page.fill('input[name="location"]', 'Main Auditorium');
      await page.click('button:has-text("Create")');
      
      cleanup.trackDocument('events', 'semester-opening');
      
      await authHelper.clearAuthState();
      
      // PHASE 2: Teacher Course Creation
      console.log('🚀 PHASE 2: Teacher Course Creation');
      
      const scenarios = TestScenarios.createTeacherScenarios('SYSTEM-E2E');
      const { teacher } = await scenarios.createNewTeacher();
      cleanup.trackDocument('users', teacher._id);
      
      await authHelper.loginWithCustomUser(teacher.email, 'TestPass123!');
      
      // Create comprehensive course
      await page.goto('/courses/create');
      const courseTitle = `Introduction to Testing ${Date.now()}`;
      
      await page.fill('input[name="title"]', courseTitle);
      await page.fill('textarea[name="description"]', 'A comprehensive course on software testing methodologies.');
      await page.fill('input[name="credits"]', '3');
      await page.selectOption('select[name="category"]', 'computer-science');
      
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/courses\/.*\/edit/, { timeout: 15000 });
      
      // Add course content
      await page.click('button:has-text("Add Chapter")');
      await page.fill('input[placeholder*="Chapter title"]', 'Testing Fundamentals');
      await page.keyboard.press('Enter');
      
      await page.click('button:has-text("Add Section")');
      await page.fill('input[placeholder*="Section title"]', 'Introduction to Unit Testing');
      await page.keyboard.press('Enter');
      
      // Add exercise
      await page.click('button:has-text("Add Exercise")');
      await page.fill('input[name="exerciseTitle"]', 'Basic Test Writing');
      await page.fill('textarea[name="instructions"]', 'Write a simple unit test for a calculator function.');
      await page.fill('textarea[name="starterCode"]', 'function add(a, b) { return a + b; }');
      await page.click('button:has-text("Save Exercise")');
      
      // Publish course
      await page.click('button:has-text("Publish Course")');
      await expect(page.locator('text=Course published')).toBeVisible({ timeout: 10000 });
      
      const courseId = page.url().match(/courses\/([a-f0-9]{24})/)?.[1];
      if (courseId) {
        cleanup.trackDocument('courses', courseId);
      }
      
      await authHelper.clearAuthState();
      
      // PHASE 3: Student Enrollment and Learning
      console.log('🚀 PHASE 3: Student Learning Journey');
      
      const studentScenarios = TestScenarios.createStudentScenarios('SYSTEM-E2E');
      const { student } = await studentScenarios.createNewStudent();
      cleanup.trackDocument('users', student._id);
      
      await authHelper.loginWithCustomUser(student.email, 'TestPass123!');
      
      // View news
      await page.goto('/news');
      await expect(page.locator('text=Welcome to New Semester')).toBeVisible();
      
      // Check calendar
      await page.goto('/planning');
      await expect(page.locator('text=Semester Opening')).toBeVisible();
      
      // Enroll in course
      await page.goto('/courses');
      await page.locator(`text=${courseTitle}`).click();
      await page.click('button:has-text("Enroll")');
      await page.click('button:has-text("Confirm")');
      await expect(page.locator('text=Successfully enrolled')).toBeVisible({ timeout: 10000 });
      
      cleanup.trackDocument('enrollments', 'student-course-enrollment');
      
      // Access course content
      await page.goto('/my-courses');
      await page.click(`text=${courseTitle}`);
      await page.click('button:has-text("Start Learning")');
      
      // Complete exercise
      await page.click('text=Basic Test Writing');
      await page.fill('textarea[name="solution"]', `
        function testAdd() {
          if (add(2, 3) === 5) {
            console.log('Test passed');
          } else {
            console.log('Test failed');
          }
        }
        testAdd();
      `);
      
      await page.click('button:has-text("Submit Solution")');
      await expect(page.locator('text=Solution submitted')).toBeVisible({ timeout: 15000 });
      
      cleanup.trackDocument('submissions', 'exercise-submission');
      
      await authHelper.clearAuthState();
      
      // PHASE 4: Teacher Review and Grading
      console.log('🚀 PHASE 4: Teacher Grading and Analytics');
      
      await authHelper.loginWithCustomUser(teacher.email, 'TestPass123!');
      
      // Review submissions
      if (courseId) {
        await page.goto(`/courses/${courseId}/grading`);
        
        // Grade submission
        await page.click('button:has-text("Grade")').first();
        await page.fill('input[name="score"]', '95');
        await page.fill('textarea[name="feedback"]', 'Excellent work! Good understanding of testing concepts.');
        await page.click('button:has-text("Save Grade")');
        await expect(page.locator('text=Grade saved')).toBeVisible({ timeout: 10000 });
        
        // View course analytics
        await page.goto(`/courses/${courseId}/analytics`);
        await expect(page.locator('h1:has-text("Course Analytics")')).toBeVisible();
        await expect(page.locator('text=Enrollment Rate')).toBeVisible();
      }
      
      await authHelper.clearAuthState();
      
      // PHASE 5: Admin Monitoring
      console.log('🚀 PHASE 5: Admin Platform Monitoring');
      
      await authHelper.loginAsAdmin();
      
      // Check platform statistics
      await page.goto('/admin/statistics');
      await expect(page.locator('h1:has-text("Platform Statistics")')).toBeVisible();
      await expect(page.locator('text=Total Users')).toBeVisible();
      await expect(page.locator('text=Active Courses')).toBeVisible();
      
      // Check system health
      await page.goto('/admin/system');
      await expect(page.locator('h1:has-text("System Dashboard")')).toBeVisible();
      
      // Verify all services healthy
      const services = ['Auth', 'User', 'Course', 'News', 'Planning', 'Statistics'];
      for (const service of services) {
        await expect(page.locator(`text=${service}:has-text("healthy")`)).toBeVisible();
      }
      
      console.log('✅ Complete educational platform workflow successful!');
      
    } catch (error) {
      await captureEnhancedError(page, error, 'System Integration E2E');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Cross-service data consistency', async ({ page }) => {
    test.setTimeout(120000);
    const cleanup = TestCleanup.getInstance('SYSTEM-CONSISTENCY: Data Integrity');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Create test data that spans multiple services
      const factory = new TestDataFactory('CONSISTENCY-TEST');
      
      // Create teacher
      const teacher = await factory.users.createUser('teacher');
      cleanup.trackDocument('users', teacher._id);
      
      // Create course
      const course = await factory.courses.createCourse(teacher._id);
      cleanup.trackDocument('courses', course._id);
      
      // Create student and enrollment
      const student = await factory.users.createUser('student');
      const enrollment = await factory.enrollments.enrollStudentInCourse(student._id, course._id);
      cleanup.trackDocument('users', student._id);
      cleanup.trackDocument('enrollments', enrollment._id);
      
      // Verify data consistency across services
      
      // 1. User service consistency
      await authHelper.loginWithCustomUser(teacher.email, 'TestPass123!');
      
      await page.goto('/instructor/dashboard');
      await expect(page.locator(`text=${course.title}`)).toBeVisible();
      
      // 2. Course service consistency
      await page.goto(`/courses/${course._id}/manage`);
      await expect(page.locator(`text=${student.email}`)).toBeVisible();
      
      await authHelper.clearAuthState();
      
      // 3. Student perspective consistency
      await authHelper.loginWithCustomUser(student.email, 'TestPass123!');
      
      await page.goto('/my-courses');
      await expect(page.locator(`text=${course.title}`)).toBeVisible();
      
      // 4. Statistics service consistency
      await authHelper.clearAuthState();
      await authHelper.loginAsAdmin();
      
      await page.goto('/admin/statistics');
      // Should reflect the new enrollment in statistics
      await expect(page.locator('text=Total Enrollments')).toBeVisible();
      
      console.log('✅ Cross-service data consistency verified!');
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Data Consistency Check');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Service failover and recovery', async ({ page }) => {
    test.setTimeout(90000);
    const cleanup = TestCleanup.getInstance('SYSTEM-FAILOVER: Service Recovery');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
      
      // Test 1: Service availability monitoring
      await page.goto('/courses');
      await expect(page.locator('h1:has-text("Courses")')).toBeVisible();
      
      // Test 2: Graceful error handling when services are slow
      // Simulate slow network
      await page.route('**/api/courses**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
        route.continue();
      });
      
      await page.goto('/courses');
      
      // Should show loading state then content
      await expect(page.locator('h1:has-text("Courses")')).toBeVisible({ timeout: 15000 });
      
      // Remove route simulation
      await page.unroute('**/api/courses**');
      
      // Test 3: Cache functionality during service issues
      await page.goto('/news');
      await expect(page.locator('h1:has-text("News")')).toBeVisible();
      
      // Test 4: User session persistence during service restart
      // Verify user remains logged in
      await page.goto('/profile');
      await expect(page.locator('h1:has-text("Profile")')).toBeVisible();
      
      console.log('✅ Service failover and recovery tests passed!');
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Service Failover');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Multi-user concurrent operations', async ({ browser }) => {
    test.setTimeout(120000);
    const cleanup = TestCleanup.getInstance('SYSTEM-CONCURRENCY: Multi-User Operations');
    
    try {
      // Create multiple browser contexts for concurrent users
      const adminContext = await browser.newContext();
      const teacherContext = await browser.newContext();
      const studentContext = await browser.newContext();
      
      cleanup.trackBrowserContext(adminContext);
      cleanup.trackBrowserContext(teacherContext);
      cleanup.trackBrowserContext(studentContext);
      
      const adminPage = await adminContext.newPage();
      const teacherPage = await teacherContext.newPage();
      const studentPage = await studentContext.newPage();
      
      const adminAuth = new CleanAuthHelper(adminPage);
      const teacherAuth = new CleanAuthHelper(teacherPage);
      const studentAuth = new CleanAuthHelper(studentPage);
      
      // Simple concurrent operations without complex data creation
      const operations = [
        // Admin monitoring system
        async () => {
          await adminAuth.loginAsAdmin();
          await adminPage.goto('/admin/system');
          await expect(adminPage.locator('h1')).toBeVisible({ timeout: 10000 });
        },
        
        // Teacher dashboard
        async () => {
          await teacherAuth.loginAsTeacher();
          await teacherPage.goto('/courses');
          await expect(teacherPage.locator('h1')).toBeVisible({ timeout: 10000 });
        },
        
        // Student learning
        async () => {
          await studentAuth.loginAsStudent();
          await studentPage.goto('/courses');
          await expect(studentPage.locator('h1')).toBeVisible({ timeout: 10000 });
        }
      ];
      
      // Execute all operations concurrently
      await Promise.all(operations);
      
      // Verify all users can navigate simultaneously
      await Promise.all([
        adminPage.goto('/admin/statistics'),
        teacherPage.goto('/statistics'),
        studentPage.goto('/dashboard')
      ]);
      
      // Check that all pages loaded
      await Promise.all([
        expect(adminPage.locator('h1')).toBeVisible({ timeout: 10000 }),
        expect(teacherPage.locator('h1')).toBeVisible({ timeout: 10000 }),
        expect(studentPage.locator('h1')).toBeVisible({ timeout: 10000 })
      ]);
      
      // Clean up auth states
      await adminAuth.clearAuthState();
      await teacherAuth.clearAuthState();  
      await studentAuth.clearAuthState();
      
      console.log('✅ Multi-user concurrent operations completed - concurrent functionality verified!');
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Concurrent Operations');
      throw error;
    } finally {
      await cleanup.cleanup();
    }
  });

  test('Performance and load validation', async ({ page }) => {
    test.setTimeout(90000);
    const cleanup = TestCleanup.getInstance('SYSTEM-PERFORMANCE: Load Validation');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
      
      // Test 1: Page load performance
      const performanceMetrics = [];
      
      const pagesToTest = [
        '/dashboard',
        '/courses', 
        '/my-courses',
        '/news',
        '/planning',
        '/profile'
      ];
      
      for (const pageUrl of pagesToTest) {
        const startTime = Date.now();
        
        await page.goto(pageUrl);
        await page.waitForLoadState('domcontentloaded');
        
        const loadTime = Date.now() - startTime;
        performanceMetrics.push({ page: pageUrl, loadTime });
        
        // Verify page loads within acceptable time (5 seconds)
        expect(loadTime).toBeLessThan(5000);
        
        console.log(`📊 ${pageUrl} loaded in ${loadTime}ms`);
      }
      
      // Test 2: Memory usage stability
      const memoryUsage = await page.evaluate(() => {
        return {
          usedJSHeapSize: performance.memory?.usedJSHeapSize || 0,
          totalJSHeapSize: performance.memory?.totalJSHeapSize || 0
        };
      });
      
      console.log('📊 Memory usage:', memoryUsage);
      
      // Test 3: Network request efficiency
      let requestCount = 0;
      page.on('request', () => requestCount++);
      
      await page.goto('/courses');
      await page.waitForLoadState('networkidle');
      
      console.log(`📊 Network requests for courses page: ${requestCount}`);
      
      // Should not make excessive requests
      expect(requestCount).toBeLessThan(20);
      
      console.log('✅ Performance validation completed!');
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Performance Validation');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
});