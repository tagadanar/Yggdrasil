#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const util = require('util');
const net = require('net');
const execAsync = util.promisify(exec);

const PORTS = [3000, 3001, 3002, 3003, 3004, 3005]; // Only development ports
const RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 5;

// Process tracking for graceful shutdown
const managedProcesses = new Map();

/**
 * Check if a port is currently in use
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => resolve(false));
      server.close();
    });
    
    server.on('error', () => resolve(true));
  });
}

/**
 * Kill a specific port with retries and verification
 */
async function killPort(port, retries = MAX_RETRIES) {
  try {
    const inUse = await isPortInUse(port);
    if (!inUse) {
      console.log(`✓ Port ${port} is already free`);
      return true;
    }

    // Find processes using the port
    const { stdout } = await execAsync(`lsof -ti:${port} 2>/dev/null || true`);
    const pids = stdout.trim().split('\n').filter(pid => pid && pid.trim());
    
    if (pids.length === 0) {
      console.log(`✓ Port ${port} is free (no processes found)`);
      return true;
    }
    
    // Kill all processes using the port - but only development related processes
    for (const pid of pids) {
      if (pid.trim()) {
        try {
          // Get process info to verify it's a development process
          const { stdout: processInfo } = await execAsync(`ps -p ${pid.trim()} -o comm,args --no-headers 2>/dev/null || echo ""`);
          const processDetails = processInfo.trim();
          
          // Only kill if it looks like a development process
          const isDevelopmentProcess = processDetails.includes('node') || 
                                     processDetails.includes('next') || 
                                     processDetails.includes('ts-node') ||
                                     processDetails.includes('npm') ||
                                     processDetails.includes('dev') ||
                                     processDetails.includes('auth-service') ||
                                     processDetails.includes('user-service') ||
                                     processDetails.includes('frontend');
          
          if (!isDevelopmentProcess && processDetails) {
            console.log(`⚠️ Skipping non-development process ${pid.trim()} on port ${port}: ${processDetails}`);
            continue;
          }
          
          // Try graceful shutdown first (SIGTERM)
          await execAsync(`kill -TERM ${pid.trim()}`);
          console.log(`📡 Sent SIGTERM to process ${pid.trim()} on port ${port}`);
          
          // Wait a moment for graceful shutdown
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check if process still exists
          try {
            await execAsync(`kill -0 ${pid.trim()}`);
            // Process still exists, force kill
            await execAsync(`kill -9 ${pid.trim()}`);
            console.log(`💀 Force killed process ${pid.trim()} using port ${port}`);
          } catch (error) {
            console.log(`✓ Process ${pid.trim()} on port ${port} terminated gracefully`);
          }
        } catch (error) {
          console.log(`✓ Process ${pid.trim()} on port ${port} already terminated`);
        }
      }
    }

    // Verify port is actually free now
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    const stillInUse = await isPortInUse(port);
    
    if (stillInUse && retries > 0) {
      console.log(`⚠️ Port ${port} still in use, retrying... (${retries} attempts left)`);
      return await killPort(port, retries - 1);
    }
    
    if (stillInUse) {
      console.error(`❌ Failed to free port ${port} after ${MAX_RETRIES} attempts`);
      return false;
    }
    
    console.log(`✅ Port ${port} successfully freed`);
    return true;
    
  } catch (error) {
    console.log(`✓ Port ${port} is free (${error.message})`);
    return true;
  }
}

/**
 * Kill all development Node.js processes
 */
async function killDevNodeProcesses() {
  try {
    console.log('🔍 Searching for development Node.js processes...');
    
    // Find all Node.js processes with development-related keywords
    const { stdout } = await execAsync(`ps aux | grep -E "(node|npm)" | grep -E "(dev|next|ts-node|concurrently|yggdrasil)" | grep -v grep || true`);
    
    if (!stdout.trim()) {
      console.log('✓ No development Node.js processes found');
      return;
    }
    
    const processes = stdout.trim().split('\n');
    console.log(`📋 Found ${processes.length} development Node.js processes`);
    
    for (const processLine of processes) {
      const parts = processLine.trim().split(/\s+/);
      const pid = parts[1];
      const command = parts.slice(10).join(' ');
      
      if (pid && !isNaN(parseInt(pid))) {
        try {
          console.log(`💀 Killing Node.js process ${pid}: ${command.substring(0, 60)}...`);
          await execAsync(`kill -9 ${pid}`);
        } catch (error) {
          // Process might already be dead, that's fine
          console.log(`✓ Process ${pid} already terminated`);
        }
      }
    }
    
    // Wait a moment for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Development Node.js processes cleared');
    
  } catch (error) {
    console.log('✓ No development Node.js processes to clear');
  }
}

