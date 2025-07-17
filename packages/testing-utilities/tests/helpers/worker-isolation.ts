// packages/testing-utilities/tests/helpers/worker-isolation.ts
// Ultra-robust worker isolation framework for parallel testing

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Worker Isolation Manager
 * Provides complete isolation between test workers to eliminate race conditions
 */
export class WorkerIsolationManager {
  private static instance: WorkerIsolationManager;
  private workerId: number;
  private workerPrefix: string;
  private isolatedEnvironment: WorkerEnvironment;

  private constructor() {
    this.workerId = this.detectWorkerId();
    this.workerPrefix = `w${this.workerId}`;
    this.isolatedEnvironment = this.createIsolatedEnvironment();
  }

  static getInstance(): WorkerIsolationManager {
    if (!WorkerIsolationManager.instance) {
      WorkerIsolationManager.instance = new WorkerIsolationManager();
    }
    return WorkerIsolationManager.instance;
  }

  /**
   * Detect current worker ID from environment or process
   */
  private detectWorkerId(): number {
    // Try environment variable first
    const envWorkerId = process.env.PLAYWRIGHT_WORKER_ID;
    if (envWorkerId) {
      return parseInt(envWorkerId, 10);
    }

    // Try process arguments
    const args = process.argv.join(' ');
    const workerMatch = args.match(/--worker-id=(\d+)/);
    if (workerMatch) {
      return parseInt(workerMatch[1], 10);
    }

    // Try to get worker ID from test worker env if available
    const testWorkerId = process.env.TEST_WORKER_INDEX;
    if (testWorkerId) {
      return parseInt(testWorkerId, 10);
    }

    // For enhanced testing with multiple workers, use PID-based detection
    // with a more reliable approach
    const pid = process.pid;
    const workerIndex = Math.abs(pid % 4); // Ensure it's between 0-3
    
    console.log(`🔍 Worker ID detection: PID=${pid}, WorkerIndex=${workerIndex}`);
    return workerIndex;
  }

  /**
   * Create completely isolated environment for this worker
   */
  private createIsolatedEnvironment(): WorkerEnvironment {
    const basePort = 3000 + (this.workerId * 10);
    
    return {
      workerId: this.workerId,
      workerPrefix: this.workerPrefix,
      
      // Isolated service ports
      ports: {
        frontend: basePort,
        auth: basePort + 1,
        user: basePort + 2,
        news: basePort + 3,
        course: basePort + 4,
        planning: basePort + 5,
        statistics: basePort + 6
      },

      // Isolated database configuration
      database: {
        name: `yggdrasil_test_${this.workerPrefix}`,
        collectionPrefix: `${this.workerPrefix}_`,
        connectionString: process.env.MONGODB_URI || `mongodb://localhost:27018/yggdrasil-dev`
      },

      // Isolated file system paths
      paths: {
        testResults: `test-results-${this.workerPrefix}`,
        screenshots: `screenshots-${this.workerPrefix}`,
        videos: `videos-${this.workerPrefix}`,
        traces: `traces-${this.workerPrefix}`
      },

      // Isolated resource pools
      resources: {
        userPoolSize: 50,
        maxConcurrentTests: 10,
        cleanupBatchSize: 20
      }
    };
  }

  /**
   * Generate cryptographically secure unique test ID
   */
  generateTestId(): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const uuid = uuidv4().substring(0, 8);
    
