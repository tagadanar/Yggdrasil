import { ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

/**
 * Kill a process gracefully
 */
async function killProcess(process: ChildProcess, serviceName: string): Promise<void> {
  if (!process.pid || process.killed) {
    return;
  }
  
  console.log(`🛑 Stopping ${serviceName}...`);
  
  return new Promise((resolve) => {
    // Set a timeout for forceful kill
    const forceKillTimeout = setTimeout(() => {
      if (!process.killed) {
        console.log(`💥 Force killing ${serviceName}...`);
        process.kill('SIGKILL');
      }
      resolve();
    }, 5000); // 5 second timeout
    
    // Handle process exit
    process.on('exit', () => {
      clearTimeout(forceKillTimeout);
      console.log(`✅ ${serviceName} stopped`);
      resolve();
    });
    
    // Try graceful shutdown first
    process.kill('SIGTERM');
    
    // If process doesn't exit in 2 seconds, try SIGINT
    setTimeout(() => {
      if (!process.killed) {
        console.log(`🔄 Sending SIGINT to ${serviceName}...`);
        process.kill('SIGINT');
      }
    }, 2000);
  });
}

/**
 * Stop all services
 */
async function stopAllServices(): Promise<void> {
  const processes = global.__YGGDRASIL_SERVICES__;
  
  if (!processes || processes.length === 0) {
    console.log('ℹ️  No services to stop');
    return;
  }
  
  console.log('🧹 Stopping all Yggdrasil services...');
  
  // Kill all processes in parallel
  const killPromises = processes.map((process, index) => 
    killProcess(process, `service-${index}`)
  );
  
  try {
    await Promise.all(killPromises);
    console.log('✅ All services stopped successfully');
  } catch (error) {
    console.error('❌ Error stopping services:', error);
  }
  
  // Clear global references
  global.__YGGDRASIL_SERVICES__ = [];
  global.__YGGDRASIL_SETUP_DONE__ = false;
}

/**
 * Clean up any remaining processes
 */
async function cleanupProcesses(): Promise<void> {
  // Additional cleanup for any zombie processes
  try {
    // Kill any remaining node processes on functional test ports (31XX)
    const ports = [3101, 3102, 3103, 3104, 3105, 3106, 3107];
    
    for (const port of ports) {
      try {
        // Use lsof to find processes on specific ports (Unix/Linux/macOS)
        const { spawn } = require('child_process');
        const lsof = spawn('lsof', ['-ti', `tcp:${port}`]);
        
        lsof.stdout.on('data', (data: Buffer) => {
          const pids = data.toString().trim().split('\n').filter(pid => pid);
          for (const pid of pids) {
            console.log(`🧹 Cleaning up process ${pid} on port ${port}`);
            try {
              process.kill(parseInt(pid), 'SIGTERM');
              // Give it a moment, then force kill if needed
              setTimeout(() => {
                try {
                  process.kill(parseInt(pid), 'SIGKILL');
                } catch (error) {
                  // Process might already be gone
                }
              }, 2000);
            } catch (error) {
              // Process might already be gone
            }
          }
        });
        
        // Wait for lsof to complete
        await new Promise((resolve) => {
          lsof.on('close', resolve);
          lsof.on('error', resolve);
          // Timeout to prevent hanging
          setTimeout(resolve, 3000);
        });
      } catch (error) {
        // lsof might not be available on all systems
      }
    }
  } catch (error) {
    // Cleanup is best effort
  }
}

/**
 * Global teardown function - runs once after all tests
 */
export default async function globalTeardown(): Promise<void> {
  try {
    console.log('🔧 Tearing down functional test environment...');
    
    // Stop all services
    await stopAllServices();
    
    // Additional cleanup
    await cleanupProcesses();
    
    // Give a moment for cleanup
    await sleep(1000);
    
    console.log('✅ Functional test environment teardown complete!');
    
  } catch (error) {
    console.error('❌ Error during teardown:', error);
    // Don't throw - teardown should be best effort
  }
}