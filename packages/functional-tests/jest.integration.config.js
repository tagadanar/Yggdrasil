module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/setup/jest.setup.ts'],
  // Modified to use globalSetup/globalTeardown for service management
  globalSetup: '<rootDir>/src/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/src/setup/globalTeardown.ts',
  testMatch: [
    '**/__tests__/**/*.integration.test.ts',
    '**/integration/__tests__/**/*.test.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '.functional.test.ts',
    '.e2e.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/setup/**',
    '!src/config/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  testTimeout: 30000, // Shorter timeout since no service startup
  maxWorkers: 1,
  detectOpenHandles: true,
  forceExit: true,
  verbose: false,
  collectCoverage: false,
  silent: false,
  bail: false,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/src/setup/',
    '/src/config/'
  ]
};