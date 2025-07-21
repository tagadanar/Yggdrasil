#!/usr/bin/env node
// scripts/run-quiet-tests.cjs
// Clean test suite overview with live progress using centralized service management

const { spawn, execSync } = require('child_process');
const path = require('path');

// Test suite categories for overview display
const SUITE_CATEGORIES = [
  { name: 'Authentication Security', priority: 'CRITICAL' },
  { name: 'User Management', priority: 'HIGH' },
  { name: 'Course Management', priority: 'HIGH' },
  { name: 'News Management', priority: 'MEDIUM' },
  { name: 'Planning Management', priority: 'MEDIUM' },
  { name: 'Platform Features', priority: 'MEDIUM' },
  { name: 'Statistics Management', priority: 'MEDIUM' },
  { name: 'System Integration', priority: 'HIGH' }
];

// Main async function to handle the test execution
async function runTests() {
  console.log('🧪 Test Suite Overview');
  console.log('💡 Running all tests with centralized service management\n');

  // Use centralized service manager for cleaning
  console.log('🧹 Cleaning environment via service manager...');
  try {
    execSync('node service-manager.js clean', { 
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    console.log('✅ Environment cleaned\n');
  } catch (error) {
    console.log('⚠️ Environment cleanup completed\n');
  }

  console.log('🎭 Starting test execution with live progress...\n');

  // State tracking
  let servicesReady = false;
  let currentTestSuite = '';
  let testsStarted = false;
  let testProgress = { passed: 0, failed: 0, total: 0 };
  let allOutput = '';
  let currentTestName = '';
  let totalTestsEstimate = 45; // Approximate total tests based on CLAUDE.md
  let collectingError = false;
  let errorBuffer = '';

  try {
    // Use Playwright with list reporter for live updates
    const playwrightProcess = spawn(
      'npx', 
      ['playwright', 'test', '--config=playwright.enhanced.config.ts', '--workers=1', '--reporter=list'],
      {
        cwd: process.cwd(),
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { 
          ...process.env,
          NODE_ENV: 'test'
        }
      }
    );

    // Process stdout for live updates
    playwrightProcess.stdout.on('data', (data) => {
      allOutput += data.toString();
      const lines = data.toString().split('\n');
      
      lines.forEach(line => {
        if (line.trim()) {
          // Service startup detection
          if (line.includes('Starting') && line.includes('service')) {
            if (!servicesReady) {
              console.log(`🚀 ${line.trim()}`);
            }
          }
          
          // Services ready detection
          if (line.includes('All services are ready') || line.includes('All services started successfully')) {
            if (!servicesReady) {
              console.log('✅ All services are ready!\n');
              servicesReady = true;
            }
          }
          
          // Try to detect total test count from Playwright output
          if (line.includes('Running') && line.includes('tests using')) {
            const totalMatch = line.match(/Running\s+(\d+)\s+test/);
            if (totalMatch) {
              totalTestsEstimate = parseInt(totalMatch[1], 10);
              console.log(`📊 Found ${totalTestsEstimate} tests to run\n`);
            }
          }
          
          // Test execution detection
          if (line.includes('Running') && line.includes('test')) {
            if (!testsStarted) {
              console.log('🧪 Test execution starting...\n');
              testsStarted = true;
            }
            
            // Extract test suite name
            const suiteMatch = line.match(/\[(.*?)\]/);
            if (suiteMatch) {
              const newSuite = suiteMatch[1];
              if (newSuite !== currentTestSuite) {
                currentTestSuite = newSuite;
                console.log(`\n📋 Running: ${currentTestSuite}`);
              }
            }
            
            // Extract test name from the line
            const testNameMatch = line.match(/Running.*?test\s+(.+?)$/);
            if (testNameMatch) {
              currentTestName = testNameMatch[1].trim();
            }
          }
          
          // Test result detection
          if (line.includes('✓') || line.includes('✗')) {
            const isPass = line.includes('✓');
            testProgress.total++;
            
            // Try to extract test name from the result line if not already set
            if (!currentTestName) {
              // Multiple patterns to try for extracting test names
              const patterns = [
                /\]\s+(.+?)\s+\(/,  // [suite] test name (time)
                /✓\s+(.+?)\s+\(/,   // ✓ test name (time)
                /✗\s+(.+?)\s+\(/,   // ✗ test name (time)
                /›\s+(.+?)$/        // › test name
              ];
              
              for (const pattern of patterns) {
                const nameMatch = line.match(pattern);
                if (nameMatch) {
                  currentTestName = nameMatch[1].trim();
                  break;
                }
              }
            }
            
            // Update total estimate if we're getting close or have exceeded it
            if (testProgress.total >= totalTestsEstimate - 5) {
              totalTestsEstimate = testProgress.total + 10; // Add buffer for remaining tests
            }
                        
            // Simple progress counter
            const progressInfo = `[${testProgress.total}/${totalTestsEstimate}]`;
            
            if (isPass) {
              testProgress.passed++;
              console.log(`✓ ${currentTestName || 'Test'} ${progressInfo}`);
            } else {
              testProgress.failed++;
              console.log(`✗ ${currentTestName || 'Test'} ${progressInfo}`);
              
              // Start collecting error details for failed test
              collectingError = true;
              errorBuffer = '';
            }
            
            // Reset current test name for next test
            currentTestName = '';
          }
          
          // Collect error details if we're tracking a failed test
          if (collectingError) {
            errorBuffer += line + '\n';
            
            // Look for test file location and error details
            if (line.includes('.spec.ts:') && (line.includes('Error:') || line.includes('at '))) {
              // Extract file location
              const locationMatch = line.match(/([^\/\s]+\.spec\.ts):(\d+):(\d+)/);
              if (locationMatch) {
                const [, file, lineNum] = locationMatch;
                console.log(`   📍 Failed at ${file}:${lineNum}`);
              }
              
              // Stop collecting after showing location
              collectingError = false;
              errorBuffer = '';
            }
            
            // Also stop collecting if we hit the next test or end of error block
            if (line.includes('✓') || line.includes('✗') || line.trim() === '') {
              collectingError = false;
              errorBuffer = '';
            }
          }
        }
      });
    });

    // Handle stderr (suppress most output for clean display)
    playwrightProcess.stderr.on('data', (data) => {
      const errorText = data.toString();
      // Only show critical system errors, not test failure details
      if (errorText.includes('ECONNREFUSED') || errorText.includes('spawn')) {
        console.error(`⚠️  ${errorText.trim()}`);
      }
      // Test failure details are handled by stdout parsing above
    });

    // Wait for process completion
    await new Promise((resolve, reject) => {
      playwrightProcess.on('close', (code) => {
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`Playwright exited with code ${code}`));
        }
      });

      playwrightProcess.on('error', (error) => {
        reject(error);
      });

      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        console.log('\n🛑 Test execution interrupted by user (Ctrl+C)');
        playwrightProcess.kill('SIGINT');
        setTimeout(() => process.exit(0), 1000);
      });
    });

    console.log('\n\n📊 Generating final test overview...');
    
    // Simple final overview using the progress we tracked
    const suiteResults = new Map();
    
    // Parse collected output for basic categorization
    const lines = allOutput.split('\n');
    let currentSuite = '';
    
    lines.forEach(line => {
      // Basic test result parsing
      if (line.includes('✓') || line.includes('✗') || line.includes('PASSED') || line.includes('FAILED')) {
        let suiteName = 'All Tests';
        
        // Try to categorize by suite
        for (const category of SUITE_CATEGORIES) {
          if (line.includes(category.name) || currentSuite.includes(category.name)) {
            suiteName = category.name;
            break;
          }
        }
        
        if (!suiteResults.has(suiteName)) {
          suiteResults.set(suiteName, { passed: 0, failed: 0, total: 0 });
        }
        
        const suiteData = suiteResults.get(suiteName);
        suiteData.total++;
        
        if (line.includes('✓') || line.includes('PASSED')) {
          suiteData.passed++;
        } else {
          suiteData.failed++;
        }
      }
    });

    // If parsing didn't work well, use aggregate data
    if (suiteResults.size === 0 && testProgress.total > 0) {
      suiteResults.set('All Tests', {
        passed: testProgress.passed,
        failed: testProgress.failed,
        total: testProgress.total
      });
    }

    // Display results overview
    console.log('\n📊 Test Suite Results:');
    console.log('═'.repeat(80));
    
    let suiteIndex = 1;
    let passedSuites = 0;
    let failedSuites = 0;
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const category of SUITE_CATEGORIES) {
      const suiteData = suiteResults.get(category.name);
      if (suiteData) {
        const status = suiteData.failed === 0 ? '✅ PASS' : '❌ FAIL';
        const counts = `(${suiteData.passed}/${suiteData.total})`;
        
        console.log(`${suiteIndex}. ${category.name.padEnd(30)} [${category.priority.padEnd(8)}] ${status} ${counts}`);
        
        totalTests += suiteData.total;
        totalPassed += suiteData.passed;
        totalFailed += suiteData.failed;
        
        if (suiteData.failed === 0) passedSuites++;
        else failedSuites++;
        
        suiteIndex++;
      } else {
        console.log(`${suiteIndex}. ${category.name.padEnd(30)} [${category.priority.padEnd(8)}] ⚪ SKIP (no tests found)`);
        suiteIndex++;
      }
    }
    
    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📈 FINAL SUMMARY:');
    console.log('═'.repeat(80));
    console.log(`🎯 Test Suites: ${passedSuites} passed, ${failedSuites} failed, ${passedSuites + failedSuites} total`);
    console.log(`🧪 Individual Tests: ${totalPassed} passed, ${totalFailed} failed, ${totalTests} total`);
    
    if (failedSuites === 0) {
      console.log('\n🎉 ALL TEST SUITES PASSED! System is healthy.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some test suites failed. Run individual suites for debugging:');
      console.log('   npm run test:single -- --grep "Suite Name"');
      process.exit(1);
    }
    
  } catch (error) {
    if (error.signal === 'SIGINT') {
      console.log('\n🛑 Test execution interrupted by user (Ctrl+C)');
      process.exit(0);
    } else {
      console.error('\n❌ Test execution failed:');
      
      // Show useful error information
      if (error.stderr) {
        const errorLines = error.stderr.toString().split('\n').filter(line => line.trim());
        if (errorLines.length > 0) {
          console.error('Error details:', errorLines[0]);
        }
      }
      
      if (error.status) {
        console.error('Exit code:', error.status);
      }
      
      console.log('\n💡 To debug, try:');
      console.log('   npm run test:single -- --grep "specific test"');
      console.log('   npm run dev:health  # Check service status');
      
      process.exit(1);
    }
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Unexpected error:', error.message);
  process.exit(1);
});