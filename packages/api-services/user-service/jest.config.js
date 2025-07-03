module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@101-school/shared-utilities$': '<rootDir>/../../shared-utilities/src',
    '^@101-school/database-schemas$': '<rootDir>/../../database-schemas/src',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app.ts',
    '!src/index.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 30000
};