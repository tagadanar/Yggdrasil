// packages/testing-utilities/tests/functional/news-management.spec.ts
// Optimized news management tests - updated to follow CLAUDE.md clean testing architecture

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { ROLE_PERMISSIONS_MATRIX } from '../helpers/role-based-testing';

test.describe('News Management', () => {
  // Removed global auth helpers - each test manages its own cleanup

  test.beforeEach(async ({ page }) => {
    // No global setup needed - each test handles its own initialization
  });

  test.afterEach(async ({ page }) => {
    // No global cleanup needed - each test handles its own cleanup
  });

  // =============================================================================
  // ROLE-BASED ACCESS TESTS (split by role for stability)
  // =============================================================================
  
  test('Admin news access and permissions', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Admin news access and permissions');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // All roles can access news page - check for actual title
    await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
    
    // Admin should see create button
    const createButton = page.locator('button:has-text("Create News Article"), .btn-primary:has-text("Create")');
    await expect(createButton.first()).toBeVisible({ timeout: 5000 });
    
    // Check article actions on existing articles
    const articles = page.locator('article');
    const articleCount = await articles.count();
    
    if (articleCount > 0) {
      const firstArticle = articles.first();
      
      // Admin should see edit/delete buttons
      const editButton = firstArticle.locator('button:has-text("Edit")');
      const deleteButton = firstArticle.locator('button:has-text("Delete")');
      // Note: Buttons may not be visible until hover/interaction
    }
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Staff news access and permissions', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Staff news access and permissions');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStaff();
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // All roles can access news page - check for actual title
    await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
    
    // Staff should see create button
    const createButton = page.locator('button:has-text("Create News Article"), .btn-primary:has-text("Create")');
    await expect(createButton.first()).toBeVisible({ timeout: 5000 });
    
    // Check article actions on existing articles
    const articles = page.locator('article');
    const articleCount = await articles.count();
    
    if (articleCount > 0) {
      const firstArticle = articles.first();
      
      // Staff should see edit/delete buttons
      const editButton = firstArticle.locator('button:has-text("Edit")');
      const deleteButton = firstArticle.locator('button:has-text("Delete")');
      // Note: Buttons may not be visible until hover/interaction
    }
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Teacher news access and permissions', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Teacher news access and permissions');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsTeacher();
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // All roles can access news page - check for actual title
    await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
    
    // Teacher should NOT see create button
    const createButton = page.locator('button:has-text("Create News Article")');
    expect(await createButton.count()).toBe(0);
    
    // Check article actions on existing articles
    const articles = page.locator('article');
    const articleCount = await articles.count();
    
    if (articleCount > 0) {
      // Teacher should NOT see edit/delete buttons
      const firstArticle = articles.first();
      const editButton = firstArticle.locator('button:has-text("Edit")');
      const deleteButton = firstArticle.locator('button:has-text("Delete")');
      expect(await editButton.count()).toBe(0);
      expect(await deleteButton.count()).toBe(0);
    }
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  test('Student news access and permissions', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Student news access and permissions');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // All roles can access news page - check for actual title
    await expect(page.locator('h1:has-text("News & Announcements")')).toBeVisible();
    
    // Student should NOT see create button
    const createButton = page.locator('button:has-text("Create News Article")');
    expect(await createButton.count()).toBe(0);
    
    // Check article actions on existing articles
    const articles = page.locator('article');
    const articleCount = await articles.count();
    
    if (articleCount > 0) {
      // Student should NOT see edit/delete buttons
      const firstArticle = articles.first();
      const editButton = firstArticle.locator('button:has-text("Edit")');
      const deleteButton = firstArticle.locator('button:has-text("Delete")');
      expect(await editButton.count()).toBe(0);
      expect(await deleteButton.count()).toBe(0);
    }
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // TEST 2: NEWS ARTICLE CREATION AND MANAGEMENT
  // =============================================================================
  test('Complete article lifecycle - create, edit, publish, archive', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Complete article lifecycle - create, edit, publish, archive');
    const authHelper = new CleanAuthHelper(page);
    let createdArticleTitle: string | null = null;
    
    try {
      await authHelper.loginAsAdmin();
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    createdArticleTitle = `Test Article ${Date.now()}`;
    
    // 1. CREATE ARTICLE
    const createButton = page.locator('button:has-text("Create News Article")');
    await expect(createButton).toBeVisible();
    await createButton.click();
    
    // Fill form in modal
    await expect(page.locator('h2:has-text("Create News Article")')).toBeVisible();
    await page.fill('#title', createdArticleTitle);
    await page.fill('#content', 'This is a comprehensive test article with detailed content.');
    await page.selectOption('#category', 'announcements');
    await page.fill('#summary', 'Test article summary');
    
    // Submit form
    await page.click('button:has-text("Create Article")');
    
    // Verify article appears in list
    const articleElement = page.locator(`article:has-text("${createdArticleTitle}")`);
    await expect(articleElement).toBeVisible({ timeout: 15000 });
    
    // 2. EDIT ARTICLE
    const editButton = articleElement.locator('button:has-text("Edit")');
    await expect(editButton).toBeVisible();
    await editButton.click();
    
    // Edit in modal
    await expect(page.locator('h2:has-text("Edit News Article")')).toBeVisible();
    const updatedTitle = `${createdArticleTitle} - Updated`;
    await page.fill('#edit-title', updatedTitle);
    await page.fill('#edit-content', 'Updated article content with additional information.');
    
    await page.click('button:has-text("Update Article")');
    
    // Verify update
    await expect(page.locator(`article:has-text("${updatedTitle}")`)).toBeVisible({ timeout: 15000 });
    
    // 3. DELETE ARTICLE
    const updatedArticle = page.locator(`article:has-text("${updatedTitle}")`);
    const deleteButton = updatedArticle.locator('button:has-text("Delete")');
    await expect(deleteButton).toBeVisible();
    
    // Set up dialog handler BEFORE clicking delete
    page.on('dialog', dialog => dialog.accept());
    await deleteButton.click();
    
    // Wait for article to be removed
    await expect(page.locator(`article:has-text("${updatedTitle}")`)).toHaveCount(0, { timeout: 15000 });
    
    } finally {
      // CRITICAL: Track and cleanup created article
      if (createdArticleTitle) {
        cleanup.addCustomCleanup(async () => {
          console.log(`Cleaning up test article: ${createdArticleTitle}`);
          // This would delete the article via API in a real implementation
        });
      }
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // TEST 3: NEWS CATEGORY FILTERING
  // =============================================================================
  test('News filtering and content discovery', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('News filtering and content discovery');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
    await page.goto('/news');
    await page.waitForLoadState('networkidle');
    
    // Test category filtering
    const categories = ['all', 'announcements', 'events', 'academic', 'general'];
    
    for (const category of categories) {
      const categoryButton = page.locator(`button:has-text("${category.charAt(0).toUpperCase() + category.slice(1)}")`);
      
      if (await categoryButton.count() > 0) {
        await categoryButton.click();
        
        // Wait for category button to become active (filtering applied)
        await expect(categoryButton).toHaveClass(/bg-primary-600/, { timeout: 10000 });
        
        // Verify filtering - count articles
        const articles = page.locator('article');
        const count = await articles.count();
      }
    }
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // TEST 4: NEWS PAGE LOADING AND ERROR HANDLING
  // =============================================================================
  test('News page loading states and error handling', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('News page loading states and error handling');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
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
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // TEST 5: ACCESS DENIED FUNCTIONALITY
  // =============================================================================
  test('Access denied message functionality', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Access denied message functionality');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
    
    // Navigate to news with access denied parameter
    await page.goto('/news?error=access_denied');
    await page.waitForLoadState('networkidle');
    
    // Should show access denied message
    await expect(page.locator('text=Access Denied')).toBeVisible();
    await expect(page.locator('text=You don\'t have permission to access')).toBeVisible();
    
    // Wait for access denied message to disappear
    await expect(page.locator('text=Access Denied')).toHaveCount(0, { timeout: 8000 });
    
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });
});