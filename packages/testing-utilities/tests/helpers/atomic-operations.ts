// packages/testing-utilities/tests/helpers/atomic-operations.ts
// Ultra-robust atomic operations framework for parallel testing

import { TestIdGenerator } from './test-id-generator';
import { DatabaseIsolationManager } from './database-isolation';
import { ResourcePoolManager } from './resource-pool-manager';
import { ServicePortManager } from './service-port-manager';
import { WorkerIsolationManager } from './worker-isolation';
import mongoose from 'mongoose';

/**
 * Atomic Operations Manager
 * Provides atomic test operations with rollback capability
 */
export class AtomicOperationsManager {
  private static instances: Map<number, AtomicOperationsManager> = new Map();
  private workerId: number;
  private workerPrefix: string;
  private testIdGenerator: TestIdGenerator;
  private dbManager: DatabaseIsolationManager;
  private resourceManager: ResourcePoolManager;
  private serviceManager: ServicePortManager;
  private activeTransactions: Map<string, AtomicTransaction> = new Map();
  private operationStack: Map<string, AtomicOperation[]> = new Map();

  private constructor(workerId: number) {
    this.workerId = workerId;
    this.workerPrefix = `w${workerId}`;
    this.testIdGenerator = TestIdGenerator.getInstance(workerId);
    this.dbManager = DatabaseIsolationManager.getInstance(workerId);
    this.resourceManager = ResourcePoolManager.getInstance(workerId);
    this.serviceManager = ServicePortManager.getInstance(workerId);
  }

  static getInstance(workerId?: number): AtomicOperationsManager {
    const worker = WorkerIsolationManager.getInstance();
    const id = workerId || worker.getEnvironment().workerId;
    
    if (!AtomicOperationsManager.instances.has(id)) {
      AtomicOperationsManager.instances.set(id, new AtomicOperationsManager(id));
    }
    return AtomicOperationsManager.instances.get(id)!;
  }

  /**
   * Execute atomic test operation
   */
  async executeAtomicTest<T>(
    testContext: AtomicTestContext,
    operation: (context: AtomicTestContext) => Promise<T>
  ): Promise<T> {
    const testId = this.testIdGenerator.generateTestId({
      suiteName: testContext.suiteName,
      testName: testContext.testName,
      testFile: testContext.testFile,
      userRole: testContext.userRole
    });

    const transaction = await this.beginAtomicTransaction(testId, testContext);
    
    try {
      // Execute the operation
      const result = await operation({
        ...testContext,
        testId: testId,
        transaction: transaction
      });

      // Commit transaction
      await this.commitAtomicTransaction(testId);
      
      return result;
    } catch (error) {
      // Rollback transaction
      await this.rollbackAtomicTransaction(testId);
      throw error;
    }
  }

  /**
   * Begin atomic transaction
   */
  private async beginAtomicTransaction(testId: string, context: AtomicTestContext): Promise<AtomicTransaction> {
    // Start database transaction
    const dbSession = await this.dbManager.startTransaction(testId);
    
    const transaction: AtomicTransaction = {
      testId: testId,
      workerId: this.workerId,
      startTime: Date.now(),
      dbSession: dbSession,
      allocatedResources: [],
      operations: [],
      status: 'active'
    };

    this.activeTransactions.set(testId, transaction);
    this.operationStack.set(testId, []);

    console.log(`🔄 Worker ${this.workerId}: Started atomic transaction for ${testId}`);
    return transaction;
  }

  /**
   * Commit atomic transaction
   */
  private async commitAtomicTransaction(testId: string): Promise<void> {
    const transaction = this.activeTransactions.get(testId);
    if (!transaction) {
      throw new Error(`No active transaction found for test ${testId}`);
    }

    try {
      // Commit database transaction
      await this.dbManager.commitTransaction(testId);
      
      // Finalize all operations
      const operations = this.operationStack.get(testId) || [];
      for (const operation of operations) {
        if (operation.finalizeFunction) {
          await operation.finalizeFunction();
        }
      }

      transaction.status = 'committed';
      transaction.endTime = Date.now();
      
      console.log(`✅ Worker ${this.workerId}: Committed atomic transaction for ${testId}`);
    } catch (error) {
      await this.rollbackAtomicTransaction(testId);
      throw error;
    } finally {
      this.cleanupTransaction(testId);
    }
  }

