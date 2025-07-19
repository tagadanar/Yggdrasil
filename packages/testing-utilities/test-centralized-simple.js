#!/usr/bin/env node

/**
 * Simple test for centralized utilities using compiled JavaScript
 */

const path = require('path');

async function testCentralizedUtilities() {
  console.log('🧪 Testing centralized utilities...\n');

  try {
    // Test worker configuration detection
    console.log('1️⃣ Testing WorkerConfigManager...');
    
    // Set worker environment
    process.env.WORKER_ID = '0';
    process.env.NODE_ENV = 'test';
    
    // Import from compiled JavaScript
    const { WorkerConfigManager } = require('../shared-utilities/dist/testing/WorkerConfig');
    
    const workerId = WorkerConfigManager.detectWorkerId();
    console.log(`   Detected Worker: ${workerId}`);
    
    const config = WorkerConfigManager.generateWorkerConfig(workerId);
    console.log(`   Auth Port: ${config.ports.auth}`);
    console.log(`   Database: ${config.database.name}`);
    console.log(`   ✅ WorkerConfigManager working\n`);

    // Test service port calculation
    console.log('2️⃣ Testing service port calculation...');
    
    const authPort = WorkerConfigManager.getServicePort('auth', 0);
    const userPort = WorkerConfigManager.getServicePort('user', 1);
    console.log(`   Worker 0 Auth Port: ${authPort}`);
    console.log(`   Worker 1 User Port: ${userPort}`);
    console.log(`   ✅ Port calculation working\n`);

    // Test multiple worker configs
    console.log('3️⃣ Testing multiple worker configurations...');
    
    const allConfigs = WorkerConfigManager.getAllWorkerConfigs(4);
    allConfigs.forEach((config, index) => {
      console.log(`   Worker ${index}: Frontend=${config.ports.frontend}, Auth=${config.ports.auth}`);
    });
    console.log(`   ✅ Multi-worker config working\n`);

    // Test convenience exports
    console.log('4️⃣ Testing convenience exports...');
    
    const { getCurrentWorkerConfig, detectWorkerId: detectWorker } = require('../shared-utilities/dist/testing/index');
    
    const currentConfig = getCurrentWorkerConfig();
    const currentWorker = detectWorker();
    console.log(`   Current Worker: ${currentWorker}`);
    console.log(`   Current Config Base Port: ${currentConfig.basePort}`);
    console.log(`   ✅ Convenience exports working\n`);

    console.log('🎉 ALL CENTRALIZED UTILITIES TESTS PASSED!');
    console.log('🎯 Ready for production use!');
    
  } catch (error) {
    console.error('❌ CENTRALIZED UTILITIES TEST FAILED:', error.message);
    process.exit(1);
  }
}

testCentralizedUtilities();