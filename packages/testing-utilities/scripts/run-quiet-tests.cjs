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

// Helper function to format elapsed time
function formatElapsedTime(startTime) {
  const elapsed = Date.now() - startTime;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}


// Helper function to clean test names (remove file paths)
function cleanTestName(testName) {
  if (!testName) return testName;
  
  // Remove file path prefixes like "tests/functional/auth-security.spec.ts:" or similar
  let cleaned = testName.replace(/^.*[\/\\]([^\/\\]+\.spec\.ts):\s*/, '');
  
  // Remove any remaining file path references
  cleaned = cleaned.replace(/^[^\/\\]*\.spec\.ts:\s*/, '');
  
  // Remove line numbers and other technical references (like :24:7 or 6:7)
  cleaned = cleaned.replace(/:\d+:\d+/g, '');
  cleaned = cleaned.replace(/^\d+:\d+\s*›\s*/, '');
  
  // Remove extra whitespace and trim
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Main async function to handle the test execution
async function runTests() {
  const startTime = Date.now();
  
  console.log('🧪 Test Suite Overview');
  console.log('💡 Running all tests with centralized service management\n');
  console.log(`⏰ Started at: ${new Date(startTime).toLocaleTimeString()}\n`);

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
  let testStartTime = null;
  let testLineNumber = 0; // Line counter for test results
  let liveTimerInterval = null; // Live timer for current test
  let isShowingLiveTimer = false; // Track if we're showing live timer
  let currentDisplayName = null; // Current test name being displayed
  let currentSuiteContext = null; // Current test suite/file context

  // Start live timer for current test
  function startCurrentTestTimer(testName = null) {
    if (liveTimerInterval) {
      clearInterval(liveTimerInterval);
    }
    
    isShowingLiveTimer = true;
    testStartTime = Date.now();
    
    // Store display name - use suite context when available
    if (testName) {
      currentDisplayName = testName;
    } else if (currentSuiteContext) {
      currentDisplayName = `${currentSuiteContext} (${testProgress.total + 1}/${totalTestsEstimate})`;
    } else {
      currentDisplayName = `Running tests... (${testProgress.total + 1}/${totalTestsEstimate})`;
    }
    process.stdout.write(`[1s] ${currentDisplayName}`);
    
    liveTimerInterval = setInterval(() => {
      if (isShowingLiveTimer && testStartTime) {
        const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
        
        // Simply overwrite the line from the beginning
        process.stdout.write(`\r[${elapsed}s] ${currentDisplayName}`);
      }
    }, 1000);
  }

  // Update the display name without restarting timer
  function updateTestName(testName) {
    if (isShowingLiveTimer && testName) {
      currentDisplayName = cleanTestName(testName);
      // Immediately update the display with new name
      if (testStartTime) {
        const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
        process.stdout.write(`\r[${elapsed}s] ${currentDisplayName}`);
      }
    }
  }

  // Stop live timer and replace with result
  function stopAndReplaceWithResult(resultLine) {
    if (liveTimerInterval) {
      clearInterval(liveTimerInterval);
      liveTimerInterval = null;
    }
    isShowingLiveTimer = false;
    
    // Replace the live timer line with result
    process.stdout.write(`\r${resultLine}\n`); // Overwrite line and add newline
  }

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
          
          // Test execution detection - start timer when first test begins
          if (line.includes('Running') && line.includes('test') && !line.includes('tests using')) {
            if (!testsStarted) {
              console.log(`🧪 Test execution starting... [${formatElapsedTime(startTime)}]\n`);
              testsStarted = true;
              
              // Start timer for first test (no name yet)
              startCurrentTestTimer();
            }
            
            // Extract test suite name for context
            const suiteMatch = line.match(/\[(.*?)\]/);
            if (suiteMatch) {
              const newSuite = suiteMatch[1];
              if (newSuite !== currentTestSuite) {
                currentTestSuite = newSuite;
                console.log(`\n📋 Running: ${currentTestSuite} [${formatElapsedTime(startTime)}]`);
              }
            }
          }
          
          // Extract suite context from correct part of Playwright output
          if ((line.includes('✓') || line.includes('✗')) && line.includes('›')) {
            const parts = line.split('›');
            
            // Format: ✓ 1 [chromium] › file.spec.ts:6:7 › Debug: Basic Page Loading › Should load root page (706ms)
            // parts[0]: browser info, parts[1]: file info, parts[2]: SUITE NAME, parts[3]: test name
            
            if (parts.length >= 3) {
              const suiteName = parts[2].trim(); // "Debug: Basic Page Loading"
              
              if (suiteName && suiteName.length > 2 && suiteName !== currentSuiteContext) {
                currentSuiteContext = suiteName;
                console.log(`🔍 SUITE CONTEXT: Set to "${suiteName}"`);
                
                // Update current timer display if showing generic info
                if (isShowingLiveTimer && currentDisplayName && 
                    (currentDisplayName.includes('Running tests') || 
                     currentDisplayName.includes('✓') || 
                     currentDisplayName.includes('(') && currentDisplayName.includes('/'))) {
                  const betterName = `${suiteName} (${testProgress.total + 1}/${totalTestsEstimate})`;
                  currentDisplayName = betterName;
                  updateTestName(betterName);
                }
              }
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
                  currentTestName = cleanTestName(nameMatch[1].trim());
                  break;
                }
              }
            }
            
            // Update total estimate if we're getting close or have exceeded it
            if (testProgress.total >= totalTestsEstimate - 5) {
              totalTestsEstimate = testProgress.total + 10; // Add buffer for remaining tests
            }
            
            // Calculate test duration if we have a start time
            let testDuration = '';
            if (testStartTime) {
              const duration = Date.now() - testStartTime;
              testDuration = ` (${Math.round(duration / 10) / 100}s)`;
            }
            
            // Extract test name from result line
            let testName = currentTestName || 'Test';
            
            // Enhanced result parsing - target Playwright list output
            const resultPatterns = [
              /✓\s+(.+?)\s+\(\d+/,       // ✓ test name (123ms)
              /✗\s+(.+?)\s+\(\d+/,       // ✗ test name (123ms)
              /\]\s+(.+?)\s+\(\d+/,      // [suite] test name (123ms)
              /›\s+(.+?)\s+\(\d+/,       // › test name (123ms)
              /(.+?)\s+\(\d+\.?\d*m?s\)$/ // fallback: name (time)
            ];
            
            for (const pattern of resultPatterns) {
              const match = line.match(pattern);
              if (match) {
                const extracted = cleanTestName(match[1].trim());
                if (extracted && extracted.length > 3) {
                  testName = extracted;
                  break;
                }
              }
            }
            
            // Progress counter with elapsed time
            const progressInfo = `[${testProgress.total}/${totalTestsEstimate}] [${formatElapsedTime(startTime)}]${testDuration}`;
            
            // Create result line
            const resultLine = isPass ? 
              `✓ ${progressInfo} ${testName}` : 
              `✗ ${progressInfo} ${testName}`;
            
            if (isPass) {
              testProgress.passed++;
            } else {
              testProgress.failed++;
              // Start collecting error details for failed test
              collectingError = true;
              errorBuffer = '';
            }
            
            // Stop current timer and replace with result
            stopAndReplaceWithResult(resultLine);
            
            // Start timer for next test (if not the last test)
            if (testProgress.total < totalTestsEstimate) {
              testStartTime = Date.now(); // Reset start time for next test
              startCurrentTestTimer(); // Will use currentSuiteContext if available
            }
            
            // Reset for next test
            currentTestName = '';
          }
          
          // Collect error details if we're tracking a failed test
          if (collectingError) {
            errorBuffer += line + '\n';
            
            // Look for test file location and error details
            if (line.includes('.spec.ts:') && (line.includes('Error:') || line.includes('at '))) {
              // Extract file location but don't show line numbers
              const locationMatch = line.match(/([^\/\s]+\.spec\.ts)/);
              if (locationMatch) {
                const [, file] = locationMatch;
                console.log(`   📍 Failed in ${file}`);
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
        if (liveTimerInterval) {
          clearInterval(liveTimerInterval);
          process.stdout.write('\r'); // Just go to start of line
        }
        console.log('\n🛑 Test execution interrupted by user (Ctrl+C)');
        playwrightProcess.kill('SIGINT');
        setTimeout(() => process.exit(0), 1000);
      });
    });

    // Ensure live timer is stopped at the end
    if (liveTimerInterval) {
      clearInterval(liveTimerInterval);
      process.stdout.write('\r'); // Just go to start of line
    }
    
    const totalExecutionTime = formatElapsedTime(startTime);
    console.log(`\n\n📊 Generating final test overview... [Total: ${totalExecutionTime}]`);
    
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
    console.log(`⏰ Total Execution Time: ${totalExecutionTime}`);
    console.log(`🕐 Finished at: ${new Date().toLocaleTimeString()}`);
    
    if (failedSuites === 0) {
      console.log('\n🎉 ALL TEST SUITES PASSED! System is healthy.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some test suites failed. Run individual suites for debugging:');
      console.log('   npm run test:single -- --grep "Suite Name"');
      process.exit(1);
    }
    
  } catch (error) {
    // Ensure live timer is stopped on error
    if (liveTimerInterval) {
      clearInterval(liveTimerInterval);
      process.stdout.write('\r'); // Just go to start of line
    }
    
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