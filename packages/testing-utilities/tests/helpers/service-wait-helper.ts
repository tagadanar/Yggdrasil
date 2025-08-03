// packages/testing-utilities/tests/helpers/service-wait-helper.ts
// Helper for tests to wait for services during recovery

import { LoggerFactory } from '@yggdrasil/shared-utilities';

const logger = LoggerFactory.createLogger('service-wait-helper');

// Import service coordinator
const { getInstance: getCoordinator } = require('../../service-coordinator');

/**
 * ServiceWaitHelper - Provides utilities for tests to wait for services
 */
export class ServiceWaitHelper {
  private static coordinator = getCoordinator();
  
  /**
   * Wait for services to be ready before proceeding with test
   * @param testName - Name of the test waiting
   * @param timeout - Maximum time to wait in milliseconds
   * @returns true if services are ready, false if timeout
   */
  static async waitForServices(testName: string, timeout: number = 15000): Promise<boolean> {
    const startTime = Date.now();
    logger.info(`⏳ ${testName}: Waiting for services to be ready...`);
    
    // Check coordinator state
    const state = this.coordinator.getState();
    
    // If services are already healthy and no restart in progress, return immediately
    if (state.servicesHealthy && !state.restartInProgress && !state.testsPaused) {
      logger.info(`✅ ${testName}: Services already ready`);
      return true;
    }
    
    // If restart is in progress, log it
    if (state.restartInProgress) {
      logger.info(`🔄 ${testName}: Service restart in progress, waiting...`);
    }
    
    // Wait for services using coordinator
    const ready = await this.coordinator.waitForServices(timeout);
    
    const elapsed = Date.now() - startTime;
    if (ready) {
      logger.info(`✅ ${testName}: Services ready after ${elapsed}ms`);
    } else {
      logger.error(`❌ ${testName}: Services not ready after ${elapsed}ms timeout`);
    }
    
    return ready;
  }
  
  /**
   * Check if services are currently healthy (no waiting)
   * @returns true if services are healthy and ready for tests
   */
  static isReady(): boolean {
    return this.coordinator.canRunTests();
  }
  
  /**
   * Get current service state
   * @returns Current coordinator state
   */
  static getState(): any {
    return this.coordinator.getState();
  }
  
  /**
   * Wait with exponential backoff for services
   * @param testName - Name of the test waiting
   * @param maxRetries - Maximum number of retries
   * @param initialDelay - Initial delay in milliseconds
   * @returns true if services become ready, false if all retries exhausted
   */
  static async waitWithBackoff(
    testName: string, 
    maxRetries: number = 5, 
    initialDelay: number = 2000
  ): Promise<boolean> {
    let delay = initialDelay;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`🔄 ${testName}: Attempt ${attempt}/${maxRetries} to verify services...`);
      
      if (this.isReady()) {
        logger.info(`✅ ${testName}: Services ready on attempt ${attempt}`);
        return true;
      }
      
      const state = this.getState();
      if (state.restartInProgress) {
        logger.info(`⏳ ${testName}: Restart in progress, waiting ${delay}ms before retry...`);
      } else if (!state.servicesHealthy) {
        logger.warn(`⚠️ ${testName}: Services unhealthy: ${state.unhealthyServices.join(', ')}`);
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Exponential backoff with cap
      delay = Math.min(delay * 2, 30000); // Cap at 30 seconds
    }
    
    logger.error(`❌ ${testName}: Services not ready after ${maxRetries} retries`);
    return false;
  }
  
  /**
   * Helper to use in beforeEach hooks
   * @param testInfo - Playwright TestInfo object
   * @returns true if test should proceed, false if it should be skipped
   */
  static async beforeTest(testInfo: any): Promise<boolean> {
    const testName = testInfo.title;
    
    // First, quick check if services are ready
    if (this.isReady()) {
      return true;
    }
    
    // If not ready, wait for services
    logger.warn(`⚠️ ${testName}: Services not immediately ready, waiting...`);
    const ready = await this.waitForServices(testName, 45000);
    
    if (!ready) {
      logger.error(`❌ ${testName}: Skipping test - services not available`);
      testInfo.skip();
      return false;
    }
    
    return true;
  }
}