/**
 * Kill multiple ports with proper error handling
 */
async function killPorts(portList) {
  console.log('🧹 Clearing development environment...');
  
  // First kill all development Node.js processes
  await killDevNodeProcesses();
  
  // Then clear specific ports
  console.log(`📋 Target ports: ${portList.join(', ')}`);
  
  const results = await Promise.allSettled(
    portList.map(port => killPort(port))
  );
  
  const failures = results
    .map((result, index) => ({ result, port: portList[index] }))
    .filter(({ result }) => result.status === 'rejected' || !result.value)
    .map(({ port }) => port);
  
  if (failures.length > 0) {
    console.error(`❌ Failed to clear ports: ${failures.join(', ')}`);
    throw new Error(`Failed to clear ports: ${failures.join(', ')}`);
  }
  
  console.log('✅ All ports cleared successfully');
}

/**
 * Wait for a port to become available
 */
async function waitForPort(port, timeout = 30000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const inUse = await isPortInUse(port);
    if (inUse) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`Port ${port} did not become available within ${timeout}ms`);
}

/**
 * Start a process and track it for cleanup
 */
function startManagedProcess(command, args = [], options = {}) {
  const processId = `${command}-${Date.now()}`;
  
  console.log(`🚀 Starting managed process: ${command} ${args.join(' ')}`);
  
  const childProcess = spawn(command, args, {
    stdio: 'pipe',
    detached: false,
    ...options
  });
  
  managedProcesses.set(processId, childProcess);
  
  // Handle process events
  childProcess.on('error', (error) => {
    console.error(`❌ Process ${processId} error:`, error.message);
    managedProcesses.delete(processId);
  });
  
  childProcess.on('exit', (code, signal) => {
    console.log(`📋 Process ${processId} exited with code ${code} (signal: ${signal})`);
    managedProcesses.delete(processId);
  });
  
  return { processId, process: childProcess };
}

/**
 * Gracefully shutdown all managed processes
 */
async function shutdownManagedProcesses() {
  if (managedProcesses.size === 0) {
    console.log('📋 No managed processes to shutdown');
    return;
  }
  
  console.log(`🛑 Shutting down ${managedProcesses.size} managed processes...`);
  
  const shutdownPromises = Array.from(managedProcesses.entries()).map(([id, process]) => {
    return new Promise((resolve) => {
      console.log(`📡 Sending SIGTERM to process ${id}`);
      
      const timeout = setTimeout(() => {
        console.log(`💀 Force killing process ${id}`);
        process.kill('SIGKILL');
        resolve();
      }, 5000);
      
      process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      process.kill('SIGTERM');
    });
  });
  
  await Promise.all(shutdownPromises);
  managedProcesses.clear();
  console.log('✅ All managed processes shutdown complete');
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown() {
  const cleanup = async (signal) => {
    console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);
    
    try {
      await shutdownManagedProcesses();
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      process.exit(1);
    }
  };
  
  process.on('SIGINT', () => cleanup('SIGINT'));
  process.on('SIGTERM', () => cleanup('SIGTERM'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught exception:', error);
    await shutdownManagedProcesses();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason) => {
    console.error('❌ Unhandled rejection:', reason);
    await shutdownManagedProcesses();
    process.exit(1);
  });
}

// If called directly, kill all common dev ports
if (require.main === module) {
  const targetPorts = process.argv.slice(2).map(p => parseInt(p)).filter(p => !isNaN(p));
  const portsToKill = targetPorts.length > 0 ? targetPorts : PORTS;
  
  killPorts(portsToKill)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Error clearing ports:', error.message);
      process.exit(1);
    });
}

module.exports = { 
  killPort, 
  killPorts, 
  isPortInUse, 
  waitForPort, 
  startManagedProcess, 
  shutdownManagedProcesses, 
  setupGracefulShutdown 
};