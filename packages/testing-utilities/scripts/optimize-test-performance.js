#!/usr/bin/env node
// Script to optimize test performance by reducing unnecessary waits and timeouts

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Performance optimizations to apply
const OPTIMIZATIONS = {
  // Replace long waitForTimeout with shorter ones
  waitForTimeoutReplacements: [
    { from: /waitForTimeout\(2000\)/g, to: 'waitForTimeout(200)' },
    { from: /waitForTimeout\(1000\)/g, to: 'waitForTimeout(100)' },
    { from: /waitForTimeout\(500\)/g, to: 'waitForTimeout(50)' },
  ],
  
  // Reduce selector timeouts
  selectorTimeoutReplacements: [
    { from: /timeout:\s*10000/g, to: 'timeout: 3000' },
    { from: /timeout:\s*5000/g, to: 'timeout: 2000' },
    { from: /timeout:\s*15000/g, to: 'timeout: 5000' },
  ],
  
  // Optimize navigation waits
  navigationOptimizations: [
    { from: /waitUntil:\s*['"]networkidle['"]/g, to: "waitUntil: 'domcontentloaded'" },
    { from: /waitLoadState\(['"]networkidle['"]\)/g, to: "waitLoadState('domcontentloaded')" },
  ],
  
  // Files to exclude from optimization
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/*.config.ts',
    '**/performance-config.ts', // Don't optimize the config itself
  ]
};

function optimizeFile(filePath) {
  console.log(`🔧 Optimizing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changeCount = 0;
  
  // Apply waitForTimeout optimizations
  OPTIMIZATIONS.waitForTimeoutReplacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      changeCount += matches.length;
      console.log(`  ✅ Replaced ${matches.length} instances of ${from.source}`);
    }
  });
  
  // Apply selector timeout optimizations
  OPTIMIZATIONS.selectorTimeoutReplacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      changeCount += matches.length;
      console.log(`  ✅ Replaced ${matches.length} instances of ${from.source}`);
    }
  });
  
  // Apply navigation optimizations
  OPTIMIZATIONS.navigationOptimizations.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      changeCount += matches.length;
      console.log(`  ✅ Replaced ${matches.length} instances of ${from.source}`);
    }
  });
  
  // Only write if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`  📝 Total changes: ${changeCount}`);
    return changeCount;
  } else {
    console.log(`  ⏭️  No changes needed`);
    return 0;
  }
}

function main() {
  console.log('🚀 Starting test performance optimization...\n');
  
  const testDir = path.join(__dirname, '../tests');
  const pattern = path.join(testDir, '**/*.{ts,js}');
  
  // Find all test files
  const files = glob.sync(pattern, {
    ignore: OPTIMIZATIONS.excludePatterns
  });
  
  console.log(`📁 Found ${files.length} test files to analyze\n`);
  
  let totalChanges = 0;
  let filesModified = 0;
  
  files.forEach(file => {
    const changes = optimizeFile(file);
    if (changes > 0) {
      totalChanges += changes;
      filesModified++;
    }
  });
  
  console.log('\n✅ Optimization complete!');
  console.log(`📊 Summary: ${totalChanges} optimizations in ${filesModified} files`);
  
  // Additional recommendations
  console.log('\n📋 Additional performance recommendations:');
  console.log('1. Consider running tests in parallel where possible');
  console.log('2. Use test.describe.configure({ mode: "parallel" }) for independent tests');
  console.log('3. Minimize database operations in tests');
  console.log('4. Use page.waitForFunction() instead of fixed timeouts where possible');
  console.log('5. Consider using test fixtures for common setup operations');
}

// Run the optimization
main();