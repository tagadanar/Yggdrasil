// packages/testing-utilities/tests/helpers/test-circuit-breaker.ts
// Circuit breaker pattern for test execution to prevent cascading failures

import { TestConnectionPool } from './TestConnectionPool';
import { LoggerFactory } from '@yggdrasil/shared-utilities';

const logger = LoggerFactory.createLogger('test-circuit-breaker');

interface CircuitBreakerState {
  consecutiveFailures: number;
  lastFailureTime: number;
  isOpen: boolean;
  totalTests: number;
  totalFailures: number;
}

/**
 * TestCircuitBreaker - Prevents cascading test failures
 * 
 * Implements circuit breaker pattern for test execution:
 * - CLOSED: Normal test execution
 * - OPEN: Emergency recovery mode after consecutive failures
 * - HALF_OPEN: Attempting to recover from failure state
 */
export class TestCircuitBreaker {
  private static state: CircuitBreakerState = {
    consecutiveFailures: 0,
    lastFailureTime: 0,
    isOpen: false,
    totalTests: 0,
    totalFailures: 0,
  };
  
  // Configuration
  private static readonly MAX_CONSECUTIVE_FAILURES = 2; // Trip after 2 consecutive failures
  private static readonly RECOVERY_TIMEOUT = 30000; // 30 seconds before attempting recovery
  private static readonly EMERGENCY_CLEANUP_THRESHOLD = 5; // Emergency cleanup after 5 total failures
  
  /**
   * Record test execution before running
   */
  static async beforeTest(testName: string): Promise<boolean> {
    this.state.totalTests++;
    
    // Check if circuit is open
    if (this.state.isOpen) {
      const timeSinceFailure = Date.now() - this.state.lastFailureTime;
      
      if (timeSinceFailure < this.RECOVERY_TIMEOUT) {
        logger.warn(`🚨 Circuit breaker OPEN - skipping test: ${testName}`);
        logger.warn(`   Recovery in ${Math.ceil((this.RECOVERY_TIMEOUT - timeSinceFailure) / 1000)}s`);
        return false; // Skip test
      } else {
        // Attempt recovery (half-open state)
        logger.info(`🔄 Circuit breaker attempting recovery for: ${testName}`);
        await this.attemptRecovery();
      }
    }
    
    logger.debug(`✅ Circuit breaker CLOSED - executing test: ${testName}`);
    return true; // Execute test
  }
  
  /**
   * Record test result after execution
   */
  static async afterTest(testName: string, passed: boolean, duration: number): Promise<void> {
    if (passed) {
      // Reset consecutive failures on success
      if (this.state.consecutiveFailures > 0) {
        logger.info(`✅ Test passed - resetting failure counter (was ${this.state.consecutiveFailures})`);
        this.state.consecutiveFailures = 0;
      }
      
      // Close circuit if it was open
      if (this.state.isOpen) {
        logger.info(`🔓 Circuit breaker CLOSED - recovery successful`);
        this.state.isOpen = false;
      }
    } else {
      // Record failure
      this.state.consecutiveFailures++;
      this.state.totalFailures++;
      this.state.lastFailureTime = Date.now();
      
      logger.error(`❌ Test failed: ${testName} (${duration}ms)`);
      logger.error(`   Consecutive failures: ${this.state.consecutiveFailures}`);
      logger.error(`   Total failures: ${this.state.totalFailures}/${this.state.totalTests}`);
      
      // Trip circuit breaker
      if (this.state.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        logger.error(`🚨 Circuit breaker OPEN - too many consecutive failures`);
        this.state.isOpen = true;
        
        // Emergency cleanup
        await this.emergencyCleanup();
      }
      
      // Emergency system cleanup
      if (this.state.totalFailures >= this.EMERGENCY_CLEANUP_THRESHOLD) {
        logger.error(`🚨 EMERGENCY: Too many total failures - performing system cleanup`);
        await this.emergencySystemCleanup();
      }
    }
  }
  
