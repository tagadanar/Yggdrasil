// Path: jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    '!packages/**/*.d.ts',
    '!packages/**/dist/**',
    '!packages/**/*.test.{ts,tsx}',
    '!packages/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/packages/testing-utilities/setup.js'],
  testTimeout: 10000,
  moduleNameMapping: {
    '^@shared/(.*)$': '<rootDir>/packages/shared-utilities/$1',
    '^@database/(.*)$': '<rootDir>/packages/database-schemas/$1',
    '^@testing/(.*)$': '<rootDir>/packages/testing-utilities/$1'
  }
};