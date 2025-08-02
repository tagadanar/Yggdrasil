#!/usr/bin/env node
/**
 * Live Progress Reporter for Playwright Tests
 *
 * Provides real-time test progress updates with clean, colored output.
 * Designed for the Yggdrasil testing framework's quiet test mode.
 *
 * Features:
 * - Live "RUNNING" status updates
 * - Immediate PASS/FAIL feedback
 * - Progress tracking [completed/total %]
 * - Clean test name formatting
 * - Colored output with consistent styling
 * - Duration tracking
 * - Comprehensive final summary
 */

const chalk = require('chalk');
const path = require('path');

class LiveProgressReporter {
  constructor(options = {}) {
    this.options = {
      showProgress: true,
      showDuration: true,
      cleanTestNames: true,
      maxTestNameLength: 80,
      ...options,
    };

    // Test tracking
    this.totalTests = 0;
    this.completedTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.timedOutTests = 0;
    this.skippedTests = 0;
    this.startTime = null;

    // Current test tracking
    this.currentTest = null;
    this.currentTestStartTime = null;

    // For summary data export
    this.results = [];

    // Track test suites for better organization
    this.currentSuite = '';
    this.suiteStartTime = null;
  }

  // Required method for Playwright - tells Playwright we handle stdio
  printsToStdio() {
    return true;
  }

  onBegin(config, suite) {
    this.totalTests = suite.allTests().length;
    this.startTime = Date.now();

    console.log(chalk.blue.bold('🧪 Yggdrasil Test Suite - Quiet Mode'));
    console.log(chalk.gray(`📊 Total tests: ${this.totalTests}`));
    console.log(''); // Blank line for spacing
  }

  onTestBegin(test, result) {
    this.currentTest = test;
    this.currentTestStartTime = Date.now();

    // Track suite changes for better organization
    const suiteName = this.extractSuiteName(test);
    if (suiteName !== this.currentSuite) {
      this.currentSuite = suiteName;
      this.suiteStartTime = Date.now();
      console.log(chalk.cyan(`\n📁 ${suiteName}`));
    }

    const cleanName = this.cleanTestName(test.title);
    const progress = this.formatProgress();

    // Show running status with spinner-like indicator
    console.log(`${progress} ${chalk.yellow('🔄 RUNNING:')} ${cleanName}`);
  }

  onTestEnd(test, result) {
    this.completedTests++;
    const duration = Date.now() - this.currentTestStartTime;
    const cleanName = this.cleanTestName(test.title);
    const progress = this.formatProgress();

    let statusIcon, statusText, statusColor;

    switch (result.status) {
      case 'passed':
        this.passedTests++;
        statusIcon = '✓';
        statusText = 'PASS';
        statusColor = chalk.green;
        break;
      case 'failed':
        this.failedTests++;
        statusIcon = '✗';
        statusText = 'FAIL';
        statusColor = chalk.red;
        break;
      case 'timedout':
        this.timedOutTests++;
        statusIcon = '⏱';
        statusText = 'TIMEOUT';
        statusColor = chalk.yellow;
        break;
      case 'skipped':
        this.skippedTests++;
        statusIcon = '○';
        statusText = 'SKIP';
        statusColor = chalk.gray;
        break;
      default:
        statusIcon = '?';
        statusText = result.status.toUpperCase();
        statusColor = chalk.gray;
    }

    const durationText = this.formatDuration(duration);
    const statusLine = `${progress} ${statusColor(statusIcon + ' ' + statusText + ':')} ${cleanName} ${chalk.gray('(' + durationText + ')')}`;

    console.log(statusLine);

    // Store result for summary
    this.results.push({
      title: test.title,
      suite: this.extractSuiteName(test),
      status: result.status,
      duration,
      error: result.error?.message,
    });

    // In quiet mode, don't show immediate error details - save for summary
  }

