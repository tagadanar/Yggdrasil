#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const { 
  killPorts, 
  isPortInUse, 
  waitForPort, 
  setupGracefulShutdown 
} = require('./kill-ports');

// Test port configuration - use same as dev for consistency
const TEST_PORTS = {
  frontend: 3000,
  auth: 3001,
  user: 3002
};

const ALL_TEST_PORTS = Object.values(TEST_PORTS);

// Process tracking
const testProcesses = new Map();

/**
 * Start a test service
 */
async function startTestService(serviceName, command, args = [], options = {}) {
  console.log(`🧪 Starting ${serviceName} for testing...`);
  
  // Ensure npm is available in PATH
  const env = { 
    ...process.env, 
    NODE_ENV: 'test',
    PATH: process.env.PATH,
    ...options.env 
  };
  
  const childProcess = spawn(command, args, {
    stdio: 'pipe',
    detached: false,
    cwd: path.join(__dirname, '..'),
    env,
    shell: true, // Use shell to ensure npm command is found
    ...options
  });
  
  testProcesses.set(serviceName, childProcess);
  
  // Handle process output with test prefix
  childProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[TEST-${serviceName}] ${output}`);
    }
  });
  
  childProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`[TEST-${serviceName}] ${output}`);
    }
  });
  
  // Handle process events
  childProcess.on('error', (error) => {
    console.error(`❌ Test ${serviceName} error:`, error.message);
    testProcesses.delete(serviceName);
  });
  
  childProcess.on('exit', (code, signal) => {
    console.log(`📋 Test ${serviceName} exited with code ${code} (signal: ${signal})`);
    testProcesses.delete(serviceName);
  });
  
  return childProcess;
}

/**
 * Wait for test service to be ready
 */
async function waitForTestServiceReady(serviceName, port, timeout = 45000) {
  console.log(`⏳ Waiting for test ${serviceName} to be ready on port ${port}...`);
  
  try {
    await waitForPort(port, timeout);
    console.log(`✅ Test ${serviceName} is ready on port ${port}`);
    return true;
  } catch (error) {
    console.error(`❌ Test ${serviceName} failed to start: ${error.message}`);
    return false;
  }
}

/**
 * Graceful shutdown of all test services
 */
async function shutdownTestServices() {
  if (testProcesses.size === 0) {
    console.log('📋 No test services to shutdown');
    return;
  }
  
  console.log(`🛑 Shutting down ${testProcesses.size} test services...`);
  
  const shutdownPromises = Array.from(testProcesses.entries()).map(([name, process]) => {
    return new Promise((resolve) => {
      console.log(`📡 Sending SIGTERM to test ${name}`);
      
      const timeout = setTimeout(() => {
        console.log(`💀 Force killing test ${name}`);
        process.kill('SIGKILL');
        resolve();
      }, 8000); // 8 seconds for test services
      
      process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      process.kill('SIGTERM');
    });
  });
  
  await Promise.all(shutdownPromises);
  testProcesses.clear();
  console.log('✅ All test services shutdown complete');
}

/**
 * Start test environment (all services needed for functional tests)
 */
async function startTestEnvironment() {
  console.log('🧪 Starting test environment...');
  
  // Clear ports first
  console.log('🧹 Clearing test ports...');
  await killPorts(ALL_TEST_PORTS);
  
  // Start backend services with test environment
  console.log('🚀 Starting test backend services...');
  
  // Get npm path
  const npmPath = process.env.npm_execpath || 'npm';
  
  // Start auth service
  await startTestService('auth-service', npmPath, ['run', 'dev', '--workspace=@yggdrasil/auth-service'], {
    env: { 
      PORT: TEST_PORTS.auth,
      NODE_ENV: 'test'
    }
  });
  
  // Start user service  
  await startTestService('user-service', npmPath, ['run', 'dev', '--workspace=@yggdrasil/user-service'], {
    env: { 
      PORT: TEST_PORTS.user,
      NODE_ENV: 'test'
    }
  });
  
  // Wait for backend services
  const authReady = await waitForTestServiceReady('auth-service', TEST_PORTS.auth);
  const userReady = await waitForTestServiceReady('user-service', TEST_PORTS.user);
  
  if (!authReady || !userReady) {
    throw new Error('Failed to start backend test services');
  }
  
  // Start frontend
  console.log('🚀 Starting test frontend...');
  await startTestService('frontend', npmPath, ['run', 'dev', '--workspace=@yggdrasil/frontend'], {
    env: { 
      PORT: TEST_PORTS.frontend,
      NODE_ENV: 'test'
    }
  });
  
  const frontendReady = await waitForTestServiceReady('frontend', TEST_PORTS.frontend);
  
  if (!frontendReady) {
    throw new Error('Failed to start frontend test service');
  }
  
  console.log('✅ Test environment is ready!');
  console.log(`🌐 Test Frontend: http://localhost:${TEST_PORTS.frontend}`);
  console.log(`🔐 Test Auth API: http://localhost:${TEST_PORTS.auth}`);
  console.log(`👤 Test User API: http://localhost:${TEST_PORTS.user}`);
  
  return true;
}

