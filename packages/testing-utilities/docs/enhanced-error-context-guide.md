# Enhanced Error Context Guide

## Overview
The enhanced error context system provides detailed debugging information when tests fail.

## Features

### Automatic Context Capture
- Current page URL and title
- Console logs (errors, warnings, info)
- Network failures and errors  
- DOM snapshot of visible elements
- Local storage contents
- Test execution context
- Debugging recommendations

### Usage in Tests

1. **Using the Enhanced Page Fixture:**
```typescript
import { test, expect } from '../fixtures/error-context-fixture';

test('my test', async ({ pageWithErrorTracking }) => {
  // Errors are automatically captured with context
  await pageWithErrorTracking.goto('/admin');
  await pageWithErrorTracking.click('button#save');
});
```

2. **Manual Error Capture:**
```typescript
import { captureEnhancedError } from '../helpers/enhanced-error-context';

try {
  await someAction();
} catch (error) {
  await captureEnhancedError(error, page, testInfo, {
    customData: 'Additional context'
  });
  throw error;
}
```

## Error Reports

When a test fails, you'll find `error-context.md` in the test results with:

- Error message and stack trace
- Page state at time of error
- Console output
- Network errors
- Visible elements on page
- Recommendations for fixing

## Debugging Tips

1. Check the error context report first
2. Look for console errors before the failure
3. Verify elements mentioned in "Visible Elements"
4. Follow the debugging recommendations
5. Use the DOM snapshot to understand page state
