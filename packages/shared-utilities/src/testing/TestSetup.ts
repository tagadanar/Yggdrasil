// packages/shared-utilities/src/testing/TestSetup.ts
// Centralized test setup orchestrator for all test infrastructure

import { WorkerConfigManager, WorkerConfig } from './WorkerConfig';
import { ServiceManager } from './ServiceManager';
import { DatabaseIsolationManager } from './DatabaseIsolation';

export interface TestSetupOptions {
  workerId?: number;
  startServices?: boolean;
  setupDatabase?: boolean;
  cleanupOnStart?: boolean;
  logLevel?: 'verbose' | 'normal' | 'quiet';
  serviceTimeout?: number;
}

export interface TestEnvironmentInfo {
  workerConfig: WorkerConfig;
  serviceManager: ServiceManager;
  databaseManager: DatabaseIsolationManager;
  isReady: boolean;
  services: {
    frontend: string;
    auth: string;
    user: string;
    news: string;
    course: string;
    planning: string;
    statistics: string;
  };
}

export class TestSetup {
  private workerConfig: WorkerConfig;
  private serviceManager: ServiceManager;
  private databaseManager: DatabaseIsolationManager;
  private options: Required<TestSetupOptions>;
  private isReady = false;

  constructor(options: TestSetupOptions = {}) {
    this.workerConfig = WorkerConfigManager.generateWorkerConfig(
      options.workerId ?? WorkerConfigManager.detectWorkerId()
    );
    
    this.options = {
      workerId: this.workerConfig.workerId,
      startServices: options.startServices ?? true,
      setupDatabase: options.setupDatabase ?? true,
      cleanupOnStart: options.cleanupOnStart ?? true,
      logLevel: options.logLevel ?? 'normal',
      serviceTimeout: options.serviceTimeout ?? 120000
    };

    // Initialize managers
    this.serviceManager = new ServiceManager({
      workerId: this.workerConfig.workerId,
      maxWaitTime: this.options.serviceTimeout,
      logLevel: this.options.logLevel
    });

    this.databaseManager = new DatabaseIsolationManager({
      workerId: this.workerConfig.workerId,
      cleanupOnStart: this.options.cleanupOnStart,
      logLevel: this.options.logLevel
    });

    this.log(`🎯 TEST SETUP: Initialized for Worker ${this.workerConfig.workerId}`);
  }

  private log(message: string, level: 'verbose' | 'normal' | 'error' = 'normal'): void {
    if (level === 'error' || this.options.logLevel === 'verbose' || 
        (this.options.logLevel === 'normal' && level === 'normal')) {
      console.log(message);
    }
  }

