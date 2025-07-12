// Test Environment Configuration for Yggdrasil Functional Tests

const TEST_ENVIRONMENTS = {
  // Default functional test environment with all services
  functional: {
    LOG_LEVEL: 'warn',
    AUTH_SERVICE_URL: 'http://localhost:3101',
    USER_SERVICE_URL: 'http://localhost:3102', 
    COURSE_SERVICE_URL: 'http://localhost:3103',
    PLANNING_SERVICE_URL: 'http://localhost:3104',
    NEWS_SERVICE_URL: 'http://localhost:3105',
    STATISTICS_SERVICE_URL: 'http://localhost:3106',
    NOTIFICATION_SERVICE_URL: 'http://localhost:3107'
  },

  // Quiet mode for CI/CD
  quiet: {
    LOG_LEVEL: 'error',
    AUTH_SERVICE_URL: 'http://localhost:3101',
    USER_SERVICE_URL: 'http://localhost:3102',
    COURSE_SERVICE_URL: 'http://localhost:3103', 
    PLANNING_SERVICE_URL: 'http://localhost:3104',
    NEWS_SERVICE_URL: 'http://localhost:3105',
    STATISTICS_SERVICE_URL: 'http://localhost:3106',
    NOTIFICATION_SERVICE_URL: 'http://localhost:3107'
  },

  // Debug mode for troubleshooting
  debug: {
    LOG_LEVEL: 'debug',
    AUTH_SERVICE_URL: 'http://localhost:3101',
    USER_SERVICE_URL: 'http://localhost:3102',
    COURSE_SERVICE_URL: 'http://localhost:3103',
    PLANNING_SERVICE_URL: 'http://localhost:3104', 
    NEWS_SERVICE_URL: 'http://localhost:3105',
    STATISTICS_SERVICE_URL: 'http://localhost:3106',
    NOTIFICATION_SERVICE_URL: 'http://localhost:3107'
  }
};

// Generate environment string for npm scripts
function generateEnvString(envName) {
  const env = TEST_ENVIRONMENTS[envName];
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
}

// Export for use in npm scripts and test files
module.exports = {
  TEST_ENVIRONMENTS,
  generateEnvString,
  
  // Pre-generated environment strings for npm scripts
  FUNCTIONAL_ENV: generateEnvString('functional'),
  QUIET_ENV: generateEnvString('quiet'), 
  DEBUG_ENV: generateEnvString('debug')
};