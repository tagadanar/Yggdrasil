// packages/testing-utilities/reporters/performance-reporter.ts
// Performance reporter for tracking test execution metrics and resource usage

import { Reporter, TestCase, TestResult, FullResult, Suite } from '@playwright/test/reporter';
import { TestConnectionPool } from '../tests/helpers/TestConnectionPool';
import fs from 'fs';
import path from 'path';

interface TestMetrics {
  name: string;
  duration: number;
  memory: number;
  status: string;
  suite: string;
  timestamp: number;
  retries: number;
}

interface SuiteMetrics {
  name: string;
  testCount: number;
  totalDuration: number;
  averageDuration: number;
  slowTests: TestMetrics[];
  failedTests: TestMetrics[];
  peakMemory: number;
  startMemory: number;
  endMemory: number;
}

/**
 * PerformanceReporter - Tracks test performance and resource usage
 * 
 * Generates detailed reports about test execution, memory usage,
 * and identifies performance bottlenecks that may cause timeouts.
 */
export class PerformanceReporter implements Reporter {
  private testMetrics: TestMetrics[] = [];
  private suiteMetrics: Map<string, SuiteMetrics> = new Map();
  private startTime: number = Date.now();
  private outputDir: string;
  
  // Thresholds
  private readonly SLOW_TEST_THRESHOLD = 15000; // 15 seconds
  private readonly MEMORY_WARNING_THRESHOLD = 400 * 1024 * 1024; // 400MB
  private readonly MEMORY_CRITICAL_THRESHOLD = 500 * 1024 * 1024; // 500MB
  
  constructor(options: { outputDir?: string } = {}) {
    this.outputDir = options.outputDir || 'test-results-enhanced';
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    console.log('\n📊 Performance Reporter initialized');
    console.log(`📁 Reports will be saved to: ${this.outputDir}`);
  }
  
  onBegin(config: any, suite: Suite): void {
    this.startTime = Date.now();
    const memory = process.memoryUsage();
    
    console.log('\n🏁 Performance monitoring started');
    console.log(`💾 Initial memory: ${this.formatBytes(memory.heapUsed)}`);
    console.log(`🔌 Connection pool: ${JSON.stringify(TestConnectionPool.getStats())}`);
  }
  
  onTestBegin(test: TestCase): void {
    // Track test start if needed
  }
  
  onTestEnd(test: TestCase, result: TestResult): void {
    const duration = result.duration;
    const memory = process.memoryUsage();
    const suiteName = this.getSuiteName(test);
    
    // Create test metric
    const testMetric: TestMetrics = {
      name: test.title,
      duration,
      memory: memory.heapUsed,
      status: result.status,
      suite: suiteName,
      timestamp: Date.now(),
      retries: result.retry,
    };
    
    this.testMetrics.push(testMetric);
    
    // Update suite metrics
    this.updateSuiteMetrics(suiteName, testMetric);
    
    // Log warnings for problematic tests
    this.checkTestThresholds(testMetric);
    
    // Emergency cleanup for critical memory usage
    if (memory.heapUsed > this.MEMORY_CRITICAL_THRESHOLD) {
      console.error(`🚨 CRITICAL: Memory at ${this.formatBytes(memory.heapUsed)} after "${test.title}"`);
      
      if (global.gc) {
        console.log('🗑️ Forcing garbage collection...');
        global.gc();
        
        const afterGC = process.memoryUsage();
        console.log(`💾 Memory after GC: ${this.formatBytes(afterGC.heapUsed)}`);
      }
    }
  }
  
