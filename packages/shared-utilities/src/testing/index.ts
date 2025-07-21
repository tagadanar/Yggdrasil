// packages/shared-utilities/src/testing/index.ts
// Centralized testing utilities - one-stop shop for all test infrastructure

export { DemoUserManager, demoUserManager, DEMO_USERS, type DemoUser } from './DemoUserManager';
export { AuthTestHelper, QuickAuth, type AuthTestOptions, type AuthResult } from './AuthTestHelper';
export { CleanAuthHelper, type CleanAuthResult } from './CleanAuthHelper';
export { TestInitializer, type TestInitializationOptions } from './TestInitializer';
export { TestCleanup, withCleanup, testCleanupHooks, type CleanupTracker } from './TestCleanup';

// Import for internal use
import { TestInitializer } from './TestInitializer';

// Convenience exports for common patterns

/**
 * Quick start for a clean testing environment  
 * @returns Test environment ready for use
 */
export async function startTestEnvironment() {
  // Initialize test environment with demo users
  await TestInitializer.quickSetup();
  return { initialized: true, message: 'Test environment ready' };
}

// Note: All types are already exported through the module exports above