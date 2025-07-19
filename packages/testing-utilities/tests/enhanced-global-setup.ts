// packages/testing-utilities/tests/enhanced-global-setup.ts
// Enhanced global setup for ultra-robust 4-worker parallelization

import { FullConfig } from '@playwright/test';
import { createEnhancedTestIsolation } from './helpers/enhanced-test-isolation';
import { connectDatabase } from '@yggdrasil/database-schemas';
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
    // Frontend service (port 3000, 3010, 3020, 3030) doesn't have /health endpoint
    const isFrontend = port % 10 === 0;
    const endpoint = isFrontend ? '' : '/health';
    
    const response = await fetch(`http://localhost:${port}${endpoint}`);
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
    cwd: process.cwd(),
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

async function startServicesForAllWorkers(workerCount: number): Promise<void> {
  console.log(`🚀 GLOBAL SETUP: Starting services for ${workerCount} workers...`);
  
  try {
    // Start services for all workers in parallel
    const workerPromises = [];
    for (let workerId = 0; workerId < workerCount; workerId++) {
      workerPromises.push(startWorkerServices(workerId));
    }
    
    serviceProcesses = await Promise.all(workerPromises);
    
    console.log('✅ GLOBAL SETUP: All workers have services running!');
    console.log('📊 Service Status:');
    for (const worker of serviceProcesses) {
      console.log(`   Worker ${worker.workerId}: ports ${worker.ports.join(', ')}`);
    }
    
    // Store reference for global teardown
    (global as any).__serviceProcesses = serviceProcesses;
    
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

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting enhanced global setup for 4-worker parallelization...');
  
  const workerCount = config.workers || 4;
  console.log(`🔧 Initializing ${workerCount} workers with complete isolation...`);
  
  try {
    // First, start services for all workers
    await startServicesForAllWorkers(workerCount);
    
    // Then initialize isolation for all workers in parallel
    const initPromises = [];
    
    for (let workerId = 0; workerId < workerCount; workerId++) {
      console.log(`🏗️ Setting up worker ${workerId}...`);
      
      const setupWorker = async () => {
        try {
          const isolationManager = createEnhancedTestIsolation(workerId);
          await isolationManager.initialize();
          console.log(`✅ Worker ${workerId} initialized successfully`);
        } catch (error) {
          console.error(`❌ Worker ${workerId} initialization failed:`, error);
          throw error;
        }
      };
      
      initPromises.push(setupWorker());
    }
    
    // Wait for all workers to initialize
    await Promise.all(initPromises);
    
    console.log('🎯 Verifying system health across all workers...');
    
    // Verify all workers are healthy
    for (let workerId = 0; workerId < workerCount; workerId++) {
      const isolationManager = createEnhancedTestIsolation(workerId);
      const stats = isolationManager.getSystemStatistics();
      
      if (!stats.isInitialized) {
        throw new Error(`Worker ${workerId} is not properly initialized`);
      }
      
      console.log(`📊 Worker ${workerId} stats:`, {
        isInitialized: stats.isInitialized,
        poolCount: stats.poolStatistics.pools.length,
        serviceCount: stats.serviceStatuses.length
      });
    }
    
    console.log('✅ Enhanced global setup completed successfully!');
    console.log('🎉 All workers ready for ultra-robust parallel testing!');
    
  } catch (error) {
    console.error('❌ Enhanced global setup failed:', error);
    
    // Cleanup on failure
    console.log('🧹 Cleaning up failed setup...');
    for (let workerId = 0; workerId < workerCount; workerId++) {
      try {
        const isolationManager = createEnhancedTestIsolation(workerId);
        await isolationManager.shutdown();
      } catch (cleanupError) {
        console.error(`Failed to cleanup worker ${workerId}:`, cleanupError);
      }
    }
    
    throw error;
  }
}

export default globalSetup;