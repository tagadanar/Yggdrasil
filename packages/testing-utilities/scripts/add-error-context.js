#!/usr/bin/env node
// Script to add enhanced error context to existing test files

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const IMPORT_STATEMENT = `import { captureEnhancedError } from '../helpers/enhanced-error-context';`;

const ERROR_HANDLING_TEMPLATE = `
      } catch (error) {
        // Capture enhanced error context
        await captureEnhancedError(
          error as Error,
          page,
          testInfo,
          {
            testSection: 'SECTION_NAME',
            lastAction: 'ACTION_NAME'
          }
        );
        throw error;
      }
`;

function addErrorContextToFile(filePath) {
  console.log(`📝 Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if already has enhanced error context
  if (content.includes('captureEnhancedError')) {
    console.log('  ⏭️  Already has enhanced error context');
    return false;
  }
  
  // Add import if test file
  if (filePath.endsWith('.spec.ts') || filePath.endsWith('.test.ts')) {
    // Add import after other imports
    const importMatch = content.match(/import .* from ['"].*['"];/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      content = content.slice(0, lastImportIndex + lastImport.length) + 
                '\\n' + IMPORT_STATEMENT + 
                content.slice(lastImportIndex + lastImport.length);
      modified = true;
    }
  }
  
  // Find try-catch blocks that could benefit from enhanced context
  const tryCatchRegex = /try\s*{([^}]+)}\s*catch\s*\((\w+)\)\s*{([^}]+)}/g;
  let matches = 0;
  
  content = content.replace(tryCatchRegex, (match, tryBlock, errorVar, catchBlock) => {
    // Skip if already has error context
    if (catchBlock.includes('captureEnhancedError')) {
      return match;
    }
    
    // Skip if just rethrowing
    if (catchBlock.trim() === `throw ${errorVar};` || catchBlock.trim() === `throw ${errorVar}`) {
      return match;
    }
    
    // Add context capture before throw
    if (catchBlock.includes('throw')) {
      matches++;
      const enhancedCatch = catchBlock.replace(
        /throw\s+\w+;?/,
        `// Capture enhanced error context for debugging\\n        await captureEnhancedError(${errorVar} as Error, page);\\n        throw ${errorVar};`
      );
      return `try {${tryBlock}} catch (${errorVar}) {${enhancedCatch}}`;
    }
    
    return match;
  });
  
  if (matches > 0) {
    modified = true;
    console.log(`  ✅ Added error context to ${matches} catch blocks`);
  }
  
  // Save if modified
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  console.log('  ⏭️  No modifications needed');
  return false;
}

function generateErrorContextGuide() {
  const guide = `# Enhanced Error Context Guide

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
\`\`\`typescript
import { test, expect } from '../fixtures/error-context-fixture';

test('my test', async ({ pageWithErrorTracking }) => {
  // Errors are automatically captured with context
  await pageWithErrorTracking.goto('/admin');
  await pageWithErrorTracking.click('button#save');
});
\`\`\`

2. **Manual Error Capture:**
\`\`\`typescript
import { captureEnhancedError } from '../helpers/enhanced-error-context';

try {
  await someAction();
} catch (error) {
  await captureEnhancedError(error, page, testInfo, {
    customData: 'Additional context'
  });
  throw error;
}
\`\`\`

## Error Reports

When a test fails, you'll find \`error-context.md\` in the test results with:

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
`;

  fs.writeFileSync(
    path.join(__dirname, '../docs/enhanced-error-context-guide.md'),
    guide
  );
  console.log('\\n📚 Generated error context guide');
}

// Main execution
function main() {
  console.log('🚀 Adding enhanced error context to tests...\\n');
  
  const testFiles = glob.sync(
    path.join(__dirname, '../tests/**/*.{spec,test}.ts'),
    { ignore: ['**/node_modules/**', '**/examples/**'] }
  );
  
  console.log(`Found ${testFiles.length} test files\\n`);
  
  let modifiedCount = 0;
  testFiles.forEach(file => {
    if (addErrorContextToFile(file)) {
      modifiedCount++;
    }
  });
  
  console.log(`\\n✅ Modified ${modifiedCount} files`);
  
  // Generate guide
  generateErrorContextGuide();
  
  console.log('\\n🎉 Enhanced error context integration complete!');
}

// Run if called directly
if (require.main === module) {
  main();
}