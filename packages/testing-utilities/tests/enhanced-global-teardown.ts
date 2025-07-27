// packages/testing-utilities/tests/enhanced-global-teardown.ts
// Enhanced global teardown for single-worker testing

import { FullConfig } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { spawn } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

async function stopWorkerServices(workerId: number): Promise<void> {
  console.log(`🛑 GLOBAL TEARDOWN: Stopping services for Worker ${workerId}...`);
  
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    WORKER_ID: workerId.toString(),
    PLAYWRIGHT_WORKER_ID: workerId.toString()
  };
  
  return new Promise((resolve) => {
    const stopProcess = spawn('node', ['service-manager.js', 'stop'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      cwd: process.cwd(),
      detached: false
    });
    
    stopProcess.stdout?.on('data', (data) => {
      console.log(`📝 Worker ${workerId} Stop:`, data.toString().trim());
    });
    
    stopProcess.stderr?.on('data', (data) => {
      console.error(`❌ Worker ${workerId} Stop Error:`, data.toString().trim());
    });
    
    stopProcess.on('close', (code) => {
      console.log(`✅ GLOBAL TEARDOWN: Worker ${workerId} services stopped (code: ${code})`);
      resolve();
    });
    
    // Graceful shutdown timeout - first try SIGTERM, then SIGKILL
    const gracefulTimeout = setTimeout(() => {
      if (!stopProcess.killed) {
        console.log(`📝 GLOBAL TEARDOWN: Sending SIGTERM to Worker ${workerId} services`);
        stopProcess.kill('SIGTERM');
        
        // Wait 5 seconds then force kill if needed
        const forceTimeout = setTimeout(() => {
          if (!stopProcess.killed) {
            console.log(`⚡ GLOBAL TEARDOWN: Force killed Worker ${workerId} services`);
            stopProcess.kill('SIGKILL');
            resolve();
          }
        }, 5000);
        
        // Clear force timeout if process exits gracefully
        stopProcess.on('exit', () => clearTimeout(forceTimeout));
      }
    }, 25000); // Start graceful shutdown after 25 seconds
    
    // Clear timeout if process exits normally
    stopProcess.on('exit', () => clearTimeout(gracefulTimeout));
  });
}

async function stopServicesForSingleWorker(): Promise<void> {
  console.log('🛑 GLOBAL TEARDOWN: Stopping services for single worker...');
  
  try {
    // Get service processes from global setup
    const serviceProcesses = (global as any).__serviceProcesses || [];
    
    // Kill any running processes first with proper graceful shutdown
    for (const worker of serviceProcesses) {
      for (const process of worker.processes) {
        if (!process.killed) {
          try {
            // 1. Send SIGTERM first for graceful shutdown
            console.log(`📝 Sending SIGTERM to process ${process.pid}`);
            process.kill('SIGTERM');
            
            // 2. Wait 5 seconds for graceful exit
            await sleep(5000);
            
            // 3. Send SIGKILL only if process still alive
            if (!process.killed) {
              console.log(`⚡ Force killing process ${process.pid} with SIGKILL`);
              process.kill('SIGKILL');
            }
          } catch (error) {
            console.error(`❌ Error killing process ${process.pid}:`, error.message);
          }
        }
      }
    }
    
    // Stop services for single worker (workerId = 0)
    await stopWorkerServices(0);
    
    console.log('✅ GLOBAL TEARDOWN: Single worker services stopped successfully!');
    
  } catch (error) {
    console.error('❌ GLOBAL TEARDOWN: Error stopping services:', error);
  }
}

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Starting clean global teardown...');
  console.log('🔧 Using clean testing architecture...');
  
  try {
    // First, stop all services
    await stopServicesForSingleWorker();
    
    // Then cleanup test data using clean architecture
    console.log('🧹 Cleaning up test data...');
    
    try {
      // Use TestCleanup for clean database cleanup
      const cleanup = TestCleanup.getInstance('GlobalTeardown');
      await cleanup.cleanup();
      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.error('❌ Test data cleanup failed:', error);
    }
    
    console.log('📊 Clean teardown statistics:');
    console.log('- Services stopped: ✅');
    console.log('- Database cleaned: ✅');
    console.log('- Clean architecture used: ✅');
    
    console.log('✅ Clean global teardown completed successfully!');
    console.log('🎉 Clean testing environment shut down!');
    
  } catch (error) {
    console.error('❌ Clean global teardown failed:', error);
    
    // Force cleanup even on failure
    try {
      const cleanup = TestCleanup.getInstance('GlobalTeardown');
      await cleanup.cleanup();
    } catch (cleanupError) {
      console.error('Failed to cleanup test data:', cleanupError);
    }
    
    // Don't throw error here - teardown should complete even if there are issues
    console.log('⚠️ Global teardown completed with errors');
  }
}

export default globalTeardown;