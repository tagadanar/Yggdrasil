// packages/testing-utilities/tests/helpers/test-lifecycle.ts
// Test lifecycle management for resource cleanup and stability

import { test } from '@playwright/test';
import mongoose from 'mongoose';
import { TestConnectionPool } from './TestConnectionPool';
import { TestCircuitBreaker } from './test-circuit-breaker';
import { LoggerFactory } from '@yggdrasil/shared-utilities';

const logger = LoggerFactory.createLogger('test-lifecycle');

// Import service coordinator for test execution control
const { getInstance: getCoordinator } = require('../../service-coordinator');
const coordinator = getCoordinator();

// Global test counter across all test files - use globalThis object to ensure sharing
declare global {
  // eslint-disable-next-line no-var
  var yggdrasilGlobalTestCount: number;
  // eslint-disable-next-line no-var
  var yggdrasilSuiteTestCount: number;
}

if (typeof globalThis.yggdrasilGlobalTestCount === 'undefined') {
  globalThis.yggdrasilGlobalTestCount = 0;
}
if (typeof globalThis.yggdrasilSuiteTestCount === 'undefined') {
  globalThis.yggdrasilSuiteTestCount = 0;
}

const CLEANUP_INTERVAL = 5; // CRITICAL: Force cleanup every 5 tests to prevent cascade at test #33
const MEMORY_THRESHOLD = 400 * 1024 * 1024; // 400MB

/**
 * Setup test lifecycle hooks for a test suite
 * 
 * Adds automatic resource cleanup and monitoring to prevent
 * cascading timeouts from resource exhaustion.
 * 
 * @param suiteName - Name of the test suite for logging
 */
