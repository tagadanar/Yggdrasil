// packages/testing-utilities/global-teardown.ts
// Global teardown for 4-worker parallelization service cleanup

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

export default async function globalTeardown() {
  console.log('🛑 GLOBAL TEARDOWN: Stopping all worker services...');
  
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
    const stopPromises = [0, 1, 2, 3].map(workerId => 
      stopWorkerServices(workerId)
    );
    
    await Promise.all(stopPromises);
    
    console.log('✅ GLOBAL TEARDOWN: All worker services stopped successfully!');
    
  } catch (error) {
    console.error('❌ GLOBAL TEARDOWN: Error stopping services:', error);
  }
}