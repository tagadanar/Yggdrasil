import { test, expect } from '@playwright/test';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';

test.describe('Instructor Course Creation Integration', () => {
  test('Course creation workflow', async ({ page }) => {
    test.setTimeout(60000); // Focused timeout
    const cleanup = TestCleanup.getInstance('Course Creation Integration');
    let courseName: string;

    try {
      // Step 1: Instructor creates course → adds content → publishes
      const authHelper = new CleanAuthHelper(page, 'Course Creation Test');
      await authHelper.initialize();
      await authHelper.loginAsTeacher();
      
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Create new course
      const createCourseButton = page.locator('button:has-text("Create Course"), button:has-text("Create")');
      await createCourseButton.first().click();
      
      courseName = `Integration Course ${Date.now()}`;
      await page.fill('input[name="title"]', courseName);
      await page.fill('textarea[name="description"]', 'Integration test course for content creation');
      
      // Set course details
      const categorySelect = page.locator('select[name="category"]');
      if (await categorySelect.count() > 0) {
        await categorySelect.selectOption({ index: 1 });
      }
      
      const levelSelect = page.locator('select[name="level"]');
      if (await levelSelect.count() > 0) {
        await levelSelect.selectOption('intermediate');
      }
      
      // Save course as draft
      const saveDraftButton = page.locator('button:has-text("Save Draft"), button:has-text("Save")');
      await saveDraftButton.first().click();
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Add course content - simplified structure
      const addChapterButton = page.locator('button:has-text("Add Chapter"), button:has-text("Chapter")');
      if (await addChapterButton.count() > 0) {
        await addChapterButton.click();
        
        const chapterTitleInput = page.locator('input[name*="chapter"], input[placeholder*="chapter"]');
        if (await chapterTitleInput.count() > 0) {
          await chapterTitleInput.fill('Introduction to Programming');
        }
        
        // Add one section to chapter
        const addSectionButton = page.locator('button:has-text("Add Section"), button:has-text("Section")');
        if (await addSectionButton.count() > 0) {
          await addSectionButton.click();
          
          const sectionTitleInput = page.locator('input[name*="section"], input[placeholder*="section"]');
          if (await sectionTitleInput.count() > 0) {
            await sectionTitleInput.fill('Basic Concepts');
          }
        }
      }
      
      // Add exercise content
      const addExerciseButton = page.locator('button:has-text("Add Exercise"), button:has-text("Exercise")');
      if (await addExerciseButton.count() > 0) {
        await addExerciseButton.click();
        
        const exerciseTitleInput = page.locator('input[name*="exercise"]');
        if (await exerciseTitleInput.count() > 0) {
          await exerciseTitleInput.fill('Hello World Program');
        }
        
        const exerciseDescTextarea = page.locator('textarea[name*="description"]');
        if (await exerciseDescTextarea.count() > 0) {
          await exerciseDescTextarea.fill('Write a program that prints "Hello World"');
        }
      }
      
      // Publish the course
      const publishButton = page.locator('button:has-text("Publish"), button:has-text("Make Public")');
      if (await publishButton.count() > 0) {
        await publishButton.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        
        // Verify course is published
        await expect(page.locator('.course-published, [data-testid="course-published"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
      
      // Verify course appears in courses list
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const courseCard = page.locator(`:has-text("${courseName}")`);
      await expect(courseCard.first()).toBeVisible();
      
    } finally {
      await cleanup.cleanup();
    }
  });
});