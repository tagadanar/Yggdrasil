// Example test demonstrating enhanced error context capture
// This shows how the new error handling improves debugging

import { test, expect } from '../fixtures/error-context-fixture';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';

test.describe('Enhanced Error Context Examples', () => {
  test('Example: Element not found with context', async ({ pageWithErrorTracking }) => {
    // This test intentionally fails to demonstrate error context
    test.skip(true, 'Demonstration only - not a real test');
    
    try {
      await pageWithErrorTracking.goto('/');
      
      // This will fail and capture detailed context
      await pageWithErrorTracking.click('button#non-existent-button', {
        timeout: 2000
      });
    } catch (error) {
      // Error context is automatically captured and attached to test report
      // The report will include:
      // - Current URL and page title
      // - Console logs leading up to the error
      // - Network failures
      // - DOM snapshot showing available elements
      // - Local storage contents
      // - Debugging recommendations
      console.log('Error was captured with enhanced context');
    }
  });
  
  test('Example: Authentication error with context', async ({ pageWithErrorTracking, errorContext }) => {
    // This test demonstrates auth error handling
    test.skip(true, 'Demonstration only - not a real test');
    
    const auth = new CleanAuthHelper(pageWithErrorTracking);
    
    try {
      // Attempt login with invalid credentials
      await auth.loginWithCredentials('invalid@example.com', 'wrongpassword');
    } catch (error) {
      // The enhanced error context will include:
      // - Authentication state from local storage
      // - Network requests showing auth failures
      // - Recommendations for debugging auth issues
      
      // You can also check error history
      const history = errorContext.getErrorHistory();
      console.log(`Total errors captured: ${history.length}`);
    }
  });
  
  test('Example: Timeout with helpful context', async ({ pageWithErrorTracking }) => {
    // This test demonstrates timeout error handling
    test.skip(true, 'Demonstration only - not a real test');
    
    try {
      await pageWithErrorTracking.goto('/slow-page');
      
      // Wait for element that takes too long to appear
      await pageWithErrorTracking.waitForSelector('.slow-loading-content', {
        timeout: 2000 // Very short timeout
      });
    } catch (error) {
      // Enhanced context will show:
      // - Page loading state
      // - What elements ARE visible (helps identify if you're on wrong page)
      // - Network requests that might be slow
      // - Recommendations to increase timeout or check selectors
    }
  });
});

// Real test showing the improvement in action
test('Improved error handling in user management', async ({ page }) => {
  // Skip this test as it's just for demonstration
  test.skip(true, 'Example implementation only');
  
  // This would show enhanced error tracking in a real implementation
  // Example: Enhanced error tracking setup would go here
  console.log('Enhanced error tracking demonstration - see captureEnhancedError helper');
});