// packages/testing-utilities/tests/helpers/test-id-generator.ts
// Ultra-robust UUID-based test ID system for parallel testing

import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import crypto from 'crypto';
import { WorkerIsolationManager } from './worker-isolation';

/**
 * Test ID Generator
 * Generates cryptographically secure unique test IDs
 */
export class TestIdGenerator {
  private static instances: Map<number, TestIdGenerator> = new Map();
  private workerId: number;
  private workerPrefix: string;
  private namespaceUuid: string;
  private idRegistry: Map<string, TestIdMetadata> = new Map();
  private sessionId: string;
  private sequenceCounter: number = 0;

  private constructor(workerId: number) {
    this.workerId = workerId;
    this.workerPrefix = `w${workerId}`;
    this.sessionId = this.generateSessionId();
    this.namespaceUuid = this.generateNamespaceUuid();
  }

  static getInstance(workerId?: number): TestIdGenerator {
    const worker = WorkerIsolationManager.getInstance();
    const id = workerId || worker.getEnvironment().workerId;
    
    if (!TestIdGenerator.instances.has(id)) {
      TestIdGenerator.instances.set(id, new TestIdGenerator(id));
    }
    return TestIdGenerator.instances.get(id)!;
  }

  /**
   * Generate session ID for this test run
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8);
    const hash = crypto.createHash('sha256');
    hash.update(`${timestamp}-${this.workerId}-${randomBytes.toString('hex')}`);
    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Generate namespace UUID for this worker
   */
  private generateNamespaceUuid(): string {
    const namespace = `yggdrasil-test-worker-${this.workerId}-${this.sessionId}`;
    return uuidv5(namespace, uuidv5.DNS);
  }

  /**
   * Generate primary test ID
   */
  generateTestId(testContext: TestContext): string {
    const sequence = this.getNextSequence();
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    
    // Create deterministic base from test context
    const contextHash = this.hashTestContext(testContext);
    
    // Generate hierarchical ID
    const hierarchicalId = this.buildHierarchicalId({
      workerId: this.workerId,
      sessionId: this.sessionId,
      sequence: sequence,
      timestamp: timestamp,
      contextHash: contextHash,
      randomSuffix: randomSuffix
    });

    // Generate UUID variant for guaranteed uniqueness
    const uuidVariant = uuidv5(hierarchicalId, this.namespaceUuid);

    // Combine for final ID
    const finalId = `${this.workerPrefix}_${hierarchicalId}_${uuidVariant.substring(0, 8)}`;

    // Validate uniqueness
    this.validateAndRegisterTestId(finalId, testContext);

    return finalId;
  }

  /**
   * Generate user ID for test
   */
  generateUserId(testId: string, role: string, userIndex: number = 0): string {
    const userUuid = uuidv4();
    const roleHash = crypto.createHash('md5').update(role).digest('hex').substring(0, 8);
    const indexHex = userIndex.toString(16).padStart(2, '0');
    
    return `${this.workerPrefix}_user_${roleHash}_${indexHex}_${userUuid.substring(0, 8)}_${testId.substring(0, 8)}`;
  }

  /**
   * Generate resource ID for test
   */
  generateResourceId(testId: string, resourceType: string, resourceName?: string): string {
    const resourceUuid = uuidv4();
    const typeHash = crypto.createHash('md5').update(resourceType).digest('hex').substring(0, 6);
    const nameHash = resourceName ? 
      crypto.createHash('md5').update(resourceName).digest('hex').substring(0, 6) : 
      crypto.randomBytes(3).toString('hex');
    
    return `${this.workerPrefix}_${resourceType}_${typeHash}_${nameHash}_${resourceUuid.substring(0, 8)}`;
  }

  /**
   * Generate database identifier
   */
  generateDatabaseId(testId: string, collection: string, entityType: string): string {
    const entityUuid = uuidv4();
    const collectionHash = crypto.createHash('md5').update(collection).digest('hex').substring(0, 4);
    const typeHash = crypto.createHash('md5').update(entityType).digest('hex').substring(0, 4);
    
    return `${this.workerPrefix}_${collectionHash}_${typeHash}_${entityUuid.substring(0, 12)}`;
  }