  /**
   * Initialize complete test environment
   */
  async initialize(): Promise<TestEnvironmentInfo> {
    this.log('🚀 TEST SETUP: Initializing complete test environment...');
    
    try {
      // Apply worker environment variables
      WorkerConfigManager.applyWorkerEnvironment(this.workerConfig.workerId);
      
      // Setup database if requested
      if (this.options.setupDatabase) {
        this.log('🔧 TEST SETUP: Setting up database isolation...');
        await this.databaseManager.initialize();
      }
      
      // Start services if requested
      if (this.options.startServices) {
        this.log('🔧 TEST SETUP: Starting services...');
        const servicesStarted = await this.serviceManager.startServices();
        if (!servicesStarted) {
          throw new Error('Failed to start services');
        }
      }
      
      this.isReady = true;
      this.log('✅ TEST SETUP: Environment ready!');
      
      return this.getEnvironmentInfo();
      
    } catch (error) {
      this.log(`❌ TEST SETUP: Failed to initialize: ${error}`, 'error');
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Get current environment information
   */
  getEnvironmentInfo(): TestEnvironmentInfo {
    const services = {
      frontend: `http://localhost:${this.workerConfig.ports.frontend}`,
      auth: `http://localhost:${this.workerConfig.ports.auth}`,
      user: `http://localhost:${this.workerConfig.ports.user}`,
      news: `http://localhost:${this.workerConfig.ports.news}`,
      course: `http://localhost:${this.workerConfig.ports.course}`,
      planning: `http://localhost:${this.workerConfig.ports.planning}`,
      statistics: `http://localhost:${this.workerConfig.ports.statistics}`
    };

    return {
      workerConfig: this.workerConfig,
      serviceManager: this.serviceManager,
      databaseManager: this.databaseManager,
      isReady: this.isReady,
      services
    };
  }

  /**
   * Check if environment is healthy
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isReady) {
      return false;
    }

    try {
      // Check services if they were started
      if (this.options.startServices) {
        const servicesHealthy = await this.serviceManager.healthCheck();
        if (!servicesHealthy) {
          this.log('❌ TEST SETUP: Services are not healthy', 'error');
          return false;
        }
      }

      // Check database if it was setup
      if (this.options.setupDatabase) {
        const dbStats = this.databaseManager.getStatistics();
        if (!dbStats.isInitialized) {
          this.log('❌ TEST SETUP: Database is not initialized', 'error');
          return false;
        }
      }

      this.log('✅ TEST SETUP: Environment is healthy');
      return true;
      
    } catch (error) {
      this.log(`❌ TEST SETUP: Health check failed: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Create test user with proper isolation
   */
  async createTestUser(userData: { email: string; password: string; role?: string }): Promise<any> {
    if (!this.options.setupDatabase) {
      throw new Error('Database setup is required to create test users');
    }

    // Dynamically import bcrypt to avoid bundling issues in frontend
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    return await this.databaseManager.createTestUser({
      ...userData,
      password: hashedPassword
    });
  }

  /**
   * Get API client configuration for this worker
   */
  getApiConfig(): {
    baseURL: string;
    authURL: string;
    userURL: string;
    newsURL: string;
    courseURL: string;
    planningURL: string;
    statisticsURL: string;
  } {
    return {
      baseURL: `http://localhost:${this.workerConfig.ports.auth}/api`,
      authURL: `http://localhost:${this.workerConfig.ports.auth}/api/auth`,
      userURL: `http://localhost:${this.workerConfig.ports.user}/api/users`,
      newsURL: `http://localhost:${this.workerConfig.ports.news}/api/news`,
      courseURL: `http://localhost:${this.workerConfig.ports.course}/api/courses`,
      planningURL: `http://localhost:${this.workerConfig.ports.planning}/api/planning`,
      statisticsURL: `http://localhost:${this.workerConfig.ports.statistics}/api/statistics`
    };
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    this.log('🧹 TEST SETUP: Cleaning up test environment...');
    
    try {
      // Stop services
      if (this.options.startServices) {
        await this.serviceManager.stopServices();
      }
      
      // Cleanup database
      if (this.options.setupDatabase) {
        await this.databaseManager.shutdown();
      }
      
      this.isReady = false;
      this.log('✅ TEST SETUP: Cleanup complete');
      
    } catch (error) {
      this.log(`❌ TEST SETUP: Cleanup failed: ${error}`, 'error');
    }
  }

  /**
   * Get worker configuration
   */
  getWorkerConfig(): WorkerConfig {
    return this.workerConfig;
  }

  /**
   * Quick setup for single test
   */
  static async quickSetup(workerId?: number): Promise<TestEnvironmentInfo> {
    const setup = new TestSetup({ 
      workerId,
      logLevel: 'quiet'
    });
    return await setup.initialize();
  }

  /**
   * Setup for multiple workers (global setup)
   */
  static async setupAllWorkers(workerCount: number = 4): Promise<TestEnvironmentInfo[]> {
    const environments: TestEnvironmentInfo[] = [];
    
    console.log(`🚀 TEST SETUP: Setting up ${workerCount} workers...`);
    
    // Initialize all workers in parallel
    const setupPromises = [];
    for (let workerId = 0; workerId < workerCount; workerId++) {
      const setup = new TestSetup({ 
        workerId,
        logLevel: 'normal'
      });
      setupPromises.push(setup.initialize());
    }
    
    try {
      const results = await Promise.all(setupPromises);
      environments.push(...results);
      
      console.log('✅ TEST SETUP: All workers ready!');
      for (const env of environments) {
        console.log(`   Worker ${env.workerConfig.workerId}: ${env.services.frontend}`);
      }
      
      return environments;
      
    } catch (error) {
      console.error('❌ TEST SETUP: Failed to setup workers:', error);
      
      // Cleanup any successful setups
      for (const env of environments) {
        try {
          await env.serviceManager.stopServices();
          await env.databaseManager.shutdown();
        } catch (cleanupError) {
          console.error(`Failed to cleanup worker ${env.workerConfig.workerId}:`, cleanupError);
        }
      }
      
      throw error;
    }
  }
}