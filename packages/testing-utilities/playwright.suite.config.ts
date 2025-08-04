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
  
  // Single worker for stable execution with memory limits
  workers: 1,
  
  // CRITICAL: Memory and resource management to prevent exit code 137
  maxFailures: undefined, // Don't stop on failures, run all tests
  
  // Memory optimization for browser contexts
  webServer: undefined, // Don't start additional web servers
  
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
    
    // OPTIMIZED: Minimal resource usage to prevent memory exhaustion
    screenshot: 'only-on-failure',
    video: 'retain-on-failure', 
    trace: 'retain-on-failure',
    
    // CRITICAL: Reduced timeouts to prevent resource exhaustion
    actionTimeout: 20000, // 20 seconds (reduced from 30)
    navigationTimeout: 30000, // 30 seconds (reduced from 45)
    
    // Ignore HTTPS errors in test environment
    ignoreHTTPSErrors: true,
    
    // Accept downloads
    acceptDownloads: true,
    
    // MEMORY OPTIMIZATION: Browser context settings
    viewport: { width: 1280, height: 720 }, // Standard viewport
    
    // Disable some resource-intensive features
    javaScriptEnabled: true,
    
    // CRITICAL: Browser launch options for memory management
    launchOptions: {
      // Memory limits to prevent exit code 137
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
        '--disable-ipc-flooding-protection',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-web-security',
        '--memory-pressure-off',
        '--aggressive-cache-discard',
        '--enable-aggressive-domstorage-flushing',
        // CRITICAL: Memory limits per process
        '--max_old_space_size=512', // Reduced to 512MB per process
        '--js-flags=--max-old-space-size=512',
        // Reduce renderer processes
        '--renderer-process-limit=1',
        '--max_renderer_processes=1'
      ],
      // Headless mode to save resources
      headless: true,
      // Force garbage collection
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=1024 --expose-gc' // Reduced Node memory limit
      }
    },
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  // CRITICAL: Increased timeout to prevent exit code 137 from timeout kills
  timeout: 120 * 1000, // 120 seconds (increased from 100)
  
  // Expect timeout - reduced for faster failure detection
  expect: {
    timeout: 20000, // 20 seconds (reduced from 30)
  },
  
  // Lightweight setup for individual suite runs
  globalSetup: require.resolve('./suite-browser-setup'),
  
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