/**
 * Run functional tests
 */
async function runFunctionalTests(testArgs = []) {
  console.log('🧪 Running functional tests...');
  
  return new Promise((resolve) => {
    const testProcess = spawn('npx', ['playwright', 'test', ...testArgs], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../packages/testing-utilities'),
      env: { 
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    testProcess.on('exit', (code) => {
      console.log(`📋 Functional tests completed with exit code: ${code}`);
      resolve(code === 0);
    });
    
    testProcess.on('error', (error) => {
      console.error('❌ Failed to run functional tests:', error.message);
      resolve(false);
    });
  });
}

/**
 * Run the complete test cycle
 */
async function runTestCycle(testArgs = []) {
  let testsPassed = false;
  
  try {
    // Start test environment
    await startTestEnvironment();
    
    // Wait a moment for services to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run functional tests
    testsPassed = await runFunctionalTests(testArgs);
    
  } catch (error) {
    console.error('❌ Test cycle error:', error.message);
  } finally {
    // Always cleanup test services
    await shutdownTestServices();
    
    // Clear test ports
    console.log('🧹 Cleaning up test ports...');
    await killPorts(ALL_TEST_PORTS);
  }
  
  return testsPassed;
}

/**
 * Check test port status
 */
async function checkTestPortStatus() {
  console.log('🔍 Checking test port status...');
  
  for (const [name, port] of Object.entries(TEST_PORTS)) {
    const inUse = await isPortInUse(port);
    const status = inUse ? '🔴 IN USE' : '🟢 FREE';
    console.log(`  Test Port ${port} (${name}): ${status}`);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  
  console.log('🧪 Yggdrasil Test Server Manager');
  console.log('===============================');
  
  // Setup graceful shutdown
  setupGracefulShutdown();
  
  const cleanup = async (signal) => {
    console.log(`\n🛑 Received ${signal}, shutting down test environment...`);
    await shutdownTestServices();
    await killPorts(ALL_TEST_PORTS);
    console.log('✅ Test environment shutdown complete');
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  try {
    switch (command) {
      case 'status':
        await checkTestPortStatus();
        break;
        
      case 'clean':
        console.log('🧹 Cleaning test ports...');
        await killPorts(ALL_TEST_PORTS);
        console.log('✅ Test ports cleaned');
        break;
        
      case 'start':
        console.log('🚀 Starting test environment (persistent)...');
        await startTestEnvironment();
        console.log('\n💡 Test environment is running. Press Ctrl+C to stop.');
        // Keep process alive
        process.stdin.resume();
        break;
        
      case 'run':
      default:
        console.log('🚀 Running complete test cycle...');
        const testArgs = args.slice(1); // Pass remaining args to playwright
        const success = await runTestCycle(testArgs);
        
        if (success) {
          console.log('🎉 All functional tests passed!');
          process.exit(0);
        } else {
          console.log('❌ Some functional tests failed!');
          process.exit(1);
        }
        break;
    }
    
  } catch (error) {
    console.error('❌ Test server error:', error.message);
    await shutdownTestServices();
    await killPorts(ALL_TEST_PORTS);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await shutdownTestServices();
  await killPorts(ALL_TEST_PORTS);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await shutdownTestServices();
  await killPorts(ALL_TEST_PORTS);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { 
  startTestEnvironment,
  runFunctionalTests,
  runTestCycle,
  shutdownTestServices,
  checkTestPortStatus,
  TEST_PORTS 
};