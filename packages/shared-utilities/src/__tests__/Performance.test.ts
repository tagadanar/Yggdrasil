// packages/shared-utilities/src/__tests__/Performance.test.ts
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ServiceClient, ServiceClientFactory } from '../patterns/service-client';
import { Cache } from '../cache/cache';
import { DataAggregator } from '../services/DataAggregator';

// Mock circuit breaker
jest.mock('opossum', () => {
  return jest.fn().mockImplementation((fn: any, options: any) => {
    const mockBreaker = {
      fire: fn,
      on: jest.fn(),
      stats: {
        failures: 0,
        successes: 0,
        fallbacks: 0,
        fires: 0,
      },
      isOpen: false,
      isHalfOpen: false,
      state: 'CLOSED',
    };

    // Simulate circuit breaker behavior
    const originalFire = mockBreaker.fire;
    mockBreaker.fire = async (...args: any[]) => {
      mockBreaker.stats.fires++;

      if (mockBreaker.isOpen) {
        mockBreaker.stats.fallbacks++;
        throw new Error('Circuit breaker is OPEN');
      }

      try {
        const result = await originalFire(...args);
        mockBreaker.stats.successes++;
        return result;
      } catch (error) {
        mockBreaker.stats.failures++;

        // Open circuit if too many failures
        if (mockBreaker.stats.failures >= options.errorThresholdPercentage / 10) {
          mockBreaker.isOpen = true;
          mockBreaker.state = 'OPEN';
        }

        throw error;
      }
    };

    return mockBreaker;
  });
});

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
  isAxiosError: jest.fn(() => true),
}));

