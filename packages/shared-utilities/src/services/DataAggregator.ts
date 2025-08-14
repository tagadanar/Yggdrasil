// packages/shared-utilities/src/services/DataAggregator.ts
import { ServiceClientFactory } from '../patterns/service-client';
import { Cache } from '../cache/cache';
import { logger } from '../logging/logger';

export class DataAggregator {
  private cache: Cache;
  private userClient = ServiceClientFactory.getUserServiceClient();
  private courseClient = ServiceClientFactory.getCourseServiceClient();
  private newsClient = ServiceClientFactory.getNewsServiceClient();
  private planningClient = ServiceClientFactory.getPlanningServiceClient();
  private enrollmentClient = ServiceClientFactory.getEnrollmentServiceClient();

  constructor() {
    this.cache = new Cache({
      ttl: 60000, // 1 minute
      max: 5000,
    });
  }

  /**
   * Get user with their enrollments and course details populated
   */
  async getUserWithEnrollments(userId: string) {
    const cacheKey = `user:${userId}:enrollments`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Fetch user and enrollments in parallel
      const [user, enrollments] = await Promise.all([
        this.userClient.get(`/users/${userId}`) as Promise<any>,
        this.enrollmentClient.get(`/enrollments/user/${userId}`) as Promise<any[]>,
      ]);

      // Fetch course details for each enrollment
      const enrollmentsWithCourses = await Promise.all(
        enrollments.map(async (enrollment) => {
          const course = await this.courseClient.get(`/courses/${enrollment.courseId}`);
          return { ...enrollment, course };
        })
      );

      const result = {
        ...user,
        enrollments: enrollmentsWithCourses,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to aggregate user with enrollments:', error);
      throw new AggregationError('Failed to fetch user with enrollments');
    }
  }

  /**
   * Get course with all enrollments and student details populated
   */
  async getCourseWithEnrollments(courseId: string) {
    const cacheKey = `course:${courseId}:enrollments`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Fetch course and its enrollments in parallel
      const [course, enrollments] = await Promise.all([
        this.courseClient.get(`/courses/${courseId}`) as Promise<any>,
        this.enrollmentClient.get(`/enrollments/course/${courseId}`) as Promise<any[]>,
      ]);

      // Fetch user details for each enrollment
      const enrollmentsWithUsers = await Promise.all(
        enrollments.map(async (enrollment) => {
          const user = await this.userClient.get(`/users/${enrollment.userId}`);
          return { ...enrollment, user };
        })
      );

      const result = {
        ...course,
        enrollments: enrollmentsWithUsers,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to aggregate course with enrollments:', error);
      throw new AggregationError('Failed to fetch course with enrollments');
    }
  }

  async getCourseWithInstructor(courseId: string) {
    const cacheKey = `course:${courseId}:instructor`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const course = (await this.courseClient.get(`/courses/${courseId}`)) as any;
      const instructor = await this.userClient.get(`/users/${course.teacherId}`);

      const result = {
        ...course,
        instructor,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to aggregate course data:', error);
      throw new AggregationError('Failed to fetch course with instructor');
    }
  }


