// packages/testing-utilities/tests/enhanced-global-setup.ts
// Enhanced global setup for single-worker testing

import { FullConfig } from '@playwright/test';
import { TestInitializer } from '@yggdrasil/shared-utilities/testing';
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
    // Frontend service (port 3000) doesn't have /health endpoint
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
    // Use authenticated MongoDB URI from environment
    WORKER_ID: workerId.toString(),
    PLAYWRIGHT_WORKER_ID: workerId.toString()
  };
  
  // Start service manager for this worker
  const serviceManager = spawn('node', ['service-manager.js', 'start'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
    cwd: process.cwd(),
    detached: false
  });
  
  serviceManager.stdout?.on('data', (data) => {
    try {
      console.log(`📝 Worker ${workerId} Service Manager:`, data.toString().trim());
    } catch (error) {
      // Ignore EPIPE errors during shutdown
    }
  });
  
  serviceManager.stderr?.on('data', (data) => {
    try {
      console.error(`❌ Worker ${workerId} Service Manager Error:`, data.toString().trim());
    } catch (error) {
      // Ignore EPIPE errors during shutdown
    }
  });
  
  // Wait for services to be ready
  console.log(`⏳ GLOBAL SETUP: Waiting for Worker ${workerId} services to be ready...`);
  
  let retries = 0;
  const maxRetries = 60; // 1 minute total with faster checks
  
  while (retries < maxRetries) {
    await sleep(1000); // Check every 1 second for faster startup
    
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

async function verifyWorkerHealth(workerId: number): Promise<boolean> {
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
  
  console.log(`🔍 HEALTH CHECK: Verifying Worker ${workerId} services on ports ${ports.join(', ')}...`);
  
  try {
    const healthChecks = await Promise.all(
      ports.map(async (port, index) => {
        const serviceName = ['frontend', 'auth', 'user', 'news', 'course', 'planning', 'statistics'][index];
        const isHealthy = await checkServiceHealth(port);
        
        if (isHealthy) {
          console.log(`✅ ${serviceName} service (${port}) - healthy`);
        } else {
          console.log(`❌ ${serviceName} service (${port}) - unhealthy`);
        }
        
        return isHealthy;
      })
    );
    
    const healthyCount = healthChecks.filter(Boolean).length;
    const isFullyHealthy = healthyCount === ports.length;
    
    console.log(`📊 Worker ${workerId} Health: ${healthyCount}/${ports.length} services healthy`);
    
    if (!isFullyHealthy) {
      console.warn(`⚠️ Worker ${workerId} has ${ports.length - healthyCount} unhealthy services`);
    }
    
    return isFullyHealthy;
  } catch (error) {
    console.error(`❌ Worker ${workerId} health check failed:`, error);
    return false;
  }
}

async function startSingleWorkerServices(): Promise<void> {
  console.log(`🚀 GLOBAL SETUP: Starting services for single worker...`);
  
  try {
    serviceProcesses = [];
    
    // Single worker setup - workerId is always 0
    const workerId = 0;
    console.log(`⚡ Starting Worker ${workerId}...`);
    
    const workerStartTime = Date.now();
    const worker = await startWorkerServices(workerId);
    serviceProcesses.push(worker);
    
    const workerDuration = Date.now() - workerStartTime;
    console.log(`✅ Worker ${workerId} started in ${workerDuration}ms`);
    
    // Verify worker health
    console.log(`🔍 Verifying Worker ${workerId} health...`);
    const healthCheck = await verifyWorkerHealth(workerId);
    if (!healthCheck) {
      throw new Error(`Worker ${workerId} failed health check after startup`);
    }
    console.log(`💚 Worker ${workerId} health verified`);
    
    console.log('✅ GLOBAL SETUP: Single worker started and verified!');
    console.log('📊 Startup Results:');
    console.log(`   Worker 0: ports ${serviceProcesses[0].ports.join(', ')}`);
    
    // Store reference for global teardown
    (global as any).__serviceProcesses = serviceProcesses;
    
  } catch (error) {
    console.error('❌ GLOBAL SETUP: Single worker startup failed:', error);
    
    // Cleanup for failed startup
    console.log('🧹 Cleaning up failed worker...');
    for (const worker of serviceProcesses) {
      try {
        for (const process of worker.processes) {
          if (process && !process.killed) {
            process.kill('SIGTERM');
            await sleep(1000);
            if (!process.killed) {
              process.kill('SIGKILL');
            }
          }
        }
      } catch (cleanupError) {
        console.error(`Failed to cleanup worker ${worker.workerId}:`, cleanupError);
      }
    }
    
    throw error;
  }
}

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting clean global setup for testing...');
  console.log('🔧 Using clean testing architecture with dev database...');
  
  try {
    // Start services for single worker
    await startSingleWorkerServices();
    
    // Initialize clean test environment
    console.log('🏗️ Initializing clean test environment...');
    
    const initStartTime = Date.now();
    await TestInitializer.quickSetup(true);
    
    const initDuration = Date.now() - initStartTime;
    console.log(`✅ Clean test environment initialized in ${initDuration}ms`);
    
    console.log('🎯 Verifying system health...');
    
    // Verify services are healthy
    const isHealthy = await verifyWorkerHealth(0);
    
    if (!isHealthy) {
      throw new Error('Services are not healthy after startup');
    }
    
    console.log('✅ Clean global setup completed successfully!');
    console.log('🎉 Services ready for clean testing!');
    
  } catch (error) {
    console.error('❌ Clean global setup failed:', error);
    
    // Cleanup on failure
    console.log('🧹 Cleaning up failed setup...');
    for (const worker of serviceProcesses) {
      try {
        for (const process of worker.processes) {
          if (process && !process.killed) {
            process.kill('SIGTERM');
            await sleep(1000);
            if (!process.killed) {
              process.kill('SIGKILL');
            }
          }
        }
      } catch (cleanupError) {
        console.error(`Failed to cleanup worker ${worker.workerId}:`, cleanupError);
      }
    }
    
    throw error;
  }
}

export default globalSetup;