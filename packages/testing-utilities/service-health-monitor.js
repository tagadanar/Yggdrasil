#!/usr/bin/env node

// Service Health Monitor - Ensures services stay healthy during test execution
const http = require('http');
const { spawn } = require('child_process');
const { getInstance: getCoordinator } = require('./service-coordinator');

const SERVICES = [
  { name: 'Frontend', port: 3000, path: '' },
  { name: 'Auth', port: 3001, path: '/health' },
  { name: 'User', port: 3002, path: '/health' },
  { name: 'News', port: 3003, path: '/health' },
  { name: 'Course', port: 3004, path: '/health' },
  { name: 'Planning', port: 3005, path: '/health' },
  { name: 'Statistics', port: 3006, path: '/health' }
];

let monitoring = false;
let monitorInterval = null;
const coordinator = getCoordinator();

async function checkServiceHealth(service) {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${service.port}${service.path}`, { timeout: 3000 }, (res) => {
      const responseTime = Date.now() - startTime;
      // More lenient: Consider service unhealthy only if response time > 2.5s
      const healthy = res.statusCode === 200 && responseTime < 2500;
      resolve({ service: service.name, healthy, responseTime });
    });
    
    req.on('error', () => {
      resolve({ service: service.name, healthy: false, responseTime: -1 });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ service: service.name, healthy: false, responseTime: -1 });
    });
  });
}

async function checkAllServices() {
  const results = await Promise.all(SERVICES.map(checkServiceHealth));
  const unhealthy = results.filter(r => !r.healthy);
  const slow = results.filter(r => r.healthy && r.responseTime > 1000);
  
  if (unhealthy.length > 0) {
    console.log(`🚨 HEALTH MONITOR: ${unhealthy.length} unhealthy services: ${unhealthy.map(s => s.service).join(', ')}`);
    coordinator.markUnhealthy(unhealthy.map(s => s.service));
    return false;
  }
  
  if (slow.length > 0) {
    console.log(`⚠️ HEALTH MONITOR: ${slow.length} slow services: ${slow.map(s => `${s.service}(${s.responseTime}ms)`).join(', ')}`);
  }
  
  coordinator.markHealthy();
  return true;
}

async function countHealthyServices() {
  const results = await Promise.all(SERVICES.map(checkServiceHealth));
  const healthy = results.filter(r => r.healthy);
  return healthy.length;
}

async function restartServices() {
  // Use coordinator to manage restart state
  if (!coordinator.startRestart()) {
    console.log('⏳ HEALTH MONITOR: Restart already in progress (via coordinator), skipping...');
    return;
  }
  
  console.log('🔄 HEALTH MONITOR: Starting coordinated service restart...');
  const restartStartTime = Date.now();
  
  try {
    // More precise service process killing
    console.log('🛑 HEALTH MONITOR: Stopping service processes...');
    try {
      const { execSync } = require('child_process');
      
      // Kill Node.js processes on our specific service ports only
      const servicePorts = [3000, 3001, 3002, 3003, 3004, 3005, 3006];
      for (const port of servicePorts) {
        try {
          // Get PIDs for this specific port and kill them
          const pids = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: 'utf8', timeout: 2000 });
          if (pids.trim()) {
            const pidList = pids.trim().split('\n').filter(p => p.trim());
            for (const pid of pidList) {
              try {
                // Check if it's a service process by looking at the command
                const cmd = execSync(`ps -p ${pid} -o command= 2>/dev/null || true`, { encoding: 'utf8', timeout: 1000 });
                if (cmd.includes('packages/api-services') || cmd.includes('packages/frontend') || cmd.includes('npm run dev')) {
                  console.log(`  Killing service process ${pid} on port ${port}`);
                  execSync(`kill -9 ${pid} 2>/dev/null || true`, { stdio: 'ignore', timeout: 1000 });
                }
              } catch (e) {
                // Ignore individual process errors
              }
            }
          }
        } catch (e) {
          // Port might be free or inaccessible
        }
      }
      
    } catch (error) {
      console.log('⚠️ HEALTH MONITOR: Process cleanup had issues, continuing...');
    }
    
    // Wait for port cleanup and system stabilization
    console.log('⏳ HEALTH MONITOR: Waiting for system stabilization...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Reduced to 3s to prevent test timeouts
    
    // Start services with more robust monitoring
    console.log('🚀 HEALTH MONITOR: Starting fresh services...');
    
    // Use a more direct approach - spawn service manager in background
    const { spawn: spawnDetached } = require('child_process');
    const startProcess = spawnDetached('node', ['service-manager.js', 'start'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: { ...process.env, QUIET_MODE: 'false' },
      detached: false
    });
    
    // Monitor startup with better detection
    await new Promise((resolve, reject) => {
      let started = false;
      let servicesReady = 0;
      
      // Monitor stdout for service readiness
      if (startProcess.stdout) {
        startProcess.stdout.on('data', (data) => {
          const output = data.toString();
          
          // Count services as they become ready
          if (output.includes('service (') && output.includes('healthy')) {
            servicesReady++;
          }
          
          // Look for completion indicators
          if (output.includes('All services are ready') || 
              output.includes('Services running. Press Ctrl+C') ||
              servicesReady >= 5) { // At least 5/7 services ready
            if (!started) {
              started = true;
              console.log(`✅ HEALTH MONITOR: Services started (${servicesReady} ready)`);
              resolve();
            }
          }
        });
      }
      
      startProcess.on('close', (code) => {
        if (!started) {
          started = true;
          if (code === 0 || servicesReady >= 5) {
            resolve();
          } else {
            reject(new Error(`Service start failed with code ${code}`));
          }
        }
      });
      
      // Reasonable timeout with fallback
      setTimeout(() => {
        if (!started) {
          if (servicesReady >= 3) {
            console.log(`⚠️ HEALTH MONITOR: Partial startup (${servicesReady}/7 services) - continuing`);
            started = true;
            resolve();
          } else {
            console.error(`❌ HEALTH MONITOR: Start timeout (only ${servicesReady}/7 services ready)`);
            if (!startProcess.killed) {
              startProcess.kill('SIGKILL');
            }
            started = true;
            reject(new Error('Service start timeout'));
          }
        }
      }, 60000); // 1 minute timeout (reduced from 2 minutes)
    });
    
    // Simplified verification - just check if services respond at all
    console.log('🔍 HEALTH MONITOR: Basic service verification...');
    
    // Give services time to settle
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try a simple health check - don't be too strict
    let basicHealthCheck = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const healthyCount = await countHealthyServices();
        if (healthyCount >= 4) { // At least 4/7 services responding
          basicHealthCheck = true;
          console.log(`✅ HEALTH MONITOR: ${healthyCount}/7 services responding`);
          break;
        }
        console.log(`⏳ HEALTH MONITOR: ${healthyCount}/7 services responding, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        // Continue trying
      }
    }
    
    if (basicHealthCheck) {
      const restartDuration = Math.round((Date.now() - restartStartTime) / 1000);
      console.log(`✅ HEALTH MONITOR: Basic service restart completed in ${restartDuration}s`);
      coordinator.completeRestart(true);
    } else {
      console.error('❌ HEALTH MONITOR: Service restart failed - insufficient services responding');
      coordinator.completeRestart(false);
    }
    
  } catch (error) {
    console.error('❌ HEALTH MONITOR: Restart error:', error.message);
    coordinator.completeRestart(false);
  }
}