  onEnd(result: FullResult): void {
    const totalDuration = Date.now() - this.startTime;
    const finalMemory = process.memoryUsage();
    
    console.log('\n📊 Performance Report');
    console.log('══════════════════════════════════════════════════════════════');
    
    // Overall summary
    this.logOverallSummary(totalDuration, finalMemory);
    
    // Suite breakdown
    this.logSuiteBreakdown();
    
    // Slow tests
    this.logSlowTests();
    
    // Failed tests
    this.logFailedTests();
    
    // Memory analysis
    this.logMemoryAnalysis();
    
    // Connection analysis
    this.logConnectionAnalysis();
    
    // Generate detailed reports
    this.generateDetailedReports();
    
    console.log('══════════════════════════════════════════════════════════════');
  }
  
  private getSuiteName(test: TestCase): string {
    // Extract suite name from test path
    const titlePath = test.titlePath();
    return titlePath.length > 1 ? titlePath[0] : 'Unknown Suite';
  }
  
  private updateSuiteMetrics(suiteName: string, testMetric: TestMetrics): void {
    if (!this.suiteMetrics.has(suiteName)) {
      this.suiteMetrics.set(suiteName, {
        name: suiteName,
        testCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        slowTests: [],
        failedTests: [],
        peakMemory: testMetric.memory,
        startMemory: testMetric.memory,
        endMemory: testMetric.memory,
      });
    }
    
    const suite = this.suiteMetrics.get(suiteName)!;
    suite.testCount++;
    suite.totalDuration += testMetric.duration;
    suite.averageDuration = suite.totalDuration / suite.testCount;
    suite.endMemory = testMetric.memory;
    
    if (testMetric.memory > suite.peakMemory) {
      suite.peakMemory = testMetric.memory;
    }
    
    if (testMetric.duration > this.SLOW_TEST_THRESHOLD) {
      suite.slowTests.push(testMetric);
    }
    
    if (testMetric.status !== 'passed') {
      suite.failedTests.push(testMetric);
    }
  }
  
  private checkTestThresholds(testMetric: TestMetrics): void {
    // Check duration
    if (testMetric.duration > this.SLOW_TEST_THRESHOLD) {
      console.warn(`⏱️ Slow test: "${testMetric.name}" (${testMetric.duration}ms)`);
    }
    
    // Check memory
    if (testMetric.memory > this.MEMORY_WARNING_THRESHOLD) {
      console.warn(`💾 High memory after "${testMetric.name}": ${this.formatBytes(testMetric.memory)}`);
    }
    
    // Check status
    if (testMetric.status !== 'passed') {
      console.error(`❌ Test failed: "${testMetric.name}" (${testMetric.status})`);
    }
  }
  
  private logOverallSummary(totalDuration: number, finalMemory: NodeJS.MemoryUsage): void {
    const totalTests = this.testMetrics.length;
    const passedTests = this.testMetrics.filter(t => t.status === 'passed').length;
    const failedTests = totalTests - passedTests;
    const slowTests = this.testMetrics.filter(t => t.duration > this.SLOW_TEST_THRESHOLD).length;
    
    console.log(`⏱️  Total Duration: ${this.formatDuration(totalDuration)}`);
    console.log(`🧪  Tests: ${totalTests} total, ${passedTests} passed, ${failedTests} failed`);
    console.log(`⚡  Slow Tests (>${this.SLOW_TEST_THRESHOLD}ms): ${slowTests}`);
    console.log(`💾  Final Memory: ${this.formatBytes(finalMemory.heapUsed)}`);
  }
  
  private logSuiteBreakdown(): void {
    console.log('\n📋 Suite Breakdown:');
    
    for (const [name, metrics] of this.suiteMetrics.entries()) {
      const memoryGrowth = metrics.endMemory - metrics.startMemory;
      const memoryGrowthPercent = ((memoryGrowth / metrics.startMemory) * 100).toFixed(1);
      
      console.log(`  ${name}:`);
      console.log(`    Tests: ${metrics.testCount}`);
      console.log(`    Duration: ${this.formatDuration(metrics.totalDuration)} (avg: ${this.formatDuration(metrics.averageDuration)})`);
      console.log(`    Memory: ${this.formatBytes(metrics.startMemory)} → ${this.formatBytes(metrics.endMemory)} (${memoryGrowthPercent}%)`);
      console.log(`    Issues: ${metrics.slowTests.length} slow, ${metrics.failedTests.length} failed`);
    }
  }
  
