#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// Load environment variables from project root
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Increase max listeners to prevent EventEmitter memory leak warnings
// Service manager needs to handle multiple services and cleanup listeners
// Set this BEFORE any services or listeners are created
EventEmitter.defaultMaxListeners = 50;
process.setMaxListeners(50);

// Simple clean architecture - use standard ports since we removed worker isolation
const WORKER_ID = parseInt(process.env.WORKER_ID || '0'); // Read from environment or default to 0
const BASE_PORT = 3000 + (WORKER_ID * 10); // Calculate base port from worker ID

const SERVICES = [
  { name: 'Frontend', url: `http://localhost:${BASE_PORT}`, port: BASE_PORT },
  { name: 'Auth Service', url: `http://localhost:${BASE_PORT + 1}/health`, port: BASE_PORT + 1 },
  { name: 'User Service', url: `http://localhost:${BASE_PORT + 2}/health`, port: BASE_PORT + 2 },
  { name: 'News Service', url: `http://localhost:${BASE_PORT + 3}/health`, port: BASE_PORT + 3 },
  { name: 'Course Service', url: `http://localhost:${BASE_PORT + 4}/health`, port: BASE_PORT + 4 },
  { name: 'Planning Service', url: `http://localhost:${BASE_PORT + 5}/health`, port: BASE_PORT + 5 },
  { name: 'Statistics Service', url: `http://localhost:${BASE_PORT + 6}/health`, port: BASE_PORT + 6 }
];

const LOCK_FILE = path.join(__dirname, `.service-manager-worker-${WORKER_ID}.lock`);
const PID_FILE = path.join(__dirname, `.service-manager-worker-${WORKER_ID}.pids`);
const MAX_WAIT_TIME = 120000; // 2 minutes
const CHECK_INTERVAL = 2000; // 2 seconds

class ServiceManager {
  constructor() {
    this.devProcess = null;
    this.processes = [];
    this.frontendProcess = null;
    this.authProcess = null;
    this.userProcess = null;
    this.newsProcess = null;
    this.courseProcess = null;
    this.planningProcess = null;
    this.statisticsProcess = null;
    this.isShuttingDown = false;
    // EventEmitter listener tracking for proper cleanup
    this.listeners = new Map();
  }

  // Method to add process listener with tracking
  addProcessListener(process, event, handler) {
    process.on(event, handler);
    if (!this.listeners.has(process.pid)) {
      this.listeners.set(process.pid, []);
    }
    this.listeners.get(process.pid).push({ event, handler });
  }

  // Method to clean up all tracked listeners
  cleanupListeners() {
    for (const [pid, listeners] of this.listeners) {
      const process = this.processes.find(p => p && p.pid === pid);
      if (process) {
        listeners.forEach(({ event, handler }) => {
          try {
            process.removeListener(event, handler);
          } catch (error) {
            // Ignore errors during cleanup
          }
        });
      }
    }
    this.listeners.clear();
  }

