// packages/testing-utilities/tests/enhanced-global-teardown.ts
// Enhanced global teardown for ultra-robust 4-worker parallelization

import { FullConfig } from '@playwright/test';
import { createEnhancedTestIsolation } from './helpers/enhanced-test-isolation';
import { IdCollisionDetector } from './helpers/test-id-generator';
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
    
    // Force stop after 30 seconds
    setTimeout(() => {
      if (!stopProcess.killed) {
        stopProcess.kill('SIGKILL');
        console.log(`⚡ GLOBAL TEARDOWN: Force killed Worker ${workerId} services`);
        resolve();
      }
    }, 30000);
  });
}

async function stopServicesForAllWorkers(workerCount: number): Promise<void> {
  console.log(`🛑 GLOBAL TEARDOWN: Stopping services for ${workerCount} workers...`);
  
  try {
    // Get service processes from global setup
    const serviceProcesses = (global as any).__serviceProcesses || [];
    
    // Kill any running processes first
    for (const worker of serviceProcesses) {
      for (const process of worker.processes) {
        if (!process.killed) {
          process.kill('SIGTERM');
          await sleep(1000);
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }
      }
    }
    
    // Stop services for all workers
    const stopPromises = [];
    for (let workerId = 0; workerId < workerCount; workerId++) {
      stopPromises.push(stopWorkerServices(workerId));
    }
    
    await Promise.all(stopPromises);
    
    console.log('✅ GLOBAL TEARDOWN: All worker services stopped successfully!');
    
  } catch (error) {
    console.error('❌ GLOBAL TEARDOWN: Error stopping services:', error);
  }
}

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting enhanced global teardown...');
  
  const workerCount = config.workers || 4;
  console.log(`🔧 Cleaning up ${workerCount} workers...`);
  
  try {
    // First, stop all services
    await stopServicesForAllWorkers(workerCount);
    
    // Then cleanup all workers in parallel
    const cleanupPromises = [];
    
    for (let workerId = 0; workerId < workerCount; workerId++) {
      console.log(`🧹 Cleaning up worker ${workerId}...`);
      
      const cleanupWorker = async () => {
        try {
          const isolationManager = createEnhancedTestIsolation(workerId);
          await isolationManager.shutdown();
          console.log(`✅ Worker ${workerId} cleaned up successfully`);
        } catch (error) {
          console.error(`❌ Worker ${workerId} cleanup failed:`, error);
          // Continue with other workers even if one fails
        }
      };
      
      cleanupPromises.push(cleanupWorker());
    }
    
    // Wait for all workers to cleanup
    await Promise.all(cleanupPromises);
    
    // Final cleanup of global resources
    console.log('🧹 Cleaning up global resources...');
    IdCollisionDetector.cleanupGlobalRegistry();
    
    console.log('📊 Final statistics:');
    console.log(`- Workers cleaned up: ${workerCount}`);
    console.log(`- Global ID registry size: ${IdCollisionDetector.getGlobalRegistrySize()}`);
    
    console.log('✅ Enhanced global teardown completed successfully!');
    console.log('🎉 All workers shut down cleanly!');
    
  } catch (error) {
    console.error('❌ Enhanced global teardown failed:', error);
    
    // Force cleanup of global resources even on failure
    try {
      IdCollisionDetector.cleanupGlobalRegistry();
    } catch (cleanupError) {
      console.error('Failed to cleanup global registry:', cleanupError);
    }
    
    // Don't throw error here - teardown should complete even if there are issues
    console.log('⚠️ Global teardown completed with errors');
  }
}

export default globalTeardown;