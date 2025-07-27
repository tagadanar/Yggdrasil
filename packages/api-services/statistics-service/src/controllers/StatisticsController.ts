// packages/api-services/statistics-service/src/controllers/StatisticsController.ts
// HTTP request handlers for statistics endpoints

import { Request, Response } from 'express';
import { ResponseHelper, HTTP_STATUS, type AuthRequest, statsLogger as logger } from '@yggdrasil/shared-utilities';
import { StatisticsService } from '../services/StatisticsService';

export class StatisticsController {

  // =============================================================================
  // DASHBOARD ENDPOINTS
  // =============================================================================

  /**
   * Get student dashboard data
   * GET /api/statistics/dashboard/student/:userId
   */
  static async getStudentDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // Validate userId
      if (!userId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('User ID is required'),
        );
        return;
      }

      // Get dashboard data
      const dashboardData = await StatisticsService.getStudentDashboard(userId);

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(dashboardData, 'Student dashboard data retrieved successfully'),
      );
    } catch (error: any) {
      logger.error('Error getting student dashboard:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to get student dashboard data'),
      );
    }
  }

  /**
   * Get teacher dashboard data
   * GET /api/statistics/dashboard/teacher/:userId
   */
  static async getTeacherDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('User ID is required'),
        );
        return;
      }

      const dashboardData = await StatisticsService.getTeacherDashboard(userId);

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(dashboardData, 'Teacher dashboard data retrieved successfully'),
      );
    } catch (error: any) {
      logger.error('Error getting teacher dashboard:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to get teacher dashboard data'),
      );
    }
  }

  /**
   * Get admin dashboard data
   * GET /api/statistics/dashboard/admin
   */
  static async getAdminDashboard(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const dashboardData = await StatisticsService.getAdminDashboard();

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(dashboardData, 'Admin dashboard data retrieved successfully'),
      );
    } catch (error: any) {
      logger.error('Error getting admin dashboard:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to get admin dashboard data'),
      );
    }
  }

  // =============================================================================
  // PROGRESS TRACKING ENDPOINTS
  // =============================================================================

  /**
   * Update student progress
   * PUT /api/statistics/progress/student/:userId/course/:courseId
   */
  static async updateStudentProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, courseId } = req.params;
      const progressUpdate = req.body;

      if (!userId || !courseId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('User ID and Course ID are required'),
        );
        return;
      }

      // Validate progress update data
      if (!progressUpdate || typeof progressUpdate !== 'object') {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Valid progress data is required'),
        );
        return;
      }

      // Validate required fields for typed progress updates
      if (progressUpdate.type && !progressUpdate.type.trim()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Progress update type is required'),
        );
        return;
      }

      const result = await StatisticsService.updateStudentProgress(
        userId,
        courseId,
        progressUpdate,
      );

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(
          ResponseHelper.success(result.data, result.message),
        );
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest(result.error),
        );
      }
    } catch (error: any) {
      logger.error('Error updating student progress:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error(error.message || 'Failed to update student progress'),
      );
    }
  }

  /**
   * Get student progress for a specific course
   * GET /api/statistics/progress/student/:userId/course/:courseId
   */
  static async getStudentCourseProgress(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, courseId } = req.params;

      if (!userId || !courseId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('User ID and Course ID are required'),
        );
        return;
      }

      // Get the student's enrollment and progress for this course
      const { CourseEnrollmentModel } = require('@yggdrasil/database-schemas');
      const enrollment = await CourseEnrollmentModel.findOne({
        studentId: userId,
        courseId: courseId,
      }).populate('courseId', 'title chapters');

      if (!enrollment) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.notFound('Enrollment not found'),
        );
        return;
      }

      // Transform enrollment data to match frontend expectations
      const progressData = {
        courseId,
        courseTitle: enrollment.courseId.title,
        enrollmentStatus: enrollment.status,
        overallProgress: enrollment.progress?.overallProgress || 0,
        timeSpent: enrollment.progress?.timeSpent || 0,
        lastAccessedAt: enrollment.progress?.lastAccessedAt || enrollment.enrolledAt,
        completedSections: enrollment.progress?.completedSections || [],
        completedExercises: enrollment.progress?.completedExercises || [],
        chapters: enrollment.courseId.chapters?.map((chapter: any) => ({
          id: chapter._id,
          title: chapter.title,
          isCompleted: false, // Calculate based on progress
          sections: chapter.sections?.map((section: any) => ({
            id: section._id,
            title: section.title,
            isCompleted: enrollment.progress?.completedSections?.includes(section._id.toString()) || false,
            items: section.content?.map((content: any) => ({
              id: content._id,
              title: content.title || `${content.type} content`,
              type: content.type,
              isCompleted: content.type === 'exercise'
                ? enrollment.progress?.completedExercises?.includes(content._id.toString()) || false
                : enrollment.progress?.completedSections?.includes(section._id.toString()) || false,
              isOptional: false,
              estimatedMinutes: content.type === 'video' ? 15 : content.type === 'exercise' ? 30 : 10,
            })) || [],
          })) || [],
        })) || [],
      };

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(progressData, 'Student course progress retrieved successfully'),
      );
    } catch (error: any) {
      logger.error('Error getting student course progress:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to get student course progress'),
      );
    }
  }

  // =============================================================================
  // ANALYTICS ENDPOINTS
  // =============================================================================

  /**
   * Get course analytics
   * GET /api/statistics/analytics/course/:courseId
   */
  static async getCourseAnalytics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;

      if (!courseId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('Course ID is required'),
        );
        return;
      }

      const analytics = await StatisticsService.getCourseAnalytics(courseId);

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(analytics, 'Course analytics retrieved successfully'),
      );
    } catch (error: any) {
      logger.error('Error getting course analytics:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error(error.message || 'Failed to get course analytics'),
      );
    }
  }

  /**
   * Get platform-wide analytics
   * GET /api/statistics/analytics/platform
   */
  static async getPlatformAnalytics(_req: AuthRequest, res: Response): Promise<void> {
    try {
      // For now, return the same data as admin dashboard
      // In a real implementation, this could be more detailed
      const platformData = await StatisticsService.getAdminDashboard();

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(platformData, 'Platform analytics retrieved successfully'),
      );
    } catch (error: any) {
      logger.error('Error getting platform analytics:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to get platform analytics'),
      );
    }
  }

  // =============================================================================
  // UTILITY ENDPOINTS
  // =============================================================================

  /**
   * Mark section as completed
   * POST /api/statistics/progress/section-complete
   */
  static async markSectionComplete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, courseId, sectionId } = req.body;

      if (!userId || !courseId || !sectionId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('User ID, Course ID, and Section ID are required'),
        );
        return;
      }

      // Update progress with completed section
      const progressUpdate = {
        completedSections: [sectionId], // In real implementation, append to existing array
        timeSpent: 15, // Add estimated time for section completion
      };

      const updatedProgress = await StatisticsService.updateStudentProgress(
        userId,
        courseId,
        progressUpdate,
      );

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(updatedProgress, 'Section marked as completed'),
      );
    } catch (error: any) {
      logger.error('Error marking section complete:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to mark section as completed'),
      );
    }
  }

  /**
   * Mark exercise as completed
   * POST /api/statistics/progress/exercise-complete
   */
  static async markExerciseComplete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, courseId, exerciseId, score: _score } = req.body;

      if (!userId || !courseId || !exerciseId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('User ID, Course ID, and Exercise ID are required'),
        );
        return;
      }

      // Update progress with completed exercise
      const progressUpdate = {
        completedExercises: [exerciseId], // In real implementation, append to existing array
        timeSpent: 30, // Add estimated time for exercise completion
      };

      const updatedProgress = await StatisticsService.updateStudentProgress(
        userId,
        courseId,
        progressUpdate,
      );

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(updatedProgress, 'Exercise marked as completed'),
      );
    } catch (error: any) {
      logger.error('Error marking exercise complete:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to mark exercise as completed'),
      );
    }
  }

  /**
   * Get user achievements
   * GET /api/statistics/achievements/:userId
   */
  static async getUserAchievements(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.badRequest('User ID is required'),
        );
        return;
      }

      // Get achievements from student dashboard (which includes achievements calculation)
      const dashboardData = await StatisticsService.getStudentDashboard(userId);
      const achievements = dashboardData.achievements;

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({ achievements }, 'User achievements retrieved successfully'),
      );
    } catch (error: any) {
      logger.error('Error getting user achievements:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to get user achievements'),
      );
    }
  }

  /**
   * Health check for statistics calculations
   * GET /api/statistics/health-check
   */
  static async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      // Test database connectivity and basic operations
      const { UserModel } = require('@yggdrasil/database-schemas');
      const userCount = await UserModel.countDocuments();

      const memoryUsage = process.memoryUsage();

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          database: 'connected',
          userCount,
          version: '1.0.0',
          uptime: Math.floor(process.uptime()),
          memory: {
            used: memoryUsage.heapUsed,
            total: memoryUsage.heapTotal,
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
          },
        }, 'Statistics service is healthy'),
      );
    } catch (error: any) {
      logger.error('Statistics service health check failed:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Statistics service health check failed'),
      );
    }
  }
}
