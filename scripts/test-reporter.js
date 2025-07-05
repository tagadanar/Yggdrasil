// Custom Jest reporter for clean test summaries
class TestSummaryReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options || {};
  }

  onRunComplete(contexts, results) {
    const { testResults, numTotalTests, numPassedTests, numFailedTests, numPendingTests } = results;
    
    console.log('\n' + '='.repeat(80));
    console.log('🌳 YGGDRASIL TEST SUMMARY');
    console.log('='.repeat(80));
    
    // Overall stats
    console.log(`📊 Total Tests: ${numTotalTests}`);
    console.log(`✅ Passed: ${numPassedTests}`);
    console.log(`❌ Failed: ${numFailedTests}`);
    console.log(`⏳ Pending: ${numPendingTests}`);
    console.log(`📈 Success Rate: ${((numPassedTests / numTotalTests) * 100).toFixed(1)}%`);
    
    // Package breakdown
    console.log('\n📦 PACKAGE BREAKDOWN:');
    const packageCounts = {};
    
    testResults.forEach(result => {
      const packageName = this._getPackageName(result.testFilePath);
      if (!packageCounts[packageName]) {
        packageCounts[packageName] = { files: 0, hasFailures: false };
      }
      packageCounts[packageName].files += 1;
      if (result.numFailingTests > 0) {
        packageCounts[packageName].hasFailures = true;
      }
    });
    
    Object.entries(packageCounts).forEach(([packageName, stats]) => {
      const status = stats.hasFailures ? '❌' : '✅';
      console.log(`  ${status} ${packageName}: ${stats.files} test files`);
    });
    
    // Failed tests summary
    if (numFailedTests > 0) {
      console.log('\n🔥 FAILED TESTS:');
      testResults.forEach(result => {
        if (result.numFailingTests > 0) {
          const packageName = this._getPackageName(result.testFilePath);
          console.log(`  📁 ${packageName}:`);
          result.testResults.forEach(test => {
            if (test.status === 'failed') {
              console.log(`    ❌ ${test.fullName}`);
            }
          });
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`🎯 Overall Result: ${numFailedTests === 0 ? '✅ ALL TESTS PASSED' : `❌ ${numFailedTests} TESTS FAILED`}`);
    console.log('='.repeat(80) + '\n');
  }

  _groupByPackage(testResults) {
    const packages = {};
    
    testResults.forEach(result => {
      const packageName = this._getPackageName(result.testFilePath);
      
      if (!packages[packageName]) {
        packages[packageName] = { total: 0, passed: 0, failed: 0 };
      }
      
      // Extract counts from each test result
      packages[packageName].total += result.numTotalTests;
      packages[packageName].passed += result.numPassedTests;
      packages[packageName].failed += result.numFailingTests;
    });
    
    return packages;
  }

  _getPackageName(filePath) {
    const match = filePath.match(/packages\/([^/]+)/);
    return match ? match[1] : 'unknown';
  }
}

module.exports = TestSummaryReporter;