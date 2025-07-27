// Playwright test fixture for automatic error context capture
// Enhances all tests with better error reporting

import { test as base, Page } from '@playwright/test';
import { captureEnhancedError, EnhancedErrorContext } from '../helpers/enhanced-error-context';

// Extend test with error context tracking
export const test = base.extend<{
  errorContext: EnhancedErrorContext;
  pageWithErrorTracking: Page;
}>({
  // Provide error context instance
  errorContext: async ({}, use) => {
    const context = EnhancedErrorContext.getInstance();
    await use(context);
  },
  
  // Enhanced page with automatic error tracking
  pageWithErrorTracking: async ({ page, errorContext }, use, testInfo) => {
    // Track console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      
      // Log errors and warnings to test output
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`🔴 Browser ${msg.type()}:`, msg.text());
      }
    });
    
    // Track network failures
    const networkErrors: string[] = [];
    page.on('requestfailed', request => {
      const failure = `${request.method()} ${request.url()}: ${request.failure()?.errorText}`;
      networkErrors.push(failure);
      console.log('🔴 Network failure:', failure);
    });
    
    // Track uncaught exceptions
    page.on('pageerror', error => {
      console.log('🔴 Page error:', error.message);
    });
    
    // Override page methods to add error context
    const originalGoto = page.goto.bind(page);
    page.goto = async (url, options) => {
      try {
        const response = await originalGoto(url, options);
        return response;
      } catch (error) {
        await captureEnhancedError(
          error as Error,
          page,
          testInfo,
          {
            action: 'goto',
            url,
            consoleLogs,
            networkErrors
          }
        );
        throw error;
      }
    };
    
    const originalClick = page.click.bind(page);
    page.click = async (selector, options) => {
      try {
        await originalClick(selector, options);
      } catch (error) {
        await captureEnhancedError(
          error as Error,
          page,
          testInfo,
          {
            action: 'click',
            selector,
            consoleLogs,
            networkErrors,
            visibleElements: await getVisibleElements(page)
          }
        );
        throw error;
      }
    };
    
    const originalFill = page.fill.bind(page);
    page.fill = async (selector, value, options) => {
      try {
        await originalFill(selector, value, options);
      } catch (error) {
        await captureEnhancedError(
          error as Error,
          page,
          testInfo,
          {
            action: 'fill',
            selector,
            value: value.substring(0, 20) + '...', // Don't log full values
            consoleLogs,
            networkErrors
          }
        );
        throw error;
      }
    };
    
    const originalWaitForSelector = page.waitForSelector.bind(page);
    page.waitForSelector = async (selector, options) => {
      try {
        const element = await originalWaitForSelector(selector, options);
        return element;
      } catch (error) {
        await captureEnhancedError(
          error as Error,
          page,
          testInfo,
          {
            action: 'waitForSelector',
            selector,
            timeout: options?.timeout,
            consoleLogs,
            networkErrors,
            visibleElements: await getVisibleElements(page)
          }
        );
        throw error;
      }
    };
    
    // Use the enhanced page
    await use(page);
  }
});

// Helper to get visible elements for debugging
async function getVisibleElements(page: Page): Promise<string[]> {
  try {
    return await page.evaluate(() => {
      const elements: string[] = [];
      
      // Get all interactive elements
      const selectors = [
        'button',
        'a',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[data-testid]'
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (el instanceof HTMLElement && el.offsetParent !== null) {
            let identifier = el.tagName.toLowerCase();
            
            if (el.id) {
              identifier += `#${el.id}`;
            }
            
            if (el.getAttribute('data-testid')) {
              identifier += `[data-testid="${el.getAttribute('data-testid')}"]`;
            }
            
            if (el.textContent) {
              const text = el.textContent.trim().substring(0, 30);
              if (text) {
                identifier += `: "${text}"`;
              }
            }
            
            elements.push(identifier);
          }
        });
      });
      
      return elements.slice(0, 50); // Limit to 50 elements
    });
  } catch {
    return [];
  }
}

// Export expect for convenience
export { expect } from '@playwright/test';

// Example usage in tests:
// import { test, expect } from '../fixtures/error-context-fixture';
// 
// test('my test', async ({ pageWithErrorTracking }) => {
//   // Use pageWithErrorTracking instead of page
//   // Errors will be automatically captured with context
//   await pageWithErrorTracking.goto('/');
//   await pageWithErrorTracking.click('button');
// });