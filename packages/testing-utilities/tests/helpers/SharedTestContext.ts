/**
 * Shared Test Context System - Optimizes test data creation and reuse
 * 
 * Reduces test execution time by caching commonly used test data
 * and providing intelligent data lifecycle management.
 */

import { TestDataFactory } from './TestDataFactory';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';

interface CachedUser {
  _id: string;
  email: string;
  role: string;
  profile: string;
  createdAt: Date;
  expiresAt: Date;
}

interface CachedCourse {
  _id: string;
  title: string;
  teacherId: string;
  createdAt: Date;
  expiresAt: Date;
}

interface TestContextCache {
  users: Map<string, CachedUser>;
  courses: Map<string, CachedCourse>;
  lastCleanup: Date;
}

export class SharedTestContext {
  private static instance: SharedTestContext;
  private cache: TestContextCache;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes
  private cleanupTimer?: NodeJS.Timeout;
  
  private constructor() {
    this.cache = {
      users: new Map(),
      courses: new Map(),
      lastCleanup: new Date()
    };
    
    this.startCleanupTimer();
  }
  
  static getInstance(): SharedTestContext {
    if (!SharedTestContext.instance) {
      SharedTestContext.instance = new SharedTestContext();
    }
    return SharedTestContext.instance;
  }
  
  /**
   * Get or create a cached user of specified role
   * Significantly faster than creating new users for each test
   */
  async getOrCreateUser(role: string, testName: string): Promise<CachedUser> {
    const cacheKey = `${role}_shared`;
    const cached = this.cache.users.get(cacheKey);
    
    // Return cached user if still valid
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }
    
    // Create new user and cache it
    const factory = new TestDataFactory(testName);
    const user = await factory.users.createUser(role);
    
    const cachedUser: CachedUser = {
      _id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_TTL)
    };
    
    this.cache.users.set(cacheKey, cachedUser);
    
    // Register for cleanup
    const cleanup = TestCleanup.getInstance(testName);
    cleanup.trackDocument('users', user._id);
    cleanup.trackDocument('profiles', user.profile);
    
    return cachedUser;
  }
  
  /**
   * Get or create a cached course for testing
   * Reuses courses across tests to reduce setup time
   */
  async getOrCreateCourse(teacherId: string, testName: string): Promise<CachedCourse> {
    const cacheKey = `course_${teacherId}`;
    const cached = this.cache.courses.get(cacheKey);
    
    // Return cached course if still valid
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }
    
    // Create new course and cache it
    const factory = new TestDataFactory(testName);
    const course = await factory.courses.createFullCourse(teacherId);
    
    const cachedCourse: CachedCourse = {
      _id: course._id,
      title: course.title,
      teacherId: course.teacherId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_TTL)
    };
    
    this.cache.courses.set(cacheKey, cachedCourse);
    
    // Register for cleanup
    const cleanup = TestCleanup.getInstance(testName);
    cleanup.trackDocument('courses', course._id);
    
    return cachedCourse;
  }
  
  /**
   * Get multiple users of different roles efficiently
   * Optimized for tests that need various role combinations
   */
  async getUserSet(roles: string[], testName: string): Promise<Record<string, CachedUser>> {
    const userPromises = roles.map(async role => {
      const user = await this.getOrCreateUser(role, testName);
      return [role, user] as [string, CachedUser];
    });
    
    const users = await Promise.all(userPromises);
    return Object.fromEntries(users);
  }
  
  /**
   * Create a complete test scenario with users and courses
   * Optimized for integration tests that need complex setups
   */
  async createTestScenario(scenarioName: string, testName: string): Promise<{
    admin: CachedUser;
    teacher: CachedUser;
    student: CachedUser;
    course: CachedCourse;
  }> {
    const [admin, teacher, student] = await Promise.all([
      this.getOrCreateUser('admin', testName),
      this.getOrCreateUser('teacher', testName),
      this.getOrCreateUser('student', testName)
    ]);
    
    const course = await this.getOrCreateCourse(teacher._id, testName);
    
    return { admin, teacher, student, course };
  }
  
  /**
   * Clean expired cache entries
   * Automatically called periodically to prevent memory leaks
   */
  private cleanExpiredEntries(): void {
    const now = new Date();
    
    // Clean expired users
    for (const [key, user] of this.cache.users.entries()) {
      if (user.expiresAt <= now) {
        this.cache.users.delete(key);
      }
    }
    
    // Clean expired courses
    for (const [key, course] of this.cache.courses.entries()) {
      if (course.expiresAt <= now) {
        this.cache.courses.delete(key);
      }
    }
    
    this.cache.lastCleanup = now;
  }
  
  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanExpiredEntries();
    }, this.CLEANUP_INTERVAL);
    
    // Clean up timer on process exit
    process.on('exit', () => {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }
    });
  }
  
  /**
   * Force cleanup of all cached data
   * Use sparingly - mainly for debugging or after major test failures
   */
  forceClearCache(): void {
    this.cache.users.clear();
    this.cache.courses.clear();
    this.cache.lastCleanup = new Date();
  }
  
  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    users: number;
    courses: number;
    lastCleanup: Date;
    memoryUsage: string;
  } {
    return {
      users: this.cache.users.size,
      courses: this.cache.courses.size,
      lastCleanup: this.cache.lastCleanup,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    };
  }
  
  /**
   * Warm up cache with commonly used test data
   * Call this before running test suites for better performance
   */
  async warmupCache(testName: string): Promise<void> {
    console.log('🔥 Warming up shared test context cache...');
    
    const startTime = Date.now();
    
    // Pre-create common user roles
    const commonRoles = ['admin', 'teacher', 'student', 'staff'];
    await Promise.all(
      commonRoles.map(role => this.getOrCreateUser(role, testName))
    );
    
    // Pre-create a test course
    const teacher = await this.getOrCreateUser('teacher', testName);
    await this.getOrCreateCourse(teacher._id, testName);
    
    const duration = Date.now() - startTime;
    console.log(`✅ Cache warmup completed in ${duration}ms`);
  }
}