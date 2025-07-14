#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const { 
  killPorts, 
  isPortInUse, 
  waitForPort, 
  setupGracefulShutdown 
} = require('./kill-ports');

// Port configuration
const DEV_PORTS = {
  frontend: 3000,
  auth: 3001,
  user: 3002,
  course: 3003,
  news: 3004,
  planning: 3005
};

const ALL_PORTS = Object.values(DEV_PORTS);

// Process tracking
const activeProcesses = new Map();

/**
 * Start a development service
 */
async function startService(serviceName, command, args = [], options = {}) {
  console.log(`🚀 Starting ${serviceName}...`);
  
  // Ensure npm is available in PATH
  const env = { 
    ...process.env, 
    ...options.env,
    PATH: process.env.PATH
  };
  
  const childProcess = spawn(command, args, {
    stdio: 'pipe',
    detached: false,
    cwd: path.join(__dirname, '..'),
    env,
    shell: true, // Use shell to ensure npm command is found
    ...options
  });
  
  activeProcesses.set(serviceName, childProcess);
  
  // Handle process output
  childProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[${serviceName}] ${output}`);
    }
  });
  
  childProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`[${serviceName}] ${output}`);
    }
  });
  
  // Handle process events
  childProcess.on('error', (error) => {
    console.error(`❌ ${serviceName} error:`, error.message);
    activeProcesses.delete(serviceName);
  });
  
  childProcess.on('exit', (code, signal) => {
    console.log(`📋 ${serviceName} exited with code ${code} (signal: ${signal})`);
    activeProcesses.delete(serviceName);
  });
  
  return childProcess;
}

/**
 * Wait for service to be ready by checking its port
 */
async function waitForServiceReady(serviceName, port, timeout = 30000) {
  console.log(`⏳ Waiting for ${serviceName} to be ready on port ${port}...`);
  
  try {
    await waitForPort(port, timeout);
    console.log(`✅ ${serviceName} is ready on port ${port}`);
    return true;
  } catch (error) {
    console.error(`❌ ${serviceName} failed to start: ${error.message}`);
    return false;
  }
}

/**
 * Graceful shutdown of all services
 */
async function shutdownServices() {
  if (activeProcesses.size === 0) {
    console.log('📋 No services to shutdown');
    return;
  }
  
  console.log(`🛑 Shutting down ${activeProcesses.size} services...`);
  
  const shutdownPromises = Array.from(activeProcesses.entries()).map(([name, process]) => {
    return new Promise((resolve) => {
      console.log(`📡 Sending SIGTERM to ${name}`);
      
      const timeout = setTimeout(() => {
        console.log(`💀 Force killing ${name}`);
        process.kill('SIGKILL');
        resolve();
      }, 10000); // 10 seconds for graceful shutdown
      
      process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      process.kill('SIGTERM');
    });
  });
  
  await Promise.all(shutdownPromises);
  activeProcesses.clear();
  console.log('✅ All services shutdown complete');
}

/**
 * Start frontend development server
 */
async function startFrontend() {
  // Get npm path
  const npmPath = process.env.npm_execpath || 'npm';
  
  await startService('frontend', npmPath, ['run', 'dev', '--workspace=@yggdrasil/frontend']);
  return await waitForServiceReady('frontend', DEV_PORTS.frontend);
}

/**
 * Start backend services
 */
async function startBackendServices() {
  // Get npm path
  const npmPath = process.env.npm_execpath || 'npm';
  
  // Start auth service
  const authProcess = await startService('auth-service', npmPath, ['run', 'dev', '--workspace=@yggdrasil/auth-service'], {
    env: { PORT: DEV_PORTS.auth }
  });
  
  // Start user service
  const userProcess = await startService('user-service', npmPath, ['run', 'dev', '--workspace=@yggdrasil/user-service'], {
    env: { PORT: DEV_PORTS.user }
  });
  
  // Wait for services to be ready
  const authReady = await waitForServiceReady('auth-service', DEV_PORTS.auth);
  const userReady = await waitForServiceReady('user-service', DEV_PORTS.user);
  
  return authReady && userReady;
}

/**
 * Check which ports are currently in use
 */
async function checkPortStatus() {
  console.log('🔍 Checking port status...');
  
  for (const [name, port] of Object.entries(DEV_PORTS)) {
    const inUse = await isPortInUse(port);
    const status = inUse ? '🔴 IN USE' : '🟢 FREE';
    console.log(`  Port ${port} (${name}): ${status}`);
  }
}

/**
 * Main development server function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  console.log('🌳 Yggdrasil Development Server Manager');
  console.log('=====================================');
  
  // Setup graceful shutdown
  setupGracefulShutdown();
  
  // Add custom shutdown handler for our services
  const cleanup = async (signal) => {
    console.log(`\n🛑 Received ${signal}, shutting down services...`);
    await shutdownServices();
    console.log('✅ Development server shutdown complete');
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  try {
    switch (command) {
      case 'status':
        await checkPortStatus();
        break;
        
      case 'clean':
        console.log('🧹 Cleaning all ports...');
        await killPorts(ALL_PORTS);
        console.log('✅ All ports cleaned');
        break;
        
      case 'frontend':
        await checkPortStatus();
        console.log('\n🚀 Starting frontend only...');
        await killPorts([DEV_PORTS.frontend]);
        await startFrontend();
        console.log('\n✅ Frontend development server is running!');
        console.log(`📍 Frontend: http://localhost:${DEV_PORTS.frontend}`);
        break;
        
      case 'services':
        await checkPortStatus();
        console.log('\n🚀 Starting backend services only...');
        await killPorts([DEV_PORTS.auth, DEV_PORTS.user]);
        const servicesReady = await startBackendServices();
        if (servicesReady) {
          console.log('\n✅ Backend services are running!');
          console.log(`🔐 Auth Service: http://localhost:${DEV_PORTS.auth}`);
          console.log(`👤 User Service: http://localhost:${DEV_PORTS.user}`);
        } else {
          console.error('❌ Failed to start some backend services');
          process.exit(1);
        }
        break;
        
      case 'all':
      default:
        await checkPortStatus();
        console.log('\n🧹 Clearing all development ports...');
        await killPorts(ALL_PORTS);
        
        console.log('\n🚀 Starting all development services...');
        
        // Start backend services first
        const backendReady = await startBackendServices();
        if (!backendReady) {
          console.error('❌ Failed to start backend services');
          process.exit(1);
        }
        
        // Then start frontend
        const frontendReady = await startFrontend();
        if (!frontendReady) {
          console.error('❌ Failed to start frontend');
          process.exit(1);
        }
        
        console.log('\n🎉 All development services are running!');
        console.log('=====================================');
        console.log(`🌐 Frontend: http://localhost:${DEV_PORTS.frontend}`);
        console.log(`🔐 Auth API: http://localhost:${DEV_PORTS.auth}/api/auth`);
        console.log(`👤 User API: http://localhost:${DEV_PORTS.user}/api/users`);
        console.log('\n💡 Press Ctrl+C to stop all services');
        break;
    }
    
    // Keep the process running unless it's a one-time command
    if (!['status', 'clean'].includes(command)) {
      // Keep process alive
      process.stdin.resume();
    }
    
  } catch (error) {
    console.error('❌ Development server error:', error.message);
    await shutdownServices();
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  await shutdownServices();
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await shutdownServices();
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { 
  startService, 
  shutdownServices, 
  checkPortStatus,
  DEV_PORTS 
};