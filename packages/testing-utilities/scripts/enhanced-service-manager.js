#!/usr/bin/env node
// Enhanced service manager with improved resource management and cleanup

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// Increase max listeners to prevent EventEmitter memory leak warnings
// Set this BEFORE any services or listeners are created
EventEmitter.defaultMaxListeners = 50;
process.setMaxListeners(50);

class EnhancedServiceManager {
  constructor() {
    this.services = new Map();
    this.lockFiles = new Set();
    this.pidFiles = new Set();
    this.cleanupHandlers = [];
    this.resourceLimits = {
      maxFileDescriptors: 100, // Per service
      maxMemoryMB: 512,        // Per service
      startupTimeoutMs: 30000, // Service startup timeout
      shutdownTimeoutMs: 10000 // Service shutdown timeout
    };
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async preStartupCleanup() {
    this.log('🧹 Pre-startup cleanup...');
    
    // Clean up any existing lock files
    const lockPattern = path.join(__dirname, '../.service-manager*.lock');
    const pidPattern = path.join(__dirname, '../.service-manager*.pids');
    
    try {
      await this.executeCommand(`rm -f ${lockPattern} ${pidPattern}`);
      await this.executeCommand('pkill -f "ts-node-dev" || true');
      await this.executeCommand('rm -f /tmp/ts-node-dev-* || true');
      this.log('✅ Pre-startup cleanup completed');
    } catch (error) {
      this.log(`⚠️  Cleanup warning: ${error.message}`);
    }
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error && !command.includes('|| true')) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  createLockFile(serviceName, workerId) {
    const lockFile = path.join(__dirname, `../.service-manager-${serviceName}-${workerId}.lock`);
    fs.writeFileSync(lockFile, process.pid.toString());
    this.lockFiles.add(lockFile);
    return lockFile;
  }

  createPidFile(serviceName, workerId, pid) {
    const pidFile = path.join(__dirname, `../.service-manager-${serviceName}-${workerId}.pids`);
    fs.writeFileSync(pidFile, pid.toString());
    this.pidFiles.add(pidFile);
    return pidFile;
  }

  async startService(serviceName, workerId, command, cwd, env = {}) {
    this.log(`🚀 Starting ${serviceName} for worker ${workerId}...`);

    const lockFile = this.createLockFile(serviceName, workerId);
    
    // Enhanced environment with resource limits
    const enhancedEnv = {
      ...process.env,
      ...env,
      NODE_OPTIONS: '--max-old-space-size=512', // Limit memory
      UV_THREADPOOL_SIZE: '4' // Limit thread pool
    };

    const serviceProcess = spawn(command.split(' ')[0], command.split(' ').slice(1), {
      cwd,
      env: enhancedEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false // Keep in same process group for easier cleanup
    });

    // Create PID file
    const pidFile = this.createPidFile(serviceName, workerId, serviceProcess.pid);

    // Set up monitoring
    const serviceInfo = {
      process: serviceProcess,
      name: serviceName,
      workerId,
      lockFile,
      pidFile,
      startTime: Date.now(),
      memoryLimit: this.resourceLimits.maxMemoryMB * 1024 * 1024
    };

    this.services.set(`${serviceName}-${workerId}`, serviceInfo);

    // Monitor resource usage
    this.monitorServiceResources(serviceInfo);

    // Set up cleanup on process exit
    serviceProcess.on('exit', (code, signal) => {
      this.log(`📋 ${serviceName} exited with code ${code}, signal ${signal}`);
      this.cleanupService(serviceName, workerId);
    });

    // Handle startup timeout
    const startupTimeout = setTimeout(() => {
      this.log(`⏰ ${serviceName} startup timeout exceeded`);
      this.killService(serviceName, workerId);
    }, this.resourceLimits.startupTimeoutMs);

    // Clear timeout once service is healthy
    serviceProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('running on port') || output.includes('ready')) {
        clearTimeout(startupTimeout);
      }
    });

    return serviceProcess;
  }

  async monitorServiceResources(serviceInfo) {
    const monitor = setInterval(async () => {
      try {
        const { stdout } = await this.executeCommand(`ps -p ${serviceInfo.process.pid} -o pid,rss,etime --no-headers`);
        
        if (stdout.trim()) {
          const [pid, rss, etime] = stdout.trim().split(/\s+/);
          const memoryMB = parseInt(rss) / 1024;
          
          if (memoryMB > this.resourceLimits.maxMemoryMB) {
            this.log(`⚠️  ${serviceInfo.name} memory limit exceeded: ${memoryMB.toFixed(1)}MB > ${this.resourceLimits.maxMemoryMB}MB`);
            this.killService(serviceInfo.name, serviceInfo.workerId);
          }
        } else {
          // Process no longer exists
          clearInterval(monitor);
        }
      } catch (error) {
        // Process likely ended, clear monitor
        clearInterval(monitor);
      }
    }, 5000); // Check every 5 seconds

    // Store monitor for cleanup
    serviceInfo.monitor = monitor;
  }

  killService(serviceName, workerId) {
    const key = `${serviceName}-${workerId}`;
    const serviceInfo = this.services.get(key);
    
    if (serviceInfo) {
      this.log(`🛑 Killing service ${serviceName}-${workerId}...`);
      
      try {
        // Clear resource monitor
        if (serviceInfo.monitor) {
          clearInterval(serviceInfo.monitor);
        }

        // Kill process
        if (serviceInfo.process && !serviceInfo.process.killed) {
          serviceInfo.process.kill('SIGKILL');
        }
      } catch (error) {
        this.log(`⚠️  Error killing service: ${error.message}`);
      }
      
      this.cleanupService(serviceName, workerId);
    }
  }

  cleanupService(serviceName, workerId) {
    const key = `${serviceName}-${workerId}`;
    const serviceInfo = this.services.get(key);
    
    if (serviceInfo) {
      // Remove lock and PID files
      try {
        if (fs.existsSync(serviceInfo.lockFile)) {
          fs.unlinkSync(serviceInfo.lockFile);
        }
        if (fs.existsSync(serviceInfo.pidFile)) {
          fs.unlinkSync(serviceInfo.pidFile);
        }
      } catch (error) {
        this.log(`⚠️  Cleanup warning: ${error.message}`);
      }
      
      this.services.delete(key);
    }
  }

  async shutdownAll() {
    this.log('🛑 Shutting down all services...');
    
    const shutdownPromises = Array.from(this.services.keys()).map(key => {
      const [serviceName, workerId] = key.split('-');
      return this.shutdownService(serviceName, workerId);
    });

    await Promise.all(shutdownPromises);
    
    // Final cleanup
    await this.finalCleanup();
  }

  async shutdownService(serviceName, workerId) {
    return new Promise((resolve) => {
      const key = `${serviceName}-${workerId}`;
      const serviceInfo = this.services.get(key);
      
      if (!serviceInfo) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        this.log(`⏰ Shutdown timeout for ${serviceName}, force killing...`);
        this.killService(serviceName, workerId);
        resolve();
      }, this.resourceLimits.shutdownTimeoutMs);

      serviceInfo.process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      // Try graceful shutdown first
      serviceInfo.process.kill('SIGTERM');
    });
  }

  async finalCleanup() {
    this.log('🧹 Final cleanup...');
    
    try {
      // Clean up any remaining files
      for (const lockFile of this.lockFiles) {
        if (fs.existsSync(lockFile)) {
          fs.unlinkSync(lockFile);
        }
      }
      
      for (const pidFile of this.pidFiles) {
        if (fs.existsSync(pidFile)) {
          fs.unlinkSync(pidFile);
        }
      }

      // Run cleanup script
      await this.executeCommand('/home/tagada/Desktop/Yggdrasil/packages/testing-utilities/scripts/cleanup-orphaned-processes.sh');
      
      this.log('✅ Final cleanup completed');
    } catch (error) {
      this.log(`⚠️  Final cleanup warning: ${error.message}`);
    }
  }

  setupExitHandlers() {
    const cleanup = () => {
      this.shutdownAll().then(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('uncaughtException', (error) => {
      this.log(`❌ Uncaught exception: ${error.message}`);
      cleanup();
    });
  }
}

module.exports = EnhancedServiceManager;