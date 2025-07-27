// Test performance optimization configuration
// Reduces unnecessary waits and optimizes timeouts for faster test execution

export const TEST_PERFORMANCE_CONFIG = {
  // Reduced timeouts for faster failure detection
  timeouts: {
    navigation: 15000,    // Navigation timeout (was 30000)
    selector: 3000,       // Element selector timeout (was 5000-10000)
    action: 2000,         // Action timeout (was 5000)
    api: 5000,           // API response timeout (was 10000)
    auth: 10000,         // Auth flow timeout (was 15000)
  },
  
  // Replace fixed waits with smarter strategies
  waits: {
    stateChange: 100,     // Minimal wait for state changes (was 500-1000)
    animation: 200,       // Wait for CSS animations (was 500)
    debounce: 50,        // Debounce wait (was 300)
    buffer: 100,         // General buffer wait (was 500)
  },
  
  // Service startup optimization
  service: {
    healthCheckInterval: 500,    // Check service health every 500ms (was 1000-2000)
    maxStartupTime: 30000,      // Max time for service startup (was 60000)
    parallelStartup: true,      // Start services in parallel where possible
  },
  
  // Database optimization
  database: {
    connectionPoolSize: 10,     // Increased pool size for tests
    queryTimeout: 2000,         // Faster query timeout
    indexStrategy: 'lazy',      // Don't create indexes unless needed
  },
  
  // Parallel execution hints
  parallel: {
    maxConcurrentDbOps: 5,      // Limit concurrent DB operations
    batchSize: 10,              // Batch operations where possible
  }
};

// Helper function to apply optimized waits
export async function optimizedWait(page: any, type: keyof typeof TEST_PERFORMANCE_CONFIG.waits) {
  const duration = TEST_PERFORMANCE_CONFIG.waits[type];
  if (duration > 0) {
    await page.waitForTimeout(duration);
  }
}

// Helper function for optimized element waiting
export async function waitForElement(
  page: any, 
  selector: string, 
  options?: { timeout?: number; state?: 'visible' | 'hidden' | 'attached' | 'detached' }
) {
  const timeout = options?.timeout || TEST_PERFORMANCE_CONFIG.timeouts.selector;
  return page.waitForSelector(selector, { ...options, timeout });
}

// Helper function for optimized navigation
export async function optimizedGoto(page: any, url: string) {
  return page.goto(url, { 
    timeout: TEST_PERFORMANCE_CONFIG.timeouts.navigation,
    waitUntil: 'domcontentloaded' // Faster than 'networkidle'
  });
}