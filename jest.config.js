// Path: jest.config.js
module.exports = {
  projects: [
    // Backend packages (Node.js environment)
    {
      displayName: 'auth-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/api-services/auth-service/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/api-services/auth-service/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/packages/api-services/auth-service/__tests__/setup.ts'],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    },
    {
      displayName: 'user-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/api-services/user-service/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/api-services/user-service/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/packages/api-services/user-service/__tests__/setup.ts'],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    },
    {
      displayName: 'course-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/api-services/course-service/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/api-services/course-service/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/packages/api-services/course-service/__tests__/setup.ts'],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    },
    {
      displayName: 'news-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/api-services/news-service/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/api-services/news-service/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/packages/api-services/news-service/__tests__/setup.ts'],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    },
    {
      displayName: 'planning-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/api-services/planning-service/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/api-services/planning-service/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/packages/api-services/planning-service/__tests__/setup.ts'],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    },
    {
      displayName: 'statistics-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/api-services/statistics-service/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/api-services/statistics-service/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/packages/api-services/statistics-service/__tests__/setup.ts'],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    },
    {
      displayName: 'notification-service',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/api-services/notification-service/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/api-services/notification-service/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      testPathIgnorePatterns: [
        '.*\\.d\\.ts$',
        '.*\\.js\\.map$'
      ],
      setupFilesAfterEnv: ['<rootDir>/packages/api-services/notification-service/__tests__/setup.ts'],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    },
    {
      displayName: 'api-gateway',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/api-gateway/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/api-gateway/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/packages/api-gateway/__tests__/setup.ts'],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    },
    {
      displayName: 'database-schemas',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/database-schemas/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/database-schemas/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    },
    {
      displayName: 'shared-utilities',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/shared-utilities/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/shared-utilities/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    },
    // Frontend package (jsdom environment for React)
    {
      displayName: 'frontend',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/packages/frontend/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/packages/frontend/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      setupFilesAfterEnv: ['<rootDir>/packages/frontend/__tests__/setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/packages/frontend/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
          },
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    },
    // Scripts tests
    {
      displayName: 'scripts',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/scripts/**/__tests__/**/*.(test|spec).(ts|tsx|js)',
        '<rootDir>/scripts/**/__tests__/**/!(setup).(ts|tsx|js)'
      ],
      moduleNameMapper: {
        '^@101-school/shared-utilities$': '<rootDir>/packages/shared-utilities/src',
        '^@101-school/database-schemas$': '<rootDir>/packages/database-schemas/src'
      }
    }
  ],
  testTimeout: 30000,
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    '!packages/**/*.d.ts',
    '!packages/**/dist/**',
    '!packages/**/*.test.{ts,tsx}',
    '!packages/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: [
    'default'
  ]
};