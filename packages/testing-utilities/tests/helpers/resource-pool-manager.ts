// packages/testing-utilities/tests/helpers/resource-pool-manager.ts
// Ultra-robust resource pool management for parallel testing

import { TestIdGenerator } from './test-id-generator';
import { DatabaseIsolationManager, IsolatedUserData } from './database-isolation';
import { WorkerIsolationManager } from './worker-isolation';

/**
 * Resource Pool Manager
 * Manages isolated resource pools for each worker
 */
export class ResourcePoolManager {
  private static instances: Map<number, ResourcePoolManager> = new Map();
  private workerId: number;
  private workerPrefix: string;
  private testIdGenerator: TestIdGenerator;
  private dbManager: DatabaseIsolationManager;
  private resourcePools: Map<string, ResourcePool<any>> = new Map();
  private isInitialized = false;

  private constructor(workerId: number) {
    this.workerId = workerId;
    this.workerPrefix = `w${workerId}`;
    this.testIdGenerator = TestIdGenerator.getInstance(workerId);
    this.dbManager = DatabaseIsolationManager.getInstance(workerId);
  }

  static getInstance(workerId?: number): ResourcePoolManager {
    const worker = WorkerIsolationManager.getInstance();
    const id = workerId || worker.getEnvironment().workerId;
    
    if (!ResourcePoolManager.instances.has(id)) {
      ResourcePoolManager.instances.set(id, new ResourcePoolManager(id));
    }
    return ResourcePoolManager.instances.get(id)!;
  }

  /**
   * Initialize resource pools
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log(`🏊 Worker ${this.workerId}: Initializing resource pools...`);
    
    // Initialize database connection
    await this.dbManager.initialize();
    
    // Create user pools for each role
    await this.createUserPool('admin', 20);
    await this.createUserPool('teacher', 20);
    await this.createUserPool('staff', 20);
    await this.createUserPool('student', 30);
    
    // Create other resource pools
    await this.createNewsPool(50);
    await this.createCoursePool(30);
    await this.createEventPool(40);
    
    this.isInitialized = true;
    console.log(`✅ Worker ${this.workerId}: Resource pools initialized`);
  }

  /**
   * Create user pool for specific role
   */
  private async createUserPool(role: UserRole, poolSize: number): Promise<void> {
    const poolName = `users_${role}`;
    const pool = new ResourcePool<IsolatedTestUser>(poolName, poolSize, this.workerId);
    
    // Set up user factory
    pool.setResourceFactory(async (index: number) => {
      return await this.createTestUser(role, index);
    });
    
    // Set up cleanup function
    pool.setCleanupFunction(async (user: IsolatedTestUser) => {
      await this.cleanupTestUser(user);
    });
    
    // Pre-populate pool
    await pool.initialize();
    
    this.resourcePools.set(poolName, pool);
  }

  /**
   * Create news pool
   */
  private async createNewsPool(poolSize: number): Promise<void> {
    const poolName = 'news_articles';
    const pool = new ResourcePool<IsolatedNewsArticle>(poolName, poolSize, this.workerId);
    
    pool.setResourceFactory(async (index: number) => {
      return await this.createTestNewsArticle(index);
    });
    
    pool.setCleanupFunction(async (article: IsolatedNewsArticle) => {
      await this.cleanupNewsArticle(article);
    });
    
    await pool.initialize();
    this.resourcePools.set(poolName, pool);
  }

  /**
   * Create course pool
   */
  private async createCoursePool(poolSize: number): Promise<void> {
    const poolName = 'courses';
    const pool = new ResourcePool<IsolatedCourse>(poolName, poolSize, this.workerId);
    
    pool.setResourceFactory(async (index: number) => {
      return await this.createTestCourse(index);
    });
    
    pool.setCleanupFunction(async (course: IsolatedCourse) => {
      await this.cleanupCourse(course);
    });
    
    await pool.initialize();
    this.resourcePools.set(poolName, pool);
  }

  /**
   * Create event pool
   */
  private async createEventPool(poolSize: number): Promise<void> {
    const poolName = 'events';
    const pool = new ResourcePool<IsolatedEvent>(poolName, poolSize, this.workerId);
    
    pool.setResourceFactory(async (index: number) => {
      return await this.createTestEvent(index);
    });
    
    pool.setCleanupFunction(async (event: IsolatedEvent) => {
      await this.cleanupEvent(event);
    });
    
    await pool.initialize();
    this.resourcePools.set(poolName, pool);
  }

