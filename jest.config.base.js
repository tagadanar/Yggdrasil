/**
 * Base Jest Configuration for Yggdrasil Platform
 * Provides shared settings and coverage thresholds for all packages
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // TypeScript setup
  preset: 'ts-jest',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).[tj]s',
  ],

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,ts}',
    '!src/**/_*.{js,ts}',
    '!src/**/{__tests__,__mocks__}/**',
    '!src/index.ts',
    '!src/index.js',
  ],

  // Coverage reporting
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json-summary'],

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Coverage thresholds - Progressive improvement strategy
  coverageThreshold: {
    global: {
      // Conservative but meaningful thresholds based on current state
      statements: 50, // Start at 50%, current average across services
      branches: 30, // Start at 30%, many services have low branch coverage
      functions: 40, // Start at 40%, reasonable function coverage expectation
      lines: 50, // Start at 50%, matches statement coverage
    },
  },

  // Enhanced error reporting
  verbose: true,

  // Timeout for tests
  testTimeout: 30000, // 30 seconds for service integration tests

  // Clear mocks between tests
  clearMocks: true,

  // Collect coverage from all files, even untested ones
  collectCoverage: false, // Only when explicitly requested

  // Transform ignore patterns for ES modules
  transformIgnorePatterns: ['node_modules/(?!(p-queue|eventemitter3|mongodb|bson)/)'],

  // Module name mapping for common imports
  moduleNameMapper: {
    // Handle CSS imports in universal config (though mainly for frontend)
    '^.+\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle image imports
    '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$/i': '<rootDir>/__mocks__/fileMock.js',

    // Mock problematic ESM modules
    '^p-queue$': '<rootDir>/__mocks__/p-queue.js',
  },

  // Error handling
  errorOnDeprecated: true,

  // Performance settings
  maxWorkers: '50%', // Use 50% of available CPUs

  // Test result formatting
  reporters: ['default'],
};
