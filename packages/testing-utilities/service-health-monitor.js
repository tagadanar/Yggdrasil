#!/usr/bin/env node

// Service Health Monitor - Ensures services stay healthy during test execution
const http = require('http');
const { spawn } = require('child_process');

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
let restartInProgress = false;

async function checkServiceHealth(service) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${service.port}${service.path}`, { timeout: 2000 }, (res) => {
      resolve({ service: service.name, healthy: res.statusCode === 200 });
    });
    
    req.on('error', () => {
      resolve({ service: service.name, healthy: false });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ service: service.name, healthy: false });
    });
  });
}

async function checkAllServices() {
  const results = await Promise.all(SERVICES.map(checkServiceHealth));
  const unhealthy = results.filter(r => !r.healthy);
  
  if (unhealthy.length > 0) {
    console.log(`🚨 HEALTH MONITOR: ${unhealthy.length} unhealthy services: ${unhealthy.map(s => s.service).join(', ')}`);
    return false;
  }
  
  return true;
}

async function restartServices() {
  if (restartInProgress) {
    console.log('⏳ HEALTH MONITOR: Restart already in progress, skipping...');
    return;
  }
  
  restartInProgress = true;
  console.log('🔄 HEALTH MONITOR: Restarting services...');
  
  try {
    // Stop services
    const stopProcess = spawn('node', ['service-manager.js', 'stop'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    await new Promise((resolve) => {
      stopProcess.on('close', resolve);
    });
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start services
    const startProcess = spawn('node', ['service-manager.js', 'start'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    await new Promise((resolve) => {
      startProcess.on('close', resolve);
    });
    
    // Wait for services to be ready
    let retries = 0;
    while (retries < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await checkAllServices()) {
        console.log('✅ HEALTH MONITOR: Services restarted successfully');
        break;
      }
      retries++;
    }
    
    if (retries >= 30) {
      console.log('❌ HEALTH MONITOR: Service restart failed');
    }
    
  } catch (error) {
    console.error('❌ HEALTH MONITOR: Restart error:', error);
  } finally {
    restartInProgress = false;
  }
}

async function startMonitoring() {
  if (monitoring) {
    console.log('⚠️ HEALTH MONITOR: Already monitoring');
    return;
  }
  
  monitoring = true;
  console.log('🏥 HEALTH MONITOR: Starting service health monitoring...');
  
  const monitorInterval = setInterval(async () => {
    if (!monitoring) {
      clearInterval(monitorInterval);
      return;
    }
    
    const allHealthy = await checkAllServices();
    
    if (!allHealthy && !restartInProgress) {
      console.log('🚨 HEALTH MONITOR: Services unhealthy, attempting restart...');
      await restartServices();
    }
  }, 5000); // Check every 5 seconds
  
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
  console.log('🛑 HEALTH MONITOR: Monitoring stopped');
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