  /**
   * Acquire user from pool
   */
  async acquireUser(role: UserRole, testId: string): Promise<IsolatedTestUser> {
    const poolName = `users_${role}`;
    const pool = this.resourcePools.get(poolName) as ResourcePool<IsolatedTestUser>;
    
    if (!pool) {
      throw new Error(`User pool for role ${role} not found`);
    }
    
    return await pool.acquire(testId);
  }

  /**
   * Release user back to pool
   */
  async releaseUser(user: IsolatedTestUser, testId: string): Promise<void> {
    const poolName = `users_${user.role}`;
    const pool = this.resourcePools.get(poolName) as ResourcePool<IsolatedTestUser>;
    
    if (!pool) {
      throw new Error(`User pool for role ${user.role} not found`);
    }
    
    await pool.release(user, testId);
  }

  /**
   * Acquire news article from pool
   */
  async acquireNewsArticle(testId: string): Promise<IsolatedNewsArticle> {
    const pool = this.resourcePools.get('news_articles') as ResourcePool<IsolatedNewsArticle>;
    return await pool.acquire(testId);
  }

  /**
   * Release news article back to pool
   */
  async releaseNewsArticle(article: IsolatedNewsArticle, testId: string): Promise<void> {
    const pool = this.resourcePools.get('news_articles') as ResourcePool<IsolatedNewsArticle>;
    await pool.release(article, testId);
  }

  /**
   * Acquire course from pool
   */
  async acquireCourse(testId: string): Promise<IsolatedCourse> {
    const pool = this.resourcePools.get('courses') as ResourcePool<IsolatedCourse>;
    return await pool.acquire(testId);
  }

  /**
   * Release course back to pool
   */
  async releaseCourse(course: IsolatedCourse, testId: string): Promise<void> {
    const pool = this.resourcePools.get('courses') as ResourcePool<IsolatedCourse>;
    await pool.release(course, testId);
  }

  /**
   * Acquire event from pool
   */
  async acquireEvent(testId: string): Promise<IsolatedEvent> {
    const pool = this.resourcePools.get('events') as ResourcePool<IsolatedEvent>;
    return await pool.acquire(testId);
  }

  /**
   * Release event back to pool
   */
  async releaseEvent(event: IsolatedEvent, testId: string): Promise<void> {
    const pool = this.resourcePools.get('events') as ResourcePool<IsolatedEvent>;
    await pool.release(event, testId);
  }

  /**
   * Create test user
   */
  private async createTestUser(role: UserRole, index: number): Promise<IsolatedTestUser> {
    const userId = this.testIdGenerator.generateUserId(`pool_${role}`, role, index);
    const email = `${userId}@test.yggdrasil.local`;
    // Don't pre-hash the password - let the User model handle it
    const plainPassword = 'TestPassword123!';
    
    const userData: IsolatedUserData = {
      _id: userId,
      email: email,
      password: plainPassword,
      role: role,
      profile: {
        firstName: `Test${role.charAt(0).toUpperCase() + role.slice(1)}`,
        lastName: `User${index}`,
        department: `Test Department ${index}`,
        bio: `Test bio for ${role} user ${index}`,
        contactInfo: {
          phone: `555-${String(index).padStart(4, '0')}`,
          office: `Office ${index}`
        }
      },
      isActive: true
    };

    const testId = this.testIdGenerator.generateTestId({
      suiteName: 'ResourcePool',
      testName: `CreateUser_${role}_${index}`,
      testFile: 'resource-pool-manager.ts',
      userRole: role
    });

    // Create user in database
    const user = await this.dbManager.createIsolatedUser(userData, testId);
    
    return {
      ...user.toObject(),
      testId: testId,
      poolIndex: index,
      isInUse: false,
      acquiredAt: null,
      acquiredBy: null
    };
  }

