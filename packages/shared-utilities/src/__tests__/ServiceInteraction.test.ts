// packages/shared-utilities/src/__tests__/ServiceInteraction.test.ts
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { ServiceClientFactory, ServiceClient } from '../patterns/service-client';
import { DataAggregator } from '../services/DataAggregator';
import { Cache } from '../cache/cache';

// Mock HTTP server for realistic service interactions
interface MockServiceResponse {
  status: number;
  data: any;
  delay?: number;
}

class MockServiceServer {
  private routes = new Map<string, MockServiceResponse>();
  private requestLog: Array<{ method: string; url: string; timestamp: number }> = [];

  setRoute(method: string, path: string, response: MockServiceResponse) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes.set(key, response);
  }

  async handleRequest(method: string, url: string): Promise<any> {
    this.requestLog.push({ method, url, timestamp: Date.now() });

    const key = `${method.toUpperCase()}:${url}`;
    const response = this.routes.get(key);

    if (!response) {
      throw new Error(`Not Found: ${method} ${url}`);
    }

    if (response.delay) {
      await new Promise(resolve => setTimeout(resolve, response.delay));
    }

    if (response.status >= 400) {
      const error = new Error(`HTTP ${response.status}`);
      (error as any).response = { status: response.status, data: response.data };
      throw error;
    }

    return response.data;
  }

  getRequestLog() {
    return [...this.requestLog];
  }

  clearRequestLog() {
    this.requestLog = [];
  }
}

