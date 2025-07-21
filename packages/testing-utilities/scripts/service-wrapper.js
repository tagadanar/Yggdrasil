#!/usr/bin/env node
// scripts/service-wrapper.js
// Centralized service management wrapper for all test commands

const { ServiceManager } = require('@yggdrasil/shared-utilities/testing');

class TestServiceWrapper {
  constructor() {
    this.serviceManager = null;
    this.isShuttingDown = false;
  }

  async startServices() {
    console.log('🚀 Starting services for testing...');
    
    try {
      this.serviceManager = new ServiceManager({ 
        workerId: 0, 
        logLevel: 'normal' 
      });
      
      const success = await this.serviceManager.startServices();
      
      if (!success) {
        throw new Error('Failed to start services');
      }
      
      console.log('✅ All services ready for testing');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to start services:', error.message);
      await this.cleanup();
      throw error;
    }
  }

  async cleanup() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    console.log('🧹 Cleaning up services...');
    
    try {
      if (this.serviceManager) {
        await this.serviceManager.stopServices();
      }
      console.log('✅ Service cleanup completed');
    } catch (error) {
      console.error('⚠️ Cleanup error:', error.message);
    }
  }

  async runWithServices(command, args = []) {
    // Setup cleanup handlers
    const cleanup = () => {
      this.cleanup().finally(() => process.exit(0));
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', () => {
      if (!this.isShuttingDown) {
        this.cleanup();
      }
    });

    try {
      // Start services
      await this.startServices();
      
      // Run the command
      const { spawn } = require('child_process');
      const commandProcess = spawn(command, args, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { 
          ...process.env, 
          NODE_ENV: 'test',
          WORKER_ID: '0',
          PLAYWRIGHT_WORKER_ID: '0'
        }
      });

      // Wait for command to complete
      const exitCode = await new Promise((resolve, reject) => {
        commandProcess.on('close', resolve);
        commandProcess.on('error', reject);
      });

      // Cleanup services
      await this.cleanup();
      
      process.exit(exitCode);
      
    } catch (error) {
      console.error('❌ Command execution failed:', error.message);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const wrapper = new TestServiceWrapper();
  const [command, ...args] = process.argv.slice(2);
  
  if (!command) {
    console.error('Usage: node service-wrapper.js <command> [args...]');
    process.exit(1);
  }
  
  wrapper.runWithServices(command, args);
}

module.exports = { TestServiceWrapper };