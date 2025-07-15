import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0, // No retries for local development
  workers: process.env.CI ? 1 : 2, // Further reduced to 2 workers for maximum stability
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  globalTimeout: 300 * 1000, // 5 minutes for entire test suite
  timeout: 60 * 1000, // 1 minute per test
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true, // Always run headless for CI/CD compatibility
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10 * 1000, // 10 seconds for actions
    navigationTimeout: 30 * 1000, // 30 seconds for page loads
    // Ensure proper test isolation
    contextOptions: {
      ignoreHTTPSErrors: true,
    },
    // Force new context for each test to ensure isolation
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'node service-manager.js start',
    url: 'http://localhost:3000',
    reuseExistingServer: false, // Always start fresh to prevent conflicts
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test'
    }
  },
});