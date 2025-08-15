const nextJest = require('next/jest');

// Providing the path to your Next.js app which will enable loading next.config.js and .env files
const createJestConfig = nextJest({
  dir: './',
});

// Any custom config you want to pass to Jest
const customJestConfig = {
  // Module name mapper for handling CSS imports, image imports, etc.
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',

    // Handle CSS imports (without CSS modules)
    '^.+\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',

    // Handle image imports
    '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$/i': '<rootDir>/__mocks__/fileMock.js',

    // Handle module aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
  },

  // Test environment
  testEnvironment: 'jest-environment-jsdom',

  // Collect coverage from
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/_*.{js,jsx,ts,tsx}',
    '!src/**/{__tests__,__mocks__}/**',
  ],

  // Test patterns
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],

  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
            decorators: false,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
  },

  // Coverage output formats
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json-summary'],

  // Coverage thresholds - Progressive improvement
  coverageThreshold: {
    global: {
      branches: 0, // Start at 0% - will increase as tests are added
      functions: 0, // Start at 0% - will increase progressively
      lines: 0, // Start at 0% - baseline for growth
      statements: 0, // Start at 0% - baseline for growth
    },
    // Realistic thresholds for utility functions (will increase progressively)
    './src/lib/utils/*.ts': {
      branches: 50, // cn.ts has 100%, so this is fair
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Longer timeouts for real service integration
  testTimeout: 60000, // 60 seconds for real service tests

  // Setup files run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/out/', '/coverage/'],

  // Transform node_modules that use ES modules
  transformIgnorePatterns: ['node_modules/(?!(mongodb|bson)/).*'],

  // Treat certain extensions as ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