describe('Performance and Resilience - Phase 4.1 Validation', () => {
  describe('Cache Performance Tests', () => {
    let cache: Cache;

    beforeEach(() => {
      cache = new Cache({
        ttl: 60000, // 1 minute
        max: 10000, // Large capacity for performance testing
      });
    });

    test('should handle high-volume cache operations efficiently', () => {
      const startTime = Date.now();

      // Set 1000 items
      for (let i = 0; i < 1000; i++) {
        cache.set(`key:${i}`, { data: `value${i}`, timestamp: Date.now() });
      }

      const setTime = Date.now() - startTime;
      expect(setTime).toBeLessThan(100); // Should complete within 100ms

      // Get 1000 items
      const getStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        const value = cache.get(`key:${i}`);
        expect(value).toBeDefined();
      }

      const getTime = Date.now() - getStartTime;
      expect(getTime).toBeLessThan(50); // Gets should be even faster
    });

    test('should maintain performance under concurrent access', async () => {
      const concurrentOperations = 100;
      const promises = [];

      const startTime = Date.now();

      // Simulate concurrent cache operations
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          new Promise<void>(resolve => {
            cache.set(`concurrent:${i}`, { value: i, timestamp: Date.now() });
            const retrieved = cache.get(`concurrent:${i}`);
            expect(retrieved).toBeDefined();
            resolve();
          }),
        );
      }

      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(200); // Should handle concurrent access efficiently
      expect(cache.size()).toBe(concurrentOperations);
    });

    test('should efficiently handle cache capacity overflow', () => {
      const smallCache = new Cache({ max: 100, ttl: 60000 });

      const startTime = Date.now();

      // Add 150 items (50 more than capacity)
      for (let i = 0; i < 150; i++) {
        smallCache.set(`overflow:${i}`, `value${i}`);
      }

      const overflowTime = Date.now() - startTime;

      expect(overflowTime).toBeLessThan(50); // Should handle overflow efficiently
      expect(smallCache.size()).toBe(100); // Should maintain max capacity

      // First 50 items should be evicted
      expect(smallCache.get('overflow:0')).toBeNull();
      expect(smallCache.get('overflow:149')).toBeDefined();
    });

    test('should perform pattern deletion efficiently', () => {
      // Setup test data
      for (let i = 0; i < 1000; i++) {
        cache.set(`user:${i}:profile`, `profile${i}`);
        cache.set(`user:${i}:settings`, `settings${i}`);
        cache.set(`course:${i}:data`, `course${i}`);
      }

      expect(cache.size()).toBe(3000);

      const startTime = Date.now();
      const deleted = cache.deletePattern('user:*:profile');
      const deleteTime = Date.now() - startTime;

      expect(deleteTime).toBeLessThan(100); // Should be efficient
      expect(deleted).toBe(1000); // Should delete all matching patterns
      expect(cache.size()).toBe(2000); // Should have 2000 remaining
    });

    test('should handle cache cleanup efficiently', async () => {
      const shortTTLCache = new Cache({ ttl: 100, max: 1000 }); // 100ms TTL

      // Add items that will expire
      for (let i = 0; i < 500; i++) {
        shortTTLCache.set(`expire:${i}`, `value${i}`);
      }

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const startTime = Date.now();
      const cleaned = shortTTLCache.cleanup();
      const cleanupTime = Date.now() - startTime;

      expect(cleanupTime).toBeLessThan(50); // Cleanup should be fast
      expect(cleaned).toBe(500); // Should clean all expired items
      expect(shortTTLCache.size()).toBe(0);
    });
  });

  describe('Circuit Breaker Behavior Tests', () => {
    let serviceClient: ServiceClient;
    let mockAxiosInstance: any;

    beforeEach(() => {
      mockAxiosInstance = {
        request: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
      };

      const axios = require('axios');
      axios.create.mockReturnValue(mockAxiosInstance);

      serviceClient = new ServiceClient('test-service', {
        baseURL: 'http://localhost:3001',
        circuitBreaker: true,
      });
    });

    test('should handle successful requests and track stats', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true },
        config: { headers: { 'X-Request-Start': Date.now().toString() } },
      });

      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(serviceClient.get(`/endpoint/${i}`));
      }

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual({ success: true });
      });
    });

    test('should open circuit after repeated failures', async () => {
      let failureCount = 0;
      mockAxiosInstance.request.mockImplementation(() => {
        failureCount++;
        if (failureCount <= 5) {
          throw new Error('Service unavailable');
        }
        return Promise.resolve({
          data: { success: true },
          config: { headers: { 'X-Request-Start': Date.now().toString() } },
        });
      });

      // First 5 requests should fail
      for (let i = 0; i < 5; i++) {
        await expect(serviceClient.get('/test')).rejects.toThrow();
      }

      // Circuit should now be open
      await expect(serviceClient.get('/test')).rejects.toThrow('Circuit breaker is OPEN');
    });

    test('should maintain performance under circuit breaker protection', async () => {
      // Setup alternating success/failure pattern
      let requestCount = 0;
      mockAxiosInstance.request.mockImplementation(() => {
        requestCount++;
        if (requestCount % 3 === 0) {
          throw new Error('Intermittent failure');
        }
        return Promise.resolve({
          data: { success: true },
          config: { headers: { 'X-Request-Start': Date.now().toString() } },
        });
      });

      const startTime = Date.now();
      const results = [];

      // Make 30 requests with circuit breaker protection
      for (let i = 0; i < 30; i++) {
        try {
          const result = await serviceClient.get(`/endpoint/${i}`);
          results.push(result);
        } catch (error) {
          // Expected for some requests
        }
      }

      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(5000); // Should complete quickly even with failures
      expect(results.length).toBeGreaterThan(0); // Some requests should succeed
    });
  });

  describe('Connection Pool Performance Tests', () => {
    // Note: Since we don't have actual connection pooling implemented yet,
    // we'll test the database manager's connection reuse behavior

    test('should reuse database connections efficiently', async () => {
      const { dbManager } = await import('../../../database-schemas/src/connection/multi-db');

      const startTime = Date.now();

      // Request same connection multiple times
      const connections = [];
      for (let i = 0; i < 10; i++) {
        connections.push(await dbManager.connect('test-service'));
      }

      const connectionTime = Date.now() - startTime;

      // All connections should be the same instance (reused)
      const firstConnection = connections[0];
      connections.forEach(conn => {
        expect(conn).toBe(firstConnection);
      });

      expect(connectionTime).toBeLessThan(1000); // Should be fast due to reuse
    });

    test('should handle concurrent connection requests efficiently', async () => {
      const { dbManager } = await import('../../../database-schemas/src/connection/multi-db');

      const startTime = Date.now();

      // Request connections concurrently
      const connectionPromises = [];
      for (let i = 0; i < 20; i++) {
        connectionPromises.push(dbManager.connect('concurrent-test-service'));
      }

      const connections = await Promise.all(connectionPromises);
      const concurrentTime = Date.now() - startTime;

      // All should be the same connection
      const firstConnection = connections[0];
      connections.forEach(conn => {
        expect(conn).toBe(firstConnection);
      });

      expect(concurrentTime).toBeLessThan(2000); // Should handle concurrency well
    });
  });

  describe('Service Communication Performance', () => {
    let dataAggregator: DataAggregator;

    beforeEach(() => {
      // Mock all service clients
      const mockServiceClient = {
        get: jest.fn(),
      };

      const ServiceClientFactory = require('../patterns/service-client').ServiceClientFactory;
      ServiceClientFactory.getUserServiceClient = jest.fn().mockReturnValue(mockServiceClient);
      ServiceClientFactory.getCourseServiceClient = jest.fn().mockReturnValue(mockServiceClient);
      ServiceClientFactory.getEnrollmentServiceClient = jest
        .fn()
        .mockReturnValue(mockServiceClient);
      ServiceClientFactory.getNewsServiceClient = jest.fn().mockReturnValue(mockServiceClient);
      ServiceClientFactory.getPlanningServiceClient = jest.fn().mockReturnValue(mockServiceClient);

      dataAggregator = new DataAggregator();
    });

    test('should aggregate data from multiple services efficiently', async () => {
      const mockUser = { _id: 'user123', email: 'test@example.com' };
      const mockEnrollments = Array.from({ length: 10 }, (_, i) => ({
        _id: `enroll${i}`,
        courseId: `course${i}`,
        status: 'active',
      }));
      const mockCourses = Array.from({ length: 10 }, (_, i) => ({
        _id: `course${i}`,
        title: `Course ${i}`,
      }));

      // Setup mocks
      const ServiceClientFactory = require('../patterns/service-client').ServiceClientFactory;
      const userClient = ServiceClientFactory.getUserServiceClient();
      const courseClient = ServiceClientFactory.getCourseServiceClient();
      const enrollmentClient = ServiceClientFactory.getEnrollmentServiceClient();

      userClient.get.mockResolvedValue(mockUser);
      enrollmentClient.get.mockResolvedValue(mockEnrollments);
      courseClient.get.mockImplementation((url: string) => {
        const courseId = url.split('/').pop();
        return Promise.resolve(mockCourses.find(c => c._id === courseId));
      });

      const startTime = Date.now();
      const result = await dataAggregator.getUserWithEnrollments('user123');
      const aggregationTime = Date.now() - startTime;

      expect(aggregationTime).toBeLessThan(1000); // Should aggregate efficiently
      expect(result.enrollments).toHaveLength(10);
      expect(userClient.get).toHaveBeenCalledTimes(1);
      expect(enrollmentClient.get).toHaveBeenCalledTimes(1);
      expect(courseClient.get).toHaveBeenCalledTimes(10); // One per enrollment
    });

    test('should handle large dataset aggregation within performance limits', async () => {
      const largeEnrollments = Array.from({ length: 100 }, (_, i) => ({
        _id: `enroll${i}`,
        courseId: `course${i}`,
      }));

      const ServiceClientFactory = require('../patterns/service-client').ServiceClientFactory;
      const userClient = ServiceClientFactory.getUserServiceClient();
      const courseClient = ServiceClientFactory.getCourseServiceClient();
      const enrollmentClient = ServiceClientFactory.getEnrollmentServiceClient();

      userClient.get.mockResolvedValue({ _id: 'user123' });
      enrollmentClient.get.mockResolvedValue(largeEnrollments);
      courseClient.get.mockImplementation((url: string) => {
        const courseId = url.split('/').pop();
        return Promise.resolve({ _id: courseId, title: `Course ${courseId}` });
      });

      const startTime = Date.now();
      const result = await dataAggregator.getUserWithEnrollments('user123');
      const aggregationTime = Date.now() - startTime;

      expect(aggregationTime).toBeLessThan(5000); // Should handle large datasets
      expect(result.enrollments).toHaveLength(100);
    });

    test('should utilize caching for repeated requests', async () => {
      const mockUser = { _id: 'user123', email: 'cached@example.com' };
      const mockEnrollments = [{ _id: 'enroll1', courseId: 'course1' }];

      const ServiceClientFactory = require('../patterns/service-client').ServiceClientFactory;
      const userClient = ServiceClientFactory.getUserServiceClient();
      const enrollmentClient = ServiceClientFactory.getEnrollmentServiceClient();
      const courseClient = ServiceClientFactory.getCourseServiceClient();

      userClient.get.mockResolvedValue(mockUser);
      enrollmentClient.get.mockResolvedValue(mockEnrollments);
      courseClient.get.mockResolvedValue({ _id: 'course1', title: 'Course 1' });

      // First request
      const firstStartTime = Date.now();
      await dataAggregator.getUserWithEnrollments('user123');
      const firstRequestTime = Date.now() - firstStartTime;

      // Second request (should use cache)
      const secondStartTime = Date.now();
      await dataAggregator.getUserWithEnrollments('user123');
      const secondRequestTime = Date.now() - secondStartTime;

      expect(secondRequestTime).toBeLessThan(firstRequestTime); // Cached should be faster
      expect(secondRequestTime).toBeLessThan(10); // Should be very fast from cache
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('should manage cache memory efficiently', () => {
      const cache = new Cache({ max: 1000, ttl: 60000 });

      // Monitor memory usage pattern
      const initialMemory = process.memoryUsage().heapUsed;

      // Add large dataset
      for (let i = 0; i < 1000; i++) {
        cache.set(`memory:${i}`, {
          data: new Array(100).fill(`item${i}`), // ~100 strings per item
          timestamp: Date.now(),
          metadata: { index: i, type: 'test' },
        });
      }

      const afterAddingMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterAddingMemory - initialMemory;

      // Clear cache
      cache.clear();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterClearMemory = process.memoryUsage().heapUsed;

      // Memory should be managed efficiently
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      expect(cache.size()).toBe(0);
    });

    test('should handle rapid cache turnover without memory leaks', async () => {
      const cache = new Cache({ max: 100, ttl: 50 }); // Very short TTL

      // Rapidly add and expire items
      for (let cycle = 0; cycle < 10; cycle++) {
        for (let i = 0; i < 100; i++) {
          cache.set(`cycle${cycle}:item${i}`, { data: `value${i}` });
        }

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 60));

        // Cleanup expired items
        cache.cleanup();
      }

      expect(cache.size()).toBe(0); // Should be empty after cleanup cycles
    });
  });

  describe('Error Recovery Performance', () => {
    test('should recover quickly from service failures', async () => {
      const ServiceClientFactory = require('../patterns/service-client').ServiceClientFactory;
      const userClient = ServiceClientFactory.getUserServiceClient();

      let failureCount = 0;
      userClient.get.mockImplementation(() => {
        failureCount++;
        if (failureCount <= 3) {
          throw new Error('Service temporarily unavailable');
        }
        return Promise.resolve({ _id: 'user123', recovered: true });
      });

      const dataAggregator = new DataAggregator();

      // First few requests should fail fast
      const failureStartTime = Date.now();
      try {
        await dataAggregator.getUser('user123', ['id', 'email']);
      } catch (error) {
        // Expected
      }
      const failureTime = Date.now() - failureStartTime;

      expect(failureTime).toBeLessThan(1000); // Should fail fast

      // Clear cache to force new request
      dataAggregator.clearAllCache();

      // Recovery should be fast once service is available
      const recoveryStartTime = Date.now();
      const result = await dataAggregator.getUser('user123', ['id', 'email']);
      const recoveryTime = Date.now() - recoveryStartTime;

      expect(recoveryTime).toBeLessThan(1000); // Should recover quickly
      expect(result.recovered).toBe(true);
    });
  });
});
