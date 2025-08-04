// Suite Browser Setup - Comprehensive setup for individual suite runs
// Replicates critical parts of enhanced-global-setup.ts for suite isolation

import { FullConfig } from '@playwright/test';

async function suiteBrowserSetup(config: FullConfig) {
  console.log('🚀 Suite Browser Setup: Starting comprehensive environment setup...');
  
  try {
    // 1. Verify services are responsive first
    await waitForServices();
    
    // 2. Initialize service coordinator (critical for tests)
    await initializeServiceCoordinator();
    
    // 3. Initialize complete test environment
    await initializeTestEnvironment();
    
    // 4. Verify test environment is ready
    await verifyTestEnvironment();
    
    console.log('✅ Suite Browser Setup: Complete environment ready for testing');
    
  } catch (error) {
    console.error('❌ Suite Browser Setup failed:', error);
    throw error;
  }
}

async function waitForServices(): Promise<void> {
  const maxRetries = 30;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch('http://localhost:3001/health', { 
        method: 'GET'
      });
      
      if (response.ok) {
        console.log('✅ Browser setup: Services responsive');
        return;
      }
    } catch (error) {
      // Services not ready yet
    }
    
    retries++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error('Services not ready after 15 seconds');
}

async function initializeServiceCoordinator(): Promise<void> {
  try {
    // Import dynamically to avoid module loading issues
    const { getInstance: getCoordinator } = require('./service-coordinator.js');
    const coordinator = getCoordinator();
    coordinator.reset();
    console.log('✅ Browser setup: Service coordinator initialized');
  } catch (error) {
    console.warn('⚠️ Browser setup: Service coordinator initialization failed:', error);
  }
}

async function initializeTestEnvironment(): Promise<void> {
  try {
    // Import dynamically to avoid module loading issues
    const { TestInitializer } = require('@yggdrasil/shared-utilities/testing');
    
    // Reset and initialize test environment
    TestInitializer.reset();
    await TestInitializer.quickSetup(true);
    
    console.log('✅ Browser setup: Test environment initialized');
  } catch (error) {
    console.error('❌ Browser setup: Test environment initialization failed:', error);
    throw error;
  }
}

async function verifyTestEnvironment(): Promise<void> {
  try {
    // Verify auth service is working
    const authResponse = await fetch('http://localhost:3001/health');
    if (!authResponse.ok) {
      throw new Error('Auth service not healthy');
    }
    
    // Verify frontend is accessible  
    const frontendResponse = await fetch('http://localhost:3000/');
    if (!frontendResponse.ok) {
      throw new Error('Frontend not accessible');
    }
    
    console.log('✅ Browser setup: Test environment verified');
  } catch (error) {
    console.error('❌ Browser setup: Test environment verification failed:', error);
    throw error;
  }
}

export default suiteBrowserSetup;