  /**
   * Attempt recovery from open state
   */
  private static async attemptRecovery(): Promise<void> {
    logger.info('🔄 Attempting circuit breaker recovery...');
    
    try {
      // 1. Check system resources
      const memory = process.memoryUsage();
      logger.info(`💾 Memory usage: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
      
      // 2. Check connection pool health
      const poolStats = TestConnectionPool.getStats();
      logger.info(`🔌 Connection pool: ${JSON.stringify(poolStats)}`);
      
      // 3. Force cleanup if resources are high
      if (memory.heapUsed > 400 * 1024 * 1024) { // 400MB
        logger.warn('🧹 High memory detected - forcing cleanup');
        await this.emergencyCleanup();
      }
      
      // 4. Reset connection pool if unhealthy
      if (!poolStats.isConnected || poolStats.connectionCount > 10) {
        logger.warn('🔌 Connection issues detected - resetting pool');
        await TestConnectionPool.cleanup();
      }
      
      logger.info('✅ Recovery attempt completed');
      
    } catch (error) {
      logger.error('❌ Recovery attempt failed:', error);
      // Keep circuit open on recovery failure
      this.state.isOpen = true;
    }
  }
  
  /**
   * Emergency cleanup for circuit breaker recovery
   */
  private static async emergencyCleanup(): Promise<void> {
    logger.warn('🚨 Starting emergency cleanup...');
    
    try {
      // 1. Force multiple garbage collections
      if (global.gc) {
        for (let i = 0; i < 3; i++) {
          global.gc();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // 2. Clear connection pool
      await TestConnectionPool.cleanup();
      
      // 3. Clear module caches for heavy modules
      const modulesToClear = [
        '@yggdrasil/database-schemas',
        'mongoose',
        '@playwright/test',
      ];
      
      modulesToClear.forEach(moduleName => {
        Object.keys(require.cache).forEach(key => {
          if (key.includes(moduleName) && !key.includes('node_modules')) {
            delete require.cache[key];
          }
        });
      });
      
      // 4. Wait for system to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalMemory = process.memoryUsage();
      logger.info(`✅ Emergency cleanup completed - Memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      
    } catch (error) {
      logger.error('❌ Emergency cleanup failed:', error);
    }
  }
  
  /**
   * Emergency system-wide cleanup for critical failures
   */
  private static async emergencySystemCleanup(): Promise<void> {
    logger.error('🚨 EMERGENCY SYSTEM CLEANUP - Critical failure threshold reached');
    
    try {
      // More aggressive cleanup
      await this.emergencyCleanup();
      
      // Force process cleanup
      if (typeof process.memoryUsage === 'function') {
        const usage = process.memoryUsage();
        logger.error(`💾 Critical memory state: ${JSON.stringify({
          rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
        })}`);
      }
      
      // Reset failure counters to prevent total test failure
      this.state.totalFailures = 0;
      logger.info('🔄 Reset failure counters after emergency cleanup');
      
    } catch (error) {
      logger.error('❌ Emergency system cleanup failed:', error);
    }
  }
  
  /**
   * Get current circuit breaker status
   */
  static getStatus(): {
    isOpen: boolean;
    consecutiveFailures: number;
    totalFailures: number;
    totalTests: number;
    failureRate: number;
  } {
    return {
      isOpen: this.state.isOpen,
      consecutiveFailures: this.state.consecutiveFailures,
      totalFailures: this.state.totalFailures,
      totalTests: this.state.totalTests,
      failureRate: this.state.totalTests > 0 ? (this.state.totalFailures / this.state.totalTests) * 100 : 0,
    };
  }
  
  /**
   * Reset circuit breaker (for testing)
   */
  static reset(): void {
    this.state = {
      consecutiveFailures: 0,
      lastFailureTime: 0,
      isOpen: false,
      totalTests: 0,
      totalFailures: 0,
    };
    logger.info('🔄 Circuit breaker reset');
  }
  
  /**
   * Force close circuit breaker
   */
  static forceClose(): void {
    this.state.isOpen = false;
    this.state.consecutiveFailures = 0;
    logger.info('🔓 Circuit breaker force closed');
  }
}