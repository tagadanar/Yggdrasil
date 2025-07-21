// packages/testing-utilities/playwright.enhanced.config.ts
// Enhanced Playwright configuration for single-worker testing

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Run tests sequentially for single-worker stability
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // No retries - tests should be deterministic with enhanced isolation
  retries: 0,
  
  // Single worker for stable execution
  workers: 1,
  
  // Enhanced reporter configuration for single-worker analysis
  reporter: process.env.CI ? [
    ['dot'],
    ['json', { outputFile: 'test-results-enhanced/results.json' }]
  ] : [
    ['html', { outputFolder: 'test-results-enhanced' }],
    ['json', { outputFile: 'test-results-enhanced/results.json' }],
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
  
  // Timeout for each test - 2 minutes (faster feedback)
  timeout: 2 * 60 * 1000,
  
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