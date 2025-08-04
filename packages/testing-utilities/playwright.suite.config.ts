// packages/testing-utilities/playwright.suite.config.ts
// Playwright configuration for individual suite execution
// Used by suite-orchestrator.js for sequential test runs

// CRITICAL FIX: Prevent Winston Console EventEmitter memory leak warnings
// Must be set before any other imports, especially Winston-related ones
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 100;
process.setMaxListeners(100);

// WINSTON CONSOLE FIX: The exact Console object that Winston's ExceptionHandler uses
// Based on stack trace analysis, Winston adds listeners to Console object directly
try {
  // Try different approaches to set Console maxListeners
  if (typeof (console as any).setMaxListeners === 'function') {
    (console as any).setMaxListeners(100);
  } else {
    // Add setMaxListeners method to Console if it doesn't exist
    (console as any).setMaxListeners = function(_n: number) {
      return this;
    };
    (console as any).setMaxListeners(100);
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
  (process as any).emit = function(event: any, ...args: any[]): boolean {
    if (event === 'warning' && args[0] && args[0].name === 'MaxListenersExceededWarning' && 
        args[0].message && args[0].message.includes('Console')) {
      return false; // Suppress the warning
    }
    return originalEmit.call(this, event, ...(args as any[])) as boolean;
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
  
  // No retries - tests should be deterministic
  retries: 0,
  
  // Single worker for stable execution
  workers: 1,
  
  // Reporter configuration for suite runs
  // The orchestrator will specify reporters via command line
  reporter: process.env['CI'] ? [
    ['dot'],
    ['json', { outputFile: process.env['PLAYWRIGHT_JSON_OUTPUT_NAME'] || 'test-results-suite.json' }]
  ] : [
    ['list', { printSteps: false }]
  ],
  
  // Global test settings
  use: {
    // Base URL for all tests
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
  ],
  
  // Timeout for each test - 100 seconds
  timeout: 100 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 30000, // 30 seconds
  },
  
  // NO global setup/teardown - handled by orchestrator
  // globalSetup: undefined,
  // globalTeardown: undefined,
  
  // Output directory for suite results
  outputDir: 'test-results-suite/',
  
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
    framework: 'Yggdrasil Suite Testing Framework',
    version: '1.0.0',
    mode: 'Sequential suite execution with service restarts',
    orchestrator: 'suite-orchestrator.js'
  }
});