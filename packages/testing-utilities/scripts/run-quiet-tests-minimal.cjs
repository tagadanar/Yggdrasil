#!/usr/bin/env node
/**
 * Enhanced Quiet Test Runner - Live Progress Edition
 * 
 * Now uses the LiveProgressReporter for real-time test status updates.
 * Simplified script that delegates all output formatting to the custom reporter.
 * 
 * Features:
 * - Live "RUNNING" status for each test
 * - Immediate PASS/FAIL feedback  
 * - Progress tracking [completed/total %]
 * - Clean, colored output
 * - Comprehensive final summary
 * - No complex regex parsing needed
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get all test files (unchanged from original)
function getTestFiles() {
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

// Clean up services (unchanged from original)
async function cleanupServices() {
  try {
    execSync('node service-manager.js clean', { 
      cwd: process.cwd(),
      stdio: 'ignore'
    });
    execSync('pkill -f "node.*service|ts-node-dev" || true', { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (e) {
    // Ignore cleanup errors - they're not critical
  }
}

// Enhanced test runner using live progress reporter
async function runTests() {
  console.log('🚀 Initializing Yggdrasil Test Suite with Live Progress...\n');
  
  // Pre-test cleanup
  await cleanupServices();
  
  const testFiles = getTestFiles();
  
  if (testFiles.length === 0) {
    console.log('❌ No test files found in tests/ directory');
    process.exit(1);
  }
  
  console.log(`📋 Found ${testFiles.length} test files`);
  console.log('🧹 Services cleaned, starting test execution...\n');
  
  try {
    // Use the custom live progress reporter - much simpler than regex parsing!
    const playwrightProcess = spawn(
      'npx', 
      [
        'playwright', 'test', 
        '--config=playwright.enhanced.config.ts', 
        '--workers=1', 
        '--reporter=./reporters/live-progress-reporter.js',  // 🎯 Custom reporter!
        ...testFiles.map(f => `tests/${f}`)
      ],
      {
        cwd: process.cwd(),
        stdio: ['inherit', 'inherit', 'inherit'],  // Direct passthrough - reporter handles everything
        env: { 
          ...process.env,
          NODE_ENV: 'test',
          QUIET_MODE: 'true'
        }
      }
    );

    // Wait for test completion - no output parsing needed!
    await new Promise((resolve, reject) => {
      playwrightProcess.on('close', (code) => {
        resolve(code);
      });

      playwrightProcess.on('error', (error) => {
        reject(error);
      });
    });

    // Post-test cleanup
    await cleanupServices();
    console.log('\n🧹 Clean testing environment shut down!');
    
    // Exit code is handled by Playwright and the reporter
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
    await cleanupServices();
    process.exit(1);
  }
}

// Handle interruption gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Test execution interrupted by user');
  console.log('🧹 Cleaning up services...');
  await cleanupServices();
  console.log('✅ Cleanup completed');
  process.exit(130);
});

// Handle other termination signals
process.on('SIGTERM', async () => {
  console.log('\n\n⚠️  Test execution terminated');
  await cleanupServices();
  process.exit(143);
});

// Run tests with error handling
runTests().catch(async (error) => {
  console.error('\n💥 Unexpected error:', error.message);
  await cleanupServices();
  process.exit(1);
});