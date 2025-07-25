/**
 * Commitlint Configuration for Yggdrasil Educational Platform
 *
 * Enforces conventional commit message format for consistent Git history
 * and automated changelog generation.
 *
 * Format: type(scope): description
 *
 * Types:
 * - feat: new features
 * - fix: bug fixes
 * - docs: documentation updates
 * - style: code formatting changes
 * - refactor: code restructuring without functionality changes
 * - test: test additions or modifications
 * - chore: maintenance tasks, dependency updates
 * - security: security-related changes
 * - perf: performance improvements
 * - ci: CI/CD configuration changes
 *
 * Scopes (optional):
 * - auth: authentication/authorization
 * - frontend: Next.js frontend
 * - api: API services
 * - db: database operations
 * - test: testing infrastructure
 * - docs: documentation
 * - config: configuration files
 *
 * Examples:
 * - feat(auth): implement JWT refresh token rotation
 * - fix(frontend): resolve dark mode toggle persistence
 * - docs(api): add OpenAPI documentation for user endpoints
 * - chore: update dependencies to latest versions
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional types
    'type-enum': [
      2,
      'always',
      [
        'feat', // New features
        'fix', // Bug fixes
        'docs', // Documentation updates
        'style', // Code formatting (no logic changes)
        'refactor', // Code refactoring
        'test', // Test additions/modifications
        'chore', // Maintenance tasks
        'security', // Security-related changes
        'perf', // Performance improvements
        'ci', // CI/CD changes
        'revert', // Revert previous commits
      ],
    ],

    // Optional scope validation
    'scope-enum': [
      1,
      'always',
      [
        'auth', // Authentication/authorization
        'frontend', // Next.js client application
        'api', // API services (any microservice)
        'db', // Database operations
        'test', // Testing infrastructure
        'docs', // Documentation
        'config', // Configuration files
        'security', // Security configurations
        'monitoring', // Logging/monitoring
        'utils', // Shared utilities
      ],
    ],

    // Message format rules
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 100],
    'subject-min-length': [2, 'always', 10],

    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    'scope-case': [2, 'always', 'lower-case'],

    // Body and footer rules
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 200],

    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 200],

    // Header rules
    'header-max-length': [2, 'always', 120],
  },
};
