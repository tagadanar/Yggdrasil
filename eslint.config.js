// Basic ESLint configuration for Yggdrasil platform
export default [
  {
    files: ['**/*.js'],
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['node_modules/', 'dist/', 'coverage/', '*.d.ts'],
    languageOptions: {
      parser: await import('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
    rules: {
      // Basic rules for TypeScript files
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'comma-dangle': ['error', 'always-multiline'],
      'eol-last': 'error',
      'no-trailing-spaces': 'error',
    }
  },
  {
    files: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}', '**/__tests__/**/*.{js,ts}'],
    rules: {
      'no-console': 'off',
    }
  }
];