  onEnd(result) {
    const totalDuration = Date.now() - this.startTime;
    const totalMinutes = Math.floor(totalDuration / 60000);
    const totalSeconds = Math.floor((totalDuration % 60000) / 1000);

    console.log('\n' + chalk.blue('='.repeat(70)));
    console.log(chalk.blue.bold('🏁 YGGDRASIL TEST SUITE RESULTS'));
    console.log(chalk.blue('='.repeat(70)));

    // Duration and performance metrics
    console.log(`⏱️  Total Duration: ${chalk.bold(totalMinutes)}m ${chalk.bold(totalSeconds)}s`);
    console.log(`🧪 Tests Executed: ${chalk.bold(this.totalTests)}`);

    // Results breakdown
    console.log(`✅ Passed: ${chalk.green.bold(this.passedTests)}`);
    console.log(`❌ Failed: ${chalk.red.bold(this.failedTests)}`);
    if (this.timedOutTests > 0) {
      console.log(`⏱️  Timed out: ${chalk.yellow.bold(this.timedOutTests)}`);
    }
    if (this.skippedTests > 0) {
      console.log(`○ Skipped: ${chalk.gray.bold(this.skippedTests)}`);
    }

    // Success rate calculation
    const totalExecuted = this.passedTests + this.failedTests + this.timedOutTests;
    const successRate =
      totalExecuted > 0 ? Math.round((this.passedTests / totalExecuted) * 100) : 0;
    console.log(`📊 Success Rate: ${chalk.bold(successRate + '%')}`);

    // Performance metrics
    const averageTestTime =
      totalExecuted > 0 ? Math.round(totalDuration / totalExecuted / 1000) : 0;
    console.log(`⚡ Average Test Time: ${chalk.bold(averageTestTime)}s`);

    // Final status
    console.log(''); // Blank line
    if (this.failedTests === 0 && this.timedOutTests === 0) {
      console.log(chalk.green.bold('🎉 ALL TESTS PASSED! Platform is stable.'));
    } else {
      const totalFailures = this.failedTests + this.timedOutTests;
      console.log(chalk.red.bold(`🚨 ${totalFailures} TEST(S) FAILED - Investigation required`));

      // Show failed test summary
      if (totalFailures > 0 && totalFailures <= 5) {
        console.log(chalk.red('\n📋 Failed Tests:'));
        this.results
          .filter(r => r.status === 'failed' || r.status === 'timedout')
          .forEach(r => {
            console.log(chalk.red(`   • ${r.title} (${r.suite})`));
          });
      }
    }

    console.log(chalk.blue('='.repeat(70)));
  }

  // Utility methods
  cleanTestName(title) {
    if (!this.options.cleanTestNames) return title;

    // Remove file paths and technical details while preserving test essence
    let cleaned = title
      // Remove file path prefixes
      .replace(/^.*[\/\\]([^\/\\]+\.spec\.ts):\s*/, '')
      .replace(/^[^\/\\]*\.spec\.ts:\s*/, '')
      // Remove line numbers and technical markers
      .replace(/:\d+:\d+/g, '')
      .replace(/^\d+:\d+\s*›\s*/, '')
      // Remove common test framework prefixes
      .replace(/^(test|it|describe)\s*›\s*/i, '')
      .trim();

    // Truncate if too long, but preserve readability
    if (cleaned.length > this.options.maxTestNameLength) {
      const truncated = cleaned.substring(0, this.options.maxTestNameLength - 3);
      // Try to break at word boundary
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > this.options.maxTestNameLength * 0.7) {
        cleaned = truncated.substring(0, lastSpace) + '...';
      } else {
        cleaned = truncated + '...';
      }
    }

    return cleaned;
  }

  extractSuiteName(test) {
    // Extract test suite name from file path for better organization
    if (test.location && test.location.file) {
      const filePath = test.location.file;
      const fileName = path.basename(filePath, '.spec.ts');
      // Convert kebab-case to Title Case
      return fileName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'Unknown Suite';
  }

  formatProgress() {
    if (!this.options.showProgress) return '';

    const percentage =
      this.totalTests > 0 ? Math.round((this.completedTests / this.totalTests) * 100) : 0;

    return chalk.cyan(`[${this.completedTests}/${this.totalTests} ${percentage}%]`);
  }

  formatDuration(ms) {
    if (!this.options.showDuration) return '';

    if (ms < 1000) return `${ms}ms`;
    if (ms < 10000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms / 1000)}s`;
  }

  // Export results for script integration if needed
  getResults() {
    return {
      total: this.totalTests,
      passed: this.passedTests,
      failed: this.failedTests,
      timedOut: this.timedOutTests,
      skipped: this.skippedTests,
      duration: Date.now() - this.startTime,
      successRate: this.totalTests > 0 ? Math.round((this.passedTests / this.totalTests) * 100) : 0,
      results: this.results,
    };
  }

  // Error handling
  onError(error) {
    console.log(chalk.red(`\n💥 REPORTER ERROR: ${error.message}`));
    console.log(chalk.gray(error.stack));
  }
}

module.exports = LiveProgressReporter;
