// packages/testing-utilities/tests/global-teardown.ts
// Global teardown for functional tests - cleanup all test data

import { globalTestCleanup } from './helpers/test-isolation';

async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  try {
    // Cleanup all test users and data
    await globalTestCleanup();
    
    console.log('✅ Global test teardown completed successfully');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
  }
}

export default globalTeardown;