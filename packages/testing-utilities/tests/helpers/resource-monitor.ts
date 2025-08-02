// packages/testing-utilities/tests/helpers/resource-monitor.ts
// Resource monitoring for test suites to track and prevent resource exhaustion

import mongoose from 'mongoose';
import { TestConnectionPool } from './TestConnectionPool';
import { LoggerFactory } from '@yggdrasil/shared-utilities';

const logger = LoggerFactory.createLogger('resource-monitor');

interface ResourceMetrics {
  startTime: number;
  startMemory: NodeJS.MemoryUsage;
  startConnections: number;
  peakMemory: number;
  testCount: number;
  slowTests: string[];
  warnings: string[];
}

interface ResourceSnapshot {
  memory: NodeJS.MemoryUsage;
  connections: number;
  openHandles: number;
  timestamp: number;
}

/**
 * ResourceMonitor - Tracks resource usage during test execution
 * 
 * Monitors memory, database connections, and other resources to
 * identify leaks and prevent cascading test failures.
 */
export class ResourceMonitor {
  private static metrics: Map<string, ResourceMetrics> = new Map();
  private static currentSuite: string | null = null;
  private static monitoringInterval: NodeJS.Timeout | null = null;
  private static snapshots: ResourceSnapshot[] = [];
  
  // Thresholds
  private static readonly MEMORY_WARNING_THRESHOLD = 400 * 1024 * 1024; // 400MB
  private static readonly MEMORY_CRITICAL_THRESHOLD = 500 * 1024 * 1024; // 500MB
  private static readonly CONNECTION_WARNING_THRESHOLD = 10;
  private static readonly CONNECTION_CRITICAL_THRESHOLD = 15;
  private static readonly SLOW_TEST_THRESHOLD = 15000; // 15 seconds
  
  /**
   * Start tracking resources for a test suite
   */
  static startTracking(suiteName: string) {
    this.currentSuite = suiteName;
    
    const startMemory = process.memoryUsage();
    const startConnections = this.getActiveConnections();
    
    this.metrics.set(suiteName, {
      startTime: Date.now(),
      startMemory,
      startConnections,
      peakMemory: startMemory.heapUsed,
      testCount: 0,
      slowTests: [],
      warnings: [],
    });
    
    // Start continuous monitoring
    this.startContinuousMonitoring();
    
    logger.info(`📊 Started resource monitoring for: ${suiteName}`);
    logger.info(`💾 Initial memory: ${this.formatBytes(startMemory.heapUsed)}`);
    logger.info(`🔌 Initial connections: ${startConnections}`);
  }
  
  /**
   * Start continuous monitoring with periodic snapshots
   */
  private static startContinuousMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.snapshots = [];
    
