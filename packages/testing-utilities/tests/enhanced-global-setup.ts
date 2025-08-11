// packages/testing-utilities/tests/enhanced-global-setup.ts
// Enhanced global setup for single-worker testing

// Increase max listeners to prevent EventEmitter memory leak warnings
// Playwright test runner and service manager add many process listeners
process.setMaxListeners(100);

import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 50;

import { FullConfig } from '@playwright/test';
import { TestInitializer } from '@yggdrasil/shared-utilities/testing';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

// Helper for quiet mode logging
const isQuietMode = process.env['QUIET_MODE'] === 'true';
const quietLog = (message: string) => {
  if (!isQuietMode) {
    console.log(message);
  }
};

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
  quietLog(`🚀 GLOBAL SETUP: Starting services for Worker ${workerId}...`);

  const basePort = 3000 + (workerId * 10);
  const ports = [
    basePort,     // frontend
    basePort + 1, // auth
    basePort + 2, // user
    basePort + 3, // news
    basePort + 4, // course
    basePort + 5, // planning
    basePort + 6,  // statistics
  ];

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    // Use authenticated MongoDB URI from environment
    WORKER_ID: workerId.toString(),
    PLAYWRIGHT_WORKER_ID: workerId.toString(),
  };

  // Start service manager for this worker
  const serviceManager = spawn('node', ['service-manager.js', 'start'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env,
    cwd: process.cwd(),
    detached: false,
  });

  serviceManager.stdout?.on('data', (data) => {
    try {
      const message = data.toString().trim();
      // Only log essential messages for quiet mode
      if (message.includes('🚀') || message.includes('✅') ||
          message.includes('📱') || message.includes('🔐') ||
          message.includes('👤') || message.includes('📰') ||
          message.includes('📚') || message.includes('📅') ||
          message.includes('📊') || message.includes('❌') ||
          message.includes('Starting') || message.includes('ready') ||
          message.includes('All services')) {
        quietLog(`📝 Worker ${workerId} Service Manager: ${message}`);
      }
    } catch (error) {
      // Ignore EPIPE errors during shutdown
    }
  });

  serviceManager.stderr?.on('data', (data) => {
    try {
      const msg = data.toString().trim();
      if (msg) {
        console.error(`❌ Worker ${workerId} Service Manager Error:`, msg);
      }
    } catch (error) {
      // Ignore EPIPE errors during shutdown
    }
  });

  // Wait for services to be ready
  quietLog(`⏳ GLOBAL SETUP: Waiting for Worker ${workerId} services to be ready...`);

  let retries = 0;
  const maxRetries = 240; // 120 seconds total with faster checks

  while (retries < maxRetries) {
    await sleep(250); // Check every 250ms for faster startup (optimized from 500ms)

    const healthChecks = await Promise.all(
      ports.map(port => checkServiceHealth(port)),
    );

    const readyServices = healthChecks.filter(Boolean).length;
    quietLog(`📊 Worker ${workerId}: ${readyServices}/${ports.length} services ready`);

    if (readyServices === ports.length) {
      console.log(`✅ GLOBAL SETUP: Worker ${workerId} services all ready!`);
      return {
        workerId,
        processes: [serviceManager],
        ports,
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
    basePort + 6,  // statistics
  ];

  quietLog(`🔍 HEALTH CHECK: Verifying Worker ${workerId} services on ports ${ports.join(', ')}...`);

  try {
    const healthChecks = await Promise.all(
      ports.map(async (port, index) => {
        const serviceName = ['frontend', 'auth', 'user', 'news', 'course', 'planning', 'statistics'][index];
        const isHealthy = await checkServiceHealth(port);

        if (isHealthy) {
          quietLog(`✅ ${serviceName} service (${port}) - healthy`);
        } else {
          quietLog(`❌ ${serviceName} service (${port}) - unhealthy`);
        }

        return isHealthy;
      }),
    );

    const healthyCount = healthChecks.filter(Boolean).length;
    const isFullyHealthy = healthyCount === ports.length;

    quietLog(`📊 Worker ${workerId} Health: ${healthyCount}/${ports.length} services healthy`);

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
  console.log('🚀 GLOBAL SETUP: Starting services for single worker...');

  try {
    serviceProcesses = [];

    // Single worker setup - workerId is always 0
    const workerId = 0;
    quietLog(`⚡ Starting Worker ${workerId}...`);

    const workerStartTime = Date.now();
    const worker = await startWorkerServices(workerId);
    serviceProcesses.push(worker);

    const workerDuration = Date.now() - workerStartTime;
    quietLog(`✅ Worker ${workerId} started in ${workerDuration}ms`);

    // Verify worker health
    quietLog(`🔍 Verifying Worker ${workerId} health...`);
    const healthCheck = await verifyWorkerHealth(workerId);
    if (!healthCheck) {
      throw new Error(`Worker ${workerId} failed health check after startup`);
    }
    quietLog(`💚 Worker ${workerId} health verified`);

    console.log('✅ GLOBAL SETUP: Single worker started and verified!');
    quietLog('📊 Startup Results:');
    quietLog(`   Worker 0: ports ${serviceProcesses[0]?.ports?.join(', ') || 'none'}`);

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

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting clean global setup for testing...');
  console.log('🔧 Using clean testing architecture with dev database...');

  try {
    // Initialize service coordinator first
    console.log('📊 Initializing service coordinator...');
    const { getInstance: getCoordinator } = require('../service-coordinator.js');
    const coordinator = getCoordinator();
    coordinator.reset(); // Start with clean state

    // Start services for single worker
    await startSingleWorkerServices();

    // Start service health monitoring with coordinator
    console.log('🏥 Starting enhanced service health monitoring...');
    const { startMonitoring } = require('../service-health-monitor.js');
    await startMonitoring();

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
