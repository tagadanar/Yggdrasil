#!/usr/bin/env node
// Test environment health check and resource monitoring

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestEnvironmentHealthCheck {
  constructor() {
    this.checks = [
      { name: 'Process Count', check: this.checkProcessCount.bind(this) },
      { name: 'File Descriptors', check: this.checkFileDescriptors.bind(this) },
      { name: 'Memory Usage', check: this.checkMemoryUsage.bind(this) },
      { name: 'Port Availability', check: this.checkPortAvailability.bind(this) },
      { name: 'Temporary Files', check: this.checkTemporaryFiles.bind(this) },
      { name: 'Lock Files', check: this.checkLockFiles.bind(this) },
      { name: 'Database Connection', check: this.checkDatabaseConnection.bind(this) },
      { name: 'Demo User Access', check: this.checkDemoUserAccess.bind(this) }
    ];
    
    this.thresholds = {
      maxProcesses: 15,
      maxFileDescriptors: 400000,
      maxMemoryMB: 4096,
      maxTempFiles: 50,
      ports: [3000, 3001, 3002, 3003, 3004, 3005, 3006]
    };
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve({ error, stdout: '', stderr });
        } else {
          resolve({ stdout, stderr, error: null });
        }
      });
    });
  }

  async checkProcessCount() {
    const { stdout, error } = await this.executeCommand('ps aux | grep -E "(ts-node-dev|node.*src/index.ts)" | grep -v grep | wc -l');
    
    if (error) {
      return { status: 'error', message: 'Could not count processes', details: error.message };
    }
    
    const count = parseInt(stdout.trim());
    const status = count > this.thresholds.maxProcesses ? 'warning' : 'ok';
    
    return {
      status,
      message: `${count} Node processes running`,
      details: count > this.thresholds.maxProcesses ? `Exceeds threshold of ${this.thresholds.maxProcesses}` : null,
      value: count
    };
  }

  async checkFileDescriptors() {
    const { stdout, error } = await this.executeCommand('lsof | wc -l');
    
    if (error) {
      return { status: 'error', message: 'Could not count file descriptors', details: error.message };
    }
    
    const count = parseInt(stdout.trim());
    const status = count > this.thresholds.maxFileDescriptors ? 'warning' : 'ok';
    
    return {
      status,
      message: `${count} file descriptors open`,
      details: status === 'warning' ? `Exceeds threshold of ${this.thresholds.maxFileDescriptors}` : null,
      value: count
    };
  }

  async checkMemoryUsage() {
    const { stdout, error } = await this.executeCommand('free -m | grep "Mem:" | awk \'{print $3}\'');
    
    if (error) {
      return { status: 'error', message: 'Could not check memory usage', details: error.message };
    }
    
    const usedMB = parseInt(stdout.trim());
    const status = usedMB > this.thresholds.maxMemoryMB ? 'warning' : 'ok';
    
    return {
      status,
      message: `${usedMB}MB memory in use`,
      details: status === 'warning' ? `Exceeds threshold of ${this.thresholds.maxMemoryMB}MB` : null,
      value: usedMB
    };
  }

  async checkPortAvailability() {
    const results = [];
    
    for (const port of this.thresholds.ports) {
      const { stdout, error } = await this.executeCommand(`netstat -tuln | grep :${port}`);
      const inUse = stdout.trim().length > 0;
      results.push({ port, inUse });
    }
    
    const portsInUse = results.filter(r => r.inUse);
    const status = portsInUse.length > 0 ? 'warning' : 'ok';
    
    return {
      status,
      message: `${portsInUse.length}/${this.thresholds.ports.length} test ports in use`,
      details: portsInUse.length > 0 ? `Ports in use: ${portsInUse.map(p => p.port).join(', ')}` : null,
      value: portsInUse.length
    };
  }

  async checkTemporaryFiles() {
    const { stdout, error } = await this.executeCommand('find /tmp -name "*ts-node*" -type f | wc -l');
    
    if (error) {
      return { status: 'error', message: 'Could not count temp files', details: error.message };
    }
    
    const count = parseInt(stdout.trim());
    const status = count > this.thresholds.maxTempFiles ? 'warning' : 'ok';
    
    return {
      status,
      message: `${count} temporary ts-node files`,
      details: status === 'warning' ? `Exceeds threshold of ${this.thresholds.maxTempFiles}` : null,
      value: count
    };
  }

  async checkLockFiles() {
    const lockDir = path.join(__dirname, '..');
    const lockFiles = [];
    
    try {
      const files = fs.readdirSync(lockDir);
      for (const file of files) {
        if (file.startsWith('.service-manager') && (file.endsWith('.lock') || file.endsWith('.pids'))) {
          lockFiles.push(file);
        }
      }
    } catch (error) {
      return { status: 'error', message: 'Could not check lock files', details: error.message };
    }
    
    const status = lockFiles.length > 0 ? 'warning' : 'ok';
    
    return {
      status,
      message: `${lockFiles.length} service lock files`,
      details: lockFiles.length > 0 ? `Lock files: ${lockFiles.join(', ')}` : null,
      value: lockFiles.length
    };
  }

  async checkDatabaseConnection() {
    try {
      // Use mongoose connection test instead of external mongosh command
      const mongoose = require('mongoose');
      
      // Use the same connection string format as the application
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27018';
      
      // Create a test connection with short timeout
      const testConnection = mongoose.createConnection(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        maxPoolSize: 1,
        bufferCommands: false
      });
      
      // Wait for connection to be ready
      await new Promise((resolve, reject) => {
        testConnection.once('open', resolve);
        testConnection.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      // Test database access with a simple listCollections operation
      await testConnection.db.listCollections().toArray();
      
      // Clean up connection
      await testConnection.close();
      
      return {
        status: 'ok',
        message: 'Database connection healthy',
        details: `Connected to ${mongoUri}`
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: 'Database connection failed', 
        details: `${error.message}` 
      };
    }
  }

  async checkDemoUserAccess() {
    try {
      const mongoose = require('mongoose');
      
      // Use the same connection string format as the application
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27018';
      
      // Create a test connection for demo user verification
      const testConnection = mongoose.createConnection(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        maxPoolSize: 1,
        bufferCommands: false
      });
      
      // Wait for connection to be ready
      await new Promise((resolve, reject) => {
        testConnection.once('open', resolve);
        testConnection.once('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      const demoEmails = ['admin@yggdrasil.edu', 'teacher@yggdrasil.edu', 'staff@yggdrasil.edu', 'student@yggdrasil.edu'];
      let foundUsers = 0;
      let totalChecked = 0;
      const issues = [];
      
      // Check single worker database
      const workerId = 0;
      const dbName = `yggdrasil_test_w${workerId}`;
      const collectionName = `w${workerId}_users`;
      
      try {
        const db = testConnection.client.db(dbName);
        const collection = db.collection(collectionName);
        
        // Check if collection exists
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length > 0) {
          // Check for demo users
          for (const email of demoEmails) {
            totalChecked++;
            const user = await collection.findOne({ email: email });
            if (user) {
              foundUsers++;
              
              // Verify user has proper password hash
              if (!user.password || typeof user.password !== 'string' || user.password.length < 50) {
                issues.push(`${email} in Worker ${workerId} has invalid password hash`);
              }
              
              // Verify user has proper role
              if (!user.role || !['admin', 'teacher', 'staff', 'student'].includes(user.role)) {
                issues.push(`${email} in Worker ${workerId} has invalid role: ${user.role}`);
              }
            }
          }
        }
      } catch (error) {
        issues.push(`Failed to check Worker ${workerId}: ${error.message}`);
      }
      
      // Clean up connection
      await testConnection.close();
      
      // Determine status
      if (issues.length > 0) {
        return {
          status: 'warning',
          message: `Demo users have issues: ${issues.length} problems found`,
          details: issues.slice(0, 3).join('; ') + (issues.length > 3 ? '...' : '')
        };
      } else if (foundUsers === 0) {
        return {
          status: 'ok',
          message: 'No demo users found (will be created during test)',
          details: `Checked ${totalChecked} possible demo user entries`
        };
      } else {
        return {
          status: 'ok',
          message: `Demo users accessible: ${foundUsers} users found`,
          details: `Verified ${foundUsers}/${totalChecked} demo users with proper authentication data`
        };
      }
      
    } catch (error) {
      return { 
        status: 'error', 
        message: 'Demo user access check failed', 
        details: `${error.message}` 
      };
    }
  }

  async runAllChecks() {
    console.log('🏥 Test Environment Health Check');
    console.log('================================\n');
    
    const results = [];
    
    for (const { name, check } of this.checks) {
      try {
        const result = await check();
        results.push({ name, ...result });
        
        const icon = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        console.log(`${icon} ${name}: ${result.message}`);
        
        if (result.details) {
          console.log(`   📋 ${result.details}`);
        }
      } catch (error) {
        results.push({ name, status: 'error', message: 'Check failed', details: error.message });
        console.log(`❌ ${name}: Check failed - ${error.message}`);
      }
      
      console.log('');
    }
    
    // Summary
    const counts = {
      ok: results.filter(r => r.status === 'ok').length,
      warning: results.filter(r => r.status === 'warning').length,
      error: results.filter(r => r.status === 'error').length
    };
    
    console.log('📊 Summary:');
    console.log(`   ✅ ${counts.ok} checks passed`);
    console.log(`   ⚠️  ${counts.warning} warnings`);
    console.log(`   ❌ ${counts.error} errors`);
    
    const overallStatus = counts.error > 0 ? 'error' : counts.warning > 0 ? 'warning' : 'ok';
    
    if (overallStatus === 'error') {
      console.log('\n🚨 Environment has critical issues - tests may fail');
      process.exit(1);
    } else if (overallStatus === 'warning') {
      console.log('\n⚠️  Environment has warnings - but tests can proceed');
      process.exit(0); // Allow tests to proceed with warnings
    } else {
      console.log('\n🎉 Environment is healthy for testing');
      process.exit(0);
    }
  }

  async autoFix() {
    console.log('🔧 Attempting automatic fixes...\n');
    
    const cleanupScript = path.join(__dirname, 'cleanup-orphaned-processes.sh');
    const { stdout, error } = await this.executeCommand(cleanupScript);
    
    if (error) {
      console.log('❌ Auto-fix failed:', error.message);
    } else {
      console.log('✅ Auto-fix completed');
      console.log(stdout);
    }
  }
}

// CLI interface
const healthCheck = new TestEnvironmentHealthCheck();

const command = process.argv[2];
if (command === '--fix') {
  healthCheck.autoFix().then(() => {
    return healthCheck.runAllChecks();
  });
} else {
  healthCheck.runAllChecks();
}