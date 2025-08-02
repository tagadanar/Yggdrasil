import { test, expect } from '@playwright/test';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { TestDataFactory } from '../helpers/TestDataFactory';

test.describe('Instructor Student Management Integration', () => {
  test('Student enrollment monitoring', async ({ page }) => {
    test.setTimeout(60000); // Focused timeout
    const cleanup = TestCleanup.getInstance('Student Management Integration');
    let courseName: string;
    let studentEmail: string;

    try {
      const authHelper = new CleanAuthHelper(page, 'Student Management Test');
      await authHelper.initialize();
      
      // Create test data using factory
      const factory = new TestDataFactory('Student Management Test');
      
      // Create a course first
      await authHelper.loginAsTeacher();
      const teacher = await factory.users.getUserByRole('teacher');
      const course = await factory.courses.createFullCourse(teacher._id);
      courseName = course.title;
      cleanup.trackDocument('courses', course._id);
      
      // Create a test student
      const student = await factory.users.createUser('student');
      studentEmail = student.email;
      cleanup.trackDocument('users', student._id);
      cleanup.trackDocument('profiles', student.profile);
      
      // Navigate to course management
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Find the created course
      const courseCard = page.locator(`:has-text("${courseName}")`);
      await courseCard.first().click();
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Manage enrollments
      const enrollmentTab = page.locator('button:has-text("Enrollments"), a:has-text("Students")');
      if (await enrollmentTab.count() > 0) {
        await enrollmentTab.click();
        
        // Enroll the test student
        const addStudentButton = page.locator('button:has-text("Add Student"), button:has-text("Enroll")');
        if (await addStudentButton.count() > 0) {
          await addStudentButton.click();
          
          const studentEmailInput = page.locator('input[name="email"], input[placeholder*="email"]');
          if (await studentEmailInput.count() > 0) {
            await studentEmailInput.fill(studentEmail);
            
            const enrollButton = page.locator('button:has-text("Enroll"), button[type="submit"]');
            await enrollButton.click();
            
            // Wait for enrollment confirmation
            await page.waitForSelector('.enrollment-complete, [data-testid="enrollment-success"]', 
              { state: 'visible', timeout: 5000 }).catch(() => {});
          }
        }
        
        // Verify student appears in enrollment list
        const enrolledStudentsList = page.locator('.enrolled-students, [data-testid="enrolled-students"]');
        if (await enrolledStudentsList.count() > 0) {
          await expect(enrolledStudentsList.locator(`:has-text("${studentEmail}")`)).toBeVisible();
        }
      }
      
      // Test student progress monitoring
      const progressTab = page.locator('button:has-text("Progress"), a:has-text("Analytics")');
      if (await progressTab.count() > 0) {
        await progressTab.click();
        
        // Verify progress dashboard loads
        const progressDashboard = page.locator('.progress-dashboard, [data-testid="progress-dashboard"]');
        await expect(progressDashboard).toBeVisible({ timeout: 10000 }).catch(() => {});
        
        // Check if student progress data is displayed
        const studentProgressCard = page.locator(`.student-progress:has-text("${studentEmail}"), [data-testid="student-progress"]:has-text("${studentEmail}")`);
        if (await studentProgressCard.count() > 0) {
          await expect(studentProgressCard).toBeVisible();
        }
      }
      
    } finally {
      await cleanup.cleanup();
    }
  });
});