  /**
   * Rollback atomic transaction
   */
  private async rollbackAtomicTransaction(testId: string): Promise<void> {
    const transaction = this.activeTransactions.get(testId);
    if (!transaction) {
      return; // No transaction to rollback
    }

    try {
      console.log(`🔄 Worker ${this.workerId}: Rolling back atomic transaction for ${testId}`);
      
      // Rollback database transaction
      await this.dbManager.rollbackTransaction(testId);
      
      // Rollback all operations in reverse order
      const operations = this.operationStack.get(testId) || [];
      for (let i = operations.length - 1; i >= 0; i--) {
        const operation = operations[i];
        if (operation.rollbackFunction) {
          try {
            await operation.rollbackFunction();
          } catch (rollbackError) {
            console.error(`❌ Worker ${this.workerId}: Rollback failed for operation ${operation.type}:`, rollbackError);
          }
        }
      }

      // Release all allocated resources
      for (const resource of transaction.allocatedResources) {
        await this.releaseResource(resource, testId);
      }

      transaction.status = 'rolledback';
      transaction.endTime = Date.now();
      
      console.log(`🔄 Worker ${this.workerId}: Rolled back atomic transaction for ${testId}`);
    } catch (error) {
      console.error(`❌ Worker ${this.workerId}: Rollback failed for ${testId}:`, error);
      transaction.status = 'failed';
    } finally {
      this.cleanupTransaction(testId);
    }
  }

  /**
   * Add operation to stack
   */
  private addOperation(testId: string, operation: AtomicOperation): void {
    const operations = this.operationStack.get(testId) || [];
    operations.push(operation);
    this.operationStack.set(testId, operations);
  }

  /**
   * Atomic user creation
   */
  async createAtomicUser(testId: string, userData: AtomicUserData): Promise<any> {
    const transaction = this.activeTransactions.get(testId);
    if (!transaction) {
      throw new Error(`No active transaction for test ${testId}`);
    }

    const operation: AtomicOperation = {
      type: 'user_creation',
      testId: testId,
      timestamp: Date.now(),
      rollbackFunction: async () => {
        // User will be rolled back via database transaction
      }
    };

    this.addOperation(testId, operation);

    // Create user in database
    const user = await this.dbManager.createIsolatedUser(userData, testId);
    
    return user;
  }

  /**
   * Atomic resource allocation
   */
  async allocateAtomicResource<T>(testId: string, resourceType: string, role?: string): Promise<T> {
    const transaction = this.activeTransactions.get(testId);
    if (!transaction) {
      throw new Error(`No active transaction for test ${testId}`);
    }

    let resource: T;
    
    // Allocate resource based on type
    switch (resourceType) {
      case 'user':
        if (!role) throw new Error('Role required for user allocation');
        resource = await this.resourceManager.acquireUser(role as any, testId) as any;
        break;
      case 'course':
        resource = await this.resourceManager.acquireCourse(testId) as any;
        break;
      case 'news':
        resource = await this.resourceManager.acquireNewsArticle(testId) as any;
        break;
      case 'event':
        resource = await this.resourceManager.acquireEvent(testId) as any;
        break;
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }

    // Track allocated resource
    const allocatedResource: AllocatedResource = {
      type: resourceType,
      resource: resource,
      testId: testId,
      allocatedAt: Date.now()
    };

    transaction.allocatedResources.push(allocatedResource);

    // Add rollback operation
    const operation: AtomicOperation = {
      type: 'resource_allocation',
      testId: testId,
      timestamp: Date.now(),
      rollbackFunction: async () => {
        await this.releaseResource(allocatedResource, testId);
      }
    };

    this.addOperation(testId, operation);

    return resource;
  }

