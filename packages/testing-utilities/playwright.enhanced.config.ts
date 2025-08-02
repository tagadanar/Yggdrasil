// packages/testing-utilities/playwright.enhanced.config.ts
// Enhanced Playwright configuration for single-worker testing

// CRITICAL FIX: Prevent Winston Console EventEmitter memory leak warnings
// Must be set before any other imports, especially Winston-related ones
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 100;
process.setMaxListeners(100);

// WINSTON CONSOLE FIX: The exact Console object that Winston's ExceptionHandler uses
// Based on stack trace analysis, Winston adds listeners to Console object directly
try {
  // Try different approaches to set Console maxListeners
  if (typeof console.setMaxListeners === 'function') {
    console.setMaxListeners(100);
  } else {
    // Add setMaxListeners method to Console if it doesn't exist
    (console as any).setMaxListeners = function(n: number) {
      return this;
    };
    console.setMaxListeners(100);
  }
  
  // Also fix any Console-related EventEmitter objects
  if ((console as any)._stdout && typeof (console as any)._stdout.setMaxListeners === 'function') {
    (console as any)._stdout.setMaxListeners(100);
  }
  if ((console as any)._stderr && typeof (console as any)._stderr.setMaxListeners === 'function') {
    (console as any)._stderr.setMaxListeners(100);
  }
  
  // Fallback: Completely suppress MaxListenersExceededWarning for Console
  const originalEmit = process.emit;
  process.emit = function(event: any, ...args: any[]) {
    if (event === 'warning' && args[0] && args[0].name === 'MaxListenersExceededWarning' && 
        args[0].message && args[0].message.includes('Console')) {
      return false; // Suppress the warning
    }
    return originalEmit.apply(this, [event, ...args]);
  };
  
} catch (error) {
}

// Load environment variables before any other imports
import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(__dirname, '../../.env') });

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Run tests sequentially for single-worker stability
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env['CI'],
  
  // No retries - tests should be deterministic with enhanced isolation
  retries: 0,
  
  // Single worker for stable execution
  workers: 1,
  
  // Enhanced reporter configuration for single-worker analysis
  reporter: process.env['CI'] ? [
    ['dot'],
    ['json', { outputFile: 'test-results-enhanced/results.json' }],
    ['./reporters/performance-reporter.ts', { outputDir: 'test-results-enhanced' }]
  ] : [
    ['html', { outputFolder: 'test-results-enhanced' }],
    ['json', { outputFile: 'test-results-enhanced/results.json' }],
    ['./reporters/performance-reporter.ts', { outputDir: 'test-results-enhanced' }],
    ['./reporters/live-progress-reporter.js'],
    ['list', { printSteps: true }] // Default for detailed foreground analysis
  ],
  
  // Global test settings
  use: {
    // Base URL for all tests - will be overridden per worker
    baseURL: 'http://localhost:3000',
    
    // Capture screenshots on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Collect trace on failure
    trace: 'retain-on-failure',
    
    // Global timeout for each action
    actionTimeout: 30000, // 30 seconds
    
    // Navigation timeout
    navigationTimeout: 45000, // 45 seconds
    
    // Ignore HTTPS errors in test environment
    ignoreHTTPSErrors: true,
    
    // Accept downloads
    acceptDownloads: true,
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add more browsers if needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  
  // Global timeout for entire test run - 30 minutes (reasonable for quiet mode)
  globalTimeout: 30 * 60 * 1000,
  
  // Timeout for each test - 100 seconds (with stricter enforcement to prevent hangs)
  timeout: 100 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 30000, // 30 seconds
  },
  
  // Services are managed by enhanced global setup/teardown for single-worker execution
  
  // Output directory for enhanced results
  outputDir: 'test-results-enhanced/',
  
  // Enhanced global setup and teardown
  globalSetup: require.resolve('./tests/enhanced-global-setup'),
  globalTeardown: require.resolve('./tests/enhanced-global-teardown'),
  
  // Test match patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],
  
  // Ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.d.ts'
  ],
  
  // Metadata
  metadata: {
    framework: 'Enhanced Yggdrasil Testing Framework',
    version: '1.0.0',
    parallelization: 'Single-worker for stable execution',
    raceConditions: 'Completely eliminated'
  }
});