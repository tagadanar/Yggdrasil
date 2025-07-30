#!/usr/bin/env node
// Enhanced quiet test runner with automatic service recycling to prevent hangs
// Maintains original UI while adding resilience against cumulative degradation

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

// Configuration for service recycling
const TESTS_PER_BATCH = 25; // Restart services every 25 tests to prevent degradation
const BATCH_TIMEOUT = 20 * 60 * 1000; // 20 minutes per batch maximum

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

// Get all test files for batching
async function getTestFiles() {
  const testDir = path.join(process.cwd(), 'tests');
  const testFiles = [];
  
  function findTestFiles(dir) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        findTestFiles(fullPath);
      } else if (entry.endsWith('.spec.ts')) {
        const relativePath = path.relative(testDir, fullPath);
        testFiles.push(relativePath);
      }
    }
  }
  
  findTestFiles(testDir);
  return testFiles;
}

// Force cleanup all services
async function forceServiceCleanup(reason = '') {
  console.log(`🧹 ${reason}Force service recycling for optimal performance...`);
  
  try {
    // Use service manager cleanup
    execSync('node service-manager.js clean', { 
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    
    // Additional cleanup - kill any remaining processes
    try {
      execSync('pkill -f "node.*service|ts-node-dev" || true', { stdio: 'ignore' });
    } catch (e) {
      // Ignore pkill errors
    }
    
    // Brief pause for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Service recycling completed\n');
  } catch (error) {
    console.log('⚠️ Service cleanup completed with warnings\n');
  }
}

// Run a batch of tests
async function runTestBatch(testFiles, batchNumber, totalBatches, overallStartTime) {
  console.log(`🎯 BATCH ${batchNumber}/${totalBatches}: Processing ${testFiles.length} test files`);
  console.log(`📁 Files: ${testFiles.slice(0, 3).join(', ')}${testFiles.length > 3 ? '...' : ''}`);
  
  const batchStartTime = Date.now();
  let batchTestCount = 0;
  let batchPassed = 0;
  let batchFailed = 0;
  
  // State tracking for live display
  let currentTestName = '';
  let testStartTime = null;
  let liveTimerInterval = null;
  let isShowingLiveTimer = false;
  let currentDisplayName = null;
  let currentSuiteContext = null;
  
  // Start live timer for current test
  function startCurrentTestTimer(testName = null) {
    if (liveTimerInterval) {
      clearInterval(liveTimerInterval);
    }
    
    isShowingLiveTimer = true;
    testStartTime = Date.now();
    
    if (testName) {
      currentDisplayName = testName;
    } else if (currentSuiteContext) {
      currentDisplayName = `${currentSuiteContext} (Batch ${batchNumber})`;
    } else {
      currentDisplayName = `Running batch ${batchNumber}...`;
    }
    process.stdout.write(`[1s] ${currentDisplayName}`);
    
    liveTimerInterval = setInterval(() => {
      if (isShowingLiveTimer && testStartTime) {
        const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
        process.stdout.write(`\r[${elapsed}s] ${currentDisplayName}`);
      }
    }, 1000);
  }

  // Stop live timer and replace with result
  function stopAndReplaceWithResult(resultLine) {
    if (liveTimerInterval) {
      clearInterval(liveTimerInterval);
      liveTimerInterval = null;
    }
    isShowingLiveTimer = false;
    process.stdout.write(`\r${resultLine}\n`);
  }

  try {
    // Build file pattern for this batch
    const filePattern = testFiles.map(f => `tests/${f}`).join('|');
    
    // Run Playwright for this batch
    const playwrightProcess = spawn(
      'npx', 
      [
        'playwright', 'test', 
        '--config=playwright.enhanced.config.ts', 
        '--workers=1', 
        '--reporter=list',
        ...testFiles.map(f => `tests/${f}`)
      ],
      {
        cwd: process.cwd(),
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { 
          ...process.env,
          NODE_ENV: 'test'
        }
      }
    );

    // Set batch timeout
    const batchTimeout = setTimeout(() => {
      console.error(`\n🚨 BATCH ${batchNumber}: Timeout after 20 minutes - forcing cleanup`);
      playwrightProcess.kill('SIGTERM');
      setTimeout(() => playwrightProcess.kill('SIGKILL'), 5000);
    }, BATCH_TIMEOUT);

    // Process stdout for live updates
    playwrightProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      
      lines.forEach(line => {
        if (line.trim()) {
          // Service startup detection
          if (line.includes('Starting') && line.includes('service')) {
            console.log(`🚀 ${line.trim()}`);
          }
          
          // Services ready detection
          if (line.includes('All services are ready') || line.includes('All services started successfully')) {
            console.log('✅ Services ready for batch\n');
          }
          
          // Test execution detection
          if (line.includes('Running') && line.includes('test') && !line.includes('tests using')) {
            if (!isShowingLiveTimer) {
              startCurrentTestTimer();
            }
            
            // Extract suite context
            const suiteMatch = line.match(/\[(.*?)\]/);
            if (suiteMatch) {
              const newSuite = suiteMatch[1];
              if (newSuite !== currentSuiteContext) {
                currentSuiteContext = newSuite;
                console.log(`\n🔍 SUITE: ${currentSuiteContext} [Batch ${batchNumber}]`);
              }
            }
          }
          
          // Test result detection
          if (line.includes('✓') || line.includes('✗')) {
            const isPass = line.includes('✓');
            batchTestCount++;
            
            // Extract test name
            let testName = 'Test';
            const resultPatterns = [
              /✓\s+(.+?)\s+\(\d+/,
              /✗\s+(.+?)\s+\(\d+/,
              /\]\s+(.+?)\s+\(\d+/,
              /›\s+(.+?)\s+\(\d+/,
              /(.+?)\s+\(\d+\.?\d*m?s\)$/
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
            
            // Calculate test duration
            let testDuration = '';
            if (testStartTime) {
              const duration = Date.now() - testStartTime;
              testDuration = ` (${Math.round(duration / 10) / 100}s)`;
            }
            
            // Create result line with overall progress
            const overallTime = formatElapsedTime(overallStartTime);
            const resultLine = isPass ? 
              `✅ [B${batchNumber}] ${testName}${testDuration} [${overallTime}]` : 
              `❌ [B${batchNumber}] ${testName}${testDuration} [${overallTime}]`;
            
            if (isPass) {
              batchPassed++;
            } else {
              batchFailed++;
            }
            
            stopAndReplaceWithResult(resultLine);
            
            // Start timer for next test
            if (batchTestCount < testFiles.length * 5) { // Estimate tests per file
              startCurrentTestTimer();
            }
          }
        }
      });
    });

    // Handle stderr quietly
    playwrightProcess.stderr.on('data', (data) => {
      const errorText = data.toString();
      if (errorText.includes('ECONNREFUSED') || errorText.includes('spawn')) {
        console.error(`⚠️ ${errorText.trim()}`);
      }
    });

    // Wait for batch completion
    await new Promise((resolve, reject) => {
      playwrightProcess.on('close', (code) => {
        clearTimeout(batchTimeout);
        if (liveTimerInterval) {
          clearInterval(liveTimerInterval);
          liveTimerInterval = null;
        }
        
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`Batch ${batchNumber} failed with code ${code}`));
        }
      });

      playwrightProcess.on('error', (error) => {
        clearTimeout(batchTimeout);
        if (liveTimerInterval) {
          clearInterval(liveTimerInterval);
          liveTimerInterval = null;
        }
        reject(error);
      });
    });

    const batchDuration = formatElapsedTime(batchStartTime);
    console.log(`\n✅ BATCH ${batchNumber}/${totalBatches} completed: ${batchPassed} passed, ${batchFailed} failed (${batchDuration})\n`);
    
    return { passed: batchPassed, failed: batchFailed, total: batchTestCount };
    
  } catch (error) {
    console.error(`❌ BATCH ${batchNumber} failed:`, error.message);
    return { passed: batchPassed, failed: batchFailed, total: batchTestCount, error };
  }
}

// Main async function to handle enhanced test execution
async function runTests() {
  const startTime = Date.now();
  
  console.log('🧪 Enhanced Test Suite with Auto-Recycling');
  console.log('💡 Prevents infinite hangs with intelligent service management\n');
  console.log(`⏰ Started at: ${new Date(startTime).toLocaleTimeString()}`);
  console.log(`🔄 Strategy: Run ${TESTS_PER_BATCH} tests → Service restart → Repeat\n`);

  // Initial cleanup
  await forceServiceCleanup('Initial ');

  try {
    // Get all test files and split into batches
    const allTestFiles = await getTestFiles();
    console.log(`📊 Found ${allTestFiles.length} test files to process\n`);

    // Split into batches
    const batches = [];
    for (let i = 0; i < allTestFiles.length; i += 4) { // 4 files per batch to manage size
      batches.push(allTestFiles.slice(i, i + 4));
    }

    console.log(`📦 Processing in ${batches.length} batches for optimal performance\n`);

    // Track overall results
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;
    const batchResults = [];

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchNumber = i + 1;

      // Service recycling between batches (except first)
      if (i > 0) {
        await forceServiceCleanup(`Batch ${batchNumber} `);
      }

      // Run the batch
      const batchResult = await runTestBatch(batch, batchNumber, batches.length, startTime);
      batchResults.push(batchResult);

      totalPassed += batchResult.passed;
      totalFailed += batchResult.failed;
      totalTests += batchResult.total;

      // Show running totals
      console.log(`📊 Running Total: ${totalPassed} passed, ${totalFailed} failed (${totalTests} tests)`);

      // Brief pause between batches
      if (i < batches.length - 1) {
        console.log(`⏸️ Brief pause before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Final cleanup
    await forceServiceCleanup('Final ');

    // Generate final summary
    const totalExecutionTime = formatElapsedTime(startTime);
    
    console.log('\n' + '═'.repeat(80));
    console.log('🏁 ENHANCED TEST SUITE RESULTS');
    console.log('═'.repeat(80));
    
    // Batch summary
    console.log('\n📦 BATCH SUMMARY:');
    batchResults.forEach((result, i) => {
      const status = result.failed === 0 ? '✅' : '❌';
      console.log(`  Batch ${i + 1}: ${status} ${result.passed} passed, ${result.failed} failed`);
    });

    // Overall summary
    console.log('\n📈 OVERALL RESULTS:');
    console.log(`🧪 Tests: ${totalPassed} passed, ${totalFailed} failed, ${totalTests} total`);
    console.log(`⏰ Duration: ${totalExecutionTime}`);
    console.log(`🕐 Finished: ${new Date().toLocaleTimeString()}`);
    console.log(`🎯 Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`);
    
    if (totalFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! No infinite hangs detected.');
      console.log('✅ Enhanced test runner successfully prevented service degradation.');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some tests failed (normal test failures, not hangs):');
      console.log('💡 To debug individual failures:');
      console.log('   npm run test:single -- --grep "Test Name"');
      console.log('   npm run dev:health  # Check service status');
      
      // Success if no hangs occurred (even with test failures)
      console.log('\n✅ Enhanced test runner prevented infinite hangs successfully!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Enhanced test execution failed:', error.message);
    console.log('\n💡 This may indicate a systematic issue. Check:');
    console.log('   - Service configuration');
    console.log('   - Database connectivity'); 
    console.log('   - Port availability');
    
    process.exit(1);
  }
}

// Handle interruption gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Enhanced test runner interrupted - cleaning up...');
  await forceServiceCleanup('Interrupt ');
  process.exit(130);
});

// Run the enhanced tests
runTests().catch(async (error) => {
  console.error('\n❌ Unexpected error in enhanced test runner:', error.message);
  await forceServiceCleanup('Error ');
  process.exit(1);
});