async function startMonitoring() {
  if (monitoring) {
    console.log('⚠️ HEALTH MONITOR: Already monitoring');
    return;
  }
  
  monitoring = true;
  console.log('🏥 HEALTH MONITOR: Starting enhanced service health monitoring...');
  
  // Reset coordinator state on start
  coordinator.reset();
  
  // Track consecutive failures before restart
  let consecutiveFailures = 0;
  const FAILURE_THRESHOLD = 3; // Increased from 2 to 3 to be less aggressive
  
  monitorInterval = setInterval(async () => {
    if (!monitoring) {
      clearInterval(monitorInterval);
      return;
    }
    
    const coordinatorState = coordinator.getState();
    
    // Don't check if restart is in progress
    if (coordinatorState.restartInProgress) {
      console.log('⏳ HEALTH MONITOR: Skipping check - restart in progress');
      return;
    }
    
    const allHealthy = await checkAllServices();
    
    if (!allHealthy) {
      consecutiveFailures++;
      console.log(`⚠️ HEALTH MONITOR: Services unhealthy (${consecutiveFailures}/${FAILURE_THRESHOLD} failures)`);
      
      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        console.log('🚨 HEALTH MONITOR: Failure threshold reached, triggering restart...');
        consecutiveFailures = 0; // Reset counter
        await restartServices();
      }
    } else {
      // Reset failure counter on successful check
      if (consecutiveFailures > 0) {
        console.log('✅ HEALTH MONITOR: Services recovered, resetting failure counter');
        consecutiveFailures = 0;
      }
    }
  }, 10000); // Check every 10 seconds (increased from 5s to reduce load)
  
  // Cleanup on exit
  process.on('SIGINT', () => {
    console.log('🛑 HEALTH MONITOR: Stopping monitoring...');
    monitoring = false;
    clearInterval(monitorInterval);
    process.exit(0);
  });
}

function stopMonitoring() {
  monitoring = false;
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  console.log('🛑 HEALTH MONITOR: Monitoring stopped');
  
  // Cleanup coordinator
  coordinator.cleanup();
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      startMonitoring();
      break;
    case 'stop':
      stopMonitoring();
      break;
    case 'check':
      checkAllServices().then(healthy => {
        console.log(`Services health: ${healthy ? 'HEALTHY ✅' : 'UNHEALTHY ❌'}`);
        process.exit(healthy ? 0 : 1);
      });
      break;
    default:
      console.log('Usage: node service-health-monitor.js [start|stop|check]');
      process.exit(1);
  }
}

module.exports = { startMonitoring, stopMonitoring, checkAllServices, restartServices };