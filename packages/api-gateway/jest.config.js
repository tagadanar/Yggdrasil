module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 10000,
  verbose: true,
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        types: ['jest', 'node']
      }
    }]
  },
  moduleNameMapper: {
    '^@101-school/shared-utilities$': '<rootDir>/../shared-utilities/src',
    '^@101-school/database-schemas$': '<rootDir>/../database-schemas/src',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json']
};