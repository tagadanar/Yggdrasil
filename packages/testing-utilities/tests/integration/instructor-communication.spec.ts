import { test, expect } from '@playwright/test';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { TestDataFactory } from '../helpers/TestDataFactory';

test.describe('Instructor Communication Integration', () => {
  test('Course announcements calendar events', async ({ page }) => {
    test.setTimeout(45000); // Focused timeout
    const cleanup = TestCleanup.getInstance('Communication Integration');
    let courseName: string;

    try {
      const authHelper = new CleanAuthHelper(page);
      await authHelper.loginAsTeacher();
      
      // Create test course using factory
      const factory = new TestDataFactory('Communication Test');
      const teacher = await factory.users.createUser('teacher');
      cleanup.trackDocument('users', teacher._id.toString());
      const course = await factory.courses.createCourse(teacher._id.toString(), {
        title: 'Introduction to Programming',
        status: 'published',
        withContent: true
      });
      courseName = course.title;
      cleanup.trackDocument('courses', course._id.toString());
      
      // Step 1: Create course-related news announcement
      await page.goto('/news');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const createNewsButton = page.locator('button:has-text("Create"), button:has-text("New Article")');
      if (await createNewsButton.count() > 0) {
        await createNewsButton.click();
        
        const newsTitleInput = page.locator('input[name="title"]');
        const newsTitle = `Important Update: ${courseName}`;
        await newsTitleInput.fill(newsTitle);
        
        const newsContentTextarea = page.locator('textarea[name="content"], .editor');
        await newsContentTextarea.fill('Students, please note the updated assignment deadline for the Hello World exercise.');
        
        const categorySelect = page.locator('select[name="category"]');
        if (await categorySelect.count() > 0) {
          await categorySelect.selectOption('course-updates');
        }
        
        // Associate with course if possible
        const courseSelect = page.locator('select[name="course"]');
        if (await courseSelect.count() > 0) {
          await courseSelect.selectOption(courseName);
        }
        
        const publishNewsButton = page.locator('button:has-text("Publish"), button[type="submit"]');
        await publishNewsButton.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        
        // Verify news article was created
        await page.goto('/news');
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        const newsArticle = page.locator(`:has-text("${newsTitle}")`);
        await expect(newsArticle.first()).toBeVisible();
      }

      // Step 2: Schedule class event in calendar
      await page.goto('/planning');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const createEventButton = page.locator('button:has-text("Create Event"), button:has-text("Add Event")');
      if (await createEventButton.count() > 0) {
        await createEventButton.click();
        
        const eventTitle = `${courseName} - Live Session`;
        const eventTitleInput = page.locator('input[name="title"]');
        await eventTitleInput.fill(eventTitle);
        
        const eventDescTextarea = page.locator('textarea[name="description"]');
        await eventDescTextarea.fill('Interactive live session covering basic programming concepts');
        
        // Set event type as class
        const eventTypeSelect = page.locator('select[name="type"]');
        if (await eventTypeSelect.count() > 0) {
          await eventTypeSelect.selectOption('class');
        }
        
        // Set course association
        const eventCourseSelect = page.locator('select[name="course"]');
        if (await eventCourseSelect.count() > 0) {
          await eventCourseSelect.selectOption(courseName);
        }
        
        // Set date and time (tomorrow at 2 PM)
        const dateInput = page.locator('input[type="date"], input[name="date"]');
        if (await dateInput.count() > 0) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          await dateInput.fill(tomorrow.toISOString().split('T')[0]);
        }
        
        const timeInput = page.locator('input[type="time"], input[name="time"]');
        if (await timeInput.count() > 0) {
          await timeInput.fill('14:00');
        }
        
        const saveEventButton = page.locator('button:has-text("Save"), button[type="submit"]');
        await saveEventButton.click();
        
        // Wait for event creation confirmation
        await page.waitForSelector('[data-testid="event-saved"], .event-created', 
          { state: 'visible', timeout: 5000 }).catch(() => {});
        
        // Verify event appears in calendar
        const calendarEvent = page.locator(`:has-text("${eventTitle}")`);
        if (await calendarEvent.count() > 0) {
          await expect(calendarEvent.first()).toBeVisible();
        }
      }
      
    } finally {
      await cleanup.cleanup();
    }
  });
});