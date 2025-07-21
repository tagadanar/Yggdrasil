#!/usr/bin/env node
// Process monitor to detect and clean up orphaned processes

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProcessMonitor {
  constructor() {
    this.maxProcesses = 20; // Maximum allowed ts-node-dev processes
    this.maxFileDescriptors = 500000; // Alert threshold for file descriptors
    this.cleanupInterval = 30000; // Check every 30 seconds
    this.logFile = path.join(__dirname, 'process-monitor.log');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logFile, logEntry);
  }

  async getProcessCount() {
    return new Promise((resolve, reject) => {
      exec('ps aux | grep -E "(ts-node-dev|node.*src/index.ts)" | grep -v grep | wc -l', (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(parseInt(stdout.trim()));
        }
      });
    });
  }

  async getFileDescriptorCount() {
    return new Promise((resolve, reject) => {
      exec('lsof | wc -l', (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(parseInt(stdout.trim()));
        }
      });
    });
  }

  async cleanupOrphanedProcesses() {
    this.log('🧹 Starting automatic cleanup of orphaned processes...');
    
    return new Promise((resolve, reject) => {
      exec('/home/tagada/Desktop/Yggdrasil/packages/testing-utilities/scripts/cleanup-orphaned-processes.sh', (error, stdout, stderr) => {
        if (error) {
          this.log(`❌ Cleanup error: ${error.message}`);
          reject(error);
        } else {
          this.log('✅ Automatic cleanup completed');
          this.log(stdout);
          resolve();
        }
      });
    });
  }

  async monitorResources() {
    try {
      const processCount = await this.getProcessCount();
      const fdCount = await this.getFileDescriptorCount();

      this.log(`📊 Status: ${processCount} Node processes, ${fdCount} file descriptors`);

      // Check for too many processes
      if (processCount > this.maxProcesses) {
        this.log(`⚠️  WARNING: Too many Node processes (${processCount} > ${this.maxProcesses})`);
        await this.cleanupOrphanedProcesses();
      }

      // Check for high file descriptor usage
      if (fdCount > this.maxFileDescriptors) {
        this.log(`⚠️  WARNING: High file descriptor usage (${fdCount} > ${this.maxFileDescriptors})`);
        await this.cleanupOrphanedProcesses();
      }

    } catch (error) {
      this.log(`❌ Monitor error: ${error.message}`);
    }
  }

  start() {
    this.log('🚀 Starting process monitor...');
    this.log(`📋 Config: maxProcesses=${this.maxProcesses}, maxFD=${this.maxFileDescriptors}, interval=${this.cleanupInterval}ms`);

    // Initial cleanup
    this.cleanupOrphanedProcesses().catch(err => {
      this.log(`❌ Initial cleanup failed: ${err.message}`);
    });

    // Start monitoring
    setInterval(() => {
      this.monitorResources();
    }, this.cleanupInterval);

    // Cleanup on exit
    process.on('SIGINT', () => {
      this.log('🛑 Process monitor shutting down...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.log('🛑 Process monitor terminated');
      process.exit(0);
    });
  }
}

// Start monitor if run directly
if (require.main === module) {
  const monitor = new ProcessMonitor();
  monitor.start();
}

module.exports = ProcessMonitor;