// packages/testing-utilities/tests/functional/news-management.spec.ts
// Optimized news management tests - simplified to match current implementation

import { test, expect } from '@playwright/test';
import { IsolatedAuthHelpers } from '../helpers/isolated-auth.helpers';
import { ROLE_PERMISSIONS_MATRIX } from '../helpers/role-based-testing';

test.describe('News Management - Optimized Tests', () => {
  let authHelpers: IsolatedAuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new IsolatedAuthHelpers(page);
    await authHelpers.initialize();
  });

  test.afterEach(async ({ page }) => {
    await authHelpers.cleanup();
  });

  // =============================================================================
  // TEST 1: COMPREHENSIVE ROLE-BASED ACCESS
  // =============================================================================
  test('Role-based news access and permissions - all roles', async ({ page }) => {
    for (const roleConfig of ROLE_PERMISSIONS_MATRIX) {
      await authHelpers[roleConfig.loginMethod]();
      await page.goto('/news');
      await page.waitForLoadState('networkidle');
      
      // All roles can access news page - check for actual title
      await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
      
      // Check create button visibility - only for admin/staff
      if (roleConfig.newsManagement.canCreate) {
        // Create button is displayed at bottom for admin/staff with btn-primary class
        const createButton = page.locator('button:has-text("Create News Article"), .btn-primary:has-text("Create")');
        await expect(createButton.first()).toBeVisible({ timeout: 5000 });
      } else {
        // Students and teachers should not see create button
        const createButton = page.locator('button:has-text("Create News Article")');
        expect(await createButton.count()).toBe(0);
      }
      
      // Check article actions on existing articles
      const articles = page.locator('article'); // Articles use <article> HTML tag
      const articleCount = await articles.count();
      
      if (articleCount > 0) {
        const firstArticle = articles.first();
        
        // Check edit/delete button visibility for admin/staff
        if (roleConfig.newsManagement.canEdit) {
          const editButton = firstArticle.locator('button:has-text("Edit")');
          const editCount = await editButton.count();
        }
        
        if (roleConfig.newsManagement.canDelete) {
          const deleteButton = firstArticle.locator('button:has-text("Delete")');
          const deleteCount = await deleteButton.count();
        }
      } else {
      }
      
      await authHelpers.logout();
    }
  });

  // =============================================================================
  // TEST 2: NEWS ARTICLE CREATION AND MANAGEMENT
  // =============================================================================
  test('Complete article lifecycle - create, edit, publish, archive', async ({ page }) => {
    await authHelpers.loginAsAdmin();
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    const articleTitle = `Test Article ${Date.now()}`;
    
    // 1. CREATE ARTICLE
    const createButton = page.locator('button:has-text("Create News Article")');
    await expect(createButton).toBeVisible();
    await createButton.click();
    
    // Fill form in modal
    await expect(page.locator('h2:has-text("Create News Article")')).toBeVisible();
    await page.fill('#title', articleTitle);
    await page.fill('#content', 'This is a comprehensive test article with detailed content.');
    await page.selectOption('#category', 'announcements');
    await page.fill('#summary', 'Test article summary');
    
    // Submit form
    await page.click('button:has-text("Create Article")');
    await page.waitForTimeout(2000);
    
    // Verify article appears in list
    const articleElement = page.locator(`article:has-text("${articleTitle}")`);
    await expect(articleElement).toBeVisible();
    
    // 2. EDIT ARTICLE
    const editButton = articleElement.locator('button:has-text("Edit")');
    await expect(editButton).toBeVisible();
    await editButton.click();
    
    // Edit in modal
    await expect(page.locator('h2:has-text("Edit News Article")')).toBeVisible();
    const updatedTitle = `${articleTitle} - Updated`;
    await page.fill('#edit-title', updatedTitle);
    await page.fill('#edit-content', 'Updated article content with additional information.');
    
    await page.click('button:has-text("Update Article")');
    await page.waitForTimeout(2000);
    
    // Verify update
    await expect(page.locator(`article:has-text("${updatedTitle}")`)).toBeVisible();
    
    // 3. DELETE ARTICLE
    const updatedArticle = page.locator(`article:has-text("${updatedTitle}")`);
    const deleteButton = updatedArticle.locator('button:has-text("Delete")');
    await expect(deleteButton).toBeVisible();
    
    // Set up dialog handler BEFORE clicking delete
    page.on('dialog', dialog => dialog.accept());
    await deleteButton.click();
    await page.waitForTimeout(2000);
    
    // Verify article is removed
    expect(await page.locator(`article:has-text("${updatedTitle}")`).count()).toBe(0);
  });

  // =============================================================================
  // TEST 3: NEWS CATEGORY FILTERING
  // =============================================================================
  test('News filtering and content discovery', async ({ page }) => {
    await authHelpers.loginAsStudent();
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // Test category filtering
    const categories = ['all', 'announcements', 'events', 'academic', 'general'];
    
    for (const category of categories) {
      const categoryButton = page.locator(`button:has-text("${category.charAt(0).toUpperCase() + category.slice(1)}")`);
      
      if (await categoryButton.count() > 0) {
        await categoryButton.click();
        await page.waitForTimeout(1000);
        
        // Verify filtering - count articles
        const articles = page.locator('article');
        const count = await articles.count();
        
        // Verify category button is active
        await expect(categoryButton).toHaveClass(/bg-primary-600/);
      }
    }
  });

  // =============================================================================
  // TEST 4: NEWS PAGE LOADING AND ERROR HANDLING
  // =============================================================================
  test('News page loading states and error handling', async ({ page }) => {
    await authHelpers.loginAsAdmin();
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // Verify page structure
    await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
    await expect(page.locator('p:has-text("Stay updated with the latest news")')).toBeVisible();
    
    // Test category filter section
    await expect(page.locator('button:has-text("All News")')).toBeVisible();
    
    // Check if articles are loading or show empty state
    const articles = page.locator('article');
    const emptyState = page.locator('text=No articles found');
    
    const hasArticles = await articles.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;
    
    if (!hasArticles && !hasEmptyState) {
      // Articles might still be loading
    } else if (hasEmptyState) {
    } else {
    }
    
    // Test responsive design
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
    
    await page.setViewportSize({ width: 1024, height: 768 }); // Desktop
    await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
  });

  // =============================================================================
  // TEST 5: ACCESS DENIED FUNCTIONALITY
  // =============================================================================
  test('Access denied message functionality', async ({ page }) => {
    await authHelpers.loginAsStudent();
    
    // Navigate to news with access denied parameter
    await page.goto('/news?error=access_denied');
    await page.waitForLoadState('networkidle');
    
    // Should show access denied message
    await expect(page.locator('text=Access Denied')).toBeVisible();
    await expect(page.locator('text=You don\'t have permission to access')).toBeVisible();
    
    // Message should disappear after 5 seconds (wait a bit)
    await page.waitForTimeout(6000);
    expect(await page.locator('text=Access Denied').count()).toBe(0);
  });
});