    // Take snapshots every 2 seconds
    this.monitoringInterval = setInterval(() => {
      const snapshot = this.takeSnapshot();
      this.snapshots.push(snapshot);
      
      // Keep only last 30 snapshots (1 minute of data)
      if (this.snapshots.length > 30) {
        this.snapshots.shift();
      }
      
      // Check thresholds
      this.checkThresholds(snapshot);
    }, 2000);
  }
  
  /**
   * Stop continuous monitoring
   */
  private static stopContinuousMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  /**
   * Take a resource snapshot
   */
  private static takeSnapshot(): ResourceSnapshot {
    return {
      memory: process.memoryUsage(),
      connections: this.getActiveConnections(),
      openHandles: this.getOpenHandles(),
      timestamp: Date.now(),
    };
  }
  
  /**
   * Check resource thresholds and log warnings
   */
  private static checkThresholds(snapshot: ResourceSnapshot) {
    const metrics = this.currentSuite ? this.metrics.get(this.currentSuite) : null;
    if (!metrics) return;
    
    // Update peak memory
    if (snapshot.memory.heapUsed > metrics.peakMemory) {
      metrics.peakMemory = snapshot.memory.heapUsed;
    }
    
    // Check memory thresholds
    if (snapshot.memory.heapUsed > this.MEMORY_CRITICAL_THRESHOLD) {
      const warning = `🚨 CRITICAL: Memory usage at ${this.formatBytes(snapshot.memory.heapUsed)}`;
      logger.error(warning);
      metrics.warnings.push(warning);
      
      // Force garbage collection in critical situations
      if (global.gc) {
        logger.info('🗑️ Forcing garbage collection due to critical memory usage');
        global.gc();
      }
    } else if (snapshot.memory.heapUsed > this.MEMORY_WARNING_THRESHOLD) {
      const warning = `⚠️ High memory usage: ${this.formatBytes(snapshot.memory.heapUsed)}`;
      logger.warn(warning);
      metrics.warnings.push(warning);
    }
    
    // Check connection thresholds
    if (snapshot.connections > this.CONNECTION_CRITICAL_THRESHOLD) {
      const warning = `🚨 CRITICAL: ${snapshot.connections} active connections`;
      logger.error(warning);
      metrics.warnings.push(warning);
    } else if (snapshot.connections > this.CONNECTION_WARNING_THRESHOLD) {
      const warning = `⚠️ High connection count: ${snapshot.connections}`;
      logger.warn(warning);
      metrics.warnings.push(warning);
    }
  }
  
  /**
   * Check resources during a specific test
   */
  static async checkResources(testName: string): Promise<{ memory: NodeJS.MemoryUsage; connections: number }> {
    const metrics = this.currentSuite ? this.metrics.get(this.currentSuite) : null;
    if (metrics) {
      metrics.testCount++;
    }
    
    const snapshot = this.takeSnapshot();
    
    // Log warnings for this specific test
    if (snapshot.memory.heapUsed > this.MEMORY_WARNING_THRESHOLD) {
      logger.warn(`⚠️ High memory in test "${testName}": ${this.formatBytes(snapshot.memory.heapUsed)}`);
    }
    
    if (snapshot.connections > this.CONNECTION_WARNING_THRESHOLD) {
      logger.warn(`⚠️ High connections in test "${testName}": ${snapshot.connections}`);
    }
    
    return {
      memory: snapshot.memory,
      connections: snapshot.connections,
    };
  }
  
  /**
   * Record a slow test
   */
  static recordSlowTest(testName: string, duration: number) {
    if (duration > this.SLOW_TEST_THRESHOLD && this.currentSuite) {
      const metrics = this.metrics.get(this.currentSuite);
      if (metrics) {
        metrics.slowTests.push(`${testName} (${duration}ms)`);
      }
    }
  }
  
  /**
   * Generate and log a report for the suite
   */
  static reportAndReset(suiteName: string) {
    this.stopContinuousMonitoring();
    
    const metrics = this.metrics.get(suiteName);
    if (!metrics) {
      logger.warn(`No metrics found for suite: ${suiteName}`);
      return;
    }
    
    const duration = Date.now() - metrics.startTime;
    const finalMemory = process.memoryUsage();
    const finalConnections = this.getActiveConnections();
    
    // Calculate memory growth
    const memoryGrowth = finalMemory.heapUsed - metrics.startMemory.heapUsed;
    const memoryGrowthPercent = (memoryGrowth / metrics.startMemory.heapUsed * 100).toFixed(1);
    
    // Generate report
    const report = `
📊 Resource Report for ${suiteName}
════════════════════════════════════════════════════════════════
⏱️  Duration: ${this.formatDuration(duration)}
🧪  Tests Run: ${metrics.testCount}
💾  Memory:
    • Start: ${this.formatBytes(metrics.startMemory.heapUsed)}
    • Peak: ${this.formatBytes(metrics.peakMemory)}
    • Final: ${this.formatBytes(finalMemory.heapUsed)}
    • Growth: ${this.formatBytes(memoryGrowth)} (${memoryGrowthPercent}%)
🔌  Connections:
    • Start: ${metrics.startConnections}
    • Final: ${finalConnections}
    • Pool Stats: ${JSON.stringify(TestConnectionPool.getStats())}
⚡  Performance:
    • Slow Tests (>${this.SLOW_TEST_THRESHOLD}ms): ${metrics.slowTests.length}
    ${metrics.slowTests.map(t => `      - ${t}`).join('\n')}
⚠️  Warnings: ${metrics.warnings.length}
    ${metrics.warnings.map(w => `    - ${w}`).join('\n')}
════════════════════════════════════════════════════════════════`;
    
    logger.info(report);
    
    // Analyze trends from snapshots
    if (this.snapshots.length > 5) {
      this.analyzeTrends();
    }
    
    // Clear metrics for this suite
    this.metrics.delete(suiteName);
    this.currentSuite = null;
    this.snapshots = [];
  }
  
  /**
   * Analyze resource trends from snapshots
   */
  private static analyzeTrends() {
    if (this.snapshots.length < 2) return;
    
    // Check for memory leaks (consistent growth)
    const memoryTrend = this.calculateTrend(this.snapshots.map(s => s.memory.heapUsed));
    if (memoryTrend > 0.1) { // 10% growth trend
      logger.warn(`📈 Potential memory leak detected: ${(memoryTrend * 100).toFixed(1)}% growth trend`);
    }
    
    // Check for connection leaks
    const connectionTrend = this.calculateTrend(this.snapshots.map(s => s.connections));
    if (connectionTrend > 0.1) {
      logger.warn(`📈 Potential connection leak detected: ${(connectionTrend * 100).toFixed(1)}% growth trend`);
    }
  }
  
  /**
   * Calculate linear trend (simple linear regression)
   */
  private static calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    
    return avgY > 0 ? slope / avgY : 0;
  }
  
  /**
   * Get active database connections
   */
  private static getActiveConnections(): number {
    let count = 0;
    
    // Count mongoose connections
    mongoose.connections.forEach(conn => {
      if (conn.readyState === 1) {
        count++;
      }
    });
    
    // Add TestConnectionPool stats
    const poolStats = TestConnectionPool.getStats();
    if (poolStats.isConnected) {
      count += poolStats.connectionCount;
    }
    
    return count;
  }
  
  /**
   * Get approximate open handle count
   */
  private static getOpenHandles(): number {
    // This is approximate - Node doesn't expose exact handle count
    // @ts-ignore
    return process._getActiveHandles?.()?.length || 0;
  }
  
  /**
   * Format bytes to human readable
   */
  private static formatBytes(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)}MB`;
  }
  
  /**
   * Format duration to human readable
   */
  private static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds % 60}s`;
  }
  
  /**
   * Get current resource stats
   */
  static getCurrentStats(): any {
    return {
      currentSuite: this.currentSuite,
      memory: this.formatBytes(process.memoryUsage().heapUsed),
      connections: this.getActiveConnections(),
      suiteMetrics: this.currentSuite ? this.metrics.get(this.currentSuite) : null,
      recentSnapshots: this.snapshots.slice(-5),
    };
  }
  
  // Global test counter for cascade prevention
  private static globalTestCounter = 0;
  
  /**
   * CRITICAL: Increment global test counter for cascade prevention
   */
  static incrementGlobalTestCount(): number {
    this.globalTestCounter++;
    
    if (this.globalTestCounter >= 30) {
      logger.warn(`🚨 CRITICAL ZONE: Global test #${this.globalTestCounter} - Cascade prevention active`);
    }
    
    return this.globalTestCounter;
  }
  
  /**
   * Get global test counter
   */
  static getGlobalTestCount(): number {
    return this.globalTestCounter;
  }
  
  /**
   * Reset global test counter
   */
  static resetGlobalTestCount(): void {
    this.globalTestCounter = 0;
    logger.info('🔄 Global test counter reset for new test run');
  }
}