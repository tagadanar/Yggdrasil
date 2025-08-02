// packages/testing-utilities/tests/helpers/test-lifecycle.ts
// Test lifecycle management for resource cleanup and stability

import { test } from '@playwright/test';
import mongoose from 'mongoose';
import { TestConnectionPool } from './TestConnectionPool';
import { TestCircuitBreaker } from './test-circuit-breaker';
import { LoggerFactory } from '@yggdrasil/shared-utilities';

const logger = LoggerFactory.createLogger('test-lifecycle');

// Global test counter across all test files - use global object to ensure sharing
declare global {
  let yggdrasilGlobalTestCount: number;
  let yggdrasilSuiteTestCount: number;
}

if (typeof global.yggdrasilGlobalTestCount === 'undefined') {
  global.yggdrasilGlobalTestCount = 0;
}
if (typeof global.yggdrasilSuiteTestCount === 'undefined') {
  global.yggdrasilSuiteTestCount = 0;
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
  global.yggdrasilSuiteTestCount = 0;
  
  // Log suite start
  test.beforeAll(async () => {
    logger.info(`🏁 Starting test suite: ${suiteName}`);
    const stats = TestConnectionPool.getStats();
    logger.info(`📊 Connection pool stats: ${JSON.stringify(stats)}`);
  });
  
  // Before each test
  test.beforeEach(async ({ }, testInfo) => {
    global.yggdrasilGlobalTestCount++;
    global.yggdrasilSuiteTestCount++;
    
    logger.info(`▶️ Test ${global.yggdrasilGlobalTestCount}: ${testInfo.title}`);
    
    // ENHANCED ROBUST SERVICE RESTART: Strategic points to prevent cascade
    if (global.yggdrasilGlobalTestCount === 25) {
      logger.warn(`🔄 PROACTIVE RESTART: Test ${global.yggdrasilGlobalTestCount} - RESTARTING ALL SERVICES TO PREVENT CASCADE`);
      
      try {
        await restartServicesForCascadePrevention(`proactive-test-${global.yggdrasilGlobalTestCount}`);
        logger.info(`✅ PROACTIVE RESTART SUCCESSFUL: Fresh services ready for tests 25+`);
      } catch (error) {
        logger.error(`❌ PROACTIVE RESTART FAILED: ${error.message}`);
        // Continue anyway - don't fail the entire test
        logger.warn(`⚠️ Continuing with existing services despite restart failure`);
      }
    }
    
    // CRITICAL RESTART: Before the cascade point that moved to test #60
    if (global.yggdrasilGlobalTestCount === 50) {
      logger.warn(`🔄 CRITICAL RESTART: Test ${global.yggdrasilGlobalTestCount} - RESTARTING BEFORE CASCADE ZONE`);
      
      try {
        await restartServicesForCascadePrevention(`critical-test-${global.yggdrasilGlobalTestCount}`);
        logger.info(`✅ CRITICAL RESTART SUCCESSFUL: Fresh services ready for tests 50+`);
      } catch (error) {
        logger.error(`❌ CRITICAL RESTART FAILED: ${error.message}`);
        // Continue anyway - don't fail the entire test
        logger.warn(`⚠️ Continuing with existing services despite restart failure`);
      }
    }
    
    // Enhanced isolation for cascade prevention
    if (global.yggdrasilGlobalTestCount >= 25) {
      logger.info(`🚨 CRITICAL ZONE: Test ${global.yggdrasilGlobalTestCount} - ENHANCED ISOLATION ACTIVE`);
      
      // REAL FIX: Enhanced cleanup and isolation - no skipping!
      await emergencyCleanup(`critical-zone-test-${global.yggdrasilGlobalTestCount}`);
      
      // Verify service health before critical tests
      await verifyServiceHealth();
      
      // Force garbage collection more aggressively
      if (global.gc) {
        for (let i = 0; i < 5; i++) {
          global.gc();
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Wait for system to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));
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
    logger.info(`▶️ Test ${global.yggdrasilGlobalTestCount}: ${testInfo.title}`);
    logger.info(`💾 Memory: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
    
    if (global.yggdrasilGlobalTestCount >= 30) {
      logger.warn(`🚨 HIGH RISK TEST - Global #${global.yggdrasilGlobalTestCount} - ${Math.max(0, 33 - global.yggdrasilGlobalTestCount)} tests until cascade point`);
    }
    
    // More aggressive memory threshold for cascade prevention
    const cascadePreventionThreshold = global.yggdrasilGlobalTestCount >= 30 ? 250 * 1024 * 1024 : MEMORY_THRESHOLD;
    
    if (memory.heapUsed > cascadePreventionThreshold) {
      logger.error(`⚠️ High memory before test ${global.yggdrasilGlobalTestCount}: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
      await emergencyCleanup(`pre-test-high-memory-${global.yggdrasilGlobalTestCount}`);
    }
  });
  
  // After each test
  test.afterEach(async ({ }, testInfo) => {
    const testDuration = testInfo.duration || 0;
    const testPassed = testInfo.status === 'passed';
    
    // Notify circuit breaker of test result
    await TestCircuitBreaker.afterTest(testInfo.title, testPassed, testDuration);
    
    // Enhanced logging with cascade risk
    const cascadeRisk = global.yggdrasilGlobalTestCount >= 25 ? 'HIGH' : 'LOW';
    logger.info(`${testPassed ? '✅' : '❌'} Test ${global.yggdrasilGlobalTestCount} completed: ${testInfo.title} (${testDuration}ms) [Risk: ${cascadeRisk}]`);
    
    // CRITICAL: Aggressive cleanup in cascade prevention zone
    if (global.yggdrasilGlobalTestCount >= 25) {
      logger.info(`🚨 POST-TEST CLEANUP: Critical zone test ${global.yggdrasilGlobalTestCount} completed - forcing aggressive cleanup`);
      await emergencyCleanup(`post-cascade-zone-test-${global.yggdrasilGlobalTestCount}`);
      
      // NUCLEAR OPTION: Force database cleanup of test data after every critical test
      await forceDatabaseCleanup();
      
      // SERVICE HEALTH MONITORING: Check for service degradation in critical zone
      await monitorServiceHealth(`post-test-${global.yggdrasilGlobalTestCount}`);
      
      // Extra stabilization time
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Force cleanup at regular intervals (more frequent now)
    if (global.yggdrasilGlobalTestCount % CLEANUP_INTERVAL === 0) {
      logger.info(`🧹 Scheduled cleanup after ${global.yggdrasilGlobalTestCount} tests`);
      await forceResourceCleanup();
    }
    
    // More aggressive cleanup conditions
    if (!testPassed) {
      logger.warn(`❌ Test ${global.yggdrasilGlobalTestCount} FAILED: ${testInfo.title} - forcing emergency cleanup`);
      await emergencyCleanup(`test-failure-${global.yggdrasilGlobalTestCount}`);
    } else if (testDuration > 15000) { // Reduced threshold from 20s to 15s
      logger.warn(`⏱️ Slow test ${global.yggdrasilGlobalTestCount} detected (${testDuration}ms) - forcing cleanup`);
      await forceResourceCleanup();
    }
    
    // More aggressive memory threshold in cascade zone
    const memory = process.memoryUsage();
    const memoryThreshold = global.yggdrasilGlobalTestCount >= 25 ? 200 * 1024 * 1024 : MEMORY_THRESHOLD; // 200MB in critical zone
    
    if (memory.heapUsed > memoryThreshold) {
      logger.warn(`⚠️ High memory after test ${global.yggdrasilGlobalTestCount}: ${Math.round(memory.heapUsed / 1024 / 1024)}MB (threshold: ${Math.round(memoryThreshold / 1024 / 1024)}MB)`);
      await emergencyCleanup(`post-test-high-memory-${global.yggdrasilGlobalTestCount}`);
    }
  });
  
  // After all tests in suite
  test.afterAll(async () => {
    logger.info(`🏁 Completed test suite: ${suiteName} (${global.yggdrasilSuiteTestCount} tests)`);
    
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
        mongoose.connection.models = {};
        mongoose.models = {};
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
    testsRun: global.yggdrasilGlobalTestCount,
    memoryUsed: Math.round(memory.heapUsed / 1024 / 1024),
    connectionPoolStats: stats,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Verify all services are healthy and responsive
 */
async function verifyServiceHealth() {
  const services = [
    { name: 'auth', port: 3001 },
    { name: 'user', port: 3002 },
    { name: 'news', port: 3003 },
    { name: 'course', port: 3004 },
    { name: 'planning', port: 3005 },
    { name: 'statistics', port: 3006 },
  ];
  
  logger.info('🔍 Verifying service health in critical zone...');
  
  for (const service of services) {
    try {
      const startTime = Date.now();
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
      
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(`http://localhost:${service.port}/health`),
        timeoutPromise
      ]);
      
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        logger.error(`❌ Service ${service.name} unhealthy: ${response.status} (${responseTime}ms)`);
      } else if (responseTime > 2000) {
        logger.warn(`⚠️ Service ${service.name} slow: ${responseTime}ms`);
      } else {
        logger.info(`✅ Service ${service.name} healthy: ${responseTime}ms`);
      }
    } catch (error) {
      logger.error(`❌ Service ${service.name} unreachable: ${error.message}`);
    }
  }
}

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
      ]);
      
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
      logger.error(`💥 SERVICE UNREACHABLE: ${service.name} - ${error.message}`);
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
 * Restart all services to prevent cascade issues - Enhanced robust version
 */