  /**
   * Atomic HTTP request
   */
  async executeAtomicRequest(
    testId: string,
    request: AtomicHttpRequest
  ): Promise<AtomicHttpResponse> {
    const transaction = this.activeTransactions.get(testId);
    if (!transaction) {
      throw new Error(`No active transaction for test ${testId}`);
    }

    const startTime = Date.now();
    
    try {
      // Execute HTTP request
      const response = await this.performHttpRequest(request);
      
      const atomicResponse: AtomicHttpResponse = {
        status: response.status,
        data: response.data,
        headers: response.headers,
        duration: Date.now() - startTime,
        success: response.status >= 200 && response.status < 300
      };

      // Add cleanup operation if needed
      if (request.cleanupFunction) {
        const operation: AtomicOperation = {
          type: 'http_request',
          testId: testId,
          timestamp: Date.now(),
          rollbackFunction: request.cleanupFunction
        };

        this.addOperation(testId, operation);
      }

      return atomicResponse;
    } catch (error) {
      throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Atomic database operation
   */
  async executeAtomicDBOperation<T>(
    testId: string,
    operation: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    const transaction = this.activeTransactions.get(testId);
    if (!transaction) {
      throw new Error(`No active transaction for test ${testId}`);
    }

    return await operation(transaction.dbSession);
  }

  /**
   * Atomic batch operations
   */
  async executeBatchOperations<T>(
    testId: string,
    operations: BatchOperation<T>[]
  ): Promise<T[]> {
    const transaction = this.activeTransactions.get(testId);
    if (!transaction) {
      throw new Error(`No active transaction for test ${testId}`);
    }

    const results: T[] = [];
    const rollbackFunctions: (() => Promise<void>)[] = [];

    try {
      // Execute all operations
      for (const operation of operations) {
        const result = await operation.execute();
        results.push(result);
        
        if (operation.rollback) {
          rollbackFunctions.push(operation.rollback);
        }
      }

      // Add batch rollback operation
      const batchOperation: AtomicOperation = {
        type: 'batch_operation',
        testId: testId,
        timestamp: Date.now(),
        rollbackFunction: async () => {
          for (let i = rollbackFunctions.length - 1; i >= 0; i--) {
            await rollbackFunctions[i]();
          }
        }
      };

      this.addOperation(testId, batchOperation);

      return results;
    } catch (error) {
      // Rollback completed operations
      for (let i = rollbackFunctions.length - 1; i >= 0; i--) {
        try {
          await rollbackFunctions[i]();
        } catch (rollbackError) {
          console.error(`Batch rollback failed:`, rollbackError);
        }
      }
      throw error;
    }
  }

  /**
   * Release resource
   */
  private async releaseResource(resource: AllocatedResource, testId: string): Promise<void> {
    try {
      switch (resource.type) {
        case 'user':
          await this.resourceManager.releaseUser(resource.resource as any, testId);
          break;
        case 'course':
          await this.resourceManager.releaseCourse(resource.resource as any, testId);
          break;
        case 'news':
          await this.resourceManager.releaseNewsArticle(resource.resource as any, testId);
          break;
        case 'event':
          await this.resourceManager.releaseEvent(resource.resource as any, testId);
          break;
      }
    } catch (error) {
      console.error(`Failed to release resource:`, error);
    }
  }

  /**
   * Perform HTTP request
   */
  private async performHttpRequest(request: AtomicHttpRequest): Promise<any> {
    const fetch = require('node-fetch');
    
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      timeout: request.timeout || 30000
    });

    const data = await response.json();
    
    return {
      status: response.status,
      data: data,
      headers: response.headers
    };
  }

