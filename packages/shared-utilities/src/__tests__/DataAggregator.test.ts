// packages/shared-utilities/src/__tests__/DataAggregator.test.ts
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DataAggregator, AggregationError } from '../services/DataAggregator';
import { ServiceClientFactory } from '../patterns/service-client';

// Mock ServiceClientFactory
jest.mock('../patterns/service-client', () => ({
  ServiceClientFactory: {
    getUserServiceClient: jest.fn(),
    getCourseServiceClient: jest.fn(),
    getEnrollmentServiceClient: jest.fn(),
    getNewsServiceClient: jest.fn(),
    getPlanningServiceClient: jest.fn(),
  },
}));

describe('DataAggregator - Phase 4.1 Validation', () => {
  let dataAggregator: DataAggregator;
  let mockUserClient: any;
  let mockCourseClient: any;
  let mockEnrollmentClient: any;
  let mockNewsClient: any;
  let mockPlanningClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock clients
    mockUserClient = {
      get: jest.fn(),
    };
    mockCourseClient = {
      get: jest.fn(),
    };
    mockEnrollmentClient = {
      get: jest.fn(),
    };
    mockNewsClient = {
      get: jest.fn(),
    };
    mockPlanningClient = {
      get: jest.fn(),
    };

    (ServiceClientFactory.getUserServiceClient as jest.Mock).mockReturnValue(mockUserClient);
    (ServiceClientFactory.getCourseServiceClient as jest.Mock).mockReturnValue(mockCourseClient);
    (ServiceClientFactory.getEnrollmentServiceClient as jest.Mock).mockReturnValue(
      mockEnrollmentClient,
    );
    (ServiceClientFactory.getNewsServiceClient as jest.Mock).mockReturnValue(mockNewsClient);
    (ServiceClientFactory.getPlanningServiceClient as jest.Mock).mockReturnValue(
      mockPlanningClient,
    );

    dataAggregator = new DataAggregator();
  });

  describe('User with Enrollments Aggregation', () => {
    test('should aggregate user data with enrollments and course details', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'john@example.com',
        profile: { firstName: 'John', lastName: 'Doe' },
      };

      const mockEnrollments = [
        { _id: 'enroll1', courseId: 'course1', status: 'active' },
        { _id: 'enroll2', courseId: 'course2', status: 'completed' },
      ];

      const mockCourses = [
        { _id: 'course1', title: 'JavaScript Basics', teacherId: 'teacher1' },
        { _id: 'course2', title: 'React Advanced', teacherId: 'teacher2' },
      ];

      mockUserClient.get.mockResolvedValue(mockUser);
      mockEnrollmentClient.get.mockResolvedValue(mockEnrollments);
      mockCourseClient.get
        .mockResolvedValueOnce(mockCourses[0])
        .mockResolvedValueOnce(mockCourses[1]);

      const result = await dataAggregator.getUserWithEnrollments('user123');

      expect(mockUserClient.get).toHaveBeenCalledWith('/users/user123');
      expect(mockEnrollmentClient.get).toHaveBeenCalledWith('/enrollments/user/user123');
      expect(mockCourseClient.get).toHaveBeenCalledWith('/courses/course1');
      expect(mockCourseClient.get).toHaveBeenCalledWith('/courses/course2');

      expect(result).toEqual({
        ...mockUser,
        enrollments: [
          { ...mockEnrollments[0], course: mockCourses[0] },
          { ...mockEnrollments[1], course: mockCourses[1] },
        ],
      });
    });

    test('should return cached result on subsequent calls', async () => {
      const mockUser = { _id: 'user123', email: 'john@example.com' };
      const mockEnrollments = [{ _id: 'enroll1', courseId: 'course1' }];
      const mockCourse = { _id: 'course1', title: 'JavaScript Basics' };

      mockUserClient.get.mockResolvedValue(mockUser);
      mockEnrollmentClient.get.mockResolvedValue(mockEnrollments);
      mockCourseClient.get.mockResolvedValue(mockCourse);

      // First call
      const result1 = await dataAggregator.getUserWithEnrollments('user123');

      // Second call (should use cache)
      const result2 = await dataAggregator.getUserWithEnrollments('user123');

      expect(mockUserClient.get).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2); // Same cached object
    });

    test('should handle errors and throw AggregationError', async () => {
      mockUserClient.get.mockRejectedValue(new Error('User service down'));

      await expect(dataAggregator.getUserWithEnrollments('user123')).rejects.toThrow(
        AggregationError,
      );

      await expect(dataAggregator.getUserWithEnrollments('user123')).rejects.toThrow(
        'Failed to fetch user with enrollments',
      );
    });
  });

  describe('Course with Instructor Aggregation', () => {
    test('should aggregate course data with instructor details', async () => {
      const mockCourse = {
        _id: 'course123',
        title: 'Advanced TypeScript',
        teacherId: 'teacher456',
      };

      const mockInstructor = {
        _id: 'teacher456',
        profile: { firstName: 'Jane', lastName: 'Smith' },
      };

      mockCourseClient.get.mockResolvedValue(mockCourse);
      mockUserClient.get.mockResolvedValue(mockInstructor);

      const result = await dataAggregator.getCourseWithInstructor('course123');

      expect(mockCourseClient.get).toHaveBeenCalledWith('/courses/course123');
      expect(mockUserClient.get).toHaveBeenCalledWith('/users/teacher456');

      expect(result).toEqual({
        ...mockCourse,
        instructor: mockInstructor,
      });
    });

    test('should handle missing instructor gracefully', async () => {
      const mockCourse = { _id: 'course123', teacherId: 'teacher456' };

      mockCourseClient.get.mockResolvedValue(mockCourse);
      mockUserClient.get.mockRejectedValue(new Error('Instructor not found'));

      await expect(dataAggregator.getCourseWithInstructor('course123')).rejects.toThrow(
        AggregationError,
      );
    });
  });

  describe('Course with Enrollments Aggregation', () => {
    test('should aggregate course with enrollment and user details', async () => {
      const mockCourse = { _id: 'course123', title: 'React Basics' };
      const mockEnrollments = [
        { _id: 'enroll1', userId: 'user1', status: 'active' },
        { _id: 'enroll2', userId: 'user2', status: 'completed' },
      ];
      const mockUsers = [
        { _id: 'user1', profile: { firstName: 'John' } },
        { _id: 'user2', profile: { firstName: 'Jane' } },
      ];

      mockCourseClient.get.mockResolvedValue(mockCourse);
      mockEnrollmentClient.get.mockResolvedValue(mockEnrollments);
      mockUserClient.get.mockResolvedValueOnce(mockUsers[0]).mockResolvedValueOnce(mockUsers[1]);

      const result = await dataAggregator.getCourseWithEnrollments('course123');

      expect(result).toEqual({
        ...mockCourse,
        enrollments: [
          { ...mockEnrollments[0], user: mockUsers[0] },
          { ...mockEnrollments[1], user: mockUsers[1] },
        ],
      });
    });
  });

  describe('Dashboard Data Aggregation', () => {
    test('should aggregate comprehensive dashboard data', async () => {
      const mockUser = { _id: 'user123', profile: { firstName: 'John' } };
      const mockEnrollments = [
        { _id: 'enroll1', courseId: 'course1', status: 'active' },
        { _id: 'enroll2', courseId: 'course2', status: 'completed' },
      ];
      const mockProgress = [
        { percentage: 75, timeSpent: 120 },
        { percentage: 100, timeSpent: 200 },
      ];
      const mockCourses = [
        { _id: 'course1', title: 'Course 1' },
        { _id: 'course2', title: 'Course 2' },
      ];
      const mockNews = [{ id: 'news1', title: 'Latest Update' }];
      const mockEvents = [{ id: 'event1', title: 'Upcoming Workshop' }];

      mockUserClient.get.mockResolvedValue(mockUser);
      mockEnrollmentClient.get
        .mockResolvedValueOnce(mockEnrollments)
        .mockResolvedValueOnce(mockProgress[0])
        .mockResolvedValueOnce(mockProgress[1]);
      mockCourseClient.get
        .mockResolvedValueOnce(mockCourses[0])
        .mockResolvedValueOnce(mockCourses[1]);
      mockNewsClient.get.mockResolvedValue(mockNews);
      mockPlanningClient.get.mockResolvedValue(mockEvents);

      const result = await dataAggregator.getDashboardData('user123');

      expect(result).toHaveProperty('user', mockUser);
      expect(result).toHaveProperty('activeEnrollments');
      expect(result).toHaveProperty('recentNews', mockNews);
      expect(result).toHaveProperty('upcomingEvents', mockEvents);
      expect(result).toHaveProperty('summary');

      expect(result.summary).toEqual({
        totalCourses: 2,
        completedCourses: 1,
        averageProgress: 88, // (75 + 100) / 2 rounded
        totalTimeSpent: 320,
      });
    });

    test('should handle empty enrollments gracefully', async () => {
      const mockUser = { _id: 'user123' };

      mockUserClient.get.mockResolvedValue(mockUser);
      mockEnrollmentClient.get.mockResolvedValue([]);
      mockNewsClient.get.mockResolvedValue([]);
      mockPlanningClient.get.mockResolvedValue([]);

      const result = await dataAggregator.getDashboardData('user123');

      expect(result.summary.totalCourses).toBe(0);
      expect(result.summary.completedCourses).toBe(0);
      expect(result.summary.averageProgress).toBe(0);
    });
  });

  describe('Statistics Overview Aggregation', () => {
    test('should aggregate statistics from all services', async () => {
      const mockUserStats = { totalUsers: 1000, activeUsers: 800 };
      const mockCourseStats = { totalCourses: 50, activeCourses: 45 };
      const mockEnrollmentStats = { totalEnrollments: 2000, completedEnrollments: 500 };
      const mockActivityStats = { totalSessions: 5000, averageSessionTime: 30 };

      mockUserClient.get.mockResolvedValue(mockUserStats);
      mockCourseClient.get.mockResolvedValue(mockCourseStats);
      mockEnrollmentClient.get
        .mockResolvedValueOnce(mockEnrollmentStats)
        .mockResolvedValueOnce(mockActivityStats);

      const result = await dataAggregator.getStatisticsOverview();

      expect(result).toEqual({
        users: mockUserStats,
        courses: mockCourseStats,
        enrollments: mockEnrollmentStats,
        activity: mockActivityStats,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('GraphQL-like Field Selection', () => {
    test('should fetch only requested user fields', async () => {
      const mockUser = { _id: 'user123', email: 'john@example.com' };
      const mockEnrollments = [{ _id: 'enroll1' }];
      const mockStatistics = { completionRate: 85 };

      mockUserClient.get.mockResolvedValue(mockUser);
      mockEnrollmentClient.get
        .mockResolvedValueOnce(mockEnrollments)
        .mockResolvedValueOnce(mockStatistics);

      const result = await dataAggregator.getUser('user123', [
        'id',
        'email',
        'enrollments',
        'statistics',
      ]);

      expect(result).toEqual({
        ...mockUser,
        enrollments: mockEnrollments,
        statistics: mockStatistics,
      });

      expect(mockEnrollmentClient.get).toHaveBeenCalledWith('/enrollments/user/user123');
      expect(mockEnrollmentClient.get).toHaveBeenCalledWith('/users/user123/statistics');
    });

    test('should handle teacher-specific fields', async () => {
      const mockTeacher = { _id: 'teacher123', role: 'teacher' };
      const mockCourses = [{ _id: 'course1', title: 'Math 101' }];

      mockUserClient.get.mockResolvedValue(mockTeacher);
      mockCourseClient.get.mockResolvedValue(mockCourses);

      const result = await dataAggregator.getUser('teacher123', ['id', 'role', 'courses']);

      expect(result).toEqual({
        ...mockTeacher,
        courses: mockCourses,
      });

      expect(mockCourseClient.get).toHaveBeenCalledWith('/courses/teacher/teacher123');
    });

    test('should fetch only requested course fields', async () => {
      const mockCourse = { _id: 'course123', title: 'React Basics', teacherId: 'teacher1' };
      const mockInstructor = { _id: 'teacher1', profile: { firstName: 'Jane' } };
      const mockEnrollments = [{ _id: 'enroll1' }];

      mockCourseClient.get.mockResolvedValue(mockCourse);
      mockUserClient.get.mockResolvedValue(mockInstructor);
      mockEnrollmentClient.get.mockResolvedValue(mockEnrollments);

      const result = await dataAggregator.getCourse('course123', [
        'id',
        'title',
        'instructor',
        'enrollments',
      ]);

      expect(result).toEqual({
        ...mockCourse,
        instructor: mockInstructor,
        enrollments: mockEnrollments,
      });
    });
  });

  describe('Cache Management', () => {
    test('should invalidate user-specific cache', async () => {
      const mockUser = { _id: 'user123' };
      const mockEnrollments = [{ _id: 'enroll1' }];

      mockUserClient.get.mockResolvedValue(mockUser);
      mockEnrollmentClient.get.mockResolvedValue(mockEnrollments);

      // First call
      await dataAggregator.getUserWithEnrollments('user123');
      expect(mockUserClient.get).toHaveBeenCalledTimes(1);

      // Second call (should use cache)
      await dataAggregator.getUserWithEnrollments('user123');
      expect(mockUserClient.get).toHaveBeenCalledTimes(1);

      // Invalidate cache
      dataAggregator.invalidateUserCache('user123');

      // Third call (should make new request)
      await dataAggregator.getUserWithEnrollments('user123');
      expect(mockUserClient.get).toHaveBeenCalledTimes(2);
    });

    test('should invalidate course-specific cache', async () => {
      const mockCourse = { _id: 'course123', teacherId: 'teacher1' };
      const mockInstructor = { _id: 'teacher1' };

      mockCourseClient.get.mockResolvedValue(mockCourse);
      mockUserClient.get.mockResolvedValue(mockInstructor);

      await dataAggregator.getCourseWithInstructor('course123');
      await dataAggregator.getCourseWithInstructor('course123'); // Cached

      expect(mockCourseClient.get).toHaveBeenCalledTimes(1);

      dataAggregator.invalidateCourseCache('course123');

      await dataAggregator.getCourseWithInstructor('course123'); // New request
      expect(mockCourseClient.get).toHaveBeenCalledTimes(2);
    });

    test('should clear all cache', async () => {
      // Setup multiple cached items
      mockUserClient.get.mockResolvedValue({ _id: 'user1' });
      mockEnrollmentClient.get.mockResolvedValue([]);

      await dataAggregator.getUserWithEnrollments('user1');
      await dataAggregator.getUserWithEnrollments('user1'); // Cached

      expect(mockUserClient.get).toHaveBeenCalledTimes(1);

      dataAggregator.clearAllCache();

      await dataAggregator.getUserWithEnrollments('user1'); // New request
      expect(mockUserClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should handle partial service failures in dashboard aggregation', async () => {
      const mockUser = { _id: 'user123' };
      const mockEnrollments = [{ _id: 'enroll1', courseId: 'course1' }];

      mockUserClient.get.mockResolvedValue(mockUser);
      mockEnrollmentClient.get.mockResolvedValue(mockEnrollments);
      mockCourseClient.get.mockRejectedValue(new Error('Course service down'));
      mockNewsClient.get.mockResolvedValue([]);
      mockPlanningClient.get.mockResolvedValue([]);

      await expect(dataAggregator.getDashboardData('user123')).rejects.toThrow(AggregationError);
    });

    test('should handle concurrent aggregation requests', async () => {
      const mockUser = { _id: 'user123' };
      mockUserClient.get.mockResolvedValue(mockUser);
      mockEnrollmentClient.get.mockResolvedValue([]);

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(dataAggregator.getUserWithEnrollments('user123'));
      }

      const results = await Promise.all(promises);

      // Should all return the same result
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toEqual(expect.objectContaining(mockUser));
      });
    });
  });

  describe('Performance Optimization', () => {
    test('should handle large datasets efficiently', async () => {
      const mockUser = { _id: 'user123' };
      const mockEnrollments = Array.from({ length: 100 }, (_, i) => ({
        _id: `enroll${i}`,
        courseId: `course${i}`,
      }));

      mockUserClient.get.mockResolvedValue(mockUser);
      mockEnrollmentClient.get.mockResolvedValue(mockEnrollments);

      // Mock 100 course requests
      mockCourseClient.get.mockImplementation((url: string) => {
        const courseId = url.split('/').pop();
        return Promise.resolve({ _id: courseId, title: `Course ${courseId}` });
      });

      const startTime = Date.now();
      const result = await dataAggregator.getUserWithEnrollments('user123');
      const duration = Date.now() - startTime;

      expect(result.enrollments).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockCourseClient.get).toHaveBeenCalledTimes(100);
    });
  });
});
