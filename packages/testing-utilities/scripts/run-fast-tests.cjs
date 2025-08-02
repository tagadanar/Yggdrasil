#!/usr/bin/env node

/**
 * Fast Test Runner - Runs only quick validation tests
 * Target: Complete in under 5 minutes
 * Focus: Core functionality validation, not comprehensive workflows
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Fast Test Runner - Quick Validation Suite');
console.log('⏱️  Target: <5 minutes total runtime');
console.log('🎯 Focus: Core functionality only\n');

// Fast test categories (estimated times)
const fastTests = [
  {
    name: 'Core Authentication',
    file: 'functional/auth-security.spec.ts',
    estimated: '45s',
    description: 'Login, logout, session management'
  },
  {
    name: 'RBAC Matrix',
    file: 'functional/rbac-matrix.spec.ts', 
    estimated: '60s',
    description: 'Role-based access control validation'
  },
  {
    name: 'Profile Management',
    file: 'functional/profile-editing.spec.ts',
    estimated: '30s',
    description: 'User profile editing workflows'
  },
  {
    name: 'Platform Health',
    file: 'functional/platform-features.spec.ts',
    estimated: '45s',
    description: 'System health and error handling'
  },
  {
    name: 'UI States',
    file: 'functional/ui-states.spec.ts',
    estimated: '60s',
    description: 'Loading states and error scenarios'
  },
  {
    name: 'System Integration Core',
    file: 'integration/system-integration.spec.ts',
    estimated: '90s',
    description: 'Service-to-service communication'
  }
];

// Playwright configuration optimized for speed
const testConfig = {
  timeout: 30000,        // 30s per test max
  workers: 2,            // Parallel execution
  retries: 0,            // No retries for fast runs
  reporter: 'line',      // Minimal output
  headless: true,        // No browser UI
  video: 'off',          // No recordings
  screenshot: 'off'      // No screenshots
};

async function runFastTests() {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  
  console.log('📋 Fast Test Suite:\n');
  fastTests.forEach((test, i) => {
    console.log(`${i + 1}. ${test.name} (${test.estimated})`);
    console.log(`   📁 ${test.file}`);
    console.log(`   ℹ️  ${test.description}\n`);
  });
  
  console.log('🏃 Starting fast test execution...\n');
  
  // Build test file paths
  const testFiles = fastTests.map(test => 
    path.join(__dirname, '..', 'tests', test.file)
  ).filter(file => fs.existsSync(file));
  
  if (testFiles.length === 0) {
    console.log('❌ No test files found');
    process.exit(1);
  }
  
  // Build playwright command
  const playwrightConfig = Object.entries(testConfig)
    .map(([key, value]) => `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}=${value}`)
    .join(' ');
    
  const testFileArgs = testFiles.join(' ');
  const command = `npx playwright test ${testFileArgs} ${playwrightConfig}`;
  
  console.log('🔧 Command:', command, '\n');
  
  return new Promise((resolve) => {
    const child = exec(command, { cwd: path.join(__dirname, '..') });
    
    let output = '';
    
    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      
      // Count results as they come in
      const passMatches = text.match(/✓/g);
      const failMatches = text.match(/✗/g);
      const skipMatches = text.match(/○/g);
      
      if (passMatches) passed += passMatches.length;
      if (failMatches) failed += failMatches.length;
      if (skipMatches) skipped += skipMatches.length;
    });
    
    child.stderr?.on('data', (data) => {
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log('\n' + '='.repeat(60));
      console.log('🏁 FAST TEST RESULTS');
      console.log('='.repeat(60));
      console.log(`⏱️  Duration: ${duration}s (Target: <300s)`);
      console.log(`✅ Passed: ${passed}`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`⏭️  Skipped: ${skipped}`);
      console.log(`📊 Success Rate: ${passed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0}%`);
      
      if (duration < 300) {
        console.log('🎯 TARGET MET: Fast test suite completed under 5 minutes!');
      } else {
        console.log('⚠️  TARGET MISSED: Consider optimizing slow tests');
      }
      
      if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED - Core functionality validated');
      } else {
        console.log('🚨 SOME TESTS FAILED - Fix issues before full test run');
      }
      
      resolve({ passed, failed, skipped, duration, success: code === 0 });
    });
  });
}

// Run fast tests if called directly
if (require.main === module) {
  runFastTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}

module.exports = { runFastTests };