  /**
   * Cleanup transaction
   */
  private cleanupTransaction(testId: string): void {
    this.activeTransactions.delete(testId);
    this.operationStack.delete(testId);
    this.testIdGenerator.deactivateTestId(testId);
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(testId: string): TransactionStatus | null {
    const transaction = this.activeTransactions.get(testId);
    if (!transaction) return null;

    return {
      testId: testId,
      status: transaction.status,
      startTime: transaction.startTime,
      endTime: transaction.endTime,
      operationCount: this.operationStack.get(testId)?.length || 0,
      allocatedResourceCount: transaction.allocatedResources.length
    };
  }

  /**
   * Cleanup all transactions
   */
  async cleanupAllTransactions(): Promise<void> {
    console.log(`🧹 Worker ${this.workerId}: Cleaning up all atomic transactions...`);
    
    const activeTestIds = Array.from(this.activeTransactions.keys());
    
    for (const testId of activeTestIds) {
      await this.rollbackAtomicTransaction(testId);
    }
    
    console.log(`✅ Worker ${this.workerId}: All atomic transactions cleaned up`);
  }
}

/**
 * Interfaces
 */
export interface AtomicTestContext {
  suiteName: string;
  testName: string;
  testFile: string;
  userRole?: string;
  testId?: string;
  transaction?: AtomicTransaction;
}

export interface AtomicTransaction {
  testId: string;
  workerId: number;
  startTime: number;
  endTime?: number;
  dbSession: mongoose.ClientSession;
  allocatedResources: AllocatedResource[];
  operations: AtomicOperation[];
  status: 'active' | 'committed' | 'rolledback' | 'failed';
}

export interface AtomicOperation {
  type: string;
  testId: string;
  timestamp: number;
  rollbackFunction?: () => Promise<void>;
  finalizeFunction?: () => Promise<void>;
}

export interface AllocatedResource {
  type: string;
  resource: any;
  testId: string;
  allocatedAt: number;
}

export interface AtomicUserData {
  _id?: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'staff' | 'student';
  profile: {
    firstName: string;
    lastName: string;
    department?: string;
    bio?: string;
    contactInfo?: {
      phone?: string;
      office?: string;
    };
  };
}

export interface AtomicHttpRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  cleanupFunction?: () => Promise<void>;
}

export interface AtomicHttpResponse {
  status: number;
  data: any;
  headers: any;
  duration: number;
  success: boolean;
}

export interface BatchOperation<T> {
  execute: () => Promise<T>;
  rollback?: () => Promise<void>;
}

export interface TransactionStatus {
  testId: string;
  status: string;
  startTime: number;
  endTime?: number;
  operationCount: number;
  allocatedResourceCount: number;
}

/**
 * Atomic Test Helper
 */
export class AtomicTestHelper {
  private atomicManager: AtomicOperationsManager;
  
  constructor(workerId?: number) {
    this.atomicManager = AtomicOperationsManager.getInstance(workerId);
  }

  /**
   * Execute atomic test with automatic cleanup
   */
  async runAtomicTest<T>(
    testContext: AtomicTestContext,
    testFunction: (context: AtomicTestContext) => Promise<T>
  ): Promise<T> {
    return await this.atomicManager.executeAtomicTest(testContext, testFunction);
  }

  /**
   * Create atomic user for test
   */
  async createTestUser(testId: string, userData: AtomicUserData): Promise<any> {
    return await this.atomicManager.createAtomicUser(testId, userData);
  }

  /**
   * Allocate atomic resource
   */
  async allocateResource<T>(testId: string, resourceType: string, role?: string): Promise<T> {
    return await this.atomicManager.allocateAtomicResource(testId, resourceType, role);
  }

  /**
   * Execute atomic HTTP request
   */
  async makeRequest(testId: string, request: AtomicHttpRequest): Promise<AtomicHttpResponse> {
    return await this.atomicManager.executeAtomicRequest(testId, request);
  }

  /**
   * Execute atomic database operation
   */
  async performDBOperation<T>(
    testId: string,
    operation: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    return await this.atomicManager.executeAtomicDBOperation(testId, operation);
  }
}

// Export singleton factory
export const createAtomicOperationsManager = (workerId?: number) => {
  return AtomicOperationsManager.getInstance(workerId);
};

export const createAtomicTestHelper = (workerId?: number) => {
  return new AtomicTestHelper(workerId);
};