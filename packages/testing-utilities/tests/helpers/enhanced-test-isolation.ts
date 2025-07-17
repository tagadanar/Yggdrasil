// packages/testing-utilities/tests/helpers/enhanced-test-isolation.ts
// Ultra-robust enhanced test isolation system combining all parallel testing components

import { Page } from '@playwright/test';
import { WorkerIsolationManager } from './worker-isolation';
import { DatabaseIsolationManager } from './database-isolation';
import { ResourcePoolManager } from './resource-pool-manager';
import { ServicePortManager } from './service-port-manager';
import { TestIdGenerator } from './test-id-generator';
import { AtomicOperationsManager, AtomicTestHelper } from './atomic-operations';

/**
 * Enhanced Test Isolation Manager
 * Provides bulletproof isolation between test workers
 */
export class EnhancedTestIsolationManager {
  private static instances: Map<number, EnhancedTestIsolationManager> = new Map();
  private workerId: number;
  private workerPrefix: string;
  private isInitialized = false;
  
  // Component managers
  private workerManager: WorkerIsolationManager;
  private dbManager: DatabaseIsolationManager;
  private resourceManager: ResourcePoolManager;
  private serviceManager: ServicePortManager;
  private testIdGenerator: TestIdGenerator;
  private atomicManager: AtomicOperationsManager;
  
  // Test tracking
  private activeTests: Map<string, EnhancedTestSession> = new Map();
  private testCounter = 0;

  private constructor(workerId: number) {
    this.workerId = workerId;
    this.workerPrefix = `w${workerId}`;
    
    // Initialize component managers
    this.workerManager = WorkerIsolationManager.getInstance();
    this.dbManager = DatabaseIsolationManager.getInstance(workerId);
    this.resourceManager = ResourcePoolManager.getInstance(workerId);
    this.serviceManager = ServicePortManager.getInstance(workerId);
    this.testIdGenerator = TestIdGenerator.getInstance(workerId);
    this.atomicManager = AtomicOperationsManager.getInstance(workerId);
  }

  static getInstance(workerId?: number): EnhancedTestIsolationManager {
    const worker = WorkerIsolationManager.getInstance();
    const id = workerId || worker.getEnvironment().workerId;
    
    if (!EnhancedTestIsolationManager.instances.has(id)) {
      EnhancedTestIsolationManager.instances.set(id, new EnhancedTestIsolationManager(id));
    }
    return EnhancedTestIsolationManager.instances.get(id)!;
  }

  /**
   * Initialize enhanced isolation system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log(`🚀 Worker ${this.workerId}: Initializing enhanced test isolation system...`);
    
    try {
      // Initialize all component managers
      await this.dbManager.initialize();
      await this.resourceManager.initialize();
      // Note: Services are started by webServer config, not by isolation system
      // await this.serviceManager.initialize();
      // await this.serviceManager.startAllServices();
      
      // Verify system health
      await this.verifySystemHealth();
      
      this.isInitialized = true;
      console.log(`✅ Worker ${this.workerId}: Enhanced test isolation system initialized successfully`);
    } catch (error) {
      console.error(`❌ Worker ${this.workerId}: Failed to initialize enhanced test isolation:`, error);
      throw error;
    }
  }

  /**
   * Create new isolated test session
   */
  async createTestSession(testInfo: EnhancedTestInfo): Promise<EnhancedTestSession> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const testId = this.testIdGenerator.generateTestId({
      suiteName: testInfo.suiteName,
      testName: testInfo.testName,
      testFile: testInfo.testFile,
      userRole: testInfo.userRole
    });

    const session: EnhancedTestSession = {
      testId: testId,
      workerId: this.workerId,
      testInfo: testInfo,
      startTime: Date.now(),
      status: 'active',
      allocatedResources: [],
      isolatedUsers: new Map(),
      atomicHelper: new AtomicTestHelper(this.workerId)
    };

    this.activeTests.set(testId, session);
    this.testCounter++;