  private logSlowTests(): void {
    const slowTests = this.testMetrics
      .filter(t => t.duration > this.SLOW_TEST_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest
    
    if (slowTests.length > 0) {
      console.log('\n⏱️ Slowest Tests:');
      slowTests.forEach((test, index) => {
        console.log(`  ${index + 1}. ${test.name} (${test.suite}): ${test.duration}ms`);
      });
    }
  }
  
  private logFailedTests(): void {
    const failedTests = this.testMetrics.filter(t => t.status !== 'passed');
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  • ${test.name} (${test.suite}): ${test.status}`);
      });
    }
  }
  
  private logMemoryAnalysis(): void {
    const memories = this.testMetrics.map(t => t.memory);
    const startMemory = memories[0] || 0;
    const peakMemory = Math.max(...memories);
    const endMemory = memories[memories.length - 1] || 0;
    const memoryGrowth = endMemory - startMemory;
    
    console.log('\n💾 Memory Analysis:');
    console.log(`  Start: ${this.formatBytes(startMemory)}`);
    console.log(`  Peak: ${this.formatBytes(peakMemory)}`);
    console.log(`  End: ${this.formatBytes(endMemory)}`);
    console.log(`  Growth: ${this.formatBytes(memoryGrowth)} (${((memoryGrowth / startMemory) * 100).toFixed(1)}%)`);
    
    // Identify memory-heavy tests
    const memoryHeavyTests = this.testMetrics
      .filter(t => t.memory > this.MEMORY_WARNING_THRESHOLD)
      .sort((a, b) => b.memory - a.memory)
      .slice(0, 5);
    
    if (memoryHeavyTests.length > 0) {
      console.log(`  Memory-heavy tests:`);
      memoryHeavyTests.forEach(test => {
        console.log(`    • ${test.name}: ${this.formatBytes(test.memory)}`);
      });
    }
  }
  
  private logConnectionAnalysis(): void {
    const stats = TestConnectionPool.getStats();
    console.log('\n🔌 Connection Analysis:');
    console.log(`  Pool connected: ${stats.isConnected}`);
    console.log(`  Active connections: ${stats.connectionCount}`);
    console.log(`  Connection state: ${stats.readyState}`);
  }
  
  private generateDetailedReports(): void {
    // Generate JSON report
    const report = {
      summary: {
        totalTests: this.testMetrics.length,
        totalDuration: Date.now() - this.startTime,
        passedTests: this.testMetrics.filter(t => t.status === 'passed').length,
        failedTests: this.testMetrics.filter(t => t.status !== 'passed').length,
        slowTests: this.testMetrics.filter(t => t.duration > this.SLOW_TEST_THRESHOLD).length,
      },
      suites: Array.from(this.suiteMetrics.values()),
      tests: this.testMetrics,
      connectionStats: TestConnectionPool.getStats(),
      timestamp: new Date().toISOString(),
    };
    
    // Save to file
    const reportPath = path.join(this.outputDir, 'performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Generate CSV for analysis
    this.generateCSVReport();
  }
  
  private generateCSVReport(): void {
    const csvHeader = 'Name,Suite,Duration,Memory,Status,Timestamp,Retries\n';
    const csvData = this.testMetrics.map(t => 
      `"${t.name}","${t.suite}",${t.duration},${t.memory},"${t.status}",${t.timestamp},${t.retries}`
    ).join('\n');
    
    const csvPath = path.join(this.outputDir, 'performance-data.csv');
    fs.writeFileSync(csvPath, csvHeader + csvData);
    console.log(`📊 CSV data saved to: ${csvPath}`);
  }
  
  private formatBytes(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)}MB`;
  }
  
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds % 60}s`;
  }
}