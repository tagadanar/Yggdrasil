// packages/testing-utilities/global-setup.ts
// Global setup for 4-worker parallelization with proper service coordination

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

interface ServiceProcess {
  workerId: number;
  processes: ChildProcess[];
  ports: number[];
}

let serviceProcesses: ServiceProcess[] = [];

async function checkServiceHealth(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function startWorkerServices(workerId: number): Promise<ServiceProcess> {
  console.log(`🚀 GLOBAL SETUP: Starting services for Worker ${workerId}...`);
  
  const basePort = 3000 + (workerId * 10);
  const ports = [
    basePort,     // frontend
    basePort + 1, // auth
    basePort + 2, // user
    basePort + 3, // news
    basePort + 4, // course
    basePort + 5, // planning
    basePort + 6  // statistics
  ];
  
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    WORKER_ID: workerId.toString(),
    PLAYWRIGHT_WORKER_ID: workerId.toString(),
    DB_NAME: `yggdrasil_test_w${workerId}`,
    DB_COLLECTION_PREFIX: `w${workerId}_`
  };
  
  // Start service manager for this worker
  const serviceManager = spawn('node', ['service-manager.js', 'start'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
    detached: false
  });
  
  serviceManager.stdout?.on('data', (data) => {
    console.log(`📝 Worker ${workerId} Service Manager:`, data.toString().trim());
  });
  
  serviceManager.stderr?.on('data', (data) => {
    console.error(`❌ Worker ${workerId} Service Manager Error:`, data.toString().trim());
  });
  
  // Wait for services to be ready
  console.log(`⏳ GLOBAL SETUP: Waiting for Worker ${workerId} services to be ready...`);
  
  let retries = 0;
  const maxRetries = 60; // 5 minutes total
  
  while (retries < maxRetries) {
    await sleep(5000); // Check every 5 seconds
    
    const healthChecks = await Promise.all(
      ports.map(port => checkServiceHealth(port))
    );
    
    const readyServices = healthChecks.filter(Boolean).length;
    console.log(`📊 Worker ${workerId}: ${readyServices}/${ports.length} services ready`);
    
    if (readyServices === ports.length) {
      console.log(`✅ GLOBAL SETUP: Worker ${workerId} services all ready!`);
      return {
        workerId,
        processes: [serviceManager],
        ports
      };
    }
    
    retries++;
  }
  
  throw new Error(`❌ GLOBAL SETUP: Worker ${workerId} services failed to start within timeout`);
}

export default async function globalSetup() {
  console.log('🚀 GLOBAL SETUP: Starting 4-worker service coordination...');
  
  try {
    // Start services for all 4 workers in parallel
    const workerPromises = [0, 1, 2, 3].map(workerId => 
      startWorkerServices(workerId)
    );
    
    serviceProcesses = await Promise.all(workerPromises);
    
    console.log('✅ GLOBAL SETUP: All 4 workers have services running!');
    console.log('📊 Service Status:');
    for (const worker of serviceProcesses) {
      console.log(`   Worker ${worker.workerId}: ports ${worker.ports.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ GLOBAL SETUP: Failed to start services:', error);
    
    // Cleanup any started processes
    for (const worker of serviceProcesses) {
      for (const process of worker.processes) {
        process.kill();
      }
    }
    
    throw error;
  }
}

// Store reference for global teardown
(global as any).__serviceProcesses = serviceProcesses;