  /**
   * Create test news article
   */
  private async createTestNewsArticle(index: number): Promise<IsolatedNewsArticle> {
    const articleId = this.testIdGenerator.generateResourceId('pool_news', 'article', `article_${index}`);
    
    return {
      _id: articleId,
      title: `Test News Article ${index}`,
      content: `This is test content for news article ${index}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
      category: 'announcement',
      author: {
        id: `test_author_${index}`,
        name: `Test Author ${index}`,
        email: `author${index}@test.yggdrasil.local`
      },
      publishedAt: new Date(),
      isInUse: false,
      acquiredAt: null,
      acquiredBy: null,
      poolIndex: index
    };
  }

  /**
   * Create test course
   */
  private async createTestCourse(index: number): Promise<IsolatedCourse> {
    const courseId = this.testIdGenerator.generateResourceId('pool_course', 'course', `course_${index}`);
    
    return {
      _id: courseId,
      name: `Test Course ${index}`,
      description: `Test course description ${index}`,
      instructor: {
        id: `test_instructor_${index}`,
        name: `Test Instructor ${index}`,
        email: `instructor${index}@test.yggdrasil.local`
      },
      schedule: {
        days: ['Monday', 'Wednesday', 'Friday'],
        time: '10:00 AM',
        location: `Room ${index + 100}`
      },
      capacity: 30,
      enrolled: [],
      isActive: true,
      isInUse: false,
      acquiredAt: null,
      acquiredBy: null,
      poolIndex: index
    };
  }

  /**
   * Create test event
   */
  private async createTestEvent(index: number): Promise<IsolatedEvent> {
    const eventId = this.testIdGenerator.generateResourceId('pool_event', 'event', `event_${index}`);
    const now = new Date();
    const startDate = new Date(now.getTime() + (index * 24 * 60 * 60 * 1000)); // Stagger events by days
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // 2 hour duration
    
    return {
      _id: eventId,
      title: `Test Event ${index}`,
      description: `Test event description ${index}`,
      startDate: startDate,
      endDate: endDate,
      location: `Test Location ${index}`,
      organizer: {
        id: `test_organizer_${index}`,
        name: `Test Organizer ${index}`,
        email: `organizer${index}@test.yggdrasil.local`
      },
      attendees: [],
      isInUse: false,
      acquiredAt: null,
      acquiredBy: null,
      poolIndex: index
    };
  }

  /**
   * Cleanup test user
   */
  private async cleanupTestUser(user: IsolatedTestUser): Promise<void> {
    // Reset user state
    user.isInUse = false;
    user.acquiredAt = null;
    user.acquiredBy = null;
    
    // Additional cleanup can be added here
  }

  /**
   * Cleanup news article
   */
  private async cleanupNewsArticle(article: IsolatedNewsArticle): Promise<void> {
    // Reset article state
    article.isInUse = false;
    article.acquiredAt = null;
    article.acquiredBy = null;
  }

  /**
   * Cleanup course
   */
  private async cleanupCourse(course: IsolatedCourse): Promise<void> {
    // Reset course state
    course.isInUse = false;
    course.acquiredAt = null;
    course.acquiredBy = null;
    course.enrolled = [];
  }

  /**
   * Cleanup event
   */
  private async cleanupEvent(event: IsolatedEvent): Promise<void> {
    // Reset event state
    event.isInUse = false;
    event.acquiredAt = null;
    event.acquiredBy = null;
    event.attendees = [];
  }

  /**
   * Get pool statistics
   */
  getPoolStatistics(): PoolStatistics {
    const stats: PoolStatistics = {
      workerId: this.workerId,
      pools: []
    };

    for (const [poolName, pool] of this.resourcePools) {
      stats.pools.push({
        name: poolName,
        totalResources: pool.getTotalCount(),
        availableResources: pool.getAvailableCount(),
        inUseResources: pool.getInUseCount(),
        utilizationRate: pool.getUtilizationRate()
      });
    }

    return stats;
  }

  /**
   * Cleanup all pools
   */
  async cleanup(): Promise<void> {
    console.log(`🧹 Worker ${this.workerId}: Cleaning up resource pools...`);
    
    for (const [poolName, pool] of this.resourcePools) {
      await pool.cleanup();
    }
    
    await this.dbManager.cleanupWorkerData();
    
    console.log(`✅ Worker ${this.workerId}: Resource pools cleaned up`);
  }
}

/**
 * Generic Resource Pool
 */
export class ResourcePool<T extends PoolResource> {
  private poolName: string;
  private workerId: number;
  private resources: T[] = [];
  private availableResources: T[] = [];
  private inUseResources: Map<string, T> = new Map();
  private resourceFactory: ((index: number) => Promise<T>) | null = null;
  private cleanupFunction: ((resource: T) => Promise<void>) | null = null;
  private maxSize: number;
  private acquireTimeout: number = 30000; // 30 seconds

  constructor(poolName: string, maxSize: number, workerId: number) {
    this.poolName = poolName;
    this.maxSize = maxSize;
    this.workerId = workerId;
  }

  /**
   * Set resource factory function
   */
  setResourceFactory(factory: (index: number) => Promise<T>): void {
    this.resourceFactory = factory;
  }

  /**
   * Set cleanup function
   */
  setCleanupFunction(cleanup: (resource: T) => Promise<void>): void {
    this.cleanupFunction = cleanup;
  }

  /**
   * Initialize pool with resources
   */
  async initialize(): Promise<void> {
    if (!this.resourceFactory) {
      throw new Error(`Resource factory not set for pool ${this.poolName}`);
    }

    console.log(`🏗️ Worker ${this.workerId}: Initializing pool ${this.poolName} with ${this.maxSize} resources...`);
    
    // Create resources in batches to avoid overwhelming the system
    const batchSize = 10;
    const batches = Math.ceil(this.maxSize / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min((batch + 1) * batchSize, this.maxSize);
      
      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        batchPromises.push(this.resourceFactory(i));
      }
      
      const batchResources = await Promise.all(batchPromises);
      this.resources.push(...batchResources);
      this.availableResources.push(...batchResources);
      
      // Small delay between batches
      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Worker ${this.workerId}: Pool ${this.poolName} initialized with ${this.resources.length} resources`);
  }

