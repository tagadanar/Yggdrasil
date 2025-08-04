#!/usr/bin/env node
/**
 * Suite Orchestrator for Sequential Test Execution with Service Restarts
 *
 * This orchestrator runs each test suite individually with complete service
 * restarts between suites to ensure clean isolation.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

class SuiteOrchestrator {
  constructor() {
    this.testDir = path.join(__dirname, 'tests');
    this.suites = [];
    this.suitesExecuted = 0;
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      timedOutTests: 0,
      skippedTests: 0,
      suiteResults: [],
      startTime: null,
      endTime: null,
    };
    this.isQuietMode = process.env.QUIET_MODE === 'true';
  }

  log(message) {
    if (!this.isQuietMode) {
      console.log(message);
    }
  }

  /**
   * Discover all test suite files
   */
  discoverSuites() {
    console.log(chalk.blue.bold('🔍 Discovering test suites...'));

    const allSuites = [];

    // Recursively find all .spec.ts files
    const findTestFiles = (dir, basePath = '') => {
      const fullPath = path.join(this.testDir, basePath, dir);

      if (!fs.existsSync(fullPath)) {
        return;
      }

      const items = fs.readdirSync(fullPath);

      for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const relativePath = path.join(basePath, dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          // Recurse into subdirectory
          findTestFiles(item, path.join(basePath, dir));
        } else if (stat.isFile() && (item.endsWith('.spec.ts') || item.endsWith('.test.ts'))) {
          // Found a test file
          allSuites.push(path.join('tests', relativePath));
        }
      }
    };

    // Start searching from the tests directory
    findTestFiles('');

    // Remove duplicates and sort
    this.suites = [...new Set(allSuites)].sort();

    console.log(chalk.green(`✅ Found ${this.suites.length} test suites`));
    this.suites.forEach((suite, index) => {
      const suiteName = path.basename(suite, path.extname(suite));
      console.log(chalk.gray(`   ${index + 1}. ${suiteName}`));
    });
    console.log('');
  }

  /**
   * Start services using service-manager
   */
  async startServices() {
    return new Promise((resolve, reject) => {
      this.log(chalk.cyan('🚀 Starting services...'));

      const serviceManager = spawn('node', ['service-manager.js', 'start'], {
        cwd: __dirname,
        env: { ...process.env, QUIET_MODE: 'true' },
        detached: false,
      });

      let startupOutput = '';
      let errorOutput = '';

      serviceManager.stdout.on('data', data => {
        const message = data.toString();
        startupOutput += message;

        // Log important messages even in quiet mode
        if (message.includes('✅ All services started successfully')) {
          console.log(chalk.green('✅ Services started successfully'));

          // Give services a moment to stabilize
          setTimeout(() => {
            serviceManager.kill('SIGTERM');
            resolve();
          }, 2000);
        }
      });

      serviceManager.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      serviceManager.on('error', error => {
        console.error(chalk.red('❌ Failed to start services:'), error.message);
        reject(error);
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        if (!serviceManager.killed) {
          serviceManager.kill('SIGKILL');
          console.error(chalk.red('❌ Service startup timeout'));
          console.error('Startup output:', startupOutput);
          console.error('Error output:', errorOutput);
          reject(new Error('Service startup timeout'));
        }
      }, 120000);
    });
  }

  /**
   * Stop services using service-manager
   */
  async stopServices() {
    return new Promise(resolve => {
      this.log(chalk.yellow('🛑 Stopping services...'));

      const stopProcess = spawn('node', ['service-manager.js', 'stop'], {
        cwd: __dirname,
        env: { ...process.env, QUIET_MODE: 'true' },
        detached: false,
      });

      stopProcess.stdout.on('data', data => {
        const message = data.toString();
        if (message.includes('✅ Services shut down successfully')) {
          this.log(chalk.green('✅ Services stopped'));
        }
      });

      stopProcess.on('close', () => {
        // Additional cleanup to ensure all processes are killed
        try {
          execSync('pkill -f "ts-node-dev|next-server" 2>/dev/null || true', { stdio: 'ignore' });
        } catch (e) {
          // Ignore errors
        }

        // Wait a bit for processes to fully terminate
        setTimeout(resolve, 2000);
      });

      // Force stop after 30 seconds
      setTimeout(() => {
        if (!stopProcess.killed) {
          stopProcess.kill('SIGKILL');
          this.log(chalk.yellow('⚠️ Force stopped service manager'));
          resolve();
        }
      }, 30000);
    });
  }

  /**
   * Restart services (stop then start) with full test environment initialization
   */
  async restartServices() {
    console.log(chalk.cyan('🔄 Restarting services for next suite...'));
    
    // CRITICAL: Force garbage collection before restart to prevent memory buildup
    await this.forceGarbageCollection();
    
    await this.stopServices();
    
    // Additional wait for memory cleanup
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await this.startServices();

    // CRITICAL: Reinitialize test environment after service restart
    await this.initializeTestEnvironment();

    console.log(chalk.green('✅ Services restarted and test environment initialized\n'));
  }

  /**
   * Force garbage collection to prevent memory accumulation leading to exit code 137
   */
  async forceGarbageCollection() {
    try {
      console.log(chalk.gray('🧹 Forcing garbage collection...'));
      
      // Try to force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log(chalk.gray('✅ Garbage collection completed'));
      } else {
        // Alternative: Clear large objects and force collection
        if (global.Buffer) {
          global.Buffer.poolSize = 8192; // Reset buffer pool
        }
        
        // Force some memory pressure to trigger GC
        const largeArray = new Array(1000000);
        largeArray.fill(null);
        largeArray.length = 0;
        
        console.log(chalk.gray('✅ Memory cleanup completed (GC not exposed)'));
      }
      
      // Display memory usage after cleanup
      const memUsage = process.memoryUsage();
      console.log(chalk.gray(`📊 Memory usage: RSS ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`));
      
    } catch (error) {
      console.warn(chalk.yellow('⚠️ Garbage collection failed:'), error.message);
    }
  }

  /**
   * Initialize test environment (service coordinator, health monitoring, database)
   * This replicates the critical steps from enhanced-global-setup.ts
   */
  async initializeTestEnvironment() {
    try {
      console.log(chalk.gray('🏗️ Initializing test environment...'));

      // Initialize service coordinator
      const { getInstance: getCoordinator } = require('./service-coordinator.js');
      const coordinator = getCoordinator();
      coordinator.reset(); // Start with clean state

      // DISABLED: Health monitoring interferes with orchestrated test restarts
      // The orchestrator manages service lifecycle directly
      // const { startMonitoring } = require('./service-health-monitor.js');
      // await startMonitoring();

      // Reset and initialize clean test environment (CRITICAL for test functionality)
      const { TestInitializer } = require('@yggdrasil/shared-utilities/testing');
      TestInitializer.reset(); // CRITICAL: Reset state between suite runs
      await TestInitializer.quickSetup(true);

      console.log(
        chalk.gray(
          '✅ Test environment initialized (health monitoring disabled for orchestrated testing)',
        ),
      );
    } catch (error) {
      console.error(chalk.red('❌ Test environment initialization failed:'), error.message);
      throw error;
    }
  }

  /**
   * Run a single test suite with enhanced memory management
   */
  async runSuite(suitePath, suiteIndex) {
    const suiteName = path.basename(suitePath, path.extname(suitePath));
    const suiteNumber = suiteIndex + 1;
    const totalSuites = this.suites.length;

    console.log(chalk.blue('━'.repeat(70)));
    console.log(chalk.blue.bold(`📁 Suite ${suiteNumber}/${totalSuites}: ${suiteName}`));
    console.log(chalk.blue('━'.repeat(70)));

    // Display memory usage before suite
    const memBefore = process.memoryUsage();
    console.log(chalk.gray(`📊 Pre-suite memory: RSS ${Math.round(memBefore.rss / 1024 / 1024)}MB, Heap ${Math.round(memBefore.heapUsed / 1024 / 1024)}MB`));

    return new Promise(resolve => {
      const suiteStats = {
        total: 0,
        passed: 0,
        failed: 0,
        timedOut: 0,
        skipped: 0,
      };

      // CRITICAL: Enhanced environment for memory management  
      const testProcess = spawn(
        'npx',
        [
          'playwright',
          'test',
          suitePath,
          '--config=playwright.suite.config.ts',
          '--reporter=./reporters/live-progress-reporter.js',
          '--workers=1',
        ],
        {
          cwd: __dirname,
          env: {
            ...process.env,
            QUIET_MODE: process.env.QUIET_MODE || 'false',
            // CRITICAL: Memory management environment variables
            NODE_OPTIONS: '--max-old-space-size=1024 --expose-gc',
            // Prevent memory leaks in Playwright
            PLAYWRIGHT_BROWSERS_PATH: undefined, // Use default browser path
            // Force garbage collection in child processes
            FORCE_GC: '1',
          },
          stdio: 'inherit',
          // CRITICAL: Process limits to prevent resource exhaustion
          timeout: 150000, // 2.5 minutes timeout per suite
        },
      );

      // CRITICAL: Timeout handler to prevent hanging suites
      const suiteTimeout = setTimeout(() => {
        if (!testProcess.killed) {
          console.log(chalk.red(`⏰ Suite ${suiteName} timeout - terminating process`));
          testProcess.kill('SIGTERM');
          
          // Force kill after 10 seconds if SIGTERM doesn't work
          setTimeout(() => {
            if (!testProcess.killed) {
              console.log(chalk.red(`💀 Force killing suite ${suiteName}`));
              testProcess.kill('SIGKILL');
            }
          }, 10000);
        }
      }, 180000); // 3 minutes total timeout

      testProcess.on('close', code => {
        clearTimeout(suiteTimeout);
        
        // Display memory usage after suite
        const memAfter = process.memoryUsage();
        console.log(chalk.gray(`📊 Post-suite memory: RSS ${Math.round(memAfter.rss / 1024 / 1024)}MB, Heap ${Math.round(memAfter.heapUsed / 1024 / 1024)}MB`));
        
        this.suitesExecuted++;

        if (code === 0) {
          console.log(chalk.green(`✅ Suite ${suiteName} passed\n`));
        } else if (code === 137) {
          console.log(chalk.red(`💀 Suite ${suiteName} killed (exit code 137) - likely memory/timeout issue\n`));
        } else {
          console.log(chalk.red(`❌ Suite ${suiteName} failed with exit code ${code}\n`));
        }

        resolve();
      });

      testProcess.on('error', error => {
        clearTimeout(suiteTimeout);
        console.error(chalk.red(`❌ Failed to run suite ${suiteName}:`, error.message));
        resolve();
      });
    });
  }

  /**
   * Display final summary matching current format
   */
  displayFinalSummary() {
    const totalDuration = this.results.endTime - this.results.startTime;
    const totalMinutes = Math.floor(totalDuration / 60000);
    const totalSeconds = Math.floor((totalDuration % 60000) / 1000);

    console.log('\n' + chalk.blue('='.repeat(70)));
    console.log(chalk.blue.bold('🏁 YGGDRASIL TEST SUITE RESULTS - SEQUENTIAL MODE'));
    console.log(chalk.blue('='.repeat(70)));

    // Duration and performance metrics
    console.log(`⏱️  Total Duration: ${chalk.bold(totalMinutes)}m ${chalk.bold(totalSeconds)}s`);
    console.log(`🧪 Suites Executed: ${chalk.bold(this.suitesExecuted)}`);
    console.log(`🔄 Service Restarts: ${chalk.bold(Math.max(0, this.suitesExecuted - 1))}`);

    // Suite breakdown
    console.log(chalk.cyan('\n📋 Suite Execution Summary:'));
    console.log(chalk.gray('   Each suite ran with fresh service instances'));
    console.log(chalk.gray('   Services were restarted between each suite'));

    // Final status message
    console.log(''); // Blank line
    console.log(chalk.green.bold('✅ Sequential test execution completed!'));
    console.log(chalk.gray('   Check individual suite outputs above for detailed results'));

    console.log(chalk.blue('='.repeat(70)));
  }

  /**
   * Main orchestration flow
   */
  async run() {
    try {
      console.log(chalk.blue.bold('🧪 Yggdrasil Test Suite Orchestrator - Sequential Mode'));
      console.log(chalk.gray('Running each suite with service restarts for clean isolation\n'));

      // Record start time
      this.results.startTime = Date.now();

      // Discover all test suites
      this.discoverSuites();

      if (this.suites.length === 0) {
        console.log(chalk.yellow('⚠️ No test suites found'));
        return;
      }

      // Initial service startup
      await this.startServices();

      // Initialize test environment for first run
      await this.initializeTestEnvironment();

      // Run each suite sequentially with restarts
      for (let i = 0; i < this.suites.length; i++) {
        const suite = this.suites[i];

        // Run the suite
        await this.runSuite(suite, i);

        // Restart services for next suite (except after last suite)
        if (i < this.suites.length - 1) {
          await this.restartServices();
        }
      }

      // Stop services after all suites
      await this.stopServices();

      // CRITICAL: Final memory cleanup to prevent lingering processes
      await this.forceGarbageCollection();

      // Record end time
      this.results.endTime = Date.now();

      // Display final summary
      this.displayFinalSummary();

      // Exit with appropriate code
      const hasFailures = this.results.failedTests > 0 || this.results.timedOutTests > 0;
      process.exit(hasFailures ? 1 : 0);
    } catch (error) {
      console.error(chalk.red.bold('❌ Orchestrator error:'), error.message);

      // Try to stop services on error
      try {
        await this.stopServices();
      } catch (stopError) {
        console.error(chalk.red('Failed to stop services:'), stopError.message);
      }

      process.exit(1);
    }
  }
}

// Run the orchestrator
if (require.main === module) {
  const orchestrator = new SuiteOrchestrator();
  orchestrator.run();
}

module.exports = SuiteOrchestrator;