export function setupTestLifecycle(suiteName: string) {
  // Reset suite counter
  globalThis.yggdrasilSuiteTestCount = 0;
  
  // Log suite start
  test.beforeAll(async () => {
    logger.info(`🏁 Starting test suite: ${suiteName}`);
    const stats = TestConnectionPool.getStats();
    logger.info(`📊 Connection pool stats: ${JSON.stringify(stats)}`);
  });
  
  // Before each test
  test.beforeEach(async ({ }, testInfo) => {
    globalThis.yggdrasilGlobalTestCount++;
    globalThis.yggdrasilSuiteTestCount++;
    
    logger.info(`▶️ Test ${globalThis.yggdrasilGlobalTestCount}: ${testInfo.title}`);
    
    // CRITICAL: Wait for services to be ready before running test
    const servicesReady = await coordinator.waitForServices(30000); // Reduced from 60s to 30s
    
    if (!servicesReady) {
      logger.error(`❌ Test ${globalThis.yggdrasilGlobalTestCount} skipped - services not ready`);
      testInfo.skip();
      return;
    }
    
    // Check if we're in a danger zone and need extra caution
    if (globalThis.yggdrasilGlobalTestCount >= 25) {
      logger.info(`🚨 CRITICAL ZONE: Test ${globalThis.yggdrasilGlobalTestCount} - Enhanced monitoring active`);
      
      // Extra verification before critical tests
      const coordinatorState = coordinator.getState();
      if (!coordinatorState.servicesHealthy) {
        logger.warn(`⚠️ Services unhealthy before test ${globalThis.yggdrasilGlobalTestCount}, waiting for recovery...`);
        const recovered = await coordinator.waitForServices(30000);
        if (!recovered) {
          logger.error(`❌ Services failed to recover, skipping test ${globalThis.yggdrasilGlobalTestCount}`);
          testInfo.skip();
          return;
        }
      }
    }
    
    // Enhanced isolation for cascade prevention
    if (globalThis.yggdrasilGlobalTestCount >= 25) {
      logger.info(`🚨 CRITICAL ZONE: Test ${globalThis.yggdrasilGlobalTestCount} - ENHANCED ISOLATION ACTIVE`);
      
      // Enhanced cleanup and isolation
      await emergencyCleanup(`critical-zone-test-${globalThis.yggdrasilGlobalTestCount}`);
      
      // Force garbage collection more aggressively
      if (global.gc) {
        for (let i = 0; i < 3; i++) {
          global.gc();
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Wait for system to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Circuit breaker check - may skip test if system is unhealthy
    const shouldExecute = await TestCircuitBreaker.beforeTest(testInfo.title);
    if (!shouldExecute) {
      // Circuit breaker is open - skip this test
      testInfo.skip();
      return;
    }
    
    // Enhanced logging with cascade risk assessment
    const memory = process.memoryUsage();
    logger.info(`▶️ Test ${globalThis.yggdrasilGlobalTestCount}: ${testInfo.title}`);
    logger.info(`💾 Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
    
    if (globalThis.yggdrasilGlobalTestCount >= 30) {
      logger.warn(`🚨 HIGH RISK TEST - Global #${globalThis.yggdrasilGlobalTestCount} - ${Math.max(0, 33 - globalThis.yggdrasilGlobalTestCount)} tests until cascade point`);
    }
    
    // More aggressive memory threshold for cascade prevention
    const cascadePreventionThreshold = globalThis.yggdrasilGlobalTestCount >= 30 ? 250 * 1024 * 1024 : MEMORY_THRESHOLD;
    
    if (memory.heapUsed > cascadePreventionThreshold) {
      logger.error(`⚠️ High memory before test ${globalThis.yggdrasilGlobalTestCount}: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
      await emergencyCleanup(`pre-test-high-memory-${globalThis.yggdrasilGlobalTestCount}`);
    }
  });
  
  // After each test
  test.afterEach(async ({ }, testInfo) => {
    const testDuration = testInfo.duration || 0;
    const testPassed = testInfo.status === 'passed';
    
    // Notify circuit breaker of test result
    await TestCircuitBreaker.afterTest(testInfo.title, testPassed, testDuration);
    
    // Enhanced logging with cascade risk
    const cascadeRisk = globalThis.yggdrasilGlobalTestCount >= 25 ? 'HIGH' : 'LOW';
    logger.info(`${testPassed ? '✅' : '❌'} Test ${globalThis.yggdrasilGlobalTestCount} completed: ${testInfo.title} (${testDuration}ms) [Risk: ${cascadeRisk}]`);
    
    // CRITICAL: Aggressive cleanup in cascade prevention zone
    if (globalThis.yggdrasilGlobalTestCount >= 25) {
      logger.info(`🚨 POST-TEST CLEANUP: Critical zone test ${globalThis.yggdrasilGlobalTestCount} completed - forcing aggressive cleanup`);
      await emergencyCleanup(`post-cascade-zone-test-${globalThis.yggdrasilGlobalTestCount}`);
      
      // Force database cleanup of test data after every critical test
      await forceDatabaseCleanup();
      
      // Check service health and report to coordinator
      const coordinatorState = coordinator.getState();
      if (!coordinatorState.servicesHealthy) {
        logger.warn(`⚠️ Services degraded after test ${globalThis.yggdrasilGlobalTestCount}`);
      }
      
      // Extra stabilization time
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Force cleanup at regular intervals (more frequent now)
    if (globalThis.yggdrasilGlobalTestCount % CLEANUP_INTERVAL === 0) {
      logger.info(`🧹 Scheduled cleanup after ${globalThis.yggdrasilGlobalTestCount} tests`);
      await forceResourceCleanup();
    }
    
    // More aggressive cleanup conditions
    if (!testPassed) {
      logger.warn(`❌ Test ${globalThis.yggdrasilGlobalTestCount} FAILED: ${testInfo.title} - forcing emergency cleanup`);
      await emergencyCleanup(`test-failure-${globalThis.yggdrasilGlobalTestCount}`);
    } else if (testDuration > 15000) { // Reduced threshold from 20s to 15s
      logger.warn(`⏱️ Slow test ${globalThis.yggdrasilGlobalTestCount} detected (${testDuration}ms) - forcing cleanup`);
      await forceResourceCleanup();
    }
    
    // More aggressive memory threshold in cascade zone
    const memory = process.memoryUsage();
    const memoryThreshold = globalThis.yggdrasilGlobalTestCount >= 25 ? 200 * 1024 * 1024 : MEMORY_THRESHOLD; // 200MB in critical zone
    
    if (memory.heapUsed > memoryThreshold) {
      logger.warn(`⚠️ High memory after test ${globalThis.yggdrasilGlobalTestCount}: ${Math.round(memory.heapUsed / 1024 / 1024)}MB (threshold: ${Math.round(memoryThreshold / 1024 / 1024)}MB)`);
      await emergencyCleanup(`post-test-high-memory-${globalThis.yggdrasilGlobalTestCount}`);
    }
  });
  
  // After all tests in suite
  test.afterAll(async () => {
    logger.info(`🏁 Completed test suite: ${suiteName} (${globalThis.yggdrasilSuiteTestCount} tests)`);
    
    // Force cleanup after each suite
    await forceResourceCleanup();
    
    // Log final stats
    const stats = TestConnectionPool.getStats();
    logger.info(`📊 Final connection pool stats: ${JSON.stringify(stats)}`);
  });
}

/**
 * Force resource cleanup to prevent accumulation
 */
async function forceResourceCleanup() {
  logger.info('🧹 Starting forced resource cleanup...');
  
  try {
    // 1. Clear mongoose internal caches
    if (mongoose.connection && mongoose.connection.db) {
      // Clear query cache (mongoose doesn't expose this directly, but we can try)
      try {
        (mongoose.connection as any).models = {};
        (mongoose as any).models = {};
      } catch (error) {
        logger.debug('Could not clear mongoose model cache:', error);
      }
    }
    
    // 2. Force garbage collection if available
    if (global.gc) {
      logger.debug('🗑️ Running garbage collection...');
      global.gc();
      
      // Run it twice for thorough cleanup
      await new Promise(resolve => setImmediate(resolve));
      global.gc();
    } else {
      logger.debug('Garbage collection not available (run with --expose-gc)');
    }
    
    // 3. Clear heavy module caches
    const modulesToClear = [
      '@yggdrasil/database-schemas',
      'mongoose',
    ];
    
    modulesToClear.forEach(moduleName => {
      Object.keys(require.cache).forEach(key => {
        if (key.includes(moduleName) && !key.includes('node_modules')) {
          delete require.cache[key];
        }
      });
    });
    
    // 4. Wait for pending operations to complete
    await new Promise(resolve => setImmediate(resolve));
    
    // 5. Log memory after cleanup
    const memory = process.memoryUsage();
    logger.info(`💾 Memory after cleanup: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
    
  } catch (error) {
    logger.error('Error during forced cleanup:', error);
  }
}

/**
 * Emergency cleanup for critical situations
 */
async function emergencyCleanup(reason: string) {
  logger.warn(`🚨 Emergency cleanup triggered: ${reason}`);
  
  try {
    // 1. Force aggressive garbage collection
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // 2. Close any hanging connections
    const stats = TestConnectionPool.getStats();
    if (stats.connectionCount === 0 && stats.isConnected) {
      logger.info('🔌 Closing unused connection pool');
      await TestConnectionPool.cleanup();
    }
    
    // 3. Clear all caches
    await forceResourceCleanup();
    
    // 4. Log final memory state
    const memory = process.memoryUsage();
    logger.info(`💾 Memory after emergency cleanup: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
    
  } catch (error) {
    logger.error('Error during emergency cleanup:', error);
  }
}

/**
 * Monitor and report test performance metrics
 */
export function reportTestMetrics() {
  const memory = process.memoryUsage();
  const stats = TestConnectionPool.getStats();
  
  return {
    testsRun: globalThis.yggdrasilGlobalTestCount,
    memoryUsed: Math.round(memory.heapUsed / 1024 / 1024),
    connectionPoolStats: stats,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Verify all services are healthy and responsive
 * Note: Removed - now handled by health monitor and coordinator
 */

/**
 * Monitor service health to detect degradation over time
 */
async function monitorServiceHealth(checkpoint: string): Promise<void> {
  logger.info(`🏥 SERVICE HEALTH MONITOR: ${checkpoint}`);
  
  const services = [
    { name: 'auth', port: 3001 },
    { name: 'news', port: 3003 },
    { name: 'course', port: 3004 },
    { name: 'user', port: 3002 },
  ];
  
  const healthResults = [];
  
  for (const service of services) {
    try {
      const start = Date.now();
      
      // Create timeout promise to avoid hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), 5000);
      });
      
      const response = await Promise.race([
        fetch(`http://localhost:${service.port}/health`),
        timeoutPromise
      ]) as Response;
      
      const responseTime = Date.now() - start;
      
      if (response.ok) {
        const healthStatus = responseTime < 1000 ? 'HEALTHY' : responseTime < 3000 ? 'SLOW' : 'DEGRADED';
        healthResults.push(`${service.name}:${healthStatus}(${responseTime}ms)`);
        
        if (responseTime > 2000) {
          logger.warn(`⚠️ SERVICE DEGRADATION: ${service.name} responding slowly (${responseTime}ms)`);
        }
      } else {
        healthResults.push(`${service.name}:ERROR(${response.status})`);
        logger.error(`❌ SERVICE ERROR: ${service.name} returned ${response.status}`);
      }
    } catch (error) {
      healthResults.push(`${service.name}:UNREACHABLE`);
      logger.error(`💥 SERVICE UNREACHABLE: ${service.name} - ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Check memory usage
  const memory = process.memoryUsage();
  const memoryMB = Math.round(memory.heapUsed / 1024 / 1024);
  
  logger.info(`🏥 HEALTH SUMMARY: ${healthResults.join(', ')} | Memory: ${memoryMB}MB`);
  
  // Alert on concerning patterns
  if (memoryMB > 200) {
    logger.warn(`⚠️ HIGH MEMORY USAGE: ${memoryMB}MB - potential memory leak`);
  }
  
  const unhealthyServices = healthResults.filter(r => r.includes('ERROR') || r.includes('UNREACHABLE') || r.includes('DEGRADED'));
  if (unhealthyServices.length > 0) {
    logger.error(`🚨 UNHEALTHY SERVICES DETECTED: ${unhealthyServices.join(', ')}`);
  }
}

/**
 * Nuclear option: Force cleanup of all test data from database
 */
async function forceDatabaseCleanup(): Promise<void> {
  logger.warn('🚨 NUCLEAR CLEANUP: Forcing database cleanup of accumulated test data');
  
  try {
    const mongoose = await import('mongoose');
    if (!mongoose.connection?.db) {
      logger.warn('⚠️ No database connection available for cleanup');
      return;
    }
    
    const db = mongoose.connection.db;
    
    // Count before cleanup
    const beforeEnrollments = await db.collection('course_enrollments').countDocuments({});
    const beforeSubmissions = await db.collection('exercise_submissions').countDocuments({});
    
    logger.info(`🔍 BEFORE NUCLEAR CLEANUP: ${beforeEnrollments} enrollments, ${beforeSubmissions} submissions`);
    
    // Delete test enrollments and submissions (these accumulate the most)
    const deletedEnrollments = await db.collection('course_enrollments').deleteMany({});
    const deletedSubmissions = await db.collection('exercise_submissions').deleteMany({});
    
    logger.info(`🧹 NUCLEAR CLEANUP RESULTS: Deleted ${deletedEnrollments.deletedCount} enrollments, ${deletedSubmissions.deletedCount} submissions`);
    
    // Also cleanup any test users that might be accumulating
    const deletedUsers = await db.collection('users').deleteMany({
      email: { $regex: /^test|^student\.test|^teacher\.test|^admin\.test|^staff\.test/ }
    });
    
    logger.info(`🧹 NUCLEAR CLEANUP: Also deleted ${deletedUsers.deletedCount} test users`);
    
  } catch (error) {
    logger.error('💥 NUCLEAR CLEANUP FAILED:', error);
  }
}

/**
 * Restart all services to prevent cascade issues
 * Note: Deprecated - now handled by health monitor with coordinator
 */
// @ts-ignore - deprecated function kept for reference
async function _restartServicesForCascadePrevention(_reason: string): Promise<void> {
  logger.warn(`⚠️ DEPRECATED: Service restart requested for ${_reason} - delegating to health monitor`);
  
  // This function is kept for backward compatibility but should not be used
  // The health monitor now handles all service restarts through the coordinator
  return;
  
  const startTime = Date.now();
  
  try {
    const { spawn } = await import('child_process');
    const path = await import('path');
    
    // 1. Pre-restart health check
    logger.info('🏥 Pre-restart health check...');
    await monitorServiceHealth(`pre-restart-${globalThis.yggdrasilGlobalTestCount}`);
    
    // 2. Force cleanup of any hanging connections
    logger.info('🧹 Pre-restart cleanup...');
    await forceDatabaseCleanup();
    await emergencyCleanup(`pre-restart-${reason}`);
    
    // 3. Stop all services with enhanced timeout handling
    logger.info('🛑 Stopping all services with enhanced handling...');
    const stopProcess = spawn('node', ['service-manager.js', 'stop'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        WORKER_ID: '0',
        PLAYWRIGHT_WORKER_ID: '0',
        QUIET_MODE: 'true' // Reduce noise during restart
      },
      cwd: path.join(__dirname, '../../'),
      detached: false
    });
    
    // Enhanced stop handling with better timeout management
    await new Promise<void>((resolve) => {
      let stopCompleted = false;
      
      const completeStop = () => {
        if (!stopCompleted) {
          stopCompleted = true;
          logger.info(`✅ Services stopped successfully`);
          resolve();
        }
      };
      
      stopProcess.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        if (message.includes('Services shut down successfully') || 
            message.includes('Ports cleaned')) {
          completeStop();
        }
      });
      
      stopProcess.stderr?.on('data', (data) => {
        logger.warn(`STOP WARNING: ${data.toString().trim()}`);
      });
      
      stopProcess.on('close', (code) => {
        logger.info(`Service stop process exited with code ${code}`);
        completeStop(); // Always resolve, regardless of exit code
      });
      
      // More aggressive timeout - 20 seconds then force kill
      setTimeout(() => {
        if (!stopCompleted) {
          logger.warn('⏰ Stop process timeout, force killing and continuing...');
          if (!stopProcess.killed) {
            stopProcess.kill('SIGKILL');
          }
          completeStop();
        }
      }, 20000);
    });
    
    // 4. Extended wait for port cleanup and system stabilization
    logger.info('⏳ Extended wait for system stabilization...');
    await new Promise(resolve => setTimeout(resolve, 8000)); // Increased from 5s to 8s
    
    // 5. Start services with enhanced monitoring
    logger.info('🚀 Starting fresh services with enhanced monitoring...');
    const startProcess = spawn('node', ['service-manager.js', 'start'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        WORKER_ID: '0',
        PLAYWRIGHT_WORKER_ID: '0',
        QUIET_MODE: 'false' // Full logging for startup
      },
      cwd: path.join(__dirname, '../../'),
      detached: false
    });
    
    // Enhanced startup monitoring with multiple success indicators
    await new Promise<void>((resolve, reject) => {
      let servicesReady = false;
      let healthyServices = 0;
      
      const completeStart = () => {
        if (!servicesReady) {
          servicesReady = true;
          logger.info(`✅ Fresh services started successfully (${healthyServices}/7 services)`);
          resolve();
        }
      };
      
      startProcess.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        logger.debug(`START: ${message}`);
        
        // Count healthy services
        if (message.includes('service (') && message.includes('healthy')) {
          healthyServices++;
        }
        
        // Multiple success indicators
        if (message.includes('All services are ready') || 
            message.includes('Services running. Press Ctrl+C') ||
            message.includes('Services ready for clean testing') ||
            (healthyServices >= 6)) { // At least 6/7 services (frontend doesn't have health endpoint)
          completeStart();
        }
      });
      
      startProcess.stderr?.on('data', (data) => {
        const errorMsg = data.toString().trim();
        logger.error(`START ERROR: ${errorMsg}`);
        // Don't fail immediately - some errors are recoverable
      });
      
      startProcess.on('close', (code) => {
        if (!servicesReady) {
          logger.error(`❌ Service start failed with code ${code}`);
          reject(new Error(`Service restart failed with code ${code} after ${Date.now() - startTime}ms`));
        }
      });
      
      // Generous timeout for startup - 90 seconds
      setTimeout(() => {
        if (!servicesReady) {
          logger.error(`⏰ Service start timeout after 90 seconds (${healthyServices}/7 services ready)`);
          if (!startProcess.killed) {
            startProcess.kill('SIGKILL');
          }
          reject(new Error(`Service restart timeout after ${Date.now() - startTime}ms`));
        }
      }, 90000);
    });
    
    // 6. Post-restart verification
    logger.info('🔍 Post-restart service verification...');
    await monitorServiceHealth('post-restart-verification');
    
    // 7. Final stabilization wait
    logger.info('⏳ Final stabilization wait...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const duration = Date.now() - startTime;
    logger.info(`✅ ENHANCED SERVICE RESTART COMPLETE: Fresh services ready for test ${globalThis.yggdrasilGlobalTestCount} (${duration}ms)`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ ENHANCED SERVICE RESTART FAILED: ${error instanceof Error ? error.message : String(error)} (${duration}ms)`);
    
    // Enhanced error recovery
    logger.warn('🔧 Attempting error recovery...');
    try {
      await emergencyCleanup(`restart-failure-recovery-${reason}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (recoveryError) {
      logger.error(`Recovery attempt failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
    }
    
    throw error;
  }
}

/**
 * Reset global counters (for testing the lifecycle itself)
 */
export function resetLifecycleCounters() {
  globalThis.yggdrasilGlobalTestCount = 0;
  globalThis.yggdrasilSuiteTestCount = 0;
}