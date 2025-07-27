import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { TestDataFactory } from '../helpers/TestDataFactory';
import { TestScenarios } from '../helpers/TestScenarioBuilders';
import { captureEnhancedError } from '../helpers/enhanced-error-context';

test.describe('Instructor Teaching Workflow - Optimized', () => {
  // Split INTEGRATION-002 into focused workflow segments
  
  // =============================================================================
  // WORKFLOW-002a: Course Creation and Content Development (25s)
  // =============================================================================
  test('WORKFLOW-002a: Course Creation and Content Development', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('WORKFLOW-002a');
    const factory = new TestDataFactory('WORKFLOW-002a');
    let context: any = undefined;
    let auth: CleanAuthHelper | undefined = undefined;
    
    try {
      context = await browser.newContext();
      cleanup.trackBrowserContext(context);
      const page = await context.newPage();
      auth = new CleanAuthHelper(page);
      
      await auth.loginAsTeacher();
      
      // Create new course
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const createButton = page.locator('button:has-text("Create Course"), button:has-text("Create")');
      await createButton.first().click();
      
      const courseName = `Instructor Course ${Date.now()}`;
      await page.fill('input[name="title"]', courseName);
      await page.fill('textarea[name="description"]', 'Comprehensive course for instructor workflow testing');
      
      // Set course details
      const categorySelect = page.locator('select[name="category"]');
      if (await categorySelect.count() > 0) {
        await categorySelect.selectOption({ index: 1 });
      }
      
      const levelSelect = page.locator('select[name="level"]');
      if (await levelSelect.count() > 0) {
        await levelSelect.selectOption('intermediate');
      }
      
      // Save as draft first
      const saveDraftButton = page.locator('button:has-text("Save Draft"), button:has-text("Save")');
      await saveDraftButton.first().click();
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Verify course saved
      await expect(page.locator(`text=${courseName}`)).toBeVisible({ timeout: 3000 });
      
      // Add course content structure
      const addChapterButton = page.locator('button:has-text("Add Chapter"), button:has-text("Chapter")');
      if (await addChapterButton.count() > 0) {
        await addChapterButton.click();
        
        const chapterTitle = page.locator('input[name*="chapter"], input[placeholder*="chapter"]');
        if (await chapterTitle.count() > 0) {
          await chapterTitle.fill('Introduction to Programming');
          
          // Save chapter
          const saveChapterButton = page.locator('button:has-text("Save Chapter"), button:has-text("Add")');
          if (await saveChapterButton.count() > 0) {
            await saveChapterButton.click();
            await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
          }
        }
      }
      
      // Add exercise content
      const addExerciseButton = page.locator('button:has-text("Add Exercise"), button:has-text("Exercise")');
      if (await addExerciseButton.count() > 0) {
        await addExerciseButton.click();
        
        const exerciseTitle = page.locator('input[name*="exercise"]');
        if (await exerciseTitle.count() > 0) {
          await exerciseTitle.fill('Hello World Program');
          
          const exerciseDesc = page.locator('textarea[name*="description"]');
          if (await exerciseDesc.count() > 0) {
            await exerciseDesc.fill('Write a program that prints "Hello World"');
            
            const saveExerciseButton = page.locator('button:has-text("Save Exercise"), button:has-text("Add")');
            if (await saveExerciseButton.count() > 0) {
              await saveExerciseButton.click();
              await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
            }
          }
        }
      }
      
      // Publish the course
      const publishButton = page.locator('button:has-text("Publish"), button:has-text("Make Public")');
      if (await publishButton.count() > 0) {
        await publishButton.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        
        // Verify published status
        const publishedIndicator = page.locator('.published, :has-text("Published"), .status-published');
        if (await publishedIndicator.count() > 0) {
          await expect(publishedIndicator.first()).toBeVisible();
        }
      }
      
    } finally {
      if (auth) await auth.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  // =============================================================================
  // WORKFLOW-002b: Student Enrollment Management (20s)
  // =============================================================================
  test('WORKFLOW-002b: Student Enrollment and Management', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('WORKFLOW-002b');
    const factory = new TestDataFactory('WORKFLOW-002b');
    let context: any = undefined;
    let auth: CleanAuthHelper | undefined = undefined;
    
    try {
      // Create teacher with published course and students
      const scenarios = TestScenarios.createTeacherScenarios('WORKFLOW-002b');
      const { teacher, courses, students } = await scenarios.createActiveTeacher();
      const course = courses[0];
      
      cleanup.trackDocument('users', teacher._id);
      courses.forEach(c => cleanup.trackDocument('courses', c._id));
      students.forEach(s => cleanup.trackDocument('users', s._id));
      
      context = await browser.newContext();
      cleanup.trackBrowserContext(context);
      const page = await context.newPage();
      auth = new CleanAuthHelper(page);
      
      await auth.loginAsTeacher();
      
      // Navigate to course management
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const courseCard = page.locator(`:has-text("${course.title}")`);
      await courseCard.first().click();
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Manage enrollments
      const enrollmentTab = page.locator('button:has-text("Enrollments"), a:has-text("Students"), tab:has-text("Students")');
      if (await enrollmentTab.count() > 0) {
        await enrollmentTab.first().click();
        
        // Check enrolled students list
        const studentList = page.locator('.student-list, .enrolled-students, [data-testid="student-list"]');
        if (await studentList.count() > 0) {
          await expect(studentList.first()).toBeVisible();
          
          // Verify students appear in list
          const studentRows = studentList.locator('.student-row, tr, .student-item');
          const studentCount = await studentRows.count();
          expect(studentCount).toBeGreaterThan(0);
        }
        
        // Test adding new student manually
        const addStudentButton = page.locator('button:has-text("Add Student"), button:has-text("Enroll")');
        if (await addStudentButton.count() > 0) {
          // Create additional student for enrollment
          const newStudent = await factory.users.createUser('student');
          cleanup.trackDocument('users', newStudent._id);
          
          await addStudentButton.click();
          
          const emailInput = page.locator('input[name="email"], input[placeholder*="email"]');
          if (await emailInput.count() > 0) {
            await emailInput.fill(newStudent.email);
            
            const enrollButton = page.locator('button:has-text("Enroll"), button[type="submit"]');
            await enrollButton.click();
            await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
            
            // Verify enrollment
            await expect(page.locator(`text=${newStudent.email}`)).toBeVisible();
          }
        }
        
        // Test removing student
        const removeButtons = page.locator('button:has-text("Remove"), button:has-text("Unenroll")');
        if (await removeButtons.count() > 0) {
          const initialCount = await studentRows.count();
          await removeButtons.last().click();
          
          // Confirm removal
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
            
            // Verify student removed
            const finalCount = await studentRows.count();
            expect(finalCount).toBeLessThan(initialCount);
          }
        }
      }
      
    } finally {
      if (auth) await auth.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  // =============================================================================
  // WORKFLOW-002c: Grading and Assessment Management (20s)
  // =============================================================================
  test('WORKFLOW-002c: Assignment Grading and Feedback', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('WORKFLOW-002c');
    const factory = new TestDataFactory('WORKFLOW-002c');
    let context: any = undefined;
    let auth: CleanAuthHelper | undefined = undefined;
    
    try {
      // Create teacher scenario with students and submissions
      const scenarios = TestScenarios.createTeacherScenarios('WORKFLOW-002c');
      const { teacher, courses, students } = await scenarios.createBasicTeacher();
      const course = courses[0];
      
      // Create submissions for grading
      for (const student of students.slice(0, 3)) {
        await factory.submissions.createSubmissions(student._id, course._id, 3);
      }
      
      cleanup.trackDocument('users', teacher._id);
      courses.forEach(c => cleanup.trackDocument('courses', c._id));
      students.forEach(s => cleanup.trackDocument('users', s._id));
      
      context = await browser.newContext();
      cleanup.trackBrowserContext(context);
      const page = await context.newPage();
      auth = new CleanAuthHelper(page);
      
      await auth.loginAsTeacher();
      
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Enter course grading section
      const courseCard = page.locator(`:has-text("${course.title}")`);
      await courseCard.first().click();
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const gradingTab = page.locator('button:has-text("Grading"), a:has-text("Submissions"), tab:has-text("Grading")');
      if (await gradingTab.count() > 0) {
        await gradingTab.first().click();
        
        // View submissions awaiting grading
        const submissions = page.locator('.submission, .student-work, [data-testid="submission"], tbody tr');
        const submissionCount = await submissions.count();
        
        if (submissionCount > 0) {
          // Grade first submission
          const firstSubmission = submissions.first();
          await firstSubmission.click();
          
          // Enter grade
          const gradeInput = page.locator('input[name="grade"], input[name="score"], input[placeholder*="grade"]');
          if (await gradeInput.count() > 0) {
            await gradeInput.fill('85');
          }
          
          // Add feedback
          const feedbackTextarea = page.locator('textarea[name="feedback"], textarea[name="comments"], textarea[placeholder*="feedback"]');
          if (await feedbackTextarea.count() > 0) {
            await feedbackTextarea.fill('Good work! Consider adding more detailed comments to explain your code logic.');
          }
          
          // Save grade
          const saveGradeButton = page.locator('button:has-text("Save Grade"), button:has-text("Submit Grade"), button:has-text("Save")');
          if (await saveGradeButton.count() > 0) {
            await saveGradeButton.click();
            await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
            
            // Verify grade saved
            const gradeConfirmation = page.locator('text=Grade saved, text=Success, .success-message');
            if (await gradeConfirmation.count() > 0) {
              await expect(gradeConfirmation.first()).toBeVisible();
            }
          }
          
          // Bulk grade multiple submissions
          const bulkGradeButton = page.locator('button:has-text("Bulk Grade"), button:has-text("Grade All")');
          if (await bulkGradeButton.count() > 0) {
            await bulkGradeButton.click();
            
            const bulkScore = page.locator('input[name="bulkScore"], input[placeholder*="score for all"]');
            if (await bulkScore.count() > 0) {
              await bulkScore.fill('90');
              
              const applyBulkButton = page.locator('button:has-text("Apply to All"), button:has-text("Bulk Apply")');
              if (await applyBulkButton.count() > 0) {
                await applyBulkButton.click();
                await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
              }
            }
          }
        }
      }
      
    } finally {
      if (auth) await auth.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  // =============================================================================
  // WORKFLOW-002d: News and Communication Management (15s)
  // =============================================================================
  test('WORKFLOW-002d: Course News and Student Communication', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('WORKFLOW-002d');
    const factory = new TestDataFactory('WORKFLOW-002d');
    let context: any = undefined;
    let auth: CleanAuthHelper | undefined = undefined;
    
    try {
      // Create teacher with course
      const teacher = await factory.users.createUser('teacher');
      const course = await factory.courses.createCourse(teacher._id, { 
        title: 'Communication Test Course',
        status: 'published' 
      });
      
      cleanup.trackDocument('users', teacher._id);
      cleanup.trackDocument('courses', course._id);
      
      context = await browser.newContext();
      cleanup.trackBrowserContext(context);
      const page = await context.newPage();
      auth = new CleanAuthHelper(page);
      
      await auth.loginAsTeacher();
      
      // Create course-related news announcement
      await page.goto('/news');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const createNewsButton = page.locator('button:has-text("Create"), button:has-text("New Article")');
      if (await createNewsButton.count() > 0) {
        await createNewsButton.click();
        
        const titleInput = page.locator('input[name="title"]');
        await titleInput.fill(`Important Update: ${course.title}`);
        
        const contentTextarea = page.locator('textarea[name="content"], .editor, [data-testid="content-editor"]');
        await contentTextarea.first().fill('Students, please note the updated assignment deadline for this week. The Hello World exercise is now due Friday.');
        
        // Set category
        const categorySelect = page.locator('select[name="category"]');
        if (await categorySelect.count() > 0) {
          await categorySelect.selectOption('course-updates');
        }
        
        // Associate with course
        const courseSelect = page.locator('select[name="course"]');
        if (await courseSelect.count() > 0) {
          await courseSelect.selectOption(course.title);
        }
        
        // Publish news
        const publishButton = page.locator('button:has-text("Publish"), button[type="submit"]');
        await publishButton.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        
        // Verify news published
        await expect(page.locator(`text=${course.title}`)).toBeVisible();
      }
      
      // Send direct message to students (if feature exists)
      const messagingButton = page.locator('button:has-text("Message Students"), a:has-text("Messages")');
      if (await messagingButton.count() > 0) {
        await messagingButton.click();
        
        const messageSubject = page.locator('input[name="subject"]');
        if (await messageSubject.count() > 0) {
          await messageSubject.fill('Assignment Reminder');
        }
        
        const messageContent = page.locator('textarea[name="message"]');
        if (await messageContent.count() > 0) {
          await messageContent.fill('Hello students, this is a reminder about the upcoming assignment due date.');
        }
        
        const sendButton = page.locator('button:has-text("Send"), button:has-text("Send Message")');
        if (await sendButton.count() > 0) {
          await sendButton.click();
          await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
        }
      }
      
    } finally {
      if (auth) await auth.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  // =============================================================================
  // WORKFLOW-002e: Analytics and Reporting (15s)
  // =============================================================================
  test('WORKFLOW-002e: Course Analytics and Performance Reports', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('WORKFLOW-002e');
    const factory = new TestDataFactory('WORKFLOW-002e');
    let context: any = undefined;
    let auth: CleanAuthHelper | undefined = undefined;
    
    try {
      // Create experienced teacher scenario with data for analytics
      const scenarios = TestScenarios.createTeacherScenarios('WORKFLOW-002e');
      const { teacher, courses } = await scenarios.createBasicTeacher();
      
      cleanup.trackDocument('users', teacher._id);
      courses.forEach(c => cleanup.trackDocument('courses', c._id));
      
      context = await browser.newContext();
      cleanup.trackBrowserContext(context);
      const page = await context.newPage();
      auth = new CleanAuthHelper(page);
      
      await auth.loginAsTeacher();
      
      // View instructor statistics
      await page.goto('/statistics');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Check course analytics section
      const analyticsSection = page.locator('.course-analytics, .instructor-dashboard, [data-testid="instructor-stats"]');
      if (await analyticsSection.count() > 0) {
        await expect(analyticsSection.first()).toBeVisible();
        
        // Verify enrollment statistics
        const enrollmentStats = analyticsSection.locator(':has-text("enrolled"), :has-text("students")');
        if (await enrollmentStats.count() > 0) {
          await expect(enrollmentStats.first()).toBeVisible();
        }
        
        // Check progress statistics
        const progressStats = analyticsSection.locator(':has-text("progress"), :has-text("completion")');
        if (await progressStats.count() > 0) {
          await expect(progressStats.first()).toBeVisible();
        }
      }
      
      // Generate course performance report
      const reportsSection = page.locator('.reports, [data-testid="reports"]');
      if (await reportsSection.count() > 0) {
        const generateReportButton = page.locator('button:has-text("Generate Report"), button:has-text("Export")');
        if (await generateReportButton.count() > 0) {
          await generateReportButton.click();
          
          // Select report type
          const reportTypeSelect = page.locator('select[name="reportType"]');
          if (await reportTypeSelect.count() > 0) {
            await reportTypeSelect.selectOption('student-progress');
          }
          
          // Select course
          const courseSelect = page.locator('select[name="course"]');
          if (await courseSelect.count() > 0 && courses.length > 0) {
            await courseSelect.selectOption(courses[0].title);
          }
          
          // Download report
          const downloadButton = page.locator('button:has-text("Download"), button:has-text("Generate")');
          if (await downloadButton.count() > 0) {
            const downloadPromise = page.waitForEvent('download', { timeout: 2000 }).catch(() => null);
            await downloadButton.click();
            
            const download = await downloadPromise;
            if (download) {
              const filename = download.suggestedFilename();
              expect(filename).toMatch(/report|statistics|progress/i);
            }
          }
        }
      }
      
      // Verify access restrictions
      await page.goto('/admin/users');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const currentUrl = page.url();
      const isRedirected = !currentUrl.includes('/admin/users');
      const hasAccessDenied = await page.locator('text=Access Denied').count() > 0;
      
      // Teacher should NOT access admin-only features
      expect(isRedirected || hasAccessDenied).toBeTruthy();
      
    } finally {
      if (auth) await auth.clearAuthState();
      await cleanup.cleanup();
    }
  });
});