describe('Service Interaction - Phase 4.1 Validation', () => {
  let mockServer: MockServiceServer;
  let dataAggregator: DataAggregator;

  beforeAll(() => {
    mockServer = new MockServiceServer();

    // Mock axios to use our mock server
    const axios = require('axios');
    axios.create.mockReturnValue({
      request: jest.fn().mockImplementation(async config => {
        const result = await mockServer.handleRequest(config.method || 'GET', config.url);
        return {
          data: result,
          status: 200,
          config: { headers: { 'X-Request-Start': Date.now().toString() } },
        };
      }),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    });

    // Mock circuit breaker
    jest.mock('opossum', () => {
      return jest.fn().mockImplementation((fn: any) => ({ fire: fn, on: jest.fn() }));
    });
  });

  beforeEach(() => {
    mockServer.clearRequestLog();
    dataAggregator = new DataAggregator();
    setupMockServiceResponses();
  });

  function setupMockServiceResponses() {
    // User Service Mock Data
    mockServer.setRoute('GET', '/users/user123', {
      status: 200,
      data: {
        _id: 'user123',
        email: 'john.doe@example.com',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          department: 'Computer Science',
          photo: 'https://example.com/avatar.jpg',
        },
        role: 'student',
      },
    });

    mockServer.setRoute('GET', '/users/teacher456', {
      status: 200,
      data: {
        _id: 'teacher456',
        email: 'jane.smith@example.com',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          department: 'Mathematics',
          officeHours: 'MWF 2-4 PM',
        },
        role: 'teacher',
      },
    });

    // Course Service Mock Data
    mockServer.setRoute('GET', '/courses/course789', {
      status: 200,
      data: {
        _id: 'course789',
        title: 'Advanced JavaScript',
        description: 'Deep dive into JavaScript concepts',
        teacherId: 'teacher456',
        status: 'active',
        chapters: [
          { id: 'ch1', title: 'Async Programming' },
          { id: 'ch2', title: 'Design Patterns' },
        ],
      },
    });

    mockServer.setRoute('GET', '/courses/course101', {
      status: 200,
      data: {
        _id: 'course101',
        title: 'React Fundamentals',
        description: 'Learn React from scratch',
        teacherId: 'teacher456',
        status: 'active',
      },
    });

    // Enrollment Service Mock Data
    mockServer.setRoute('GET', '/enrollments/user/user123', {
      status: 200,
      data: [
        {
          _id: 'enroll1',
          userId: 'user123',
          courseId: 'course789',
          status: 'active',
          enrolledAt: '2024-01-15T10:00:00Z',
          progress: 65,
        },
        {
          _id: 'enroll2',
          userId: 'user123',
          courseId: 'course101',
          status: 'completed',
          enrolledAt: '2024-01-01T10:00:00Z',
          progress: 100,
        },
      ],
    });

    mockServer.setRoute('GET', '/enrollments/course/course789', {
      status: 200,
      data: [
        {
          _id: 'enroll1',
          userId: 'user123',
          courseId: 'course789',
          status: 'active',
        },
        {
          _id: 'enroll3',
          userId: 'user456',
          courseId: 'course789',
          status: 'active',
        },
      ],
    });

    // Progress data
    mockServer.setRoute('GET', '/progress/enroll1', {
      status: 200,
      data: {
        enrollmentId: 'enroll1',
        percentage: 65,
        chaptersCompleted: ['ch1'],
        timeSpent: 480,
        lastAccessed: '2024-01-20T14:30:00Z',
      },
    });

    mockServer.setRoute('GET', '/progress/enroll2', {
      status: 200,
      data: {
        enrollmentId: 'enroll2',
        percentage: 100,
        chaptersCompleted: ['ch1', 'ch2'],
        timeSpent: 720,
        lastAccessed: '2024-01-10T16:00:00Z',
      },
    });

    // News Service Mock Data
    mockServer.setRoute('GET', '/articles/recent?limit=5', {
      status: 200,
      data: [
        {
          _id: 'news1',
          title: 'New Course Available',
          content: "We're excited to announce...",
          publishedAt: '2024-01-20T09:00:00Z',
        },
        {
          _id: 'news2',
          title: 'Platform Update',
          content: 'Latest features and improvements...',
          publishedAt: '2024-01-19T15:00:00Z',
        },
      ],
    });

    // Planning Service Mock Data
    mockServer.setRoute('GET', '/events/upcoming?userId=user123&limit=5', {
      status: 200,
      data: [
        {
          _id: 'event1',
          title: 'JavaScript Workshop',
          date: '2024-01-25T14:00:00Z',
          type: 'workshop',
          location: 'Online',
        },
      ],
    });

    // Statistics endpoints
    mockServer.setRoute('GET', '/users/stats', {
      status: 200,
      data: {
        totalUsers: 1250,
        activeUsers: 980,
        newUsersThisMonth: 45,
      },
    });

    mockServer.setRoute('GET', '/courses/stats', {
      status: 200,
      data: {
        totalCourses: 87,
        activeCourses: 76,
        newCoursesThisMonth: 3,
      },
    });

    mockServer.setRoute('GET', '/enrollments/stats', {
      status: 200,
      data: {
        totalEnrollments: 3420,
        activeEnrollments: 2890,
        completionRate: 0.72,
      },
    });

    mockServer.setRoute('GET', '/activity/stats', {
      status: 200,
      data: {
        totalSessions: 15670,
        averageSessionTime: 28,
        peakUsageHours: [14, 15, 16, 20, 21],
      },
    });
  }

  describe('User Dashboard Scenario', () => {
    test('should aggregate complete user dashboard data', async () => {
      const result = await dataAggregator.getDashboardData('user123');

      expect(result).toEqual({
        user: expect.objectContaining({
          _id: 'user123',
          email: 'john.doe@example.com',
          profile: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
          }),
        }),
        activeEnrollments: expect.arrayContaining([
          expect.objectContaining({
            _id: 'enroll1',
            courseId: 'course789',
            course: expect.objectContaining({
              title: 'Advanced JavaScript',
            }),
            progress: expect.objectContaining({
              percentage: 65,
            }),
          }),
        ]),
        recentNews: expect.arrayContaining([
          expect.objectContaining({
            title: 'New Course Available',
          }),
        ]),
        upcomingEvents: expect.arrayContaining([
          expect.objectContaining({
            title: 'JavaScript Workshop',
          }),
        ]),
        summary: expect.objectContaining({
          totalCourses: 2,
          completedCourses: 1,
          averageProgress: expect.any(Number),
          totalTimeSpent: expect.any(Number),
        }),
      });

      // Verify service interactions
      const requestLog = mockServer.getRequestLog();
      expect(requestLog.length).toBeGreaterThan(5); // Multiple service calls

      const userRequests = requestLog.filter(r => r.url.includes('/users/'));
      const courseRequests = requestLog.filter(r => r.url.includes('/courses/'));
      const enrollmentRequests = requestLog.filter(
        r => r.url.includes('/enrollments/') || r.url.includes('/progress/'),
      );

      expect(userRequests.length).toBeGreaterThan(0);
      expect(courseRequests.length).toBeGreaterThan(0);
      expect(enrollmentRequests.length).toBeGreaterThan(0);
    });

    test('should handle partial service failures gracefully', async () => {
      // Simulate news service failure
      mockServer.setRoute('GET', '/articles/recent?limit=5', {
        status: 503,
        data: { error: 'Service unavailable' },
      });

      await expect(dataAggregator.getDashboardData('user123')).rejects.toThrow();

      // Verify that other services were still called
      const requestLog = mockServer.getRequestLog();
      const userRequests = requestLog.filter(r => r.url.includes('/users/'));
      expect(userRequests.length).toBeGreaterThan(0);
    });

    test('should leverage caching for repeated dashboard requests', async () => {
      // First request
      await dataAggregator.getDashboardData('user123');
      const firstRequestCount = mockServer.getRequestLog().length;

      mockServer.clearRequestLog();

      // Second request (should use cache)
      await dataAggregator.getDashboardData('user123');
      const secondRequestCount = mockServer.getRequestLog().length;

      expect(secondRequestCount).toBeLessThan(firstRequestCount);
    });
  });

  describe('Course Management Scenario', () => {
    test('should aggregate course data with instructor and enrollments', async () => {
      const result = await dataAggregator.getCourseWithEnrollments('course789');

      expect(result).toEqual({
        _id: 'course789',
        title: 'Advanced JavaScript',
        description: 'Deep dive into JavaScript concepts',
        teacherId: 'teacher456',
        status: 'active',
        chapters: expect.any(Array),
        enrollments: expect.arrayContaining([
          expect.objectContaining({
            _id: 'enroll1',
            userId: 'user123',
            user: expect.objectContaining({
              profile: expect.objectContaining({
                firstName: 'John',
                lastName: 'Doe',
              }),
            }),
          }),
        ]),
      });

      // Verify cross-service data fetching
      const requestLog = mockServer.getRequestLog();
      const courseRequest = requestLog.find(r => r.url === '/courses/course789');
      const enrollmentRequest = requestLog.find(r => r.url === '/enrollments/course/course789');

      expect(courseRequest).toBeDefined();
      expect(enrollmentRequest).toBeDefined();
    });

    test('should handle course with instructor details', async () => {
      const result = await dataAggregator.getCourseWithInstructor('course789');

      expect(result).toEqual({
        _id: 'course789',
        title: 'Advanced JavaScript',
        teacherId: 'teacher456',
        instructor: expect.objectContaining({
          _id: 'teacher456',
          profile: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Smith',
            officeHours: 'MWF 2-4 PM',
          }),
        }),
        description: expect.any(String),
        status: 'active',
        chapters: expect.any(Array),
      });
    });
  });

  describe('Student Learning Journey Scenario', () => {
    test('should track complete student learning progression', async () => {
      const result = await dataAggregator.getUserWithEnrollments('user123');

      expect(result.enrollments).toHaveLength(2);

      const activeEnrollment = result.enrollments.find(e => e.status === 'active');
      const completedEnrollment = result.enrollments.find(e => e.status === 'completed');

      expect(activeEnrollment).toEqual(
        expect.objectContaining({
          courseId: 'course789',
          progress: 65,
          course: expect.objectContaining({
            title: 'Advanced JavaScript',
          }),
        }),
      );

      expect(completedEnrollment).toEqual(
        expect.objectContaining({
          courseId: 'course101',
          progress: 100,
          course: expect.objectContaining({
            title: 'React Fundamentals',
          }),
        }),
      );
    });

    test('should handle GraphQL-like field selection for student data', async () => {
      const result = await dataAggregator.getUser('user123', [
        'id',
        'email',
        'profile',
        'enrollments',
        'statistics',
      ]);

      expect(result).toEqual(
        expect.objectContaining({
          _id: 'user123',
          email: 'john.doe@example.com',
          profile: expect.any(Object),
          enrollments: expect.any(Array),
          statistics: expect.any(Object),
        }),
      );

      // Verify selective data fetching
      const requestLog = mockServer.getRequestLog();
      expect(requestLog.some(r => r.url === '/users/user123')).toBe(true);
      expect(requestLog.some(r => r.url === '/enrollments/user/user123')).toBe(true);
    });
  });

  describe('Administrative Statistics Scenario', () => {
    test('should aggregate platform-wide statistics', async () => {
      const result = await dataAggregator.getStatisticsOverview();

      expect(result).toEqual({
        users: {
          totalUsers: 1250,
          activeUsers: 980,
          newUsersThisMonth: 45,
        },
        courses: {
          totalCourses: 87,
          activeCourses: 76,
          newCoursesThisMonth: 3,
        },
        enrollments: {
          totalEnrollments: 3420,
          activeEnrollments: 2890,
          completionRate: 0.72,
        },
        activity: {
          totalSessions: 15670,
          averageSessionTime: 28,
          peakUsageHours: [14, 15, 16, 20, 21],
        },
        timestamp: expect.any(Date),
      });

      // Verify all statistics services were called
      const requestLog = mockServer.getRequestLog();
      expect(requestLog.some(r => r.url === '/users/stats')).toBe(true);
      expect(requestLog.some(r => r.url === '/courses/stats')).toBe(true);
      expect(requestLog.some(r => r.url === '/enrollments/stats')).toBe(true);
      expect(requestLog.some(r => r.url === '/activity/stats')).toBe(true);
    });
  });

  describe('Performance Under Load Scenarios', () => {
    test('should handle concurrent user dashboard requests efficiently', async () => {
      const startTime = Date.now();

      // Simulate 10 concurrent dashboard requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(dataAggregator.getDashboardData('user123'));
      }

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Most requests should use cache after the first one
      const requestLog = mockServer.getRequestLog();
      const uniqueRequests = new Set(requestLog.map(r => r.url));

      // Should make initial requests but then cache subsequent ones
      expect(uniqueRequests.size).toBeLessThan(requestLog.length);
    });

    test('should handle mixed request patterns efficiently', async () => {
      const startTime = Date.now();

      // Mix of different request types
      const promises = [
        dataAggregator.getUserWithEnrollments('user123'),
        dataAggregator.getCourseWithInstructor('course789'),
        dataAggregator.getStatisticsOverview(),
        dataAggregator.getDashboardData('user123'),
        dataAggregator.getCourseWithEnrollments('course789'),
      ];

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(totalTime).toBeLessThan(3000); // Should handle mixed load efficiently

      // Verify all different types of requests were made
      const requestLog = mockServer.getRequestLog();
      expect(requestLog.some(r => r.url.includes('/users/'))).toBe(true);
      expect(requestLog.some(r => r.url.includes('/courses/'))).toBe(true);
      expect(requestLog.some(r => r.url.includes('/enrollments/'))).toBe(true);
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should handle cascading service failures', async () => {
      // Simulate progressive service failures
      mockServer.setRoute('GET', '/users/user123', {
        status: 503,
        data: { error: 'User service down' },
      });

      await expect(dataAggregator.getUserWithEnrollments('user123')).rejects.toThrow();

      // Now restore service and verify recovery
      mockServer.setRoute('GET', '/users/user123', {
        status: 200,
        data: {
          _id: 'user123',
          email: 'recovered@example.com',
          profile: { firstName: 'Recovered', lastName: 'User' },
        },
      });

      // Clear cache to force new request
      dataAggregator.invalidateUserCache('user123');

      const result = await dataAggregator.getUserWithEnrollments('user123');
      expect(result.email).toBe('recovered@example.com');
    });

    test('should handle slow service responses', async () => {
      // Add delay to simulate slow service
      mockServer.setRoute('GET', '/users/user123', {
        status: 200,
        data: { _id: 'user123', email: 'slow@example.com' },
        delay: 100, // 100ms delay
      });

      const startTime = Date.now();
      const result = await dataAggregator.getUser('user123', ['id', 'email']);
      const responseTime = Date.now() - startTime;

      expect(result.email).toBe('slow@example.com');
      expect(responseTime).toBeGreaterThan(90); // Should account for delay
      expect(responseTime).toBeLessThan(500); // But still complete reasonably fast
    });
  });

  describe('Cache Invalidation Scenarios', () => {
    test('should properly invalidate related caches', async () => {
      // Get initial data
      await dataAggregator.getUserWithEnrollments('user123');
      await dataAggregator.getCourseWithInstructor('course789');

      const initialRequestCount = mockServer.getRequestLog().length;
      mockServer.clearRequestLog();

      // Requests should use cache
      await dataAggregator.getUserWithEnrollments('user123');
      await dataAggregator.getCourseWithInstructor('course789');

      expect(mockServer.getRequestLog().length).toBe(0); // All from cache

      // Invalidate user cache
      dataAggregator.invalidateUserCache('user123');

      // User request should hit service, course should still use cache
      await dataAggregator.getUserWithEnrollments('user123');
      await dataAggregator.getCourseWithInstructor('course789');

      const afterInvalidationLog = mockServer.getRequestLog();
      expect(afterInvalidationLog.some(r => r.url.includes('/users/'))).toBe(true);
      expect(afterInvalidationLog.some(r => r.url.includes('/courses/course789'))).toBe(false);
    });

    test('should handle selective cache clearing', async () => {
      // Load multiple types of data
      await dataAggregator.getUserWithEnrollments('user123');
      await dataAggregator.getStatisticsOverview();

      mockServer.clearRequestLog();

      // Both should use cache
      await dataAggregator.getUserWithEnrollments('user123');
      await dataAggregator.getStatisticsOverview();
      expect(mockServer.getRequestLog().length).toBe(0);

      // Clear only statistics cache
      dataAggregator.invalidateStatisticsCache();

      await dataAggregator.getUserWithEnrollments('user123'); // Should use cache
      await dataAggregator.getStatisticsOverview(); // Should hit service

      const requestLog = mockServer.getRequestLog();
      expect(requestLog.some(r => r.url.includes('/stats'))).toBe(true);
      expect(requestLog.some(r => r.url.includes('/users/user123'))).toBe(false);
    });
  });
});
