#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

const services = [
  { name: 'Auth Service', url: 'http://localhost:3001/health' },
  { name: 'Course Service', url: 'http://localhost:3003/health' },
  { name: 'Planning Service', url: 'http://localhost:3004/health' },
  { name: 'News Service', url: 'http://localhost:3005/health' },
  { name: 'Statistics Service', url: 'http://localhost:3006/health' },
  { name: 'Notification Service', url: 'http://localhost:3007/health' }
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function checkService(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 2000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 300);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.setTimeout(2000);
  });
}

async function waitForServices(maxWaitTime = 60) {
  console.log(`${colors.cyan}${colors.bright}⏳ Waiting for services to start...${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`);

  const startTime = Date.now();
  const healthyServices = new Set();
  
  while (Date.now() - startTime < maxWaitTime * 1000) {
    for (const service of services) {
      if (!healthyServices.has(service.name)) {
        const isHealthy = await checkService(service.url);
        if (isHealthy) {
          healthyServices.add(service.name);
          console.log(`${colors.green}✅ ${service.name} is ready${colors.reset}`);
        }
      }
    }

    if (healthyServices.size === services.length) {
      console.log(`\n${colors.green}${colors.bright}🎉 All services are ready!${colors.reset}`);
      return true;
    }

    // Show progress
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = services.filter(s => !healthyServices.has(s.name));
    process.stdout.write(`\r${colors.yellow}⏳ Waiting for: ${remaining.map(s => s.name).join(', ')} (${elapsed}s/${maxWaitTime}s)${colors.reset}`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${colors.red}❌ Timeout waiting for services${colors.reset}`);
  const stillWaiting = services.filter(s => !healthyServices.has(s.name));
  console.log(`${colors.red}Services not ready: ${stillWaiting.map(s => s.name).join(', ')}${colors.reset}`);
  return false;
}

async function runHealthCheck() {
  console.log(`\n${colors.cyan}${colors.bright}🏥 Running final health check...${colors.reset}`);
  
  try {
    const healthCheckProcess = spawn('node', ['scripts/health-check.js'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    return new Promise((resolve) => {
      healthCheckProcess.on('close', (code) => {
        resolve(code === 0);
      });
    });
  } catch (error) {
    console.log(`${colors.red}❌ Health check failed: ${error.message}${colors.reset}`);
    return false;
  }
}

async function main() {
  const maxWaitTime = parseInt(process.argv[2]) || 60;
  
  console.log(`${colors.blue}${colors.bright}🌳 Yggdrasil Services Startup Monitor${colors.reset}\n`);
  
  const servicesReady = await waitForServices(maxWaitTime);
  
  if (servicesReady) {
    const healthCheckPassed = await runHealthCheck();
    
    if (healthCheckPassed) {
      console.log(`\n${colors.green}${colors.bright}🚀 All systems go! Services are healthy and ready.${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}${colors.bright}❌ Health check failed${colors.reset}`);
      process.exit(1);
    }
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ Services failed to start within ${maxWaitTime} seconds${colors.reset}`);
    process.exit(1);
  }
}

main().catch(console.error);