// packages/shared-utilities/src/testing/index.ts
// Centralized testing utilities - one-stop shop for all test infrastructure

export { WorkerConfigManager, type WorkerConfig } from './WorkerConfig';
export { ServiceManager, type ServiceInfo, type ServiceManagerOptions } from './ServiceManager';
export { DatabaseIsolationManager, type DatabaseIsolationOptions, type TestUserData } from './DatabaseIsolation';
export { TestSetup, type TestSetupOptions, type TestEnvironmentInfo } from './TestSetup';
export { WorkerValidation } from './WorkerValidation';
export { DemoUserManager, demoUserManager, DEMO_USERS, type DemoUser } from './DemoUserManager';
export { AuthTestHelper, QuickAuth, type AuthTestOptions, type AuthResult } from './AuthTestHelper';
export { CleanAuthHelper, type CleanAuthResult } from './CleanAuthHelper';
export { TestInitializer, type TestInitializationOptions } from './TestInitializer';
export { TestCleanup, withCleanup, testCleanupHooks, type CleanupTracker } from './TestCleanup';

// Import for internal use
import { TestSetup } from './TestSetup';
import { WorkerConfigManager } from './WorkerConfig';
import { TestInitializer } from './TestInitializer';

// Convenience exports for common patterns

/**
 * Quick start for a single test worker
 * @param workerId Optional worker ID (auto-detected if not provided)
 * @returns Complete test environment ready for use
 */
export async function startTestEnvironment(workerId?: number) {
  // Initialize test environment with demo users
  await TestInitializer.quickSetup();
  return TestSetup.quickSetup(workerId);
}

/**
 * Start test environment for all workers (global setup)
 * @param workerCount Number of workers to setup (default: 1 for single-worker architecture)
 * @returns Array of test environments for each worker
 */
export async function startAllTestEnvironments(workerCount: number = 1) {
  return TestSetup.setupAllWorkers(workerCount);
}

/**
 * Get current worker configuration without starting services
 * @returns Worker configuration for current worker
 */
export function getCurrentWorkerConfig() {
  return WorkerConfigManager.getCurrentWorkerConfig();
}

/**
 * Detect current worker ID
 * @returns Worker ID (0-3 for 4-worker setup)
 */
export function detectWorkerId() {
  return WorkerConfigManager.detectWorkerId();
}

/**
 * Get service port for specific service type
 * @param serviceType Type of service (frontend, auth, user, etc.)
 * @param workerId Optional worker ID (auto-detected if not provided)
 * @returns Port number for the service
 */
export function getServicePort(serviceType: 'frontend' | 'auth' | 'user' | 'news' | 'course' | 'planning' | 'statistics', workerId?: number) {
  return WorkerConfigManager.getServicePort(serviceType, workerId);
}

/**
 * Apply worker environment variables to current process
 * @param workerId Optional worker ID (auto-detected if not provided)
 */
export function applyWorkerEnvironment(workerId?: number) {
  return WorkerConfigManager.applyWorkerEnvironment(workerId);
}

// Note: All types are already exported through the module exports above