    console.log(`🧪 Worker ${this.workerId}: Created test session ${testId}`);
    return session;
  }

  /**
   * Get isolated user for test
   */
  async getIsolatedUser(testId: string, role: EnhancedUserRole): Promise<EnhancedIsolatedUser> {
    const session = this.activeTests.get(testId);
    if (!session) {
      throw new Error(`No active test session found for ${testId}`);
    }

    // Check if user already exists for this role
    const existingUser = session.isolatedUsers.get(role);
    if (existingUser) {
      return existingUser;
    }

    // Allocate new user from resource pool
    const user = await this.resourceManager.acquireUser(role, testId);
    
    const isolatedUser: EnhancedIsolatedUser = {
      ...user,
      testId: testId,
      role: role,
      isAuthenticated: false,
      sessionToken: null,
      isolationLevel: 'complete'
    };

    session.isolatedUsers.set(role, isolatedUser);
    session.allocatedResources.push({
      type: 'user',
      resourceId: user._id,
      role: role,
      allocatedAt: Date.now()
    });

    return isolatedUser;
  }

  /**
   * Authenticate isolated user
   */
  async authenticateIsolatedUser(
    page: Page,
    testId: string,
    role: EnhancedUserRole
  ): Promise<EnhancedIsolatedUser> {
    const user = await this.getIsolatedUser(testId, role);
    const session = this.activeTests.get(testId);
    
    if (!session) {
      throw new Error(`No active test session found for ${testId}`);
    }

    try {
      // Clear any existing authentication
      await this.clearBrowserState(page);

      // Navigate to login page
      const loginUrl = this.serviceManager.getServiceUrl('frontend') + '/auth/login';
      await page.goto(loginUrl);
      await page.waitForLoadState('networkidle');

      // Perform login
      await page.fill('[data-testid="email"]', user.email);
      await page.fill('[data-testid="password"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      // Wait for authentication to complete
      await page.waitForLoadState('networkidle');
      
      // Verify authentication success
      const currentUrl = page.url();
      if (currentUrl.includes('/auth/login')) {
        throw new Error(`Authentication failed for user ${user.email}`);
      }

      // Generate session token
      const sessionToken = this.testIdGenerator.generateSessionToken(testId, user._id);
      
      // Update user state
      user.isAuthenticated = true;
      user.sessionToken = sessionToken;
      user.lastLoginAt = Date.now();

      console.log(`🔐 Worker ${this.workerId}: User ${role} authenticated for test ${testId}`);
      return user;
    } catch (error) {
      console.error(`❌ Worker ${this.workerId}: Authentication failed for ${role}:`, error);
      throw error;
    }
  }

  /**
   * Execute atomic test operation
   */
  async executeAtomicOperation<T>(
    testId: string,
    operation: (helper: AtomicTestHelper) => Promise<T>
  ): Promise<T> {
    const session = this.activeTests.get(testId);
    if (!session) {
      throw new Error(`No active test session found for ${testId}`);
    }

    return await this.atomicManager.executeAtomicTest(
      {
        suiteName: session.testInfo.suiteName,
        testName: session.testInfo.testName,
        testFile: session.testInfo.testFile,
        userRole: session.testInfo.userRole,
        testId: testId
      },
      async (context) => {
        return await operation(session.atomicHelper);
      }
    );
  }

  /**
   * Create isolated test data
   */
  async createIsolatedTestData(testId: string, dataType: string, data: any): Promise<any> {
    const session = this.activeTests.get(testId);
    if (!session) {
      throw new Error(`No active test session found for ${testId}`);
    }

    return await session.atomicHelper.performDBOperation(testId, async (dbSession) => {
      const Model = this.dbManager.getModel(dataType);
      
      // Add worker prefix to ensure isolation
      const isolatedData = {
        ...data,
        _id: this.testIdGenerator.generateDatabaseId(testId, dataType, 'entity'),
        workerId: this.workerId,
        testId: testId
      };

      const entity = new Model(isolatedData);
      await entity.save({ session: dbSession });
      return entity;
    });
  }

  /**
   * Make isolated HTTP request
   */
  async makeIsolatedRequest(
    testId: string,
    serviceName: string,
    endpoint: string,
    options: EnhancedRequestOptions = {}
  ): Promise<any> {
    const session = this.activeTests.get(testId);
    if (!session) {
      throw new Error(`No active test session found for ${testId}`);
    }

    const serviceUrl = this.serviceManager.getServiceUrl(serviceName);
    const fullUrl = `${serviceUrl}${endpoint}`;

    // Add authentication if user is specified
    const headers = { ...options.headers };
    if (options.authenticateAs) {
      const user = session.isolatedUsers.get(options.authenticateAs);
      if (user && user.sessionToken) {
        headers['Authorization'] = `Bearer ${user.sessionToken}`;
      }
    }

    return await session.atomicHelper.makeRequest(testId, {
      url: fullUrl,
      method: options.method || 'GET',
      headers: headers,
      body: options.body,
      timeout: options.timeout || 30000
    });
  }

  /**
   * Clear browser state
   */
  async clearBrowserState(page: Page): Promise<void> {
    // Clear all storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
    });

    // Additional cleanup
    await page.context().clearCookies();
  }

  /**
   * Verify system health
   */
  private async verifySystemHealth(): Promise<void> {
    // Check database connection
    if (!this.dbManager.isConnectedToDatabase()) {
      throw new Error('Database connection failed');
    }

    // Check service health
    const serviceStatuses = this.serviceManager.getAllServiceStatuses();
    const unhealthyServices = serviceStatuses.filter(s => s.status !== 'running');
    
    if (unhealthyServices.length > 0) {
      throw new Error(`Unhealthy services: ${unhealthyServices.map(s => s.name).join(', ')}`);
    }

    // Check resource pools
    const poolStats = this.resourceManager.getPoolStatistics();
    for (const pool of poolStats.pools) {
      if (pool.availableResources === 0) {
        console.warn(`⚠️ Worker ${this.workerId}: Resource pool ${pool.name} is empty`);
      }
    }
  }

  /**
   * Cleanup test session
   */
  async cleanupTestSession(testId: string): Promise<void> {
    const session = this.activeTests.get(testId);
    if (!session) {
      return; // Already cleaned up
    }

    try {
      console.log(`🧹 Worker ${this.workerId}: Cleaning up test session ${testId}`);
      
      // Release all allocated resources
      for (const resource of session.allocatedResources) {
        await this.releaseResource(resource, testId);
      }

      // Clear isolated users
      session.isolatedUsers.clear();
      
      // Update session status
      session.status = 'completed';
      session.endTime = Date.now();
      
      // Remove from active tests
      this.activeTests.delete(testId);
      
      console.log(`✅ Worker ${this.workerId}: Test session ${testId} cleaned up`);
    } catch (error) {
      console.error(`❌ Worker ${this.workerId}: Failed to cleanup test session ${testId}:`, error);
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
          const user = await this.resourceManager.acquireUser(resource.role!, testId);
          await this.resourceManager.releaseUser(user, testId);
          break;
        // Add other resource types as needed
      }
    } catch (error) {
      console.error(`Failed to release resource ${resource.resourceId}:`, error);
    }
  }

  /**
   * Cleanup all test sessions
   */
  async cleanupAllTestSessions(): Promise<void> {
    console.log(`🧹 Worker ${this.workerId}: Cleaning up all test sessions...`);
    
    const activeTestIds = Array.from(this.activeTests.keys());
    
    for (const testId of activeTestIds) {
      await this.cleanupTestSession(testId);
    }
    
    console.log(`✅ Worker ${this.workerId}: All test sessions cleaned up`);
  }

  /**
   * Get worker ID for testing
   */
  getWorkerId(): number {
    return this.workerId;
  }

  /**
   * Get database info for testing
   */
  getDatabaseInfo(): any {
    return {
      workerId: this.workerId,
      name: this.workerManager.getEnvironment().database.name,
      collectionPrefix: this.workerManager.getEnvironment().database.collectionPrefix,
      connectionString: this.workerManager.getEnvironment().database.connectionString,
      isConnected: this.dbManager.isConnectedToDatabase()
    };
  }

  /**
   * Shutdown enhanced isolation system
   */
  async shutdown(): Promise<void> {
    console.log(`🛑 Worker ${this.workerId}: Shutting down enhanced isolation system...`);
    
    try {
      // Cleanup all test sessions
      await this.cleanupAllTestSessions();
      
      // Cleanup atomic operations
      await this.atomicManager.cleanupAllTransactions();
      
      // Cleanup resource pools
      await this.resourceManager.cleanup();
      
      // Note: Services are managed by webServer config, not by isolation system
      // await this.serviceManager.stopAllServices();
      
      // Disconnect database
      await this.dbManager.disconnect();
      
      this.isInitialized = false;
      console.log(`✅ Worker ${this.workerId}: Enhanced isolation system shut down successfully`);
    } catch (error) {
      console.error(`❌ Worker ${this.workerId}: Failed to shutdown enhanced isolation system:`, error);
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  getSystemStatistics(): EnhancedSystemStats {
    return {
      workerId: this.workerId,
      isInitialized: this.isInitialized,
      activeTestCount: this.activeTests.size,
      totalTestsExecuted: this.testCounter,
      poolStatistics: this.resourceManager.getPoolStatistics(),
      serviceStatuses: this.serviceManager.getAllServiceStatuses(),
      testIdStats: this.testIdGenerator.getStatistics()
    };
  }
}

/**
 * Enhanced Auth Helpers
 * Provides convenient authentication methods using enhanced isolation
 */
export class EnhancedAuthHelpers {
  private isolationManager: EnhancedTestIsolationManager;
  private currentTestId: string | null = null;
  private currentPage: Page | null = null;

  constructor(page: Page, workerId?: number) {
    this.isolationManager = EnhancedTestIsolationManager.getInstance(workerId);
    this.currentPage = page;
  }

  /**
   * Initialize for test
   */
  async initialize(testInfo: EnhancedTestInfo): Promise<void> {
    const session = await this.isolationManager.createTestSession(testInfo);
    this.currentTestId = session.testId;
  }

  /**
   * Login as admin
   */
  async loginAsAdmin(): Promise<EnhancedIsolatedUser> {
    if (!this.currentTestId || !this.currentPage) {
      throw new Error('Auth helpers not properly initialized');
    }

    return await this.isolationManager.authenticateIsolatedUser(
      this.currentPage,
      this.currentTestId,
      'admin'
    );
  }

  /**
   * Login as teacher
   */
  async loginAsTeacher(): Promise<EnhancedIsolatedUser> {
    if (!this.currentTestId || !this.currentPage) {
      throw new Error('Auth helpers not properly initialized');
    }

    return await this.isolationManager.authenticateIsolatedUser(
      this.currentPage,
      this.currentTestId,
      'teacher'
    );
  }

  /**
   * Login as staff
   */
  async loginAsStaff(): Promise<EnhancedIsolatedUser> {
    if (!this.currentTestId || !this.currentPage) {
      throw new Error('Auth helpers not properly initialized');
    }

    return await this.isolationManager.authenticateIsolatedUser(
      this.currentPage,
      this.currentTestId,
      'staff'
    );
  }

  /**
   * Login as student
   */
  async loginAsStudent(): Promise<EnhancedIsolatedUser> {
    if (!this.currentTestId || !this.currentPage) {
      throw new Error('Auth helpers not properly initialized');
    }

    return await this.isolationManager.authenticateIsolatedUser(
      this.currentPage,
      this.currentTestId,
      'student'
    );
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    if (!this.currentPage) {
      throw new Error('Auth helpers not properly initialized');
    }

    await this.isolationManager.clearBrowserState(this.currentPage);
    
    // Navigate to login page
    const loginUrl = '/auth/login';
    await this.currentPage.goto(loginUrl);
    await this.currentPage.waitForLoadState('networkidle');
  }

  /**
   * Get worker ID for testing
   */
  getWorkerId(): number {
    return this.isolationManager.getWorkerId();
  }

  /**
   * Get database info for testing
   */
  getDatabaseInfo(): any {
    return this.isolationManager.getDatabaseInfo();
  }

  /**
   * Get test isolation manager for testing
   */
  get testIsolationManager(): any {
    return this.isolationManager;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.currentTestId) {
      await this.isolationManager.cleanupTestSession(this.currentTestId);
      this.currentTestId = null;
    }
    this.currentPage = null;
  }
}

