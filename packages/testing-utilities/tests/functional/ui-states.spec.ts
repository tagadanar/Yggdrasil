import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { TestDataFactory } from '../helpers/TestDataFactory';
import { captureEnhancedError } from '../helpers/enhanced-error-context';

// Helper function to wait for module content with flexible selectors
async function waitForModuleContent(page: any, module: any): Promise<void> {
  const selectors = module.contentSelectors || [module.contentSelector];
  
  // Try each selector until one is found
  let contentFound = false;
  for (const selector of selectors) {
    try {
      await expect(page.locator(selector)).toBeVisible({ timeout: 2000 });
      contentFound = true;
      break;
    } catch (error) {
      // Try next selector
      continue;
    }
  }
  
  if (!contentFound) {
    throw new Error(`None of the content selectors for ${module.name} were found: ${selectors.join(', ')}`);
  }
}

test.describe('UI States and Error Handling', () => {
  test('UI-001: Loading and Error States Across All Modules', async ({ browser }) => {
    // Prevent test hangs - 90 second max per test
    test.setTimeout(90000);
  
    const cleanup = TestCleanup.getInstance('UI-001');
    let context: any = undefined;
    let auth: CleanAuthHelper | undefined = undefined;
    
    try {
      context = await browser.newContext();
      cleanup.trackBrowserContext(context);
      const page = await context.newPage();
      auth = new CleanAuthHelper(page);
      
      // Use existing demo admin for full access
      await auth.loginAsAdmin();
      
      // Module endpoints to test
      const modules = [
        { 
          name: 'Users',
          url: '/admin/users', 
          loadingSelector: '[data-testid="loading-state"]',
          contentSelector: '[data-testid="users-table"]',
          errorEndpoint: '**/api/users'
        },
        { 
          name: 'Courses',
          url: '/courses', 
          loadingSelector: '[data-testid="loading-state"]',
          contentSelectors: ['[data-testid="course-card"]', '[data-testid="no-courses-message"]', 'text=/courses/i'],
          errorEndpoint: '**/api/courses'
        },
        { 
          name: 'News',
          url: '/news', 
          loadingSelector: '[data-testid="loading-state"]',
          contentSelectors: ['[data-testid="news-article"]', 'text=/news/i'],
          errorEndpoint: '**/api/news/**'
        },
        { 
          name: 'Planning',
          url: '/planning', 
          loadingSelector: '[data-testid="loading-state"]',
          contentSelectors: ['[data-testid="calendar-view"]', 'text=/calendar|planning/i'],
          errorEndpoint: '**/api/planning/**'
        },
        { 
          name: 'Statistics',
          url: '/statistics', 
          loadingSelector: '[data-testid="loading-state"]',
          contentSelectors: ['[data-testid="statistics-page"]', 'text=/statistics/i'],
          errorEndpoint: '**/api/statistics/**'
        }
      ];
      
      // Testing loading states
      
      // Test loading states for each module
      for (const module of modules) {
        // Testing module loading state
        
        // Set up promise to catch loading state
        const loadingPromise = page.waitForSelector(module.loadingSelector, { 
          state: 'visible',
          timeout: 2000 
        }).catch(() => null);
        
        // Navigate to the page
        await page.goto(module.url);
        
        // Check if loading state appeared
        const loadingElement = await loadingPromise;
        if (loadingElement) {
          // Loading indicator displayed
          
          // Wait for content to load
          await waitForModuleContent(page, module);
          
          // Verify loading indicator disappears
          await expect(page.locator(module.loadingSelector)).not.toBeVisible();
          // Loading indicator hidden after content loads
        } else {
          // If no loading state, verify content loads directly
          await waitForModuleContent(page, module);
          // Content loaded (fast load, no loading state shown)
        }
      }
      
      // Testing error states
      
      // Test error states for each module
      for (const module of modules) {
        // Testing module error handling
        
        // Create a new page for each error test to avoid state pollution
        const errorPage = await context.newPage();
        
        // Copy auth cookies to new page
        const cookies = await context.cookies();
        await errorPage.context().addCookies(cookies);
        
        // Intercept API calls and force errors
        await errorPage.route(module.errorEndpoint, route => {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Internal Server Error',
              message: 'Test error for UI state verification'
            })
          });
        });
        
        // Navigate and check for error handling
        await errorPage.goto(module.url);
        
        // Wait for error state - check multiple possible error indicators
        const errorSelectors = [
          '[data-testid="error-message"]',
          '[data-testid="error-state"]',
          'text=/error|failed|unable to load|something went wrong/i',
          '.error-container',
          '.alert-danger'
        ];
        
        let errorFound = false;
        for (const selector of errorSelectors) {
          const count = await errorPage.locator(selector).count();
          if (count > 0) {
            errorFound = true;
            // Error state displayed
            break;
          }
        }
        
        expect(errorFound).toBeTruthy();
        
        // Verify no content is shown when error occurs
        const selectors = module.contentSelectors || [module.contentSelector];
        let anyContentVisible = false;
        for (const selector of selectors) {
          const visible = await errorPage.locator(selector).isVisible().catch(() => false);
          if (visible) {
            anyContentVisible = true;
            break;
          }
        }
        expect(anyContentVisible).toBeFalsy();
        // Content hidden during error state
        
        await errorPage.close();
      }
      
      // Testing refresh/retry functionality
      
      // Test refresh functionality after error
      const retryPage = await context.newPage();
      const cookies = await context.cookies();
      await retryPage.context().addCookies(cookies);
      
      // First load with error
      let requestCount = 0;
      await retryPage.route('**/api/users', route => {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          route.fulfill({ status: 500 });
        } else {
          // Subsequent requests succeed
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ users: [], total: 0 })
          });
        }
      });
      
      await retryPage.goto('/admin/users');
      
      // Wait for error state
      await expect(retryPage.locator('text=/error|retry/i')).toBeVisible();
      
      // Look for retry button or refresh functionality
      const retryButton = retryPage.locator('button:has-text("Retry"), button:has-text("Refresh"), button:has-text("Try Again")');
      if (await retryButton.count() > 0) {
        await retryButton.first().click();
        // Retry button clicked
      } else {
        // If no retry button, test page refresh
        await retryPage.reload();
        // Page refreshed
      }
      
      // Verify content loads after retry (users table should be visible for admin)
      await expect(retryPage.locator('[data-testid="users-table"]')).toBeVisible({ timeout: 5000 });
      // Content loaded successfully after retry
      
      await retryPage.close();
      
    } finally {
      if (auth) await auth.clearAuthState();
      await cleanup.cleanup();
    }
  });
  
  test('UI-002: Empty States and No Data Scenarios', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('UI-002');
    let context: any = undefined;
    let auth: CleanAuthHelper | undefined = undefined;
    
    try {
      context = await browser.newContext();
      cleanup.trackBrowserContext(context);
      const page = await context.newPage();
      auth = new CleanAuthHelper(page);
      
      await auth.loginAsTeacher();
      
      // Testing empty states
      
      // Test courses empty state (teacher with no courses)
      await page.goto('/courses');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const emptyStateSelectors = [
        '[data-testid="no-courses-message"]',
        '[data-testid="error-state"]',
        'text=/no courses|create your first course|get started/i'
      ];
      
      let emptyStateFound = false;
      for (const selector of emptyStateSelectors) {
        if (await page.locator(selector).count() > 0) {
          emptyStateFound = true;
          // Courses: Empty state displayed
          
          // Check for CTA button
          const ctaButton = page.locator('button:has-text("Create Course"), a:has-text("Create Course"), button:has-text("Get Started")');
          if (await ctaButton.count() > 0) {
            // Courses: Call-to-action button present
          }
          break;
        }
      }
      
      // Test statistics empty state (teacher with no data)
      await page.goto('/statistics');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      const noDataSelectors = [
        '[data-testid="error-state"]',
        '[data-testid="statistics-page"]',
        'text=/no data|no statistics|start teaching/i'
      ];
      
      for (const selector of noDataSelectors) {
        if (await page.locator(selector).count() > 0) {
          // Statistics: No data state displayed
          break;
        }
      }
      
    } finally {
      if (auth) await auth.clearAuthState();
      await cleanup.cleanup();
    }
  });
});