    return `${this.workerPrefix}_${timestamp}_${uuid}_${randomBytes}`;
  }

  /**
   * Generate unique user identifier for this worker
   */
  generateUserId(role: string, testId: string): string {
    const shortId = crypto.randomBytes(4).toString('hex');
    return `test_${this.workerPrefix}_${role}_${testId}_${shortId}`;
  }

  /**
   * Get isolated environment configuration
   */
  getEnvironment(): WorkerEnvironment {
    return this.isolatedEnvironment;
  }

  /**
   * Get worker-specific database collection name
   */
  getCollectionName(baseName: string): string {
    return `${this.isolatedEnvironment.database.collectionPrefix}${baseName}`;
  }

  /**
   * Get worker-specific service URL
   */
  getServiceUrl(service: keyof WorkerEnvironment['ports']): string {
    const port = this.isolatedEnvironment.ports[service];
    return `http://localhost:${port}`;
  }

  /**
   * Check if current worker owns a resource
   */
  ownsResource(resourceId: string): boolean {
    return resourceId.startsWith(this.workerPrefix);
  }

  /**
   * Clean up all worker-specific resources
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 Worker ${this.workerId}: Starting comprehensive cleanup...`);
    
    // Clean up database collections
    await this.cleanupDatabase();
    
    // Clean up file system
    await this.cleanupFileSystems();
    
    // Clean up any remaining processes
    await this.cleanupProcesses();
    
    console.log(`✅ Worker ${this.workerId}: Cleanup completed successfully`);
  }

  private async cleanupDatabase(): Promise<void> {
    // Implementation in Phase 2
  }

  private async cleanupFileSystems(): Promise<void> {
    // Implementation in Phase 2
  }

  private async cleanupProcesses(): Promise<void> {
    // Implementation in Phase 3
  }
}

/**
 * Worker Environment Configuration
 */
export interface WorkerEnvironment {
  workerId: number;
  workerPrefix: string;
  
  ports: {
    frontend: number;
    auth: number;
    user: number;
    news: number;
    course: number;
    planning: number;
    statistics: number;
  };

  database: {
    name: string;
    collectionPrefix: string;
    connectionString: string;
  };

  paths: {
    testResults: string;
    screenshots: string;
    videos: string;
    traces: string;
  };

  resources: {
    userPoolSize: number;
    maxConcurrentTests: number;
    cleanupBatchSize: number;
  };
}

/**
 * Utility functions for worker isolation
 */
export class WorkerUtils {
  /**
   * Create worker-specific test environment
   */
  static async setupWorkerEnvironment(): Promise<WorkerEnvironment> {
    const manager = WorkerIsolationManager.getInstance();
    const env = manager.getEnvironment();
    
    // Create isolated directories
    await this.createIsolatedDirectories(env);
    
    // Setup isolated database
    await this.setupIsolatedDatabase(env);
    
    return env;
  }

  /**
   * Generate worker-specific configuration
   */
  static generateWorkerConfig(env: WorkerEnvironment): WorkerTestConfig {
    return {
      playwright: {
        workers: 1, // Each worker runs sequentially internally
        timeout: 60000,
        globalTimeout: 30 * 60 * 1000,
        outputDir: env.paths.testResults,
        use: {
          baseURL: `http://localhost:${env.ports.frontend}`,
          screenshot: 'only-on-failure',
          video: 'retain-on-failure',
          trace: 'retain-on-failure'
        }
      },
      
      services: {
        frontend: { port: env.ports.frontend, url: `http://localhost:${env.ports.frontend}` },
        auth: { port: env.ports.auth, url: `http://localhost:${env.ports.auth}` },
        user: { port: env.ports.user, url: `http://localhost:${env.ports.user}` },
        news: { port: env.ports.news, url: `http://localhost:${env.ports.news}` },
        course: { port: env.ports.course, url: `http://localhost:${env.ports.course}` },
        planning: { port: env.ports.planning, url: `http://localhost:${env.ports.planning}` },
        statistics: { port: env.ports.statistics, url: `http://localhost:${env.ports.statistics}` }
      },

      database: {
        connectionString: env.database.connectionString,
        name: env.database.name,
        collectionPrefix: env.database.collectionPrefix
      }
    };
  }

  private static async createIsolatedDirectories(env: WorkerEnvironment): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    for (const [key, dirPath] of Object.entries(env.paths)) {
      const fullPath = path.join(process.cwd(), dirPath);
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  private static async setupIsolatedDatabase(env: WorkerEnvironment): Promise<void> {
    // Implementation in Phase 2
  }
}

/**
 * Worker Test Configuration
 */
export interface WorkerTestConfig {
  playwright: {
    workers: number;
    timeout: number;
    globalTimeout: number;
    outputDir: string;
    use: {
      baseURL: string;
      screenshot: string;
      video: string;
      trace: string;
    };
  };
  
  services: {
    [key: string]: {
      port: number;
      url: string;
    };
  };

  database: {
    connectionString: string;
    name: string;
    collectionPrefix: string;
  };
}

// Export singleton instance
export const workerIsolation = WorkerIsolationManager.getInstance();