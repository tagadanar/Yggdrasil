// packages/shared-utilities/src/testing/WorkerConfig.ts
// Centralized worker configuration and port calculation for all test infrastructure

import { WorkerValidation } from './WorkerValidation';

export interface WorkerConfig {
  workerId: number;
  basePort: number;
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
    connectionUri: string;
  };
  environment: Record<string, string>;
}

export class WorkerConfigManager {
  /**
   * Detect worker ID from environment with consistent logic across all components
   */
  static detectWorkerId(): number {
    console.log(`🔍 WORKER CONFIG: Environment variables:`, {
      PLAYWRIGHT_WORKER_ID: process.env.PLAYWRIGHT_WORKER_ID,
      TEST_WORKER_INDEX: process.env.TEST_WORKER_INDEX,
      WORKER_ID: process.env.WORKER_ID
    });
    
    // Use centralized WorkerValidation for consistent bounds checking
    return WorkerValidation.validateWorkerId();
  }

  /**
   * Generate complete worker configuration for a given worker ID
   */
  static generateWorkerConfig(workerId: number): WorkerConfig {
    // Calculate ports with 10-port gaps between workers
    const basePort = 3000 + (workerId * 10);
    
    const ports = {
      frontend: basePort,
      auth: basePort + 1,
      user: basePort + 2,
      news: basePort + 3,
      course: basePort + 4,
      planning: basePort + 5,
      statistics: basePort + 6
    };

    // Generate database configuration
    const workerPrefix = `w${workerId}`;
    const database = {
      name: `yggdrasil_test_${workerPrefix}`,
      collectionPrefix: `${workerPrefix}_`,
      connectionUri: process.env.MONGODB_URI || `mongodb://localhost:27018/yggdrasil_test_${workerPrefix}`
    };

    // Generate environment variables for this worker
    const environment = {
      NODE_ENV: 'test',
      WORKER_ID: workerId.toString(),
      PLAYWRIGHT_WORKER_ID: workerId.toString(),
      TEST_WORKER_INDEX: workerId.toString(),
      
      // Database configuration
      DB_NAME: database.name,
      DB_COLLECTION_PREFIX: database.collectionPrefix,
      MONGODB_URI: database.connectionUri,
      
      // Service URLs for inter-service communication
      AUTH_SERVICE_URL: `http://localhost:${ports.auth}`,
      USER_SERVICE_URL: `http://localhost:${ports.user}`,
      NEWS_SERVICE_URL: `http://localhost:${ports.news}`,
      COURSE_SERVICE_URL: `http://localhost:${ports.course}`,
      PLANNING_SERVICE_URL: `http://localhost:${ports.planning}`,
      STATISTICS_SERVICE_URL: `http://localhost:${ports.statistics}`,
      
      // Frontend environment variables
      NEXT_PUBLIC_API_URL: `http://localhost:${ports.auth}`,
      NEXT_PUBLIC_USER_SERVICE_URL: `http://localhost:${ports.user}`,
      NEXT_PUBLIC_NEWS_SERVICE_URL: `http://localhost:${ports.news}`,
      NEXT_PUBLIC_COURSE_SERVICE_URL: `http://localhost:${ports.course}`,
      NEXT_PUBLIC_PLANNING_SERVICE_URL: `http://localhost:${ports.planning}`,
      NEXT_PUBLIC_STATISTICS_SERVICE_URL: `http://localhost:${ports.statistics}`,
      
      // Port assignments for each service
      PORT: basePort.toString(), // For frontend
      AUTH_SERVICE_PORT: ports.auth.toString(),
      USER_SERVICE_PORT: ports.user.toString(),
      NEWS_SERVICE_PORT: ports.news.toString(),
      COURSE_SERVICE_PORT: ports.course.toString(),
      PLANNING_SERVICE_PORT: ports.planning.toString(),
      STATISTICS_SERVICE_PORT: ports.statistics.toString()
    };

    return {
      workerId,
      basePort,
      ports,
      database,
      environment
    };
  }

  /**
   * Get current worker configuration (detects and generates)
   */
  static getCurrentWorkerConfig(): WorkerConfig {
    const workerId = this.detectWorkerId();
    return this.generateWorkerConfig(workerId);
  }

  /**
   * Get service port for a specific service type
   */
  static getServicePort(serviceType: keyof WorkerConfig['ports'], workerId?: number): number {
    const currentWorkerId = workerId ?? this.detectWorkerId();
    const config = this.generateWorkerConfig(currentWorkerId);
    return config.ports[serviceType];
  }

  /**
   * Get all worker configurations for multi-worker setup
   */
  static getAllWorkerConfigs(workerCount: number = 1): WorkerConfig[] {
    const configs: WorkerConfig[] = [];
    for (let i = 0; i < workerCount; i++) {
      configs.push(this.generateWorkerConfig(i));
    }
    return configs;
  }

  /**
   * Merge worker environment into current process environment
   */
  static applyWorkerEnvironment(workerId?: number): void {
    const currentWorkerId = workerId ?? this.detectWorkerId();
    const config = this.generateWorkerConfig(currentWorkerId);
    
    console.log(`🔧 WORKER CONFIG: Applying environment for Worker ${currentWorkerId}`);
    
    // Apply all environment variables
    Object.entries(config.environment).forEach(([key, value]) => {
      if (!process.env[key]) { // Don't override existing environment variables
        process.env[key] = value;
        console.log(`🔧 WORKER CONFIG: Set ${key}=${value}`);
      }
    });
  }
}