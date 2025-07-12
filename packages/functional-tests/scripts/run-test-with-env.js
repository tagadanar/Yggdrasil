#!/usr/bin/env node

/**
 * Test Execution Helper Script
 * Runs tests with appropriate environment configuration
 */

const { spawn } = require('child_process');
const path = require('path');

// Import environment configurations
const { TEST_ENVIRONMENTS } = require('../config/test-environments.js');

// Parse command line arguments
const args = process.argv.slice(2);
const envName = args[0] || 'functional';
const jestArgs = args.slice(1);

// Get environment configuration
const environment = TEST_ENVIRONMENTS[envName];
if (!environment) {
  console.error(`❌ Unknown environment: ${envName}`);
  console.error(`✅ Available environments: ${Object.keys(TEST_ENVIRONMENTS).join(', ')}`);
  process.exit(1);
}

// Setup environment variables
const env = { ...process.env, ...environment };

// Build jest command
const jestCommand = 'jest';
const jestOptions = [
  '--runInBand',  // Run tests serially to avoid port conflicts
  ...jestArgs
];

console.log(`🧪 Running tests with ${envName} environment`);
console.log(`📊 Command: ${jestCommand} ${jestOptions.join(' ')}`);

// Execute jest with environment
const testProcess = spawn(jestCommand, jestOptions, {
  stdio: 'inherit',
  env: env,
  cwd: process.cwd()
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log(`✅ Tests completed successfully`);
  } else {
    console.log(`❌ Tests failed with exit code ${code}`);
  }
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error(`❌ Failed to start test process: ${error.message}`);
  process.exit(1);
});