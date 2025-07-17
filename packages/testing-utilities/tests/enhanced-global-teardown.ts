// packages/testing-utilities/tests/enhanced-global-teardown.ts
// Enhanced global teardown for ultra-robust 4-worker parallelization

import { FullConfig } from '@playwright/test';
import { createEnhancedTestIsolation } from './helpers/enhanced-test-isolation';
import { IdCollisionDetector } from './helpers/test-id-generator';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting enhanced global teardown...');
  
  const workerCount = config.workers || 4;
  console.log(`🔧 Cleaning up ${workerCount} workers...`);
  
  try {
    // Cleanup all workers in parallel
    const cleanupPromises = [];
    
    for (let workerId = 0; workerId < workerCount; workerId++) {
      console.log(`🧹 Cleaning up worker ${workerId}...`);
      
      const cleanupWorker = async () => {
        try {
          const isolationManager = createEnhancedTestIsolation(workerId);
          await isolationManager.shutdown();
          console.log(`✅ Worker ${workerId} cleaned up successfully`);
        } catch (error) {
          console.error(`❌ Worker ${workerId} cleanup failed:`, error);
          // Continue with other workers even if one fails
        }
      };
      
      cleanupPromises.push(cleanupWorker());
    }
    
    // Wait for all workers to cleanup
    await Promise.all(cleanupPromises);
    
    // Final cleanup of global resources
    console.log('🧹 Cleaning up global resources...');
    IdCollisionDetector.cleanupGlobalRegistry();
    
    console.log('📊 Final statistics:');
    console.log(`- Workers cleaned up: ${workerCount}`);
    console.log(`- Global ID registry size: ${IdCollisionDetector.getGlobalRegistrySize()}`);
    
    console.log('✅ Enhanced global teardown completed successfully!');
    console.log('🎉 All workers shut down cleanly!');
    
  } catch (error) {
    console.error('❌ Enhanced global teardown failed:', error);
    
    // Force cleanup of global resources even on failure
    try {
      IdCollisionDetector.cleanupGlobalRegistry();
    } catch (cleanupError) {
      console.error('Failed to cleanup global registry:', cleanupError);
    }
    
    // Don't throw error here - teardown should complete even if there are issues
    console.log('⚠️ Global teardown completed with errors');
  }
}

export default globalTeardown;