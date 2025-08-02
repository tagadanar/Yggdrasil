export class TestPerformanceMonitor {
  private static timings = new Map<string, number[]>();
  
  static recordTiming(testName: string, duration: number): void {
    if (!this.timings.has(testName)) {
      this.timings.set(testName, []);
    }
    
    this.timings.get(testName)!.push(duration);
    
    // Alert if test exceeds 60s
    if (duration > 60000) {
      console.error(`❌ PERFORMANCE VIOLATION: ${testName} took ${duration}ms (> 60s limit)`);
    }
  }
  
  static generateReport(): void {
    console.log('\n📊 Test Performance Report:');
    console.log('='.repeat(80));
    
    const violations: string[] = [];
    
    for (const [test, timings] of this.timings) {
      const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
      const max = Math.max(...timings);
      
      if (max > 60000) {
        violations.push(`${test}: ${max}ms`);
      }
      
      console.log(`${test}: avg=${avg}ms, max=${max}ms`);
    }
    
    if (violations.length > 0) {
      console.error('\n❌ Tests exceeding 60s limit:');
      violations.forEach(v => console.error(`  - ${v}`));
      process.exit(1);
    }
  }
}