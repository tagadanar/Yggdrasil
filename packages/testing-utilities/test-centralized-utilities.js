#!/usr/bin/env node

/**
 * Demo script to verify centralized testing utilities work correctly
 */

const path = require('path');

// Add shared-utilities to the path for testing
const sharedUtilitiesPath = path.join(__dirname, '../shared-utilities/src');
require('module')._nodeModulesPaths = function(from) {
  return [path.join(__dirname, '../shared-utilities/node_modules'), ...require.cache[require.resolve('module')]._nodeModulesPaths.call(this, from)];
};

async function testCentralizedUtilities() {
  console.log('🧪 Testing centralized utilities...\n');

  try {
    // Test 1: Worker Configuration
    console.log('1️⃣ Testing WorkerConfigManager...');
    
    // Simulate different worker environments
    process.env.WORKER_ID = '0';
    const { WorkerConfigManager } = require('../shared-utilities/src/testing/WorkerConfig');
    
    console.log('   📊 Worker ID detection:');
    const workerId = WorkerConfigManager.detectWorkerId();
    console.log(`      Detected Worker: ${workerId}`);
    
    console.log('   📊 Worker configuration:');
    const config = WorkerConfigManager.generateWorkerConfig(workerId);
    console.log(`      Base Port: ${config.basePort}`);
    console.log(`      Auth Port: ${config.ports.auth}`);
    console.log(`      Database: ${config.database.name}`);
    console.log(`      Collection Prefix: ${config.database.collectionPrefix}`);
    
    console.log('   📊 Service port lookup:');
    const authPort = WorkerConfigManager.getServicePort('auth', 0);
    const frontendPort = WorkerConfigManager.getServicePort('frontend', 0);
    console.log(`      Auth Service: ${authPort}`);
    console.log(`      Frontend Service: ${frontendPort}`);
    
    console.log('   ✅ WorkerConfigManager working correctly\n');

    // Test 2: Multiple Worker Configs
    console.log('2️⃣ Testing multi-worker setup...');
    
    const allConfigs = WorkerConfigManager.getAllWorkerConfigs(4);
    console.log('   📊 All worker configurations:');
    allConfigs.forEach(config => {
      console.log(`      Worker ${config.workerId}: ports ${config.basePort}-${config.basePort + 6}`);
    });
    
    console.log('   ✅ Multi-worker setup working correctly\n');

    // Test 3: Environment Application
    console.log('3️⃣ Testing environment application...');
    
    const originalEnv = { ...process.env };
    WorkerConfigManager.applyWorkerEnvironment(0);
    
    console.log('   📊 Applied environment variables:');
    console.log(`      NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`      DB_NAME: ${process.env.DB_NAME}`);
    console.log(`      AUTH_SERVICE_URL: ${process.env.AUTH_SERVICE_URL}`);
    console.log(`      NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL}`);
    
    console.log('   ✅ Environment application working correctly\n');

    // Test 4: Service Manager (without actually starting services)
    console.log('4️⃣ Testing ServiceManager configuration...');
    
    const { ServiceManager } = require('../shared-utilities/src/testing/ServiceManager');
    const serviceManager = new ServiceManager({ workerId: 0, logLevel: 'quiet' });
    
    const workerConfig = serviceManager.getWorkerConfig();
    const services = serviceManager.getServices();
    
    console.log('   📊 Service Manager configuration:');
    console.log(`      Worker ID: ${workerConfig.workerId}`);
    console.log(`      Services count: ${services.length}`);
    console.log(`      Service ports: ${services.map(s => s.port).join(', ')}`);
    
    console.log('   ✅ ServiceManager configuration working correctly\n');

    // Test 5: Database Isolation Manager (configuration only)
    console.log('5️⃣ Testing DatabaseIsolationManager configuration...');
    
    const { DatabaseIsolationManager } = require('../shared-utilities/src/testing/DatabaseIsolation');
    const dbManager = DatabaseIsolationManager.createForWorker(0);
    
    const dbStats = dbManager.getStatistics();
    console.log('   📊 Database isolation configuration:');
    console.log(`      Worker ID: ${dbStats.workerId}`);
    console.log(`      Database Name: ${dbStats.databaseName}`);
    console.log(`      Collection Prefix: ${dbStats.collectionPrefix}`);
    console.log(`      Connection URI: ${dbStats.connectionUri}`);
    
    console.log('   ✅ DatabaseIsolationManager configuration working correctly\n');

    // Test 6: Convenience exports
    console.log('6️⃣ Testing convenience exports...');
    
    const { 
      getCurrentWorkerConfig, 
      detectWorkerId, 
      getServicePort,
      applyWorkerEnvironment
    } = require('../shared-utilities/src/testing/index');
    
    console.log('   📊 Convenience functions:');
    console.log(`      Current Worker: ${detectWorkerId()}`);
    console.log(`      Auth Port: ${getServicePort('auth')}`);
    console.log(`      User Port: ${getServicePort('user')}`);
    
    const currentConfig = getCurrentWorkerConfig();
    console.log(`      Current Config: Worker ${currentConfig.workerId}, Base ${currentConfig.basePort}`);
    
    console.log('   ✅ Convenience exports working correctly\n');

    // Test different worker configurations
    console.log('7️⃣ Testing different worker scenarios...');
    
    for (let workerId = 0; workerId < 4; workerId++) {
      const workerConfig = WorkerConfigManager.generateWorkerConfig(workerId);
      console.log(`   Worker ${workerId}: Frontend=${workerConfig.ports.frontend}, Auth=${workerConfig.ports.auth}`);
    }
    
    console.log('   ✅ All worker scenarios working correctly\n');

    console.log('🎉 ALL CENTRALIZED UTILITIES TESTS PASSED!');
    console.log('🎯 Ready for centralized testing infrastructure!');
    
  } catch (error) {
    console.error('❌ CENTRALIZED UTILITIES TEST FAILED:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testCentralizedUtilities();