  /**
   * Acquire resource from pool
   */
  async acquire(testId: string): Promise<T> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.acquireTimeout) {
      if (this.availableResources.length > 0) {
        const resource = this.availableResources.shift()!;
        
        // Mark as in use
        resource.isInUse = true;
        resource.acquiredAt = Date.now();
        resource.acquiredBy = testId;
        
        this.inUseResources.set(testId, resource);
        
        return resource;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Timeout acquiring resource from pool ${this.poolName} for test ${testId}`);
  }

  /**
   * Release resource back to pool
   */
  async release(resource: T, testId: string): Promise<void> {
    // Remove from in-use map
    this.inUseResources.delete(testId);
    
    // Clean up resource
    if (this.cleanupFunction) {
      await this.cleanupFunction(resource);
    }
    
    // Return to available pool
    this.availableResources.push(resource);
  }

  /**
   * Get total resource count
   */
  getTotalCount(): number {
    return this.resources.length;
  }

  /**
   * Get available resource count
   */
  getAvailableCount(): number {
    return this.availableResources.length;
  }

  /**
   * Get in-use resource count
   */
  getInUseCount(): number {
    return this.inUseResources.size;
  }

  /**
   * Get utilization rate
   */
  getUtilizationRate(): number {
    return this.getTotalCount() > 0 ? (this.getInUseCount() / this.getTotalCount()) * 100 : 0;
  }

  /**
   * Cleanup pool
   */
  async cleanup(): Promise<void> {
    // Force release all in-use resources
    for (const [testId, resource] of this.inUseResources) {
      await this.release(resource, testId);
    }
    
    // Clear all arrays
    this.resources = [];
    this.availableResources = [];
    this.inUseResources.clear();
  }
}

/**
 * Resource Interfaces
 */
export interface PoolResource {
  _id: string;
  isInUse: boolean;
  acquiredAt: number | null;
  acquiredBy: string | null;
  poolIndex: number;
}

export interface IsolatedTestUser extends PoolResource {
  email: string;
  password: string;
  role: UserRole;
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
  isActive: boolean;
  testId: string;
}

export interface IsolatedNewsArticle extends PoolResource {
  title: string;
  content: string;
  category: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  publishedAt: Date;
}

export interface IsolatedCourse extends PoolResource {
  name: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  schedule: {
    days: string[];
    time: string;
    location: string;
  };
  capacity: number;
  enrolled: string[];
  isActive: boolean;
}

export interface IsolatedEvent extends PoolResource {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  organizer: {
    id: string;
    name: string;
    email: string;
  };
  attendees: string[];
}

export type UserRole = 'admin' | 'teacher' | 'staff' | 'student';

/**
 * Pool Statistics Interface
 */
export interface PoolStatistics {
  workerId: number;
  pools: PoolStat[];
}

export interface PoolStat {
  name: string;
  totalResources: number;
  availableResources: number;
  inUseResources: number;
  utilizationRate: number;
}

// Export singleton factory
export const createResourcePoolManager = (workerId?: number) => {
  return ResourcePoolManager.getInstance(workerId);
};