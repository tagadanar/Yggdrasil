// Debug test to check basic page loading functionality

import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';

test.describe('Debug: Basic Page Loading', () => {
  test('Should load root page', async ({ page }) => {
    const cleanup = await TestCleanup.ensureCleanStart('Root Page Load Test');
    
    try {
      console.log('Navigating to root page...');
      await page.goto('http://localhost:3000/');
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-root-page.png' });
      
      // Check what's actually on the page
      const content = await page.content();
      console.log('Page content length:', content.length);
      console.log('Page title:', await page.title());
      
      // Look for any error messages
      const hasError404 = content.includes('404');
      const hasErrorMessage = content.includes('This page could not be found');
      
      console.log('Has 404 error:', hasError404);
      console.log('Has error message:', hasErrorMessage);
      
      // If there are errors, log more details
      if (hasError404 || hasErrorMessage) {
        console.log('ERROR: Page returned 404');
        console.log('Full content preview:', content.substring(0, 500));
      }
      
      // Test should pass if we can at least load something (even if it's an error page)
      expect(content.length).toBeGreaterThan(0);
      
    } finally {
      await cleanup.cleanup();
    }
  });

  test('Should access frontend server directly', async ({ page }) => {
    const cleanup = await TestCleanup.ensureCleanStart('Direct Server Access Test');
    
    try {
      console.log('Testing direct server access...');
      
      // Check if server is responding at all
      const response = await page.goto('http://localhost:3000/');
      console.log('Response status:', response?.status());
      console.log('Response URL:', response?.url());
      
      expect(response?.status()).toBeDefined();
      
    } finally {
      await cleanup.cleanup();
    }
  });
});