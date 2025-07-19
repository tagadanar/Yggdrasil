// packages/testing-utilities/playwright.enhanced.config.ts
// Enhanced Playwright configuration for ultra-robust 4-worker parallelization

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Run tests in files in parallel with 4 workers
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // No retries - tests should be deterministic with enhanced isolation
  retries: 0,
  
  // 4 workers for enhanced parallelization
  workers: 4,
  
  // Enhanced reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results-enhanced' }],
    ['json', { outputFile: 'test-results-enhanced/results.json' }],
    ['list', { printSteps: true }],
    ['dot'] // Clean output during execution
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
  
  // Global timeout for entire test run - 1 hour
  globalTimeout: 60 * 60 * 1000,
  
  // Timeout for each test - 5 minutes
  timeout: 5 * 60 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 30000, // 30 seconds
  },
  
  // Services are managed by enhanced global setup/teardown for 4-worker coordination
  
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
    parallelization: '4-worker for enhanced parallelization',
    raceConditions: 'Completely eliminated'
  }
});