// packages/testing-utilities/tests/helpers/test-id-generator.ts
// Test ID Generator (STUB - Simplified Implementation)

/**
 * Test ID metadata interface
 */
export interface TestIdMetadata {
  id: string;
  type: 'test' | 'user' | 'resource' | 'document';
  workerId: number;
  createdAt: Date;
  testName?: string;
}

/**
 * Simplified Test ID Generator
 * Generates unique test IDs for testing scenarios
 */
export class TestIdGenerator {
  private static instances: Map<number, TestIdGenerator> = new Map();
  private workerId: number;
  private sequenceCounter: number = 0;
  private idRegistry: Map<string, TestIdMetadata> = new Map();

  private constructor(workerId: number) {
    this.workerId = workerId;
    // Session ID removed - not used in current implementation
  }

  static getInstance(workerId: number = 0): TestIdGenerator {
    if (!TestIdGenerator.instances.has(workerId)) {
      TestIdGenerator.instances.set(workerId, new TestIdGenerator(workerId));
    }
    return TestIdGenerator.instances.get(workerId)!;
  }

  /**
   * Generate a unique test ID
   */
  generateTestId(testName?: string): string {
    const id = `test_${this.workerId}_${this.sequenceCounter++}_${Date.now()}`;
    
    this.idRegistry.set(id, {
      id,
      type: 'test',
      workerId: this.workerId,
      createdAt: new Date(),
      testName
    });
    
    return id;
  }

  /**
   * Generate a unique user ID for testing
   */
  generateUserId(testName?: string): string {
    const id = `user_${this.workerId}_${this.sequenceCounter++}_${Date.now()}`;
    
    this.idRegistry.set(id, {
      id,
      type: 'user',
      workerId: this.workerId,
      createdAt: new Date(),
      testName
    });
    
    return id;
  }

  /**
   * Generate a unique document ID for testing
   */
  generateDocumentId(collection: string): string {
    const id = `${collection}_${this.workerId}_${this.sequenceCounter++}_${Date.now()}`;
    
    this.idRegistry.set(id, {
      id,
      type: 'document',
      workerId: this.workerId,
      createdAt: new Date()
    });
    
    return id;
  }

  /**
   * Get metadata for a test ID
   */
  getMetadata(id: string): TestIdMetadata | undefined {
    return this.idRegistry.get(id);
  }

  /**
   * Clean up registered IDs
   */
  cleanup(): void {
    this.idRegistry.clear();
    this.sequenceCounter = 0;
  }
}

export default TestIdGenerator;