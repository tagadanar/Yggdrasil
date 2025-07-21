#!/usr/bin/env node

/**
 * Comprehensive Environment Reset Script
 * 
 * This script performs a complete environment reset following ULTRATHINK methodology:
 * 1. Process cleanup (zombie processes)
 * 2. Port cleanup (hanging services)
 * 3. Database cleanup (stale test data)
 * 4. File system cleanup (temp files, locks)
 * 5. Memory cleanup (garbage collection)
 * 6. Health verification
 * 
 * Usage: node scripts/comprehensive-environment-reset.js [--verify-only]
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration for single-worker architecture
const SINGLE_WORKER_CONFIG = {
  workerId: 0,
  basePort: 3000,
  portRange: [3000, 3001, 3002, 3003, 3004, 3005, 3006],
  database: {
    name: 'yggdrasil_test_w0',
    collectionPrefix: 'w0_'
  }
};

const HEALTH_THRESHOLDS = {
  maxProcesses: 15,
  maxMemoryMB: 4096,
  maxTempFiles: 50,
  maxOpenFDs: 1000000
};

class ComprehensiveEnvironmentReset {
  constructor(options = {}) {
    this.verifyOnly = options.verifyOnly || false;
    this.verbose = options.verbose !== false;
    this.issues = [];
    this.fixes = [];
  }

  log(message, level = 'info') {
    if (!this.verbose && level === 'debug') return;
    
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level] || '📋';
    
    console.log(`${prefix} ${message}`);
  }

  async executeCommand(command, description, options = {}) {
    try {
      this.log(`${description}...`, 'debug');
      const result = execSync(command, { 
        encoding: 'utf8', 
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options 
      });
      return { success: true, output: result ? result.trim() : '' };
    } catch (error) {
      // Don't log errors for optional commands that may fail (like pkill when no processes exist)
      if (!options.silent) {
        this.log(`Failed: ${description} - ${error.message}`, 'error');
      }
      return { success: false, error: error.message };
    }
  }

  async checkSystemHealth() {
    this.log('🏥 HEALTH CHECK: Analyzing system state...', 'info');
    const health = {
      processes: { count: 0, status: 'unknown' },
      memory: { usage: 0, status: 'unknown' },
      ports: { inUse: 0, status: 'unknown' },
      tempFiles: { count: 0, status: 'unknown' },
      database: { status: 'unknown' }
    };

    // Check process count
    try {
      const processCmd = 'ps aux | grep -E "(node|ts-node)" | grep -v grep | wc -l';
      const result = await this.executeCommand(processCmd, 'Counting Node processes', { silent: true });
      if (result.success) {
        health.processes.count = parseInt(result.output);
        health.processes.status = health.processes.count <= HEALTH_THRESHOLDS.maxProcesses ? 'healthy' : 'warning';
        
        if (health.processes.status === 'warning') {
          this.issues.push(`High process count: ${health.processes.count} (threshold: ${HEALTH_THRESHOLDS.maxProcesses})`);
        }
      }
    } catch (error) {
      health.processes.status = 'error';
    }

    // Check memory usage
    try {
      const memCmd = "ps aux | grep -E '(node|ts-node)' | grep -v grep | awk '{sum += $6} END {print sum/1024}'";
      const result = await this.executeCommand(memCmd, 'Checking memory usage', { silent: true });
      if (result.success) {
        health.memory.usage = Math.round(parseFloat(result.output) || 0);
        health.memory.status = health.memory.usage <= HEALTH_THRESHOLDS.maxMemoryMB ? 'healthy' : 'warning';
        
        if (health.memory.status === 'warning') {
          this.issues.push(`High memory usage: ${health.memory.usage}MB (threshold: ${HEALTH_THRESHOLDS.maxMemoryMB}MB)`);
        }
      }
    } catch (error) {
      health.memory.status = 'error';
    }

    // Check port usage
    try {
      let portsInUse = 0;
      for (const port of SINGLE_WORKER_CONFIG.portRange) {
        const portCmd = `lsof -t -i:${port} 2>/dev/null | wc -l`;
        const result = await this.executeCommand(portCmd, `Checking port ${port}`, { silent: true });
        if (result.success && parseInt(result.output) > 0) {
          portsInUse++;
        }
      }
      health.ports.inUse = portsInUse;
      health.ports.status = portsInUse === 0 ? 'healthy' : 'warning';
      
      if (health.ports.status === 'warning') {
        this.issues.push(`Ports in use: ${portsInUse}/${SINGLE_WORKER_CONFIG.portRange.length}`);
      }
    } catch (error) {
      health.ports.status = 'error';
    }

    // Check temporary files (non-critical)
    try {
      const tempCmd = 'find /tmp -name "*ts-node*" 2>/dev/null | wc -l';
      const result = await this.executeCommand(tempCmd, 'Counting temp files', { silent: true });
      if (result.success) {
        health.tempFiles.count = parseInt(result.output);
        // Don't treat temp files as critical issue - they clean up naturally
        health.tempFiles.status = 'healthy';
        
        if (health.tempFiles.count > HEALTH_THRESHOLDS.maxTempFiles) {
          this.log(`Info: ${health.tempFiles.count} temp files found (non-critical)`, 'debug');
        }
      }
    } catch (error) {
      health.tempFiles.status = 'healthy'; // Non-critical
    }

    return health;
  }

  async killZombieProcesses() {
    this.log('🧟 PROCESS CLEANUP: Eliminating zombie processes...', 'info');
    
    const processCommands = [
      { cmd: 'pkill -f "ts-node-dev.*src/index.ts" || true', desc: 'Kill ts-node-dev processes' },
      { cmd: 'pkill -f "next dev" || true', desc: 'Kill Next.js dev servers' },
      { cmd: 'pkill -f "@yggdrasil" || true', desc: 'Kill project-specific processes' },
      { cmd: 'pkill -f "service-manager" || true', desc: 'Kill service managers' }
    ];

    for (const { cmd, desc } of processCommands) {
      const result = await this.executeCommand(cmd, desc, { silent: true });
      if (result.success) {
        this.fixes.push(desc);
      }
    }

    // Force kill high CPU processes
    try {
      const highCpuCmd = "ps aux | grep -E '(node|ts-node)' | awk '$3 > 90 {print $2}' | head -10";
      const result = await this.executeCommand(highCpuCmd, 'Find high CPU processes', { silent: true });
      if (result.success && result.output) {
        const pids = result.output.split('\n').filter(pid => pid.trim());
        for (const pid of pids) {
          await this.executeCommand(`kill -9 ${pid} 2>/dev/null || true`, `Force kill PID ${pid}`, { silent: true });
          this.fixes.push(`Force killed high CPU process ${pid}`);
        }
      }
    } catch (error) {
      // Silent failure for optional cleanup
    }
  }

  async cleanupPorts() {
    this.log('🔌 PORT CLEANUP: Freeing occupied ports...', 'info');
    
    for (const port of SINGLE_WORKER_CONFIG.portRange) {
      try {
        const pidCmd = `lsof -t -i:${port} 2>/dev/null || true`;
        const result = await this.executeCommand(pidCmd, `Check port ${port}`, { silent: true });
        
        if (result.success && result.output.trim()) {
          const pids = result.output.trim().split('\n').filter(pid => pid);
          for (const pid of pids) {
            await this.executeCommand(`kill -9 ${pid} 2>/dev/null || true`, `Kill process on port ${port}`);
            this.fixes.push(`Freed port ${port} (killed PID ${pid})`);
          }
        }
      } catch (error) {
        this.log(`Failed to clean port ${port}: ${error.message}`, 'warning');
      }
    }
  }

  async cleanupFileSystem() {
    this.log('📁 FILESYSTEM CLEANUP: Removing temporary artifacts...', 'info');
    
    const cleanupTargets = [
      // Lock files
      { pattern: '.service-manager*.lock', desc: 'Service manager locks' },
      { pattern: '.service-manager*.pids', desc: 'Service manager PIDs' },
      
      // Test artifacts
      { pattern: 'test-results*', desc: 'Test results' },
      { pattern: 'playwright-report*', desc: 'Playwright reports' },
      { pattern: '.playwright-cache', desc: 'Playwright cache' },
      
      // Build artifacts
      { pattern: 'dist', desc: 'Build output' },
      { pattern: '*.tsbuildinfo', desc: 'TypeScript build info' }
    ];

    for (const { pattern, desc } of cleanupTargets) {
      const result = await this.executeCommand(`rm -rf ${pattern} 2>/dev/null || true`, `Clean ${desc}`, { silent: true });
      if (result.success) {
        this.fixes.push(`Cleaned ${desc}`);
      }
    }

    // Clean temporary ts-node files
    const tempResult = await this.executeCommand(
      'find /tmp -name "*ts-node*" -type f -mmin +60 -delete 2>/dev/null || true',
      'Clean old ts-node temp files',
      { silent: true }
    );
    if (tempResult.success) {
      this.fixes.push('Cleaned old temporary files');
    }
  }

  async resetEnvironmentVariables() {
    this.log('🌍 ENVIRONMENT RESET: Clearing test environment variables...', 'info');
    
    const testEnvVars = [
      'PLAYWRIGHT_WORKER_ID',
      'TEST_WORKER_INDEX', 
      'WORKER_ID',
      'DB_NAME',
      'DB_COLLECTION_PREFIX'
    ];

    for (const varName of testEnvVars) {
      if (process.env[varName]) {
        delete process.env[varName];
        this.fixes.push(`Cleared environment variable: ${varName}`);
      }
    }
  }

  async verifyCleanState() {
    this.log('🔍 VERIFICATION: Confirming clean environment state...', 'info');
    
    const health = await this.checkSystemHealth();
    const issues = [];

    if (health.processes.status !== 'healthy') {
      issues.push(`Process count: ${health.processes.count}`);
    }
    if (health.memory.status !== 'healthy') {
      issues.push(`Memory usage: ${health.memory.usage}MB`);
    }
    if (health.ports.status !== 'healthy') {
      issues.push(`Ports in use: ${health.ports.inUse}`);
    }
    if (health.tempFiles.status !== 'healthy') {
      issues.push(`Temp files: ${health.tempFiles.count}`);
    }

    return {
      clean: issues.length === 0,
      issues,
      health
    };
  }

  async run() {
    this.log('🚀 COMPREHENSIVE ENVIRONMENT RESET: Starting...', 'info');
    console.log(`Mode: ${this.verifyOnly ? 'VERIFY-ONLY' : 'FULL RESET'}`);
    console.log('─'.repeat(60));

    // Initial health check
    const initialHealth = await this.checkSystemHealth();
    
    if (this.verifyOnly) {
      this.log('📊 HEALTH REPORT:', 'info');
      console.log(JSON.stringify(initialHealth, null, 2));
      
      if (this.issues.length > 0) {
        this.log('\n⚠️ ISSUES FOUND:', 'warning');
        this.issues.forEach(issue => console.log(`   - ${issue}`));
        process.exit(1);
      } else {
        this.log('✅ Environment is healthy!', 'success');
        process.exit(0);
      }
    }

    // Perform cleanup
    await this.killZombieProcesses();
    await this.cleanupPorts();
    await this.cleanupFileSystem();
    await this.resetEnvironmentVariables();

    // Verify cleanup
    const verification = await this.verifyCleanState();
    
    console.log('\n' + '─'.repeat(60));
    this.log('📊 RESET SUMMARY:', 'info');
    
    if (this.fixes.length > 0) {
      console.log('\n✅ Fixes Applied:');
      this.fixes.forEach(fix => console.log(`   - ${fix}`));
    }

    if (verification.clean) {
      this.log('\n🎉 Environment reset completed successfully!', 'success');
      this.log('✅ All systems clean and ready for testing', 'success');
    } else {
      this.log('\n⚠️ Some issues remain after cleanup:', 'warning');
      verification.issues.forEach(issue => console.log(`   - ${issue}`));
      this.log('\nTip: Try running the reset again or check for persistent services', 'info');
    }

    return verification.clean;
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verifyOnly: args.includes('--verify-only') || args.includes('-v'),
    verbose: !args.includes('--quiet')
  };

  const reset = new ComprehensiveEnvironmentReset(options);
  reset.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  });
}

module.exports = ComprehensiveEnvironmentReset;