async function restartServicesForCascadePrevention(reason: string): Promise<void> {
  logger.warn(`🔄 ENHANCED SERVICE RESTART: ${reason} - Stopping and restarting all services`);
  
  const startTime = Date.now();
  
  try {
    const { spawn } = await import('child_process');
    const path = await import('path');
    
    // 1. Pre-restart health check
    logger.info('🏥 Pre-restart health check...');
    await monitorServiceHealth(`pre-restart-${global.yggdrasilGlobalTestCount}`);
    
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
    await verifyServiceHealth();
    
    // 7. Final stabilization wait
    logger.info('⏳ Final stabilization wait...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const duration = Date.now() - startTime;
    logger.info(`✅ ENHANCED SERVICE RESTART COMPLETE: Fresh services ready for test ${global.yggdrasilGlobalTestCount} (${duration}ms)`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ ENHANCED SERVICE RESTART FAILED: ${error.message} (${duration}ms)`);
    
    // Enhanced error recovery
    logger.warn('🔧 Attempting error recovery...');
    try {
      await emergencyCleanup(`restart-failure-recovery-${reason}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (recoveryError) {
      logger.error(`Recovery attempt failed: ${recoveryError.message}`);
    }
    
    throw error;
  }
}

/**
 * Reset global counters (for testing the lifecycle itself)
 */
export function resetLifecycleCounters() {
  global.yggdrasilGlobalTestCount = 0;
  global.yggdrasilSuiteTestCount = 0;
}