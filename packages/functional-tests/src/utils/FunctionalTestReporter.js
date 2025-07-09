/**
 * Custom Jest reporter for functional tests
 * Provides cleaner, more readable output for functional test runs
 */

class FunctionalTestReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options || {};
    this.testResults = [];
    this.startTime = Date.now();
  }

  onRunStart(results, options) {
    console.log('');
    console.log('🌳 ====================================================================');
    console.log('🌳 YGGDRASIL FUNCTIONAL TEST SUITE');
    console.log('🌳 ====================================================================');
    console.log('');
    this.startTime = Date.now();
  }

  onTestStart(test) {
    const testName = test.path.split('/').pop();
    console.log(`🧪 Running: ${testName}`);
    // Add timestamp to track test duration
    this.testStartTime = Date.now();
  }

  onTestResult(test, testResult) {
    const testName = test.path.split('/').pop();
    const { numPassingTests, numFailingTests, numTodoTests } = testResult;
    const duration = testResult.perfStats.end - testResult.perfStats.start;
    
    if (numFailingTests > 0) {
      console.log(`❌ ${testName}: ${numFailingTests} failed, ${numPassingTests} passed (${duration}ms)`);
      
      // Show failed test details with limited output
      testResult.testResults.forEach(result => {
        if (result.status === 'failed') {
          console.log(`   ❌ ${result.title}`);
          if (result.failureMessages && result.failureMessages.length > 0) {
            // Limit error message to first line to prevent timeout
            const firstLine = result.failureMessages[0].split('\n')[0];
            console.log(`      Error: ${firstLine.substring(0, 100)}${firstLine.length > 100 ? '...' : ''}`);
          }
        }
      });
    } else {
      console.log(`✅ ${testName}: ${numPassingTests} passed (${duration}ms)`);
    }
    
    if (numTodoTests > 0) {
      console.log(`   ⏳ ${numTodoTests} todo tests`);
    }
    
    this.testResults.push({
      testName,
      numPassingTests,
      numFailingTests,
      numTodoTests,
      duration
    });
  }

  onRunComplete(contexts, results) {
    const duration = Date.now() - this.startTime;
    const { numPassedTests, numFailedTests, numTodoTests, numTotalTests } = results;
    
    console.log('');
    console.log('🌳 ====================================================================');
    console.log('🌳 FUNCTIONAL TEST RESULTS SUMMARY');
    console.log('🌳 ====================================================================');
    console.log('');
    
    // Test breakdown
    console.log('📊 Test Results:');
    console.log(`   ✅ Passed: ${numPassedTests}`);
    if (numFailedTests > 0) {
      console.log(`   ❌ Failed: ${numFailedTests}`);
    }
    if (numTodoTests > 0) {
      console.log(`   ⏳ Todo: ${numTodoTests}`);
    }
    console.log(`   📈 Total: ${numTotalTests}`);
    console.log('');
    
    // Success rate
    const successRate = numTotalTests > 0 ? ((numPassedTests / numTotalTests) * 100).toFixed(1) : 0;
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️  Total Time: ${(duration / 1000).toFixed(2)}s`);
    console.log('');
    
    // File breakdown - limited to prevent timeout
    if (this.testResults.length > 0 && this.testResults.length <= 10) {
      console.log('📁 Test Files:');
      this.testResults.forEach(result => {
        const icon = result.numFailingTests > 0 ? '❌' : '✅';
        console.log(`   ${icon} ${result.testName}: ${result.numPassingTests} passed${result.numFailingTests > 0 ? `, ${result.numFailingTests} failed` : ''}`);
      });
      console.log('');
    } else if (this.testResults.length > 10) {
      console.log('📁 Test Files: (showing first 10)');
      this.testResults.slice(0, 10).forEach(result => {
        const icon = result.numFailingTests > 0 ? '❌' : '✅';
        console.log(`   ${icon} ${result.testName}: ${result.numPassingTests} passed${result.numFailingTests > 0 ? `, ${result.numFailingTests} failed` : ''}`);
      });
      console.log(`   ... and ${this.testResults.length - 10} more files`);
      console.log('');
    }
    
    // Overall result
    if (numFailedTests > 0) {
      console.log('🔥 ====================================================================');
      console.log(`🔥 FUNCTIONAL TESTS FAILED: ${numFailedTests} test(s) failed`);
      console.log('🔥 ====================================================================');
    } else {
      console.log('🎉 ====================================================================');
      console.log('🎉 ALL FUNCTIONAL TESTS PASSED!');
      console.log('🎉 ====================================================================');
    }
    console.log('');
  }
}

module.exports = FunctionalTestReporter;