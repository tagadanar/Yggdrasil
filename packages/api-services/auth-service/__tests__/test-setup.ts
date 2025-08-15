/**
 * Test Setup for Auth Service
 * Initializes JWT and other required services for testing
 */

// Set up test environment variables before imports
process.env['JWT_SECRET'] =
  process.env['JWT_SECRET'] || 'test-jwt-secret-for-testing-only-that-is-longer-than-32-chars';
process.env['JWT_REFRESH_SECRET'] =
  process.env['JWT_REFRESH_SECRET'] ||
  'test-refresh-secret-for-testing-only-that-is-longer-than-32-chars';
process.env['JWT_ISSUER'] = 'yggdrasil-test';
process.env['JWT_AUDIENCE'] = 'yggdrasil-platform-test';

import { initializeJWT } from '@yggdrasil/shared-utilities';

// Initialize JWT for all tests
beforeAll(() => {
  // Initialize JWT with test configuration
  initializeJWT();
});

// Clean up after tests
afterAll(() => {
  // Any cleanup needed
});

export {};
