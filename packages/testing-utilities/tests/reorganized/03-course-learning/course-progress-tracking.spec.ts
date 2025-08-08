// packages/testing-utilities/tests/reorganized/03-course-learning/course-progress-tracking.spec.ts
// Real E2E tests for course progress tracking - NO MOCKS

import { test, expect, Browser } from '@playwright/test';
import { CleanAuthHelper } from '../../helpers/clean-auth.helpers';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { TestDataFactory } from '../../helpers/TestDataFactory';
import { TestScenarios } from '../../helpers/TestScenarioBuilders';
import { safeCleanup } from '../../helpers/test-cleanup-utils';

test.describe('Course Progress Tracking E2E Tests', () => {
  let browser: Browser;
  let cleanup: TestCleanup;
  let factory: TestDataFactory;
  let scenarios: any;

  test.beforeEach(async ({ browser: testBrowser }) => {
    browser = testBrowser;
    cleanup = TestCleanup.getInstance('Course Progress Tracking');
    factory = new TestDataFactory('Progress E2E');
    scenarios = TestScenarios.createStudentScenarios('Progress E2E');
  });

  test.afterEach(async () => {
    await cleanup.cleanup();
  });

  test('Complete student progress workflow from enrollment to course completion', async ({ page }) => {
    const auth = new CleanAuthHelper(page);
    
    try {
      await auth.initialize();
      
      // 1. Create a comprehensive learning scenario
      const { student, courses, promotion, events } = await scenarios.createActiveStudent();
      cleanup.trackDocument('users', student._id);
      cleanup.trackDocument('promotions', promotion._id);
      courses.forEach((course: any) => cleanup.trackDocument('courses', course._id));
      events.forEach((event: any) => cleanup.trackDocument('events', event._id));
      
      // 2. Login as student and verify initial progress state
      await auth.loginWithCustomUser(student.email, 'TestPass123!');
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="student-dashboard"]');
      
      // Should show 0% initial progress
      const progressCard = page.locator('[data-testid="progress-card"]');
      await expect(progressCard).toBeVisible();
      
      const initialProgress = page.locator('[data-testid="overall-progress"]');
      await expect(initialProgress).toContainText('0%');
      
      // 3. Navigate to course and simulate learning activities
      await page.click('[data-testid="courses-nav"]');
      await page.waitForSelector('[data-testid="course-list"]');
      
      // Click on first course
      await page.click(`[data-testid="course-${courses[0]._id}"]`);
      await page.waitForSelector('[data-testid="course-detail"]');
      
      // Verify course structure is displayed
      const courseChapters = page.locator('[data-testid="course-chapters"]');
      await expect(courseChapters).toBeVisible();
      
      // Start first exercise
      const firstExercise = page.locator('[data-testid="exercise"]:first-child');
      await firstExercise.click();
      
      // Complete exercise (simulate good performance)
      await page.fill('[data-testid="exercise-answer"]', 'Correct answer');
      await page.click('[data-testid="submit-exercise"]');
      
      // Should see progress update
      await expect(page.locator('[data-testid="exercise-success"]')).toBeVisible();
      
      // 4. Return to dashboard and verify progress update
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="student-dashboard"]');
      
      // Progress should now be > 0%
      const updatedProgress = page.locator('[data-testid="overall-progress"]');
      await expect(updatedProgress).not.toContainText('0%');
      
      // Should show course progress details
      const courseProgressDetails = page.locator('[data-testid="course-progress-details"]');
      await expect(courseProgressDetails).toBeVisible();
      
      // 5. Complete multiple exercises to reach significant progress
      for (let i = 0; i < 3; i++) {
        await page.click('[data-testid="courses-nav"]');
        await page.click(`[data-testid="course-${courses[0]._id}"]`);
        
        const exercise = page.locator(`[data-testid="exercise"]:nth-child(${i + 2})`);
        if (await exercise.isVisible()) {
          await exercise.click();
          await page.fill('[data-testid="exercise-answer"]', 'Excellent answer');
          await page.click('[data-testid="submit-exercise"]');
          await expect(page.locator('[data-testid="exercise-success"]')).toBeVisible();
        }
      }
      
      // 6. Check final progress state
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="student-dashboard"]');
      
      const finalProgress = page.locator('[data-testid="overall-progress"]');
      const progressText = await finalProgress.textContent();
      const progressValue = parseInt(progressText?.replace('%', '') || '0');
      
      expect(progressValue).toBeGreaterThan(30); // Should have significant progress
      
      // Should show milestone achievements
      const milestones = page.locator('[data-testid="milestones"]');
      await expect(milestones).toBeVisible();
      await expect(page.locator('[data-testid="milestone-first-course-started"]')).toBeVisible();
      
    } finally {
      await auth.clearAuthState();
    }
  });

  test('Attendance tracking affects overall progress calculation', async ({ page }) => {
    const auth = new CleanAuthHelper(page);
    
    try {
      await auth.initialize();
      
      // 1. Create scenario with student and teacher
      const { student, teacher, promotion, events, courses } = await scenarios.createActiveStudent();
      cleanup.trackDocument('users', student._id);
      cleanup.trackDocument('users', teacher._id);
      cleanup.trackDocument('promotions', promotion._id);
      events.forEach((event: any) => cleanup.trackDocument('events', event._id));
      courses.forEach((course: any) => cleanup.trackDocument('courses', course._id));
      
      // 2. Login as student and establish baseline progress
      await auth.loginWithCustomUser(student.email, 'TestPass123!');
      await page.goto('/dashboard');
      
      // Complete some course work first
      await page.click('[data-testid="courses-nav"]');
      await page.click(`[data-testid="course-${courses[0]._id}"]`);
      await page.click('[data-testid="exercise"]:first-child');
      await page.fill('[data-testid="exercise-answer"]', 'Good answer');
      await page.click('[data-testid="submit-exercise"]');
      
      // Check progress with perfect attendance (initial state)
      await page.goto('/dashboard');
      const initialProgress = await page.locator('[data-testid="overall-progress"]').textContent();
      const initialValue = parseInt(initialProgress?.replace('%', '') || '0');
      
      // Verify attendance rate is 100% (no events marked yet)
      const attendanceRate = page.locator('[data-testid="attendance-rate"]');
      await expect(attendanceRate).toContainText('100%');
      
      // 3. Switch to teacher and mark attendance as absent
      await auth.clearAuthState();
      await auth.loginWithCustomUser(teacher.email, 'TestPass123!');
      
      await page.goto('/planning');
      await page.click('[data-testid="events-tab"]');
      
      // Find today's event and mark attendance
      const eventRow = page.locator(`[data-testid="event-${events[0]._id}"]`).first();
      await eventRow.click();
      
      // Mark student as absent
      const attendanceSheet = page.locator('[data-testid="attendance-sheet"]');
      await expect(attendanceSheet).toBeVisible();
      
      const studentRow = page.locator(`[data-testid="student-${student._id}"]`);
      await studentRow.locator('[data-testid="absent-checkbox"]').check();
      await studentRow.locator('[data-testid="notes-input"]').fill('Student was sick');
      
      await page.click('[data-testid="save-attendance"]');
      await expect(page.locator('[data-testid="attendance-saved"]')).toBeVisible();
      
      // 4. Switch back to student and verify progress impact
      await auth.clearAuthState();
      await auth.loginWithCustomUser(student.email, 'TestPass123!');
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="student-dashboard"]');
      
      // Attendance rate should now be lower
      const newAttendanceRate = page.locator('[data-testid="attendance-rate"]');
      await expect(newAttendanceRate).not.toContainText('100%');
      
      // Overall progress should be lower due to attendance component
      const newProgress = await page.locator('[data-testid="overall-progress"]').textContent();
      const newValue = parseInt(newProgress?.replace('%', '') || '0');
      
      expect(newValue).toBeLessThan(initialValue); // Progress should decrease due to poor attendance
      
      // 5. Verify attendance details are visible
      await page.click('[data-testid="view-attendance-details"]');
      const attendanceModal = page.locator('[data-testid="attendance-modal"]');
      await expect(attendanceModal).toBeVisible();
      
      // Should show the absence with teacher's note
      await expect(page.locator('[data-testid="absence-note"]')).toContainText('Student was sick');
      
    } finally {
      await auth.clearAuthState();
    }
  });

  test('Progress calculation formula verification (70% course + 30% attendance)', async ({ page }) => {
    const auth = new CleanAuthHelper(page);
    
    try {
      await auth.initialize();
      
      // 1. Create controlled scenario for precise testing
      const student = await factory.users.createUser('student');
      const teacher = await factory.users.createUser('teacher');
      const promotion = await factory.promotions.createPromotion('Test Promotion', teacher._id, [student._id]);
      const course = await factory.courses.createCourse('Progress Formula Test', teacher._id);
      const event = await factory.events.createEvent('Test Event', teacher._id, [promotion._id], course._id);
      
      cleanup.trackDocument('users', student._id);
      cleanup.trackDocument('users', teacher._id);
      cleanup.trackDocument('promotions', promotion._id);
      cleanup.trackDocument('courses', course._id);
      cleanup.trackDocument('events', event._id);
      
      // 2. Set up controlled progress scenario
      // Course progress: 80%, Attendance: 50% => Expected overall: (80 * 0.7) + (50 * 0.3) = 56 + 15 = 71%
      
      // Login as teacher and set attendance to 50% (1 present, 1 absent)
      await auth.loginWithCustomUser(teacher.email, 'TestPass123!');
      
      await page.goto('/planning');
      await page.click('[data-testid="events-tab"]');
      await page.click(`[data-testid="event-${event._id}"]`);
      
      // Mark as present for first event
      const studentRow = page.locator(`[data-testid="student-${student._id}"]`);
      await studentRow.locator('[data-testid="present-checkbox"]').check();
      await page.click('[data-testid="save-attendance"]');
      
      // Create second event and mark as absent
      const event2 = await factory.events.createEvent('Test Event 2', teacher._id, [promotion._id], course._id);
      cleanup.trackDocument('events', event2._id);
      
      await page.reload();
      await page.click(`[data-testid="event-${event2._id}"]`);
      await studentRow.locator('[data-testid="absent-checkbox"]').check();
      await page.click('[data-testid="save-attendance"]');
      
      // 3. Set course progress to exactly 80%
      await page.goto('/admin/students');
      await page.click(`[data-testid="student-${student._id}"]`);
      await page.click('[data-testid="edit-progress"]');
      
      await page.fill(`[data-testid="course-${course._id}-progress"]`, '80');
      await page.fill(`[data-testid="course-${course._id}-score"]`, '85');
      await page.click('[data-testid="update-progress"]');
      
      // 4. Login as student and verify exact calculation
      await auth.clearAuthState();
      await auth.loginWithCustomUser(student.email, 'TestPass123!');
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="student-dashboard"]');
      
      // Should show attendance: 50%
      const attendanceDisplay = page.locator('[data-testid="attendance-rate"]');
      await expect(attendanceDisplay).toContainText('50%');
      
      // Should show overall progress: 71% (80 * 0.7 + 50 * 0.3)
      const overallProgress = page.locator('[data-testid="overall-progress"]');
      await expect(overallProgress).toContainText('71%');
      
      // 5. Verify breakdown is shown correctly
      await page.click('[data-testid="progress-breakdown"]');
      const breakdownModal = page.locator('[data-testid="progress-breakdown-modal"]');
      await expect(breakdownModal).toBeVisible();
      
      await expect(page.locator('[data-testid="course-component"]')).toContainText('56%'); // 80 * 0.7
      await expect(page.locator('[data-testid="attendance-component"]')).toContainText('15%'); // 50 * 0.3
      await expect(page.locator('[data-testid="total-calculation"]')).toContainText('71%');
      
    } finally {
      await auth.clearAuthState();
    }
  });

  test('Multi-course progress aggregation and milestone tracking', async ({ page }) => {
    const auth = new CleanAuthHelper(page);
    
    try {
      await auth.initialize();
      
      // 1. Create scenario with multiple courses
      const student = await factory.users.createUser('student');
      const teacher = await factory.users.createUser('teacher'); 
      const promotion = await factory.promotions.createPromotion('Multi-Course Test', teacher._id, [student._id]);
      
      const courses = await Promise.all([
        factory.courses.createCourse('JavaScript Basics', teacher._id),
        factory.courses.createCourse('React Fundamentals', teacher._id),
        factory.courses.createCourse('Node.js Backend', teacher._id)
      ]);
      
      cleanup.trackDocument('users', student._id);
      cleanup.trackDocument('users', teacher._id);
      cleanup.trackDocument('promotions', promotion._id);
      courses.forEach(course => cleanup.trackDocument('courses', course._id));
      
      // 2. Set different progress levels for each course
      await auth.loginWithCustomUser(teacher.email, 'TestPass123!');
      await page.goto('/admin/students');
      await page.click(`[data-testid="student-${student._id}"]`);
      await page.click('[data-testid="edit-progress"]');
      
      // Course 1: 100% complete (excellent)
      await page.fill(`[data-testid="course-${courses[0]._id}-progress"]`, '100');
      await page.fill(`[data-testid="course-${courses[0]._id}-score"]`, '95');
      await page.click(`[data-testid="course-${courses[0]._id}-complete"]`);
      
      // Course 2: 60% in progress (good)
      await page.fill(`[data-testid="course-${courses[1]._id}-progress"]`, '60');
      await page.fill(`[data-testid="course-${courses[1]._id}-score"]`, '82');
      
      // Course 3: 20% just started (poor)
      await page.fill(`[data-testid="course-${courses[2]._id}-progress"]`, '20');
      await page.fill(`[data-testid="course-${courses[2]._id}-score"]`, '70');
      
      await page.click('[data-testid="update-all-progress"]');
      await expect(page.locator('[data-testid="progress-updated"]')).toBeVisible();
      
      // 3. Login as student and verify aggregated progress
      await auth.clearAuthState();
      await auth.loginWithCustomUser(student.email, 'TestPass123!');
      
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="student-dashboard"]');
      
      // Overall course progress should be average: (100 + 60 + 20) / 3 = 60%
      // With 100% attendance: 60 * 0.7 + 100 * 0.3 = 42 + 30 = 72%
      const overallProgress = page.locator('[data-testid="overall-progress"]');
      await expect(overallProgress).toContainText('72%');
      
      // Should show individual course progress
      const courseList = page.locator('[data-testid="course-progress-list"]');
      await expect(courseList).toBeVisible();
      
      await expect(page.locator(`[data-testid="course-${courses[0]._id}-progress"]`)).toContainText('100%');
      await expect(page.locator(`[data-testid="course-${courses[1]._id}-progress"]`)).toContainText('60%');
      await expect(page.locator(`[data-testid="course-${courses[2]._id}-progress"]`)).toContainText('20%');
      
      // 4. Verify milestone tracking
      const milestones = page.locator('[data-testid="milestones-section"]');
      await expect(milestones).toBeVisible();
      
      // Should show first course started and completed
      await expect(page.locator('[data-testid="milestone-first-course-started"]')).toBeVisible();
      await expect(page.locator('[data-testid="milestone-first-course-completed"]')).toBeVisible();
      
      // Should not show halfway milestone (only 1/3 courses completed)
      await expect(page.locator('[data-testid="milestone-halfway-completed"]')).not.toBeVisible();
      
      // 5. Complete another course and verify halfway milestone
      await auth.clearAuthState();
      await auth.loginWithCustomUser(teacher.email, 'TestPass123!');
      await page.goto('/admin/students');
      await page.click(`[data-testid="student-${student._id}"]`);
      await page.click('[data-testid="edit-progress"]');
      
      // Complete second course
      await page.fill(`[data-testid="course-${courses[1]._id}-progress"]`, '100');
      await page.click(`[data-testid="course-${courses[1]._id}-complete"]`);
      await page.click('[data-testid="update-all-progress"]');
      
      // Login as student again
      await auth.clearAuthState();
      await auth.loginWithCustomUser(student.email, 'TestPass123!');
      await page.goto('/dashboard');
      
      // Should now show halfway milestone (2/3 courses completed)
      await expect(page.locator('[data-testid="milestone-halfway-completed"]')).toBeVisible();
      
      // Overall progress should increase: (100 + 100 + 20) / 3 = 73.33%
      // With attendance: 73.33 * 0.7 + 100 * 0.3 = 51.33 + 30 = 81.33% ≈ 81%
      const newOverallProgress = page.locator('[data-testid="overall-progress"]');
      await expect(newOverallProgress).toContainText('81%');
      
    } finally {
      await auth.clearAuthState();
    }
  });

  test('Real-time progress updates and admin monitoring', async ({ page, context }) => {
    const auth = new CleanAuthHelper(page);
    
    try {
      await auth.initialize();
      
      // 1. Create test scenario
      const { student, teacher, admin, promotion, courses } = await scenarios.createActiveStudent();
      cleanup.trackDocument('users', student._id);
      cleanup.trackDocument('users', teacher._id);
      cleanup.trackDocument('users', admin._id);
      cleanup.trackDocument('promotions', promotion._id);
      courses.forEach((course: any) => cleanup.trackDocument('courses', course._id));
      
      // 2. Open admin dashboard in one tab
      const adminPage = await context.newPage();
      const adminAuth = new CleanAuthHelper(adminPage);
      await adminAuth.initialize();
      await adminAuth.loginWithCustomUser(admin.email, 'TestPass123!');
      await adminPage.goto('/admin/promotions');
      await adminPage.click(`[data-testid="promotion-${promotion._id}"]`);
      await adminPage.click('[data-testid="view-progress"]');
      
      // Should see initial low progress
      const initialStats = adminPage.locator('[data-testid="promotion-statistics"]');
      await expect(initialStats).toBeVisible();
      await expect(adminPage.locator('[data-testid="average-progress"]')).toContainText('0%');
      
      // 3. Student makes progress in another tab
      await auth.loginWithCustomUser(student.email, 'TestPass123!');
      await page.goto('/courses');
      await page.click(`[data-testid="course-${courses[0]._id}"]`);
      
      // Complete several exercises
      for (let i = 1; i <= 3; i++) {
        await page.click(`[data-testid="exercise-${i}"]`);
        await page.fill('[data-testid="exercise-answer"]', `Answer ${i}`);
        await page.click('[data-testid="submit-exercise"]');
        await expect(page.locator('[data-testid="exercise-success"]')).toBeVisible();
      }
      
      // 4. Refresh admin view and verify updates
      await adminPage.reload();
      await adminPage.click('[data-testid="refresh-statistics"]');
      
      // Should show updated progress
      await expect(adminPage.locator('[data-testid="average-progress"]')).not.toContainText('0%');
      
      // Should show student in progress list
      const progressTable = adminPage.locator('[data-testid="student-progress-table"]');
      await expect(progressTable).toBeVisible();
      
      const studentRow = adminPage.locator(`[data-testid="student-progress-${student._id}"]`);
      await expect(studentRow).toBeVisible();
      await expect(studentRow.locator('[data-testid="progress-value"]')).not.toContainText('0%');
      
      // 5. Test real-time notifications (if WebSocket enabled)
      await page.goto('/courses');
      await page.click(`[data-testid="course-${courses[0]._id}"]`);
      await page.click('[data-testid="exercise-4"]');
      await page.fill('[data-testid="exercise-answer"]', 'Final answer');
      await page.click('[data-testid="submit-exercise"]');
      
      // Admin should receive notification (check for notification system)
      const notifications = adminPage.locator('[data-testid="notifications"]');
      if (await notifications.isVisible()) {
        await expect(adminPage.locator('[data-testid="progress-update-notification"]')).toBeVisible();
      }
      
      // Cleanup admin page
      await adminAuth.clearAuthState();
      await adminPage.close();
      
    } finally {
      await auth.clearAuthState();
    }
  });
});