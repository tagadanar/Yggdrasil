#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SERVICES = [
  { name: 'Frontend', url: 'http://localhost:3000', port: 3000 },
  { name: 'Auth Service', url: 'http://localhost:3001/health', port: 3001 },
  { name: 'User Service', url: 'http://localhost:3002/health', port: 3002 }
];

const LOCK_FILE = path.join(__dirname, '.service-manager.lock');
const PID_FILE = path.join(__dirname, '.service-manager.pids');
const MAX_WAIT_TIME = 120000; // 2 minutes
const CHECK_INTERVAL = 2000; // 2 seconds

class ServiceManager {
  constructor() {
    this.devProcess = null;
    this.processes = [];
    this.frontendProcess = null;
    this.authProcess = null;
    this.userProcess = null;
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
    console.log(`🧹 Cleaning ports: ${ports.join(', ')}`);
    
    try {
      // Kill processes using lsof
      const command = `lsof -ti:${ports.join(',')} | xargs -r kill -9 2>/dev/null || true`;
      execSync(command, { stdio: 'ignore' });
      
      // Additional cleanup for any remaining Node.js processes
      try {
        execSync('pkill -f "next-server" 2>/dev/null || true', { stdio: 'ignore' });
        execSync('pkill -f "ts-node-dev.*src/index.ts" 2>/dev/null || true', { stdio: 'ignore' });
      } catch (e) {
        // Ignore errors - processes might not exist
      }
      
      // Wait a moment for processes to die
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
    
    console.log('🚀 Starting development services...');
    
    // Start services individually to avoid npm workspace command issues
    const rootDir = path.join(__dirname, '../..');
    
    // Start frontend service (Next.js)
    console.log('📱 Starting frontend service...');
    this.frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'packages/frontend'),
      stdio: 'pipe',
      detached: false,
      env: { ...process.env, PORT: '3000' }
    });
    
    // Start auth service
    console.log('🔐 Starting auth service...');
    this.authProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'packages/api-services/auth-service'),
      stdio: 'pipe', 
      detached: false,
      env: { ...process.env, PORT: '3001' }
    });
    
    // Start user service
    console.log('👤 Starting user service...');
    this.userProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(rootDir, 'packages/api-services/user-service'),
      stdio: 'pipe',
      detached: false,
      env: { ...process.env, PORT: '3002' }
    });

    // Store all process references
    this.processes = [this.frontendProcess, this.authProcess, this.userProcess];
    
    // Handle errors for all processes
    this.processes.forEach((process, index) => {
      const names = ['frontend', 'auth', 'user'];
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
    
    // Stop all individual processes
    if (this.processes && this.processes.length > 0) {
      const names = ['frontend', 'auth', 'user'];
      
      for (let i = 0; i < this.processes.length; i++) {
        const process = this.processes[i];
        const name = names[i];
        
        if (process && !process.killed) {
          console.log(`🛑 Stopping ${name} service...`);
          process.kill('SIGTERM');
        }
      }
      
      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Force kill any remaining processes
      for (let i = 0; i < this.processes.length; i++) {
        const process = this.processes[i];
        const name = names[i];
        
        if (process && !process.killed) {
          console.log(`🔥 Force killing ${name} service...`);
          process.kill('SIGKILL');
        }
      }
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

  // Setup graceful shutdown handlers
  process.on('SIGINT', async () => {
    console.log('\\n🛑 Received SIGINT, shutting down gracefully...');
    await serviceManager.stopServices();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\\n🛑 Received SIGTERM, shutting down gracefully...');
    await serviceManager.stopServices();
    process.exit(0);
  });

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