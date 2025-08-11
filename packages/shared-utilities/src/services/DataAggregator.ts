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

  constructor() {
    this.cache = new Cache({
      ttl: 60000, // 1 minute
      max: 5000,
    });
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
      const [user, enrollments, recentNews, upcomingEvents] = await Promise.all([
        this.userClient.get(`/users/${userId}`),
        this.enrollmentClient.get(`/enrollments/user/${userId}?status=active`),
        this.newsClient.get('/articles/recent?limit=5'),
        this.planningClient.get(`/events/upcoming?userId=${userId}&limit=5`),
      ]);

      // Get progress for active enrollments
      const progressPromises = (enrollments as any[]).map((enrollment: any) =>
        this.enrollmentClient.get(`/progress/${enrollment._id}`),
      );
      const progressData = await Promise.all(progressPromises);

      // Get course details for enrollments
      const courseIds = (enrollments as any[]).map((e: any) => e.courseId);
      const courses = await Promise.all(
        courseIds.map(id => this.courseClient.get(`/courses/${id}`)),
      );

      // Aggregate dashboard data
      const result = {
        user,
        activeEnrollments: (enrollments as any[]).map((enrollment: any, index: number) => ({
          ...enrollment,
          course: courses[index],
          progress: progressData[index],
        })),
        recentNews,
        upcomingEvents,
        summary: {
          totalCourses: (enrollments as any[]).length,
          completedCourses: (enrollments as any[]).filter((e: any) => e.status === 'completed')
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
        this.enrollmentClient.get('/enrollments/stats'),
        this.enrollmentClient.get('/activity/stats'),
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
      aggregated.enrollments = await this.enrollmentClient.get(`/enrollments/user/${userId}`);
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
      aggregated.enrollments = await this.enrollmentClient.get(`/enrollments/course/${courseId}`);
    }

    if (aggregateFields.includes('statistics')) {
      aggregated.statistics = await this.enrollmentClient.get(`/courses/${courseId}/statistics`);
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
      return await this.enrollmentClient.get(`/users/${userId}/statistics`);
    } catch (error) {
      logger.error('Failed to get user statistics:', error);
      return null;
    }
  }

  private async getRecentActivity(userId: string) {
    try {
      return await this.enrollmentClient.get(`/users/${userId}/activity/recent?limit=10`);
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