  async isPortInUse(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}`, { timeout: 1000 }, () => {
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async checkService(url) {
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: 5000 }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async killPortProcesses(ports) {
    console.log(`🧹 Cleaning up development processes and test browsers...`);
    
    try {
      // First, kill Node.js processes on these ports (but not browsers)
      // Use lsof to find processes, then filter by command name
      for (const port of ports) {
        try {
          // Get detailed process info for this port
          const processInfo = execSync(`lsof -i:${port} -n -P 2>/dev/null || true`, { encoding: 'utf8' });
          
          if (processInfo) {
            // Parse lsof output to find Node.js processes only
            const lines = processInfo.split('\n').slice(1); // Skip header
            for (const line of lines) {
              if (!line.trim()) continue;
              
              const parts = line.split(/\s+/);
              const command = parts[0];
              const pid = parts[1];
              
              // Only kill Node.js processes, not browsers
              if (command && (command.includes('node') || command.includes('ts-node'))) {
                console.log(`  Killing ${command} process (PID: ${pid}) on port ${port}`);
                try {
                  execSync(`kill -9 ${pid} 2>/dev/null || true`, { stdio: 'ignore' });
                } catch (e) {
                  // Process might already be dead
                }
              }
            }
          }
        } catch (e) {
          // Port might be free
        }
      }
      
      // Kill development tools
      const devToolKillCommands = [
        'pkill -f "next-server" 2>/dev/null || true',
        'pkill -f "ts-node-dev" 2>/dev/null || true'
      ];
      
      for (const cmd of devToolKillCommands) {
        try {
          execSync(cmd, { stdio: 'ignore', timeout: 2000 });
        } catch (e) {
          // Ignore errors - processes might not exist
        }
      }
      
      // Kill Playwright browsers ONLY - these are browsers launched by Playwright for testing
      // They have specific signatures that distinguish them from user browsers
      console.log('  Cleaning up Playwright test browsers...');
      
      // Playwright browsers are launched from specific paths
      const playwrightBrowserKillCommands = [
        // Kill browsers from ms-playwright cache directory
        'pkill -f "ms-playwright/chromium" 2>/dev/null || true',
        'pkill -f "ms-playwright/firefox" 2>/dev/null || true',
        'pkill -f "ms-playwright/webkit" 2>/dev/null || true',
        // Kill browsers with Playwright-specific flags
        'pkill -f "firefox.*-marionette.*-profile" 2>/dev/null || true',
        'pkill -f "chromium.*--remote-debugging-pipe" 2>/dev/null || true',
        'pkill -f "webkit.*--automation" 2>/dev/null || true',
        // Kill browsers with specific test automation flags
        'pkill -f "--enable-automation" 2>/dev/null || true',
        'pkill -f "--no-startup-window" 2>/dev/null || true'
      ];
      
      for (const cmd of playwrightBrowserKillCommands) {
        try {
          execSync(cmd, { stdio: 'ignore', timeout: 2000 });
        } catch (e) {
          // Ignore errors - processes might not exist
        }
      }
      
      // Wait for processes to die
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Cleanup completed - development processes and test browsers killed');
      console.log('   (User browsers on localhost:3000 preserved)');
      
    } catch (error) {
      console.log('⚠️ Cleanup completed with warnings:', error.message);
    }
  }

  async ensureSingleInstance() {
    // Check if another instance is already running
    if (fs.existsSync(LOCK_FILE)) {
      const lockContent = fs.readFileSync(LOCK_FILE, 'utf8');
      const lockPid = parseInt(lockContent.trim());
      
      try {
        // Check if the process is still running
        process.kill(lockPid, 0);
        console.log(`⚠️ Another service manager is already running (PID: ${lockPid})`);
        console.log('🔄 Killing existing instance and starting fresh...');
        
        // Kill the existing instance
        try {
          process.kill(lockPid, 'SIGTERM');
          await new Promise(resolve => setTimeout(resolve, 2000));
          process.kill(lockPid, 'SIGKILL');
        } catch (e) {
          // Process might already be dead
        }
        
        // Clean up lock file
        if (fs.existsSync(LOCK_FILE)) {
          fs.unlinkSync(LOCK_FILE);
        }
      } catch (e) {
        // Process doesn't exist, remove stale lock file
        if (fs.existsSync(LOCK_FILE)) {
          fs.unlinkSync(LOCK_FILE);
        }
      }
    }

    // Create new lock file
    fs.writeFileSync(LOCK_FILE, process.pid.toString());
    
    // Setup cleanup on process exit
    const cleanup = () => {
      this.cleanupListeners(); // Clean up event listeners
      if (fs.existsSync(LOCK_FILE)) {
        fs.unlinkSync(LOCK_FILE);
      }
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
      }
    };

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  async startServices() {
    await this.ensureSingleInstance();
    
    // Force clean all ports first
    const ports = SERVICES.map(s => s.port);
    await this.killPortProcesses(ports);
    
    console.log(`🚀 Worker ${WORKER_ID}: Starting development services on ports ${BASE_PORT}-${BASE_PORT + 6}...`);
    
    // Start services individually to avoid npm workspace command issues
    const rootDir = path.join(__dirname, '../..');
    
    // Clean environment for test mode without worker isolation
    const testEnv = { 
      ...process.env, 
      NODE_ENV: 'test',
      WORKER_ID: WORKER_ID.toString(),
      // Clean database configuration - no worker isolation
      PLAYWRIGHT_WORKER_ID: WORKER_ID.toString(),
      TEST_WORKER_INDEX: WORKER_ID.toString(),
      MONGODB_URI: 'mongodb://localhost:27018/yggdrasil-dev',
      // Ensure all services use the same dev database (prevent worker isolation)
      DB_NAME: 'yggdrasil-dev',
      DB_COLLECTION_PREFIX: '', // Empty prefix to use main collections
      // Ensure JWT secrets are available (loaded from .env)
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      // MongoDB authentication credentials for services
      MONGO_APP_USERNAME: process.env.MONGO_APP_USERNAME,
      MONGO_APP_PASSWORD: process.env.MONGO_APP_PASSWORD,
      MONGO_ROOT_USERNAME: process.env.MONGO_ROOT_USERNAME,
      MONGO_ROOT_PASSWORD: process.env.MONGO_ROOT_PASSWORD,
      // Service URLs for inter-service communication
      AUTH_SERVICE_URL: `http://localhost:${BASE_PORT + 1}`,
      USER_SERVICE_URL: `http://localhost:${BASE_PORT + 2}`,
      NEWS_SERVICE_URL: `http://localhost:${BASE_PORT + 3}`,
      COURSE_SERVICE_URL: `http://localhost:${BASE_PORT + 4}`,
      PLANNING_SERVICE_URL: `http://localhost:${BASE_PORT + 5}`,
      STATISTICS_SERVICE_URL: `http://localhost:${BASE_PORT + 6}`,
      // Frontend environment variables
      NEXT_PUBLIC_API_URL: `http://localhost:${BASE_PORT + 1}`,
      NEXT_PUBLIC_USER_SERVICE_URL: `http://localhost:${BASE_PORT + 2}`,
      NEXT_PUBLIC_NEWS_SERVICE_URL: `http://localhost:${BASE_PORT + 3}`,
      NEXT_PUBLIC_COURSE_SERVICE_URL: `http://localhost:${BASE_PORT + 4}`,
      NEXT_PUBLIC_PLANNING_SERVICE_URL: `http://localhost:${BASE_PORT + 5}`,
      NEXT_PUBLIC_STATISTICS_SERVICE_URL: `http://localhost:${BASE_PORT + 6}`
    };
    
    // Start frontend service (Next.js)
    console.log(`📱 Worker ${WORKER_ID}: Starting frontend service on port ${BASE_PORT}...`);
    this.frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'packages/frontend'),
      stdio: 'pipe',
      detached: false,
      env: { ...testEnv, PORT: BASE_PORT.toString() }
    });
    
    // Start auth service
    console.log(`🔐 Worker ${WORKER_ID}: Starting auth service on port ${BASE_PORT + 1}...`);
    console.log(`🔐 Worker ${WORKER_ID}: Auth service environment:`, {
      NODE_ENV: testEnv.NODE_ENV,
      DB_NAME: testEnv.DB_NAME,
      DB_COLLECTION_PREFIX: testEnv.DB_COLLECTION_PREFIX,
      WORKER_ID: testEnv.WORKER_ID,
      PORT: (BASE_PORT + 1).toString()
    });
    this.authProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'packages/api-services/auth-service'),
      stdio: ['pipe', 'pipe', 'pipe'], 
      detached: false,
      env: { ...testEnv, PORT: (BASE_PORT + 1).toString() }
    });
    
    // Forward auth service logs for debugging
    if (this.authProcess.stdout) {
      this.authProcess.stdout.on('data', (data) => {
        console.log(`🔐 AUTH SERVICE: ${data.toString().trim()}`);
      });
    }
    if (this.authProcess.stderr) {
      this.authProcess.stderr.on('data', (data) => {
        console.error(`🚨 AUTH SERVICE ERROR: ${data.toString().trim()}`);
      });
    }
    
    // Start user service
    console.log(`👤 Worker ${WORKER_ID}: Starting user service on port ${BASE_PORT + 2}...`);
    this.userProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'packages/api-services/user-service'),
      stdio: 'pipe',
      detached: false,
      env: { ...testEnv, PORT: (BASE_PORT + 2).toString() }
    });
    
    // Start news service
    console.log(`📰 Worker ${WORKER_ID}: Starting news service on port ${BASE_PORT + 3}...`);
    this.newsProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'packages/api-services/news-service'),
      stdio: 'pipe',
      detached: false,
      env: { ...testEnv, PORT: (BASE_PORT + 3).toString() }
    });

    // Start course service
    console.log(`📚 Worker ${WORKER_ID}: Starting course service on port ${BASE_PORT + 4}...`);
    this.courseProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'packages/api-services/course-service'),
      stdio: 'pipe',
      detached: false,
      env: { ...testEnv, PORT: (BASE_PORT + 4).toString() }
    });

    console.log(`📅 Worker ${WORKER_ID}: Starting planning service on port ${BASE_PORT + 5}...`);
    this.planningProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'packages/api-services/planning-service'),
      stdio: 'pipe',
      detached: false,
      env: { ...testEnv, PORT: (BASE_PORT + 5).toString() }
    });

    console.log(`📊 Worker ${WORKER_ID}: Starting statistics service on port ${BASE_PORT + 6}...`);
    this.statisticsProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'packages/api-services/statistics-service'),
      stdio: 'pipe',
      detached: false,
      env: { ...testEnv, PORT: (BASE_PORT + 6).toString() }
    });

    // Store all process references
    this.processes = [this.frontendProcess, this.authProcess, this.userProcess, this.newsProcess, this.courseProcess, this.planningProcess, this.statisticsProcess];
    
    // Handle errors for all processes
    this.processes.forEach((process, index) => {
      const names = ['frontend', 'auth', 'user', 'news', 'course', 'planning', 'statistics'];
      this.addProcessListener(process, 'error', (error) => {
        console.error(`❌ Failed to start ${names[index]} service:`, error);
        process.exit(1);
      });
      
      this.addProcessListener(process, 'exit', (code) => {
        if (!this.isShuttingDown) {
          console.log(`📋 ${names[index]} service exited with code ${code}`);
        }
      });
    });

    // Store the PIDs
    const pids = this.processes.map(p => p.pid).filter(Boolean);
    if (pids.length > 0) {
      fs.writeFileSync(PID_FILE, pids.join(','));
    }

    // Wait for services to be ready
    const allReady = await this.waitForServices();
    
    if (!allReady) {
      console.error('❌ Failed to start all services, stopping...');
      await this.stopServices();
      process.exit(1);
    }

    console.log('✅ All services started successfully!');
    return true;
  }

  async waitForServices() {
    console.log('🔍 Waiting for all services to be ready...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < MAX_WAIT_TIME) {
      const results = await Promise.allSettled(
        SERVICES.map(async service => {
          const isReady = await this.checkService(service.url);
          return { service: service.name, ready: isReady };
        })
      );
      
      const readyServices = results
        .filter(result => result.status === 'fulfilled' && result.value.ready)
        .map(result => result.value.service);
      
      const notReadyServices = SERVICES
        .map(s => s.name)
        .filter(name => !readyServices.includes(name));
      
      if (readyServices.length === SERVICES.length) {
        console.log('✅ All services are ready!');
        console.log(`   ${readyServices.join(', ')}`);
        return true;
      }
      
      console.log(`⏳ Waiting for: ${notReadyServices.join(', ')}`);
      if (readyServices.length > 0) {
        console.log(`   Ready: ${readyServices.join(', ')}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
    
    console.error('❌ Timeout waiting for services to be ready');
    return false;
  }

  async stopServices() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log('🛑 Shutting down services...');
    
    // Graceful shutdown with SIGTERM->SIGKILL progression
    if (this.processes && this.processes.length > 0) {
      const names = ['frontend', 'auth', 'user', 'news', 'course', 'planning', 'statistics'];
      
      // First, try graceful shutdown with SIGTERM
      for (let i = 0; i < this.processes.length; i++) {
        const process = this.processes[i];
        const name = names[i];
        
        if (process && !process.killed) {
          console.log(`📝 Sending SIGTERM to ${name} service...`);
          try {
            process.kill('SIGTERM');
          } catch (error) {
            console.log(`⚠️ Failed to send SIGTERM to ${name} process:`, error.message);
          }
        }
      }
      
      // Wait 5 seconds for graceful shutdown
      console.log('⏳ Waiting 5 seconds for graceful shutdown...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Force kill any remaining processes with SIGKILL
      for (let i = 0; i < this.processes.length; i++) {
        const process = this.processes[i];
        const name = names[i];
        
        if (process && !process.killed) {
          console.log(`🔥 Force killing ${name} service with SIGKILL...`);
          try {
            process.kill('SIGKILL');
          } catch (error) {
            console.log(`⚠️ Failed to kill ${name} process:`, error.message);
          }
        }
      }
      
      // Additional wait for SIGKILL to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clean up event listeners before final cleanup
    this.cleanupListeners();
    
    // Force clean ports as final step
    const ports = SERVICES.map(s => s.port);
    await this.killPortProcesses(ports);
    
    console.log('✅ Services shut down successfully');
  }

  async healthCheck() {
    const results = await Promise.allSettled(
      SERVICES.map(async service => {
        const isReady = await this.checkService(service.url);
        return { service: service.name, ready: isReady, url: service.url };
      })
    );

    console.log('🏥 Service Health Check:');
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { service, ready, url } = result.value;
        const status = ready ? '✅' : '❌';
        console.log(`   ${status} ${service} (${url})`);
      }
    });

    const allHealthy = results.every(result => 
      result.status === 'fulfilled' && result.value.ready
    );

    return allHealthy;
  }

  // Process monitoring for zombies and hanging processes
  async monitorProcessHealth() {
    console.log('🔍 Monitoring process health...');
    
    try {
      // Check for zombie processes
      const zombieCheck = execSync('ps aux | grep -E "Z|<defunct>" | grep -v grep || true', { encoding: 'utf8' });
      if (zombieCheck.trim()) {
        console.log('⚠️ Zombie processes detected:');
        console.log(zombieCheck);
      } else {
        console.log('✅ No zombie processes found');
      }

      // Check our managed processes
      if (this.processes && this.processes.length > 0) {
        const names = ['frontend', 'auth', 'user', 'news', 'course', 'planning', 'statistics'];
        console.log('📊 Managed process status:');
        
        for (let i = 0; i < this.processes.length; i++) {
          const process = this.processes[i];
          const name = names[i];
          
          if (process) {
            const status = process.killed ? '💀 Dead' : '✅ Alive';
            console.log(`   ${name}: ${status} (PID: ${process.pid})`);
          } else {
            console.log(`   ${name}: ❌ Not started`);
          }
        }
      }

      // Check for hanging Node.js processes on our ports
      const ports = SERVICES.map(s => s.port);
      for (const port of ports) {
        try {
          const processInfo = execSync(`lsof -i:${port} -n -P 2>/dev/null || true`, { encoding: 'utf8' });
          if (processInfo.trim()) {
            console.log(`🔍 Port ${port} processes:`);
            console.log(processInfo);
          }
        } catch (error) {
          // Ignore errors - port might not be in use
        }
      }

    } catch (error) {
      console.error('❌ Process monitoring error:', error.message);
    }
  }
}

// CLI Interface
async function main() {
  const serviceManager = new ServiceManager();
  const command = process.argv[2] || 'start';

  // Setup aggressive shutdown handlers
  let isShuttingDown = false;
  
  const aggressiveShutdown = async (signal) => {
    if (isShuttingDown) {
      console.log('\n⚡ Force shutdown - killing all processes immediately...');
      const ports = SERVICES.map(s => s.port);
      await serviceManager.killPortProcesses(ports);
      process.exit(1);
    }
    
    isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    try {
      // Kill all processes gracefully
      await serviceManager.stopServices();
      console.log('✅ Service manager shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Service manager shutdown error:', error);
      const ports = SERVICES.map(s => s.port);
      await serviceManager.killPortProcesses(ports);
      process.exit(1);
    }
  };
  
  process.on('SIGINT', () => aggressiveShutdown('SIGINT'));
  process.on('SIGTERM', () => aggressiveShutdown('SIGTERM'));
  // Note: SIGKILL cannot be caught, trapped, or ignored

  try {
    switch (command) {
      case 'start':
        await serviceManager.startServices();
        // Keep the process running
        console.log('📋 Services running. Press Ctrl+C to stop.');
        setInterval(() => {}, 1000);
        break;
        
      case 'stop':
        await serviceManager.stopServices();
        break;
        
      case 'health':
        const healthy = await serviceManager.healthCheck();
        process.exit(healthy ? 0 : 1);
        break;
        
      case 'monitor':
        await serviceManager.monitorProcessHealth();
        break;
        
      case 'clean':
        const ports = SERVICES.map(s => s.port);
        await serviceManager.killPortProcesses(ports);
        console.log('✅ Ports cleaned');
        break;
        
      default:
        console.log('Usage: node service-manager.js [start|stop|health|monitor|clean]');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Service manager error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ServiceManager;