/**
 * Interfaces
 */
export interface EnhancedTestInfo {
  suiteName: string;
  testName: string;
  testFile: string;
  userRole?: string;
}

export interface EnhancedTestSession {
  testId: string;
  workerId: number;
  testInfo: EnhancedTestInfo;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'failed';
  allocatedResources: AllocatedResource[];
  isolatedUsers: Map<EnhancedUserRole, EnhancedIsolatedUser>;
  atomicHelper: AtomicTestHelper;
}

export interface EnhancedIsolatedUser {
  _id: string;
  email: string;
  role: EnhancedUserRole;
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
  testId: string;
  isAuthenticated: boolean;
  sessionToken: string | null;
  lastLoginAt?: number;
  isolationLevel: 'complete' | 'partial';
}

export interface AllocatedResource {
  type: string;
  resourceId: string;
  role?: EnhancedUserRole;
  allocatedAt: number;
}

export interface EnhancedRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  authenticateAs?: EnhancedUserRole;
}

export interface EnhancedSystemStats {
  workerId: number;
  isInitialized: boolean;
  activeTestCount: number;
  totalTestsExecuted: number;
  poolStatistics: any;
  serviceStatuses: any[];
  testIdStats: any;
}

export type EnhancedUserRole = 'admin' | 'teacher' | 'staff' | 'student';

// Export singleton factory
export const createEnhancedTestIsolation = (workerId?: number) => {
  return EnhancedTestIsolationManager.getInstance(workerId);
};