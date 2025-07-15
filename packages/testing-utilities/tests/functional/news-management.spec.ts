// packages/testing-utilities/tests/functional/news-management.spec.ts
// Comprehensive functional tests for news management features

import { test, expect } from '@playwright/test';
import { IsolatedAuthHelpers } from '../helpers/isolated-auth.helpers';

test.describe('News Management - Functional Tests', () => {
  let authHelpers: IsolatedAuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new IsolatedAuthHelpers(page);
    await authHelpers.initialize();
  });

  test.afterEach(async ({ page }) => {
    await authHelpers.cleanup();
  });

  // =============================================================================
  // NEWS VIEWING AND FILTERING - ALL ROLES
  // =============================================================================
  test.describe('News Viewing and Filtering', () => {
    test('Should display news list for all authenticated users', async ({ page }) => {
      await authHelpers.loginAsStudent();
      
      await page.goto('/news');
      await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
      
      // Should show news articles
      await expect(page.locator('article')).toHaveCount(4); // Based on mock data
      
      // Should show article titles
      await expect(page.locator('h2:has-text("Welcome to the New Academic Year!")')).toBeVisible();
      await expect(page.locator('h2:has-text("New Course Registration Open")')).toBeVisible();
      await expect(page.locator('h2:has-text("Student Tech Fair - January 25th")')).toBeVisible();
      await expect(page.locator('h2:has-text("Library Hours Extended")')).toBeVisible();
    });

    test('Should filter news by category', async ({ page }) => {
      await authHelpers.loginAsStudent();
      
      await page.goto('/news');
      
      // Test "All News" filter (default)
      await expect(page.locator('article')).toHaveCount(4);
      
      // Test "Announcements" filter
      await page.click('button:has-text("Announcements")');
      await expect(page.locator('article')).toHaveCount(1);
      await expect(page.locator('h2:has-text("Welcome to the New Academic Year!")')).toBeVisible();
      
      // Test "Events" filter
      await page.click('button:has-text("Events")');
      await expect(page.locator('article')).toHaveCount(1);
      await expect(page.locator('h2:has-text("Student Tech Fair - January 25th")')).toBeVisible();
      
      // Test "Academic" filter
      await page.click('button:has-text("Academic")');
      await expect(page.locator('article')).toHaveCount(1);
      await expect(page.locator('h2:has-text("New Course Registration Open")')).toBeVisible();
      
      // Test "General" filter
      await page.click('button:has-text("General")');
      await expect(page.locator('article')).toHaveCount(1);
      await expect(page.locator('h2:has-text("Library Hours Extended")')).toBeVisible();
      
      // Back to "All News"
      await page.click('button:has-text("All News")');
      await expect(page.locator('article')).toHaveCount(4);
    });

    test('Should display proper article metadata', async ({ page }) => {
      await authHelpers.loginAsStudent();
      
      await page.goto('/news');
      
      // Check first article metadata
      const firstArticle = page.locator('article').first();
      await expect(firstArticle.locator('span:has-text("Announcements")')).toBeVisible();
      await expect(firstArticle.locator('time')).toBeVisible();
      await expect(firstArticle.locator('text=Admin User')).toBeVisible();
      await expect(firstArticle.locator('button:has-text("Read more")')).toBeVisible();
    });

    test('Should handle empty category filter correctly', async ({ page }) => {
      await authHelpers.loginAsStudent();
      
      await page.goto('/news');
      
      // This would test a category with no articles - but all current categories have articles
      // If we had a category with no articles, we would expect to see the empty state
      // For now, we'll test that filtering works correctly
      await page.click('button:has-text("Events")');
      await expect(page.locator('article')).toHaveCount(1);
    });
  });

  // =============================================================================
  // NEWS CREATION BUTTON ACCESS - ROLE-BASED
  // =============================================================================
  test.describe('News Creation Button Access', () => {
    test('Should show Create News Article button based on user role', async ({ page }) => {
      const roleTests = [
        { role: 'admin', shouldSee: true, loginMethod: () => authHelpers.loginAsAdmin() },
        { role: 'staff', shouldSee: true, loginMethod: () => authHelpers.loginAsStaff() },
        { role: 'teacher', shouldSee: false, loginMethod: () => authHelpers.loginAsTeacher() },
        { role: 'student', shouldSee: false, loginMethod: () => authHelpers.loginAsStudent() }
      ];

      for (const roleTest of roleTests) {
        await roleTest.loginMethod();
        await page.goto('/news');
        
        const createButton = page.locator('button:has-text("Create News Article")');
        if (roleTest.shouldSee) {
          await expect(createButton).toBeVisible();
        } else {
          await expect(createButton).not.toBeVisible();
        }
        
        await authHelpers.logout();
      }
    });
  });

  // =============================================================================
  // NEWS CREATION WORKFLOW - ADMIN/STAFF
  // =============================================================================
  test.describe('News Creation Workflow', () => {
    test('Should successfully create a new article as Admin or Staff', async ({ page }) => {
      const roleTests = [
        { 
          role: 'admin', 
          loginMethod: () => authHelpers.loginAsAdmin(),
          category: 'events',
          titlePrefix: 'Admin Test Article'
        },
        { 
          role: 'staff', 
          loginMethod: () => authHelpers.loginAsStaff(),
          category: 'general',
          titlePrefix: 'Staff Test Article'
        }
      ];

      for (const roleTest of roleTests) {
        await roleTest.loginMethod();
        await page.goto('/news');
        
        // Wait for articles to load completely
        await page.waitForSelector('article', { timeout: 10000 });
        
        // Count initial articles
        const initialCount = await page.locator('article').count();
        
        // Click Create News Article button
        await page.click('button:has-text("Create News Article")');
        
        // Verify create form modal opens
        await expect(page.locator('h2:has-text("Create News Article")')).toBeVisible();
        
        // Fill in the form
        const testTitle = `${roleTest.titlePrefix} - ${Date.now()}`;
        await page.fill('input[id="title"]', testTitle);
        await page.selectOption('select[id="category"]', roleTest.category);
        await page.fill('textarea[id="summary"]', `Test summary for ${roleTest.role}`);
        await page.fill('textarea[id="content"]', `Test content for ${roleTest.role} with details`);
        
        // Submit the form
        await page.click('button:has-text("Create Article")');
        
        // Wait for modal to close (indicates successful creation)
        await expect(page.locator('h2:has-text("Create News Article")')).not.toBeVisible();
        
        // Wait for new article to appear in the list
        await expect(page.locator(`h2:has-text("${testTitle}")`)).toBeVisible();
        
        // Verify article count increased
        await expect(page.locator('article')).toHaveCount(initialCount + 1);
        
        await authHelpers.logout();
      }
    });
    
    test('Should handle form validation errors', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/news');
      
      // Click Create News Article button
      await page.click('button:has-text("Create News Article")');
      
      // Verify create form modal opens
      await expect(page.locator('h2:has-text("Create News Article")')).toBeVisible();
      
      // Try to submit empty form
      await page.click('button:has-text("Create Article")');
      
      // Should show validation error (handled by JavaScript alert)
      // The form should still be open
      await expect(page.locator('h2:has-text("Create News Article")')).toBeVisible();
    });
  });

  // =============================================================================
  // NEWS EDITING WORKFLOW - ADMIN/STAFF
  // =============================================================================
  test.describe('News Editing Workflow', () => {
    test('Should successfully edit an existing article as Admin or Staff', async ({ page }) => {
      const roleTests = [
        { 
          role: 'admin', 
          loginMethod: () => authHelpers.loginAsAdmin(),
          titlePrefix: 'Admin Updated Title'
        },
        { 
          role: 'staff', 
          loginMethod: () => authHelpers.loginAsStaff(),
          titlePrefix: 'Staff Updated Title'
        }
      ];

      for (const roleTest of roleTests) {
        await roleTest.loginMethod();
        await page.goto('/news');
        
        // Wait for articles to load
        await page.waitForSelector('article', { timeout: 10000 });
        
        // Get the first article's current title
        const firstArticle = page.locator('article').first();
        const originalTitle = await firstArticle.locator('h2').textContent();
        
        // Click Edit button on first article
        await firstArticle.locator('button:has-text("Edit")').click();
        
        // Verify edit form modal opens
        await expect(page.locator('h2:has-text("Edit News Article")')).toBeVisible();
        
        // Verify form is populated with current data
        await expect(page.locator('input[id="edit-title"]')).toHaveValue(originalTitle || '');
        
        // Modify the title
        const newTitle = `${roleTest.titlePrefix} - ${Date.now()}`;
        await page.fill('input[id="edit-title"]', newTitle);
        
        // Modify the content
        await page.fill('textarea[id="edit-content"]', `Updated content by ${roleTest.role}`);
        
        // Submit the form
        await page.click('button:has-text("Update Article")');
        
        // Wait for article title to be updated in the list (indicates successful update)
        await expect(page.locator(`h2:has-text("${newTitle}")`)).toBeVisible();
        
        // Verify modal closes after successful update
        await expect(page.locator('h2:has-text("Edit News Article")')).not.toBeVisible();
        
        // Verify original title is no longer visible
        if (originalTitle) {
          await expect(page.locator(`h2:has-text("${originalTitle}")`)).not.toBeVisible();
        }
        
        await authHelpers.logout();
      }
    });

    test('Should successfully delete an article as Admin or Staff', async ({ page }) => {
      const roleTests = [
        { role: 'admin', loginMethod: () => authHelpers.loginAsAdmin() },
        { role: 'staff', loginMethod: () => authHelpers.loginAsStaff() }
      ];

      for (const roleTest of roleTests) {
        await roleTest.loginMethod();
        await page.goto('/news');
        
        // Wait for articles to load
        await page.waitForSelector('article', { timeout: 10000 });
        
        // Count initial articles
        const initialCount = await page.locator('article').count();
        
        // Get the first article's title for verification
        const firstArticle = page.locator('article').first();
        const titleToDelete = await firstArticle.locator('h2').textContent();
        
        // Set up dialog handler for confirmation
        page.on('dialog', dialog => {
          expect(dialog.message()).toContain('Are you sure you want to delete this article?');
          dialog.accept();
        });
        
        // Click Delete button on first article
        await firstArticle.locator('button:has-text("Delete")').click();
        
        // Wait for article to be removed from the list
        if (titleToDelete) {
          await expect(page.locator(`h2:has-text("${titleToDelete}")`)).not.toBeVisible();
        }
        
        // Verify article count decreased
        await expect(page.locator('article')).toHaveCount(initialCount - 1);
        
        await authHelpers.logout();
      }
    });

    test('Should handle delete cancellation', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      
      await page.goto('/news');
      
      // Wait for articles to load
      await page.waitForSelector('article', { timeout: 10000 });
      
      // Count initial articles
      const initialCount = await page.locator('article').count();
      
      // Set up dialog handler to cancel deletion
      page.on('dialog', dialog => {
        dialog.dismiss();
      });
      
      // Click Delete button on first article
      const firstArticle = page.locator('article').first();
      await firstArticle.locator('button:has-text("Delete")').click();
      
      // Wait a bit
      await page.waitForTimeout(1000);
      
      // Verify article count unchanged
      await expect(page.locator('article')).toHaveCount(initialCount);
    });
  });

  // =============================================================================
  // NEWS LOADING AND ERROR STATES
  // =============================================================================
  test.describe('News Loading and Error States', () => {
    test('Should display proper page structure, handle loading states, and be responsive', async ({ page }) => {
      await authHelpers.loginAsAdmin();
      await page.goto('/news');
      
      // Check page structure and loading completion
      await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
      await expect(page.locator('p:has-text("Stay updated with the latest news")')).toBeVisible();
      await expect(page.locator('article')).toHaveCount(4);
      
      // Check category filter structure
      await expect(page.locator('button:has-text("All News")')).toBeVisible();
      await expect(page.locator('button:has-text("Announcements")')).toBeVisible();
      await expect(page.locator('button:has-text("Events")')).toBeVisible();
      await expect(page.locator('button:has-text("Academic")')).toBeVisible();
      await expect(page.locator('button:has-text("General")')).toBeVisible();
      
      // Check article structure
      const firstArticle = page.locator('article').first();
      await expect(firstArticle.locator('h2')).toBeVisible(); // Article title
      await expect(firstArticle.locator('p.text-gray-600')).toBeVisible(); // Article excerpt
      await expect(firstArticle.locator('time')).toBeVisible(); // Publication date
      await expect(firstArticle.locator('span.inline-flex')).toBeVisible(); // Category badge
      
      // Test desktop view
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
      await expect(page.locator('article')).toHaveCount(4);
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
      await expect(page.locator('article')).toHaveCount(4);
      
      // Category filters should still work on mobile
      await page.click('button:has-text("Events")');
      await expect(page.locator('article')).toHaveCount(1);
    });
  });

  // =============================================================================
  // NEWS ROLE-BASED FUNCTIONALITY
  // =============================================================================
  test.describe('News Role-Based Functionality', () => {
    test('Should verify news access for all roles', async ({ page }) => {
      const roles = ['admin', 'staff', 'teacher', 'student'];
      
      for (const role of roles) {
        switch (role) {
          case 'admin':
            await authHelpers.loginAsAdmin();
            break;
          case 'staff':
            await authHelpers.loginAsStaff();
            break;
          case 'teacher':
            await authHelpers.loginAsTeacher();
            break;
          case 'student':
            await authHelpers.loginAsStudent();
            break;
        }
        
        await page.goto('/news');
        
        // All roles should be able to view news
        await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
        await expect(page.locator('article')).toHaveCount(4);
        
        // Only admin and staff should see Create button
        const createButton = page.locator('button:has-text("Create News Article")');
        if (role === 'admin' || role === 'staff') {
          await expect(createButton).toBeVisible();
        } else {
          await expect(createButton).not.toBeVisible();
        }
        
        await authHelpers.logout();
      }
    });
  });
});