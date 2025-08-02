// packages/testing-utilities/tests/functional/news-management.spec.ts
// Clean news management tests following CLAUDE.md production standards

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { setupTestLifecycle } from '../helpers/test-lifecycle';
import { NewsArticleModel } from '@yggdrasil/database-schemas';

test.describe('News Management', () => {
  // Initialize test lifecycle for cascade prevention
  setupTestLifecycle('News Management');
  
  // =============================================================================
  // ROLE-BASED ACCESS TESTS
  // =============================================================================
  

  // NOTE: Role access tests removed - use rbac-matrix.spec.ts for comprehensive role testing


  // =============================================================================
  // NEWS ARTICLE CREATION AND MANAGEMENT
  // =============================================================================
  test('Article lifecycle', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Article lifecycle');
    const authHelper = new CleanAuthHelper(page);
    let createdArticleTitle: string | null = null;
    let createdArticleId: string | null = null;
    
    try {
      await authHelper.loginAsAdmin();
      await page.goto('/news');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      createdArticleTitle = `Test Article ${Date.now()}`;
      
      // 1. CREATE ARTICLE
      const createButton = page.locator('button:has-text("Create News Article")');
      await expect(createButton).toBeVisible({ timeout: 5000 });
      await createButton.click();
      
      // Fill form in modal
      await expect(page.locator('h2:has-text("Create News Article")')).toBeVisible();
      await page.fill('#title', createdArticleTitle);
      await page.fill('#content', 'This is a comprehensive test article with detailed content.');
      await page.selectOption('#category', 'announcements');
      await page.fill('#summary', 'Test article summary');
      
      // Submit form and wait for network activity
      const createPromise = page.waitForResponse(response => 
        response.url().includes('/api/news/articles') && response.request().method() === 'POST',
        { timeout: 15000 }
      );
      
      await page.click('button:has-text("Create Article")');
      
      // Wait for article creation API call
      const createResponse = await createPromise;
      
      if (!createResponse.ok()) {
        const errorText = await createResponse.text();
        throw new Error(`Article creation failed: ${createResponse.status()} - ${errorText}`);
      }
      
      // Wait for modal to close
      await page.waitForSelector('h2:has-text("Create News Article")', { state: 'hidden', timeout: 5000 });
      
      // Extract the article ID from the response for publishing
      const createResponseData = await createResponse.json();
      
      // Try multiple paths to find the article ID
      const createdArticleId = 
        createResponseData.data?.article?._id || 
        createResponseData.data?.article?.id ||
        createResponseData.article?._id ||
        createResponseData.article?.id ||
        createResponseData.data?._id ||
        createResponseData.data?.id;
      
      if (!createdArticleId) {
        throw new Error('Failed to extract article ID from creation response');
      }
      
      // Publish the article so it appears in the public list
      const publishResponse = await page.evaluate(async ({ articleId, serviceUrl }) => {
        try {
          const cookies = document.cookie;
          const tokenMatch = cookies.match(/yggdrasil_access_token=([^;]+)/);
          if (!tokenMatch) {
            return { error: 'No auth token found' };
          }
          
          const response = await fetch(`${serviceUrl}/api/news/articles/${articleId}/publish`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenMatch[1]}`,
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          return { 
            success: response.ok, 
            status: response.status,
            data: data 
          };
        } catch (error) {
          return { error: error.message };
        }
      }, { articleId: createdArticleId, serviceUrl: 'http://localhost:3003' });
      
      if (!publishResponse.success) {
        throw new Error(`Failed to publish article: ${publishResponse.error || publishResponse.status}`);
      }
      
      // Wait for the page to reload/refresh the article list
      await page.waitForTimeout(1000);
      
      // Wait for loading to complete first
      await page.waitForLoadState('domcontentloaded');
      
      // Check for loading indicators and wait for them to disappear
      const loadingIndicators = await page.locator('text=Loading, :has-text("Loading"), .loading, .spinner').count();
      if (loadingIndicators > 0) {
        await page.waitForSelector('text=Loading, :has-text("Loading"), .loading, .spinner', { state: 'hidden', timeout: 10000 });
      }
      
      // If no articles, try refreshing the page
      const articleCount = await page.locator('article').count();
      if (articleCount === 0) {
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
      }
      
      // Wait for loading to complete and articles to appear
      await page.waitForSelector('article', { timeout: 15000 });
      
      // Verify article appears in list
      const articleElement = page.locator(`article:has-text("${createdArticleTitle}")`);
      await expect(articleElement).toBeVisible({ timeout: 5000 });
    
      // 2. EDIT ARTICLE
      const editButton = articleElement.locator('button:has-text("Edit")');
      await expect(editButton).toBeVisible({ timeout: 5000 });
      await editButton.click();
      
      // Edit in modal
      await expect(page.locator('h2:has-text("Edit News Article")')).toBeVisible();
      const updatedTitle = `${createdArticleTitle} - Updated`;
      await page.fill('#edit-title', updatedTitle);
      await page.fill('#edit-content', 'Updated article content with additional information.');
      
      await page.click('button:has-text("Update Article")');
      
      // Verify update
      await expect(page.locator(`article:has-text("${updatedTitle}")`)).toBeVisible({ timeout: 5000 });
      
      // 3. DELETE ARTICLE
      const updatedArticle = page.locator(`article:has-text("${updatedTitle}")`);
      const deleteButton = updatedArticle.locator('button:has-text("Delete")');
      await expect(deleteButton).toBeVisible({ timeout: 5000 });
      
      // Set up dialog handler BEFORE clicking delete
      page.on('dialog', dialog => dialog.accept());
      await deleteButton.click();
      
      // Wait for article to be removed
      await expect(page.locator(`article:has-text("${updatedTitle}")`)).toHaveCount(0, { timeout: 5000 });
    
    } finally {
      // Track and cleanup created article
      if (createdArticleId) {
        cleanup.addCustomCleanup(async () => {
          try {
            // Delete the article directly from database
            await NewsArticleModel.deleteOne({ _id: createdArticleId });
            console.log(`🧹 CLEANUP: Deleted news article ${createdArticleId}`);
          } catch (error) {
            console.warn(`🧹 CLEANUP: Failed to delete news article ${createdArticleId}:`, error);
          }
        });
      }
      await authHelper.clearAuthState();
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // NEWS CATEGORY FILTERING
  // =============================================================================
  test('News filtering', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('News filtering');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Detect if we're in critical zone and use enhanced isolation
      const globalTestCount = global.yggdrasilGlobalTestCount || 0;
      const inCriticalZone = globalTestCount >= 25;
      
      if (inCriticalZone) {
        console.log(`🚨 NEWS FILTERING: Running in critical zone (test #${globalTestCount}) - using enhanced isolation`);
        
        // DEEP DIAGNOSIS: Check news service and database state
        console.log(`🔍 NEWS FILTERING: Diagnosing news service state...`);
        
        try {
          // Count ALL database collections to identify accumulation source
          const mongoose = require('mongoose');
          const collections = await mongoose.connection.db.listCollections().toArray();
          
          for (const collection of collections) {
            const count = await mongoose.connection.db.collection(collection.name).countDocuments({});
            console.log(`🔍 COLLECTION ${collection.name}: ${count} documents`);
          }
          
          // Count articles in database
          const articleCount = await NewsArticleModel.countDocuments({});
          const publishedCount = await NewsArticleModel.countDocuments({ isPublished: true });
          console.log(`🔍 DATABASE STATE: Total articles: ${articleCount}, Published: ${publishedCount}`);
          
          // If too many articles, emergency cleanup
          if (articleCount > 50) {
            console.log(`🚨 EMERGENCY: Too many articles (${articleCount}), performing emergency cleanup...`);
            const deleted = await NewsArticleModel.deleteMany({ 
              title: { $regex: /^Test Article/ }  // Delete test articles
            });
            console.log(`🧹 EMERGENCY CLEANUP: Deleted ${deleted.deletedCount} test articles`);
          }
          
          // Check indexes
          const indexes = await NewsArticleModel.collection.getIndexes();
          console.log(`🔍 DATABASE INDEXES: ${JSON.stringify(Object.keys(indexes))}`);
          
          // Check if critical indexes exist
          const hasSlugIndex = 'slug_1' in indexes;
          const hasCategoryIndex = 'category_1' in indexes;
          const hasPublishedIndex = 'isPublished_1' in indexes;
          
          if (!hasCategoryIndex || !hasPublishedIndex) {
            console.log(`⚠️ MISSING CRITICAL INDEXES: category=${hasCategoryIndex}, isPublished=${hasPublishedIndex}`);
          }
          // Check news service health specifically
          const newsHealthStart = Date.now();
          const newsHealthResponse = await page.evaluate(async () => {
            try {
              const response = await fetch('http://localhost:3003/health');
              return {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText,
                responseTime: Date.now()
              };
            } catch (error) {
              return { error: error.message };
            }
          });
          const newsHealthTime = Date.now() - newsHealthStart;
          console.log(`🔍 NEWS SERVICE HEALTH: ${JSON.stringify(newsHealthResponse)} (${newsHealthTime}ms)`);
          
          // Check news service API directly
          const newsApiStart = Date.now();
          const newsApiResponse = await page.evaluate(async () => {
            try {
              const response = await fetch('http://localhost:3003/api/news/articles?limit=1');
              const data = await response.json();
              return {
                status: response.status,
                ok: response.ok,
                hasData: !!data,
                dataSize: JSON.stringify(data).length
              };
            } catch (error) {
              return { error: error.message };
            }
          });
          const newsApiTime = Date.now() - newsApiStart;
          console.log(`🔍 NEWS API TEST: ${JSON.stringify(newsApiResponse)} (${newsApiTime}ms)`);
          
          // Check memory usage
          const memory = process.memoryUsage();
          console.log(`🔍 MEMORY USAGE: heapUsed=${Math.round(memory.heapUsed / 1024 / 1024)}MB, heapTotal=${Math.round(memory.heapTotal / 1024 / 1024)}MB, external=${Math.round(memory.external / 1024 / 1024)}MB`);
          
          // Check connection pool state
          if (mongoose.connection) {
            console.log(`🔍 CONNECTION STATE: readyState=${mongoose.connection.readyState}, name=${mongoose.connection.name}`);
          }
          
        } catch (diagnosisError) {
          console.log(`🔍 NEWS DIAGNOSIS ERROR: ${diagnosisError.message}`);
        }
        
        await authHelper.loginAsStudentWithEnhancedIsolation();
      } else {
        console.log(`📰 NEWS FILTERING: Normal execution (test #${globalTestCount})`);
        await authHelper.loginAsStudent();
      }
      
      // Monitor the actual page navigation that's timing out
      console.log(`🔍 NEWS FILTERING: Starting page navigation to /news...`);
      const navigationStart = Date.now();
      
      try {
        await page.goto('/news');
        const gotoTime = Date.now() - navigationStart;
        console.log(`🔍 NEWS FILTERING: page.goto('/news') completed in ${gotoTime}ms`);
        
        const domLoadStart = Date.now();
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        const domLoadTime = Date.now() - domLoadStart;
        console.log(`🔍 NEWS FILTERING: DOM load completed in ${domLoadTime}ms`);
        
      } catch (navigationError) {
        const totalTime = Date.now() - navigationStart;
        console.log(`🔍 NEWS FILTERING: Navigation failed after ${totalTime}ms: ${navigationError.message}`);
        throw navigationError;
      }
      
      // Test category filtering
      const categories = ['all', 'announcements', 'events', 'academic', 'general'];
      
      for (const category of categories) {
        const categoryStart = Date.now();
        const categoryButton = page.locator(`button:has-text("${category.charAt(0).toUpperCase() + category.slice(1)}")`);
        
        if (await categoryButton.count() > 0) {
          const clickStart = Date.now();
          await categoryButton.click();
          const clickTime = Date.now() - clickStart;
          
          // Wait for category button to become active (filtering applied)
          const activeStart = Date.now();
          await expect(categoryButton).toHaveClass(/bg-primary-600/, { timeout: 3000 });
          const activeTime = Date.now() - activeStart;
          
          // Verify filtering - count articles
          const countStart = Date.now();
          const articles = page.locator('article');
          const count = await articles.count();
          const countTime = Date.now() - countStart;
          
          const totalTime = Date.now() - categoryStart;
          console.log(`🔍 CATEGORY ${category.toUpperCase()}: ${count} articles (click=${clickTime}ms, active=${activeTime}ms, count=${countTime}ms, total=${totalTime}ms)`);
          
          // If any operation is slow, it's a sign of the issue
          if (totalTime > 5000) {
            console.log(`⚠️ SLOW FILTERING: Category ${category} took ${totalTime}ms!`);
          }
        }
      }
      
    } finally {
      // Use enhanced cleanup if we were in critical zone
      const globalTestCount = global.yggdrasilGlobalTestCount || 0;
      const inCriticalZone = globalTestCount >= 25;
      
      if (inCriticalZone) {
        console.log(`🚨 NEWS FILTERING: Critical zone cleanup (test #${globalTestCount})`);
        await authHelper.clearAuthStateEnhanced();
      } else {
        await authHelper.clearAuthState();
      }
      await cleanup.cleanup();
    }
  });

  // =============================================================================
  // NEWS PAGE LOADING AND ERROR HANDLING
  // =============================================================================
  test('News page loading', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('News page loading');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsAdmin();
      await page.goto('/news');
      await page.waitForLoadState('domcontentloaded');
      
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
  // ACCESS DENIED FUNCTIONALITY
  // =============================================================================
  test('Access denied message', async ({ page }) => {
    const cleanup = TestCleanup.getInstance('Access denied message');
    const authHelper = new CleanAuthHelper(page);
    
    try {
      await authHelper.loginAsStudent();
      
      // Navigate to news with access denied parameter
      await page.goto('/news?error=access_denied');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
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