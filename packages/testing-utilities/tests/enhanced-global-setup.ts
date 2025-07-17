// packages/testing-utilities/tests/enhanced-global-setup.ts
// Enhanced global setup for ultra-robust 4-worker parallelization

import { FullConfig } from '@playwright/test';
import { createEnhancedTestIsolation } from './helpers/enhanced-test-isolation';
import { connectDatabase } from '@yggdrasil/database-schemas';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting enhanced global setup for 4-worker parallelization...');
  
  const workerCount = config.workers || 4;
  console.log(`🔧 Initializing ${workerCount} workers with complete isolation...`);
  
  try {
    // Initialize isolation for all workers in parallel
    const initPromises = [];
    
    for (let workerId = 0; workerId < workerCount; workerId++) {
      console.log(`🏗️ Setting up worker ${workerId}...`);
      
      const setupWorker = async () => {
        try {
          const isolationManager = createEnhancedTestIsolation(workerId);
          await isolationManager.initialize();
          console.log(`✅ Worker ${workerId} initialized successfully`);
        } catch (error) {
          console.error(`❌ Worker ${workerId} initialization failed:`, error);
          throw error;
        }
      };
      
      initPromises.push(setupWorker());
    }
    
    // Wait for all workers to initialize
    await Promise.all(initPromises);
    
    console.log('🎯 Verifying system health across all workers...');
    
    // Verify all workers are healthy
    for (let workerId = 0; workerId < workerCount; workerId++) {
      const isolationManager = createEnhancedTestIsolation(workerId);
      const stats = isolationManager.getSystemStatistics();
      
      if (!stats.isInitialized) {
        throw new Error(`Worker ${workerId} is not properly initialized`);
      }
      
      console.log(`📊 Worker ${workerId} stats:`, {
        isInitialized: stats.isInitialized,
        poolCount: stats.poolStatistics.pools.length,
        serviceCount: stats.serviceStatuses.length
      });
    }
    
    console.log('✅ Enhanced global setup completed successfully!');
    console.log('🎉 All workers ready for ultra-robust parallel testing!');
    
  } catch (error) {
    console.error('❌ Enhanced global setup failed:', error);
    
    // Cleanup on failure
    console.log('🧹 Cleaning up failed setup...');
    for (let workerId = 0; workerId < workerCount; workerId++) {
      try {
        const isolationManager = createEnhancedTestIsolation(workerId);
        await isolationManager.shutdown();
      } catch (cleanupError) {
        console.error(`Failed to cleanup worker ${workerId}:`, cleanupError);
      }
    }
    
    throw error;
  }
}

export default globalSetup;