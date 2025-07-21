#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple clean architecture - use standard ports since we removed worker isolation
const WORKER_ID = 0; // Clean architecture uses single worker
const BASE_PORT = 3000; // Standard base port for clean architecture

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
    console.log(`🧹 Aggressively cleaning ports: ${ports.join(', ')}`);
    
    try {
      // Kill processes using lsof with SIGKILL
      const command = `lsof -ti:${ports.join(',')} | xargs -r kill -9 2>/dev/null || true`;
      execSync(command, { stdio: 'ignore' });
      
      // Aggressive cleanup for development tools that spawn child processes
      const aggressiveKillCommands = [
        'pkill -f "next-server" 2>/dev/null || true',
        'pkill -f "ts-node-dev" 2>/dev/null || true',
        'pkill -f "next.*dev" 2>/dev/null || true',
        'pkill -f "npm.*run.*dev" 2>/dev/null || true',
        // Kill any Node.js processes on our port range
        `lsof -ti:${ports[0]}-${ports[ports.length-1]} | xargs -r kill -9 2>/dev/null || true`
      ];
      
      for (const cmd of aggressiveKillCommands) {
        try {
          execSync(cmd, { stdio: 'ignore', timeout: 2000 });
        } catch (e) {
          // Ignore errors - processes might not exist
        }
      }
      
      // Wait for processes to die
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Aggressive port cleanup completed');
      
    } catch (error) {
      console.log('⚠️ Port cleanup completed (some ports may have been free)');
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
      // No DB_NAME or DB_COLLECTION_PREFIX - use clean dev database
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
    this.authProcess.stdout.on('data', (data) => {
      console.log(`🔐 AUTH SERVICE: ${data.toString().trim()}`);
    });
    this.authProcess.stderr.on('data', (data) => {
      console.error(`🚨 AUTH SERVICE ERROR: ${data.toString().trim()}`);
    });
    
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
      process.on('error', (error) => {
        console.error(`❌ Failed to start ${names[index]} service:`, error);
        process.exit(1);
      });
      
      process.on('exit', (code) => {
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
    
    // Immediately kill all individual processes with SIGKILL
    if (this.processes && this.processes.length > 0) {
      const names = ['frontend', 'auth', 'user', 'news', 'course', 'planning', 'statistics'];
      
      // Skip SIGTERM - go straight to SIGKILL for development tools
      for (let i = 0; i < this.processes.length; i++) {
        const process = this.processes[i];
        const name = names[i];
        
        if (process && !process.killed) {
          console.log(`🔥 Force killing ${name} service immediately...`);
          try {
            process.kill('SIGKILL');
          } catch (error) {
            console.log(`⚠️ Failed to kill ${name} process:`, error.message);
          }
        }
      }
      
      // Shorter wait since we're using SIGKILL
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

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
}

// CLI Interface
async function main() {
  const serviceManager = new ServiceManager();
  const command = process.argv[2] || 'start';

  // Setup aggressive shutdown handlers
  let isShuttingDown = false;
  
  const aggressiveShutdown = async (signal) => {
    if (isShuttingDown) {
      console.log('\\n⚡ Force shutdown - killing all processes immediately...');
      const ports = SERVICES.map(s => s.port);
      await serviceManager.killPortProcesses(ports);
      process.exit(1);
    }
    
    isShuttingDown = true;
    console.log(`\\n🛑 Received ${signal}, shutting down immediately...`);
    
    try {
      // Kill all processes aggressively
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
        
      case 'clean':
        const ports = SERVICES.map(s => s.port);
        await serviceManager.killPortProcesses(ports);
        console.log('✅ Ports cleaned');
        break;
        
      default:
        console.log('Usage: node service-manager.js [start|stop|health|clean]');
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