// packages/testing-utilities/tests/helpers/migrate-auth-helpers.ts
// Migration utility to update existing tests to use isolated auth helpers

import { test, expect } from '@playwright/test';
import { IsolatedAuthHelpers } from './isolated-auth.helpers';

/**
 * Create a properly isolated test setup
 */
export function createIsolatedTest() {
  let authHelpers: IsolatedAuthHelpers;

  const beforeEach = async ({ page }: { page: any }) => {
    authHelpers = new IsolatedAuthHelpers(page);
    await authHelpers.initialize();
  };

  const afterEach = async ({ page }: { page: any }) => {
    await authHelpers.cleanup();
  };

  return {
    beforeEach,
    afterEach,
    getAuthHelpers: () => authHelpers
  };
}

/**
 * Migration guide for existing tests:
 * 
 * OLD PATTERN:
 * ```typescript
 * import { AuthHelpers } from '../helpers/auth.helpers';
 * 
 * test.describe('My Tests', () => {
 *   let authHelpers: AuthHelpers;
 * 
 *   test.beforeEach(async ({ page }) => {
 *     authHelpers = new AuthHelpers(page);
 *   });
 * 
 *   test('My test', async ({ page }) => {
 *     await authHelpers.loginAsAdmin();
 *     // test logic
 *   });
 * });
 * ```
 * 
 * NEW PATTERN:
 * ```typescript
 * import { IsolatedAuthHelpers } from '../helpers/isolated-auth.helpers';
 * 
 * test.describe('My Tests', () => {
 *   let authHelpers: IsolatedAuthHelpers;
 * 
 *   test.beforeEach(async ({ page }) => {
 *     authHelpers = new IsolatedAuthHelpers(page);
 *     await authHelpers.initialize();
 *   });
 * 
 *   test.afterEach(async ({ page }) => {
 *     await authHelpers.cleanup();
 *   });
 * 
 *   test('My test', async ({ page }) => {
 *     await authHelpers.loginAsAdmin();
 *     // test logic
 *   });
 * });
 * ```
 */