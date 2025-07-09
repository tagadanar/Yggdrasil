module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/setup/jest.setup.ts'],
  globalSetup: '<rootDir>/src/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/src/setup/globalTeardown.ts',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
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
  testTimeout: 120000, // Increased for service startup and slow tests
  maxWorkers: 1, // Run serially to avoid port conflicts
  detectOpenHandles: true,
  forceExit: true,
  verbose: false, // Reduce verbosity to prevent timeout
  collectCoverage: false,
  silent: false, // Allow our custom reporter to work
  bail: false, // Don't stop on first failure when running suites
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/src/setup/',
    '/src/config/'
  ]
};