  async getDashboardData(userId: string) {
    const cacheKey = `dashboard:${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Parallel data fetching for dashboard
      const [user, promotions, recentNews, upcomingEvents] = await Promise.all([
        this.userClient.get(`/users/${userId}`),
        this.planningClient.get(`/promotions/user/${userId}`),
        this.newsClient.get('/articles/recent?limit=5'),
        this.planningClient.get(`/events/upcoming?userId=${userId}&limit=5`),
      ]);

      // Get progress for active promotions
      const progressPromises = (promotions as any[]).map((promotion: any) =>
        this.planningClient.get(`/promotions/progress/${promotion._id}`),
      );
      const progressData = await Promise.all(progressPromises);

      // Get course details for promotions
      const courseIds = (promotions as any[]).map((p: any) => p.courseId);
      const courses = await Promise.all(
        courseIds.map(id => this.courseClient.get(`/courses/${id}`)),
      );

      // Aggregate dashboard data
      const result = {
        user,
        activePromotions: (promotions as any[]).map((promotion: any, index: number) => ({
          ...promotion,
          course: courses[index],
          progress: progressData[index],
        })),
        recentNews,
        upcomingEvents,
        summary: {
          totalCourses: (promotions as any[]).length,
          completedCourses: (promotions as any[]).filter((p: any) => p.status === 'completed')
            .length,
          averageProgress: this.calculateAverageProgress(progressData as any[]),
          totalTimeSpent: (progressData as any[]).reduce(
            (acc: number, p: any) => acc + (p.timeSpent || 0),
            0,
          ),
        },
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to aggregate dashboard data:', error);
      throw new AggregationError('Failed to fetch dashboard data');
    }
  }

  async getStatisticsOverview() {
    const cacheKey = 'statistics:overview';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Parallel data fetching for statistics
      const [userStats, courseStats, enrollmentStats, activityStats] = await Promise.all([
        this.userClient.get('/users/stats'),
        this.courseClient.get('/courses/stats'),
        this.planningClient.get('/promotions/stats'),
        this.planningClient.get('/activity/stats'),
      ]);

      const result = {
        users: userStats,
        courses: courseStats,
        enrollments: enrollmentStats,
        activity: activityStats,
        timestamp: new Date(),
      };

      this.cache.set(cacheKey, result, 300000); // Cache for 5 minutes
      return result;
    } catch (error) {
      logger.error('Failed to aggregate statistics overview:', error);
      throw new AggregationError('Failed to fetch statistics overview');
    }
  }

  // GraphQL-like field selection
  async getUser(userId: string, fields: string[]) {
    const baseFields = ['id', 'email', 'role', 'profile'];
    const aggregateFields = fields.filter(f => !baseFields.includes(f));

    // Get base user data
    const user = (await this.userClient.get(`/users/${userId}`)) as any;

    // Aggregate additional data based on requested fields
    const aggregated: any = { ...user };

    if (aggregateFields.includes('enrollments')) {
      aggregated.promotions = await this.planningClient.get(`/promotions/user/${userId}`);
    }

    if (aggregateFields.includes('courses') && user.role === 'teacher') {
      aggregated.courses = await this.courseClient.get(`/courses/teacher/${userId}`);
    }

    if (aggregateFields.includes('statistics')) {
      aggregated.statistics = await this.getStatistics(userId);
    }

    if (aggregateFields.includes('recentActivity')) {
      aggregated.recentActivity = await this.getRecentActivity(userId);
    }

    return aggregated;
  }

  async getCourse(courseId: string, fields: string[]) {
    const baseFields = ['id', 'title', 'description', 'teacherId'];
    const aggregateFields = fields.filter(f => !baseFields.includes(f));

    // Get base course data
    const course = (await this.courseClient.get(`/courses/${courseId}`)) as any;

    // Aggregate additional data based on requested fields
    const aggregated: any = { ...course };

    if (aggregateFields.includes('instructor')) {
      aggregated.instructor = await this.userClient.get(`/users/${course.teacherId}`);
    }

    if (aggregateFields.includes('enrollments')) {
      aggregated.promotions = await this.planningClient.get(`/promotions/course/${courseId}`);
    }

    if (aggregateFields.includes('statistics')) {
      aggregated.statistics = await this.planningClient.get(`/courses/${courseId}/statistics`);
    }

    return aggregated;
  }

  // Helper methods
  private calculateAverageProgress(progressData: any[]): number {
    if (progressData.length === 0) return 0;

    const total = progressData.reduce((acc, p) => acc + (p.percentage || 0), 0);
    return Math.round(total / progressData.length);
  }

  private async getStatistics(userId: string) {
    try {
      return await this.planningClient.get(`/users/${userId}/statistics`);
    } catch (error) {
      logger.error('Failed to get user statistics:', error);
      return null;
    }
  }

  private async getRecentActivity(userId: string) {
    try {
      return await this.planningClient.get(`/users/${userId}/activity/recent?limit=10`);
    } catch (error) {
      logger.error('Failed to get recent activity:', error);
      return null;
    }
  }

  // Cache management
  invalidateUserCache(userId: string) {
    this.cache.deletePattern(`user:${userId}:*`);
    this.cache.deletePattern(`dashboard:${userId}`);
  }

  invalidateCourseCache(courseId: string) {
    this.cache.deletePattern(`course:${courseId}:*`);
  }

  invalidateStatisticsCache() {
    this.cache.deletePattern('statistics:*');
  }

  clearAllCache() {
    this.cache.clear();
  }
}

export class AggregationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AggregationError';
  }
}

// Singleton instance
export const dataAggregator = new DataAggregator();
