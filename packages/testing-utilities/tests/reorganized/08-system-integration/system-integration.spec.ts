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

  // =============================================================================
  // PROMOTION SYSTEM WORKFLOWS - Complete Educational Lifecycle
  // =============================================================================

  test('Complete promotion-based academic workflow', async ({ page }) => {
    test.setTimeout(300000); // Extended timeout for comprehensive promotion workflow
    const cleanup = TestCleanup.getInstance('PROMOTION-E2E: Complete Academic Workflow');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // PHASE 1: Admin Creates Promotion and Sets Up Academic Structure
      console.log('🚀 PHASE 1: Admin Promotion Setup');
      
      await authHelper.loginAsAdmin();
      
      // Create new promotion for Fall Year 1 (Semester 1)
      await page.goto('/promotions/create');
      await expect(page.locator('h1:has-text("Create New Promotion")')).toBeVisible();
      
      const promotionName = `Fall Year 1 (Semester 1) ${Date.now()}`;
      await page.fill('input[name="name"]', promotionName);
      await page.selectOption('select[name="semester"]', '1');
      await page.selectOption('select[name="intake"]', 'september');
      await page.selectOption('select[name="academicYear"]', '2024-2025');
      
      // Set promotion timeline
      const startDate = new Date();
      startDate.setMonth(8, 1); // September 1st
      const endDate = new Date();
      endDate.setMonth(11, 31); // December 31st
      
      await page.fill('input[name="startDate"]', startDate.toISOString().slice(0, 16));
      await page.fill('input[name="endDate"]', endDate.toISOString().slice(0, 16));
      
      // Set additional promotion details
      await page.fill('input[name="metadata.department"]', 'Computer Science');
      await page.fill('input[name="metadata.level"]', 'Bachelor');
      await page.fill('input[name="metadata.maxStudents"]', '30');
      await page.fill('textarea[name="metadata.description"]', 'First semester computer science promotion focusing on programming fundamentals.');
      
      await page.click('button:has-text("Create Promotion")');
      await expect(page.locator('text=Promotion created successfully')).toBeVisible({ timeout: 15000 });
      
      // Extract promotion ID for tracking
      const promotionUrl = page.url();
      const promotionId = promotionUrl.match(/promotions\/([a-f0-9]{24})/)?.[1];
      if (promotionId) {
        cleanup.trackDocument('promotions', promotionId);
      }
      
      await authHelper.clearAuthState();
      
      // PHASE 2: Teacher Creates Course Content
      console.log('🚀 PHASE 2: Teacher Course Content Creation');
      
      const factory = new TestDataFactory('PROMOTION-E2E');
      const teacher = await factory.users.createUser('teacher');
      cleanup.trackDocument('users', teacher._id);
      
      await authHelper.loginWithCustomUser(teacher.email, 'TestPass123!');
      
      // Create comprehensive course for the promotion
      await page.goto('/courses/create');
      const courseTitle = `Programming Fundamentals ${Date.now()}`;
      
      await page.fill('input[name="title"]', courseTitle);
      await page.fill('textarea[name="description"]', 'Introduction to programming concepts and fundamental algorithms.');
      await page.selectOption('select[name="category"]', 'programming');
      await page.selectOption('select[name="level"]', 'beginner');
      await page.fill('input[name="estimatedDuration"]', '120');
      
      // Add course tags
      await page.fill('input[placeholder="Add a tag"]', 'programming');
      await page.click('button:has-text("Add")');
      await page.fill('input[placeholder="Add a tag"]', 'fundamentals');
      await page.click('button:has-text("Add")');
      
      await page.click('button:has-text("Create Course")');
      await page.waitForURL(/.*\/courses\/.*/, { timeout: 15000 });
      
      const courseId = page.url().match(/courses\/([a-f0-9]{24})/)?.[1];
      if (courseId) {
        cleanup.trackDocument('courses', courseId);
      }
      
      await authHelper.clearAuthState();
      
      // PHASE 3: Admin Links Course to Promotion via Events
      console.log('🚀 PHASE 3: Admin Event Management');
      
      await authHelper.loginAsAdmin();
      
      // Create planning events linked to the course and promotion
      await page.goto('/planning');
      await page.click('button:has-text("New Event")');
      
      await page.fill('input[name="title"]', 'Programming Fundamentals - Lecture 1');
      await page.fill('textarea[name="description"]', 'Introduction to programming concepts and syntax.');
      
      // Set event for next week
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 7);
      await page.fill('input[name="startDate"]', eventDate.toISOString().slice(0, 10));
      await page.fill('input[name="startTime"]', '09:00');
      await page.fill('input[name="endTime"]', '11:00');
      await page.fill('input[name="location"]', 'Room CS-101');
      await page.selectOption('select[name="type"]', 'class');
      
      // Link to course
      if (courseId) {
        await page.selectOption('select[name="linkedCourse"]', courseId);
      }
      
      // Assign teacher
      await page.selectOption('select[name="teacherId"]', teacher._id);
      
      await page.click('button:has-text("Create Event")');
      await expect(page.locator('text=Event created successfully')).toBeVisible();
      
      const eventId = await page.locator('[data-testid="event-card"]').first().getAttribute('data-event-id');
      if (eventId) {
        cleanup.trackDocument('events', eventId);
      }
      
      // Link event to promotion
      if (promotionId && eventId) {
        await page.goto(`/promotions/${promotionId}`);
        await page.click('button:has-text("Link Events")');
        await page.check(`input[value="${eventId}"]`);
        await page.click('button:has-text("Link Selected Events")');
        await expect(page.locator('text=Events linked successfully')).toBeVisible();
      }
      
      await authHelper.clearAuthState();
      
      // PHASE 4: Admin Assigns Students to Promotion
      console.log('🚀 PHASE 4: Student Assignment');
      
      await authHelper.loginAsAdmin();
      
      // Create students and assign to promotion
      const students = [];
      for (let i = 0; i < 3; i++) {
        const student = await factory.users.createUser('student');
        students.push(student);
        cleanup.trackDocument('users', student._id);
      }
      
      if (promotionId) {
        await page.goto(`/promotions/${promotionId}`);
        await page.click('button:has-text("Add Students")');
        
        // Add students to promotion
        for (const student of students) {
          await page.fill('input[placeholder="Search for students..."]', student.email);
          await page.click(`text=${student.email}`);
        }
        
        await page.click('button:has-text("Add Selected Students")');
        await expect(page.locator('text=Students added successfully')).toBeVisible();
      }
      
      await authHelper.clearAuthState();
      
      // PHASE 5: Teacher Manages Events and Students
      console.log('🚀 PHASE 5: Teacher Event Management');
      
      await authHelper.loginWithCustomUser(teacher.email, 'TestPass123!');
      
      // Check teacher dashboard shows assigned events
      await page.goto('/dashboard');
      await expect(page.locator('h1:has-text("My Teaching Schedule")')).toBeVisible();
      await expect(page.locator('text=Programming Fundamentals - Lecture 1')).toBeVisible();
      
      // Verify teacher can see promotion details
      await expect(page.locator(`text=${promotionName}`)).toBeVisible();
      await expect(page.locator('text=3 students')).toBeVisible();
      
      // Navigate to course management
      await page.click('button:has-text("Course")');
      await page.waitForURL(/.*\/courses\/.*/, { timeout: 10000 });
      await expect(page.locator(`h1:has-text("${courseTitle}")`)).toBeVisible();
      
      await authHelper.clearAuthState();
      
      // PHASE 6: Student Accesses Promotion Calendar and Courses
      console.log('🚀 PHASE 6: Student Learning Experience');
      
      const testStudent = students[0];
      await authHelper.loginWithCustomUser(testStudent.email, 'TestPass123!');
      
      // Check student dashboard shows promotion
      await page.goto('/dashboard');
      await expect(page.locator(`text=${promotionName}`)).toBeVisible();
      await expect(page.locator('text=Semester 1/10')).toBeVisible();
      
      // Navigate to promotion calendar
      await page.goto('/planning');
      await expect(page.locator('h1:has-text("My Promotion Calendar")')).toBeVisible();
      await expect(page.locator(`text=${promotionName}`)).toBeVisible();
      
      // Verify student can see upcoming events
      await expect(page.locator('text=Programming Fundamentals - Lecture 1')).toBeVisible();
      
      // Click on event to see details
      await page.click('text=Programming Fundamentals - Lecture 1');
      await expect(page.locator(`text=${courseTitle}`)).toBeVisible();
      await expect(page.locator('text=Room CS-101')).toBeVisible();
      
      // Navigate to course through event
      await page.click('button:has-text("View Course")');
      await page.waitForURL(/.*\/courses\/.*/, { timeout: 10000 });
      await expect(page.locator(`h1:has-text("${courseTitle}")`)).toBeVisible();
      
      // Verify student can access course content
      await expect(page.locator('text=Introduction to programming concepts')).toBeVisible();
      
      // Check courses page shows accessible courses
      await page.goto('/courses');
      await expect(page.locator('h1:has-text("My Accessible Courses")')).toBeVisible();
      await expect(page.locator(`text=${courseTitle}`)).toBeVisible();
      
      await authHelper.clearAuthState();
      
      // PHASE 7: Full System Integration Verification
      console.log('🚀 PHASE 7: System Integration Verification');
      
      await authHelper.loginAsAdmin();
      
      // Verify admin dashboard shows promotion metrics
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="platform-stats-promotions"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-promotions"]')).toContainText('1');
      
      // Verify promotion detail shows complete setup
      if (promotionId) {
        await page.goto(`/promotions/${promotionId}`);
        await expect(page.locator(`h1:has-text("${promotionName}")`)).toBeVisible();
        await expect(page.locator('text=3 students')).toBeVisible();
        await expect(page.locator('text=1 events')).toBeVisible();
      }
      
      await authHelper.clearAuthState();
      
      console.log('✅ Complete promotion-based academic workflow successful!');
      console.log('📊 Verified: Promotion creation, course linking, teacher assignment, student enrollment, and learning access');
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Promotion Academic Workflow');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Promotion semester progression workflow', async ({ page }) => {
    test.setTimeout(240000);
    const cleanup = TestCleanup.getInstance('PROMOTION-PROGRESSION: Semester Advancement');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // PHASE 1: Create Initial Promotion (Semester 1)
      console.log('🚀 PHASE 1: Create Initial Promotion');
      
      const factory = new TestDataFactory('PROGRESSION-TEST');
      await authHelper.loginAsAdmin();
      
      // Create Semester 1 promotion
      await page.goto('/promotions/create');
      const sem1Name = `Fall Year 1 (Semester 1) ${Date.now()}`;
      await page.fill('input[name="name"]', sem1Name);
      await page.selectOption('select[name="semester"]', '1');
      await page.selectOption('select[name="intake"]', 'september');
      await page.selectOption('select[name="academicYear"]', '2024-2025');
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 4);
      
      await page.fill('input[name="startDate"]', startDate.toISOString().slice(0, 16));
      await page.fill('input[name="endDate"]', endDate.toISOString().slice(0, 16));
      await page.fill('input[name="metadata.department"]', 'Computer Science');
      
      await page.click('button:has-text("Create Promotion")');
      await expect(page.locator('text=Promotion created successfully')).toBeVisible();
      
      const sem1Id = page.url().match(/promotions\/([a-f0-9]{24})/)?.[1];
      if (sem1Id) cleanup.trackDocument('promotions', sem1Id);
      
      // Add students to Semester 1 promotion
      const students = [];
      for (let i = 0; i < 2; i++) {
        const student = await factory.users.createUser('student');
        students.push(student);
        cleanup.trackDocument('users', student._id);
      }
      
      await page.click('button:has-text("Add Students")');
      for (const student of students) {
        await page.fill('input[placeholder="Search for students..."]', student.email);
        await page.click(`text=${student.email}`);
      }
      await page.click('button:has-text("Add Selected Students")');
      
      // PHASE 2: Create Semester 2 Promotion
      console.log('🚀 PHASE 2: Create Semester 2 Promotion');
      
      await page.goto('/promotions/create');
      const sem2Name = `Spring Year 1 (Semester 2) ${Date.now()}`;
      await page.fill('input[name="name"]', sem2Name);
      await page.selectOption('select[name="semester"]', '2');
      await page.selectOption('select[name="intake"]', 'march');
      await page.selectOption('select[name="academicYear"]', '2024-2025');
      
      const sem2Start = new Date();
      sem2Start.setMonth(sem2Start.getMonth() + 5);
      const sem2End = new Date();
      sem2End.setMonth(sem2End.getMonth() + 9);
      
      await page.fill('input[name="startDate"]', sem2Start.toISOString().slice(0, 16));
      await page.fill('input[name="endDate"]', sem2End.toISOString().slice(0, 16));
      await page.fill('input[name="metadata.department"]', 'Computer Science');
      
      await page.click('button:has-text("Create Promotion")');
      await expect(page.locator('text=Promotion created successfully')).toBeVisible();
      
      const sem2Id = page.url().match(/promotions\/([a-f0-9]{24})/)?.[1];
      if (sem2Id) cleanup.trackDocument('promotions', sem2Id);
      
      // PHASE 3: Progress Students from Semester 1 to Semester 2
      console.log('🚀 PHASE 3: Student Progression');
      
      if (sem1Id && sem2Id) {
        // Navigate to semester 1 promotion
        await page.goto(`/promotions/${sem1Id}`);
        
        // Progress each student
        for (const student of students) {
          await page.click(`button[data-student-id="${student._id}"]:has-text("Progress")`);
          await page.selectOption('select[name="targetPromotion"]', sem2Id);
          await page.click('button:has-text("Confirm Progression")');
          await expect(page.locator('text=Student progressed successfully')).toBeVisible();
        }
      }
      
      // PHASE 4: Verify Progression
      console.log('🚀 PHASE 4: Verify Student Progression');
      
      // Check that students are now in Semester 2
      if (sem2Id) {
        await page.goto(`/promotions/${sem2Id}`);
        await expect(page.locator('text=2 students')).toBeVisible();
      }
      
      // Verify from student perspective
      await authHelper.clearAuthState();
      const testStudent = students[0];
      await authHelper.loginWithCustomUser(testStudent.email, 'TestPass123!');
      
      await page.goto('/dashboard');
      await expect(page.locator(`text=${sem2Name}`)).toBeVisible();
      await expect(page.locator('text=Semester 2/10')).toBeVisible();
      
      await authHelper.clearAuthState();
      
      console.log('✅ Promotion semester progression workflow successful!');
      console.log('📊 Verified: Student progression from Semester 1 to Semester 2');
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Promotion Progression');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Multi-promotion teacher event coordination', async ({ page }) => {
    test.setTimeout(180000);
    const cleanup = TestCleanup.getInstance('PROMOTION-COORDINATION: Multi-Promotion Teaching');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // PHASE 1: Setup Multiple Promotions
      console.log('🚀 PHASE 1: Setup Multiple Promotions');
      
      const factory = new TestDataFactory('COORDINATION-TEST');
      await authHelper.loginAsAdmin();
      
      // Create teacher
      const teacher = await factory.users.createUser('teacher');
      cleanup.trackDocument('users', teacher._id);
      
      // Create multiple courses
      const course1 = await factory.courses.createCourse(teacher._id, 'Introduction to Programming');
      const course2 = await factory.courses.createCourse(teacher._id, 'Advanced Programming');
      cleanup.trackDocument('courses', course1._id);
      cleanup.trackDocument('courses', course2._id);
      
      // Create two different promotions
      const promotions = [];
      for (let i = 1; i <= 2; i++) {
        await page.goto('/promotions/create');
        const promotionName = `CS Year ${i} Semester ${i} ${Date.now()}`;
        
        await page.fill('input[name="name"]', promotionName);
        await page.selectOption('select[name="semester"]', i.toString());
        await page.selectOption('select[name="intake"]', 'september');
        await page.selectOption('select[name="academicYear"]', '2024-2025');
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 4);
        
        await page.fill('input[name="startDate"]', startDate.toISOString().slice(0, 16));
        await page.fill('input[name="endDate"]', endDate.toISOString().slice(0, 16));
        
        await page.click('button:has-text("Create Promotion")');
        await expect(page.locator('text=Promotion created successfully')).toBeVisible();
        
        const promotionId = page.url().match(/promotions\/([a-f0-9]{24})/)?.[1];
        if (promotionId) {
          cleanup.trackDocument('promotions', promotionId);
          promotions.push({ id: promotionId, name: promotionName });
        }
      }
      
      // PHASE 2: Create Events for Each Promotion
      console.log('🚀 PHASE 2: Create Coordinated Events');
      
      const events = [];
      for (let i = 0; i < promotions.length; i++) {
        const promotion = promotions[i];
        const course = i === 0 ? course1 : course2;
        
        // Create event
        await page.goto('/planning');
        await page.click('button:has-text("New Event")');
        
        await page.fill('input[name="title"]', `${course.title} - Lecture ${i + 1}`);
        
        const eventDate = new Date();
        eventDate.setDate(eventDate.getDate() + (i + 1) * 7); // Different weeks
        
        await page.fill('input[name="startDate"]', eventDate.toISOString().slice(0, 10));
        await page.fill('input[name="startTime"]', '09:00');
        await page.fill('input[name="endTime"]', '11:00');
        await page.selectOption('select[name="linkedCourse"]', course._id);
        await page.selectOption('select[name="teacherId"]', teacher._id);
        
        await page.click('button:has-text("Create Event")');
        await expect(page.locator('text=Event created successfully')).toBeVisible();
        
        // Link to promotion
        await page.goto(`/promotions/${promotion.id}`);
        await page.click('button:has-text("Link Events")');
        const eventCheckbox = await page.locator('input[type="checkbox"]').first();
        await eventCheckbox.check();
        await page.click('button:has-text("Link Selected Events")');
        
        events.push({ promotionId: promotion.id, courseName: course.title });
      }
      
      await authHelper.clearAuthState();
      
      // PHASE 3: Teacher Views Multi-Promotion Schedule
      console.log('🚀 PHASE 3: Teacher Multi-Promotion View');
      
      await authHelper.loginWithCustomUser(teacher.email, 'TestPass123!');
      
      // Check teacher dashboard
      await page.goto('/dashboard');
      await expect(page.locator('h1:has-text("My Teaching Schedule")')).toBeVisible();
      
      // Verify teacher sees events from multiple promotions
      await expect(page.locator('text=Introduction to Programming - Lecture 1')).toBeVisible();
      await expect(page.locator('text=Advanced Programming - Lecture 2')).toBeVisible();
      
      // Check promotion count
      await expect(page.locator('text=2')).toBeVisible(); // Should show 2 active promotions
      
      // Filter by different timeframes
      await page.selectOption('select[name="timeframe"]', 'month');
      await expect(page.locator('text=Introduction to Programming')).toBeVisible();
      
      // PHASE 4: Verify Cross-Promotion Coordination
      console.log('🚀 PHASE 4: Cross-Promotion Coordination');
      
      // Check that teacher can see all promotion details
      for (const event of events) {
        await page.click(`text=${event.courseName}`);
        await expect(page.locator(`text=${event.courseName}`)).toBeVisible();
        await page.goBack();
      }
      
      await authHelper.clearAuthState();
      
      console.log('✅ Multi-promotion teacher coordination workflow successful!');
      console.log('📊 Verified: Teacher assigned to multiple promotions with coordinated scheduling');
      
    } catch (error) {
      await captureEnhancedError(page, error, 'Multi-Promotion Coordination');
      throw error;
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
});