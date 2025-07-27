#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration for timeout optimizations
const TIMEOUT_OPTIMIZATIONS = {
  // Add explicit timeouts to expect statements
  'expect\\(([^)]+)\\)\\.toBeVisible\\(\\)': 'expect($1).toBeVisible({ timeout: 5000 })',
  'expect\\(([^)]+)\\)\\.not\\.toBeVisible\\(\\)': 'expect($1).not.toBeVisible({ timeout: 10000 })',
  
  // Add timeouts to waitForSelector calls without them
  'waitForSelector\\(([^,]+)\\)': 'waitForSelector($1, { timeout: 10000 })',
  'waitForSelector\\(([^,]+),\\s*{\\s*state:\\s*[\'"]visible[\'"]\\s*}\\)': 'waitForSelector($1, { state: "visible", timeout: 10000 })',
  
  // Replace any remaining waitForTimeout with proper waits
  'page\\.waitForTimeout\\(\\d+\\)': 'page.waitForLoadState("domcontentloaded", { timeout: 5000 })',
  'await waitForTimeout\\(\\d+\\)': 'await page.waitForLoadState("domcontentloaded", { timeout: 5000 })',
};

// Find all test files
const testFiles = glob.sync('packages/testing-utilities/tests/**/*.spec.ts');

console.log(`Found ${testFiles.length} test files to optimize`);

let totalOptimizations = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let fileOptimizations = 0;

  // Apply each optimization pattern
  Object.entries(TIMEOUT_OPTIMIZATIONS).forEach(([pattern, replacement]) => {
    const regex = new RegExp(pattern, 'g');
    const matches = content.match(regex) || [];
    
    // Skip if replacement already exists
    if (replacement.includes('timeout') && content.includes(replacement)) {
      return;
    }
    
    if (matches.length > 0) {
      content = content.replace(regex, replacement);
      fileOptimizations += matches.length;
      console.log(`  ${path.basename(file)}: Applied ${matches.length} ${pattern} optimizations`);
    }
  });

  // Write back if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`✅ Updated ${path.basename(file)} with ${fileOptimizations} optimizations`);
    totalOptimizations += fileOptimizations;
  }
});

console.log(`\n✨ Total optimizations applied: ${totalOptimizations}`);
console.log('\nRecommended next steps:');
console.log('1. Run: npm run test:single -- --grep "Should load root page" to verify basic functionality');
console.log('2. Run individual test suites to check for improvements');
console.log('3. Monitor for any new timeout issues');