  /**
   * Generate session token
   */
  generateSessionToken(testId: string, userId: string): string {
    const tokenPayload = {
      testId: testId,
      userId: userId,
      workerId: this.workerId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    };

    const tokenString = JSON.stringify(tokenPayload);
    const tokenHash = crypto.createHash('sha256').update(tokenString).digest('hex');
    
    return `${this.workerPrefix}_token_${tokenHash.substring(0, 32)}`;
  }

  /**
   * Hash test context for deterministic component
   */
  private hashTestContext(context: TestContext): string {
    const contextString = JSON.stringify({
      suiteName: context.suiteName,
      testName: context.testName,
      testFile: context.testFile,
      userRole: context.userRole || 'unknown'
    });
    
    return crypto.createHash('sha256').update(contextString).digest('hex').substring(0, 16);
  }

  /**
   * Build hierarchical ID structure
   */
  private buildHierarchicalId(components: HierarchicalIdComponents): string {
    const {
      workerId,
      sessionId,
      sequence,
      timestamp,
      contextHash,
      randomSuffix
    } = components;

    // Convert to base-36 for compactness
    const timestampB36 = timestamp.toString(36);
    const sequenceB36 = sequence.toString(36).padStart(4, '0');
    const workerB36 = workerId.toString(36);

    return `${workerB36}_${sessionId.substring(0, 8)}_${sequenceB36}_${timestampB36}_${contextHash.substring(0, 8)}_${randomSuffix}`;
  }

  /**
   * Get next sequence number
   */
  private getNextSequence(): number {
    return ++this.sequenceCounter;
  }

  /**
   * Validate and register test ID
   */
  private validateAndRegisterTestId(testId: string, context: TestContext): void {
    // Check for collisions
    if (this.idRegistry.has(testId)) {
      throw new Error(`Test ID collision detected: ${testId}`);
    }

    // Register ID with metadata
    const metadata: TestIdMetadata = {
      testId: testId,
      workerId: this.workerId,
      sessionId: this.sessionId,
      context: context,
      createdAt: Date.now(),
      isActive: true
    };

    this.idRegistry.set(testId, metadata);
  }

  /**
   * Validate test ID format
   */
  validateTestId(testId: string): ValidationResult {
    try {
      // Check basic format
      const parts = testId.split('_');
      if (parts.length < 3) {
        return { isValid: false, error: 'Invalid ID format' };
      }

      // Check worker prefix
      if (!parts[0].startsWith('w')) {
        return { isValid: false, error: 'Invalid worker prefix' };
      }

      // Check if ID exists in registry
      const metadata = this.idRegistry.get(testId);
      if (!metadata) {
        return { isValid: false, error: 'ID not found in registry' };
      }

      // Check if ID is active
      if (!metadata.isActive) {
        return { isValid: false, error: 'ID has been deactivated' };
      }

      return { isValid: true, metadata: metadata };
    } catch (error) {
      return { isValid: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Parse test ID components
   */
  parseTestId(testId: string): ParsedTestId | null {
    try {
      const parts = testId.split('_');
      if (parts.length < 3) return null;

      const workerId = parseInt(parts[0].substring(1));
      const sessionId = parts[1];
      
      return {
        workerId: workerId,
        sessionId: sessionId,
        originalId: testId,
        isValid: this.validateTestId(testId).isValid
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Deactivate test ID
   */
  deactivateTestId(testId: string): void {
    const metadata = this.idRegistry.get(testId);
    if (metadata) {
      metadata.isActive = false;
      metadata.deactivatedAt = Date.now();
    }
  }

  /**
   * Get test ID metadata
   */
  getTestIdMetadata(testId: string): TestIdMetadata | undefined {
    return this.idRegistry.get(testId);
  }

  /**
   * Get all active test IDs for this worker
   */
  getActiveTestIds(): string[] {
    return Array.from(this.idRegistry.entries())
      .filter(([_, metadata]) => metadata.isActive)
      .map(([testId, _]) => testId);
  }

  /**
   * Cleanup completed test IDs
   */
  cleanupCompletedTests(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [testId, metadata] of this.idRegistry) {
      if (!metadata.isActive || (now - metadata.createdAt) > maxAge) {
        this.idRegistry.delete(testId);
      }
    }
  }

  /**
   * Generate batch of IDs
   */
  generateBatchIds(count: number, testContext: TestContext): string[] {
    const ids: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const batchContext = {
        ...testContext,
        batchIndex: i,
        batchSize: count
      };
      
      ids.push(this.generateTestId(batchContext));
    }
    
    return ids;
  }

  /**
   * Get ID generation statistics
   */
  getStatistics(): IdGenerationStats {
    const now = Date.now();
    const activeIds = this.getActiveTestIds();
    
    return {
      workerId: this.workerId,
      sessionId: this.sessionId,
      totalIdsGenerated: this.sequenceCounter,
      activeIds: activeIds.length,
      registrySize: this.idRegistry.size,
      sessionStartTime: this.sessionId ? parseInt(this.sessionId.substring(0, 8), 16) : 0,
      currentTime: now
    };
  }
}

/**
 * Test Context Interface
 */
export interface TestContext {
  suiteName: string;
  testName: string;
  testFile: string;
  userRole?: string;
  batchIndex?: number;
  batchSize?: number;
}

/**
 * Test ID Metadata Interface
 */
export interface TestIdMetadata {
  testId: string;
  workerId: number;
  sessionId: string;
  context: TestContext;
  createdAt: number;
  isActive: boolean;
  deactivatedAt?: number;
}

/**
 * Hierarchical ID Components Interface
 */
export interface HierarchicalIdComponents {
  workerId: number;
  sessionId: string;
  sequence: number;
  timestamp: number;
  contextHash: string;
  randomSuffix: string;
}

/**
 * Validation Result Interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: TestIdMetadata;
}

/**
 * Parsed Test ID Interface
 */
export interface ParsedTestId {
  workerId: number;
  sessionId: string;
  originalId: string;
  isValid: boolean;
}

/**
 * ID Generation Statistics Interface
 */
export interface IdGenerationStats {
  workerId: number;
  sessionId: string;
  totalIdsGenerated: number;
  activeIds: number;
  registrySize: number;
  sessionStartTime: number;
  currentTime: number;
}

/**
 * Test ID Utilities
 */
export class TestIdUtils {
  /**
   * Extract worker ID from test ID
   */
  static extractWorkerId(testId: string): number | null {
    const parts = testId.split('_');
    if (parts.length < 1 || !parts[0].startsWith('w')) {
      return null;
    }
    
    return parseInt(parts[0].substring(1));
  }

  /**
   * Check if test ID belongs to worker
   */
  static belongsToWorker(testId: string, workerId: number): boolean {
    const extractedWorkerId = TestIdUtils.extractWorkerId(testId);
    return extractedWorkerId === workerId;
  }

  /**
   * Generate short display ID
   */
  static generateDisplayId(testId: string): string {
    const parts = testId.split('_');
    if (parts.length < 3) return testId;
    
    return `${parts[0]}-${parts[parts.length - 1].substring(0, 8)}`;
  }

  /**
   * Validate ID format
   */
  static validateFormat(testId: string): boolean {
    const pattern = /^w\d+_[a-f0-9]+_[a-z0-9]+_[a-z0-9]+_[a-f0-9]+_[a-f0-9]+$/;
    return pattern.test(testId);
  }

  /**
   * Generate deterministic ID for specific test
   */
  static generateDeterministicId(testContext: TestContext, workerId: number): string {
    const generator = TestIdGenerator.getInstance(workerId);
    return generator.generateTestId(testContext);
  }
}

/**
 * ID Collision Detector
 */
export class IdCollisionDetector {
  private static globalIdRegistry: Set<string> = new Set();
  
  /**
   * Register global ID
   */
  static registerGlobalId(testId: string): boolean {
    if (this.globalIdRegistry.has(testId)) {
      return false; // Collision detected
    }
    
    this.globalIdRegistry.add(testId);
    return true;
  }

  /**
   * Check for global collision
   */
  static hasGlobalCollision(testId: string): boolean {
    return this.globalIdRegistry.has(testId);
  }

  /**
   * Clean up global registry
   */
  static cleanupGlobalRegistry(): void {
    this.globalIdRegistry.clear();
  }

  /**
   * Get global registry size
   */
  static getGlobalRegistrySize(): number {
    return this.globalIdRegistry.size;
  }
}

// Export singleton factory
export const createTestIdGenerator = (workerId?: number) => {
  return TestIdGenerator.getInstance(workerId);
};