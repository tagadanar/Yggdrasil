/**
 * Unit tests for StatisticsController
 * Tests HTTP request handling and response formatting
 */

import { Request, Response } from 'express';
import { StatisticsController } from '../../src/controllers/StatisticsController';
import { StatisticsService } from '../../src/services/StatisticsService';
import { HTTP_STATUS } from '@yggdrasil/shared-utilities';

// Mock the StatisticsService
jest.mock('../../src/services/StatisticsService');

// Mock the database models
jest.mock('@yggdrasil/database-schemas', () => ({
  UserModel: {
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
  CourseModel: {
    findById: jest.fn(),
  },
  PromotionProgressModel: {
    findOrCreateForStudent: jest.fn(),
  },
}));

// Mock the logger
jest.mock('@yggdrasil/shared-utilities', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
  ResponseHelper: {
    success: jest.fn((data, message) => ({ success: true, data, message })),
    badRequest: jest.fn(message => ({ success: false, error: message })),
    notFound: jest.fn(message => ({ success: false, error: message })),
    error: jest.fn(message => ({ success: false, error: message })),
  },
  statsLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('StatisticsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('getStudentDashboard', () => {
    it('should return student dashboard data successfully', async () => {
      const mockDashboardData = {
        learningStats: { totalCourses: 3, activeCourses: 2, completedCourses: 1 },
        courseProgress: [],
        recentActivity: [],
        achievements: [],
      };

      mockRequest = {
        params: { userId: 'student123' },
        user: { userId: 'student123', role: 'student' },
      };

      (StatisticsService.getStudentDashboard as jest.Mock).mockResolvedValue(mockDashboardData);

      await StatisticsController.getStudentDashboard(mockRequest as any, mockResponse as Response);

      expect(StatisticsService.getStudentDashboard).toHaveBeenCalledWith('student123');
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return bad request when userId is missing', async () => {
      mockRequest = {
        params: {},
        user: { userId: 'student123', role: 'student' },
      };

      await StatisticsController.getStudentDashboard(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockRequest = {
        params: { userId: 'student123' },
        user: { userId: 'student123', role: 'student' },
      };

      (StatisticsService.getStudentDashboard as jest.Mock).mockRejectedValue(
        new Error('Service error'),
      );

      await StatisticsController.getStudentDashboard(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getTeacherDashboard', () => {
    it('should return teacher dashboard data successfully', async () => {
      const mockDashboardData = {
        teachingStats: { totalStudents: 25, activeCourses: 3 },
        courseMetrics: [],
        recentActivity: [],
        studentProgress: [],
      };

      mockRequest = {
        params: { userId: 'teacher123' },
        user: { userId: 'teacher123', role: 'teacher' },
      };

      (StatisticsService.getTeacherDashboard as jest.Mock).mockResolvedValue(mockDashboardData);

      await StatisticsController.getTeacherDashboard(mockRequest as any, mockResponse as Response);

      expect(StatisticsService.getTeacherDashboard).toHaveBeenCalledWith('teacher123');
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('should return bad request when userId is missing', async () => {
      mockRequest = {
        params: {},
        user: { userId: 'teacher123', role: 'teacher' },
      };

      await StatisticsController.getTeacherDashboard(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('getAdminDashboard', () => {
    it('should return admin dashboard data successfully', async () => {
      const mockDashboardData = {
        platformStats: { totalUsers: 1000, activeUsers: 750 },
        userBreakdown: { students: 800, teachers: 150 },
        courseMetrics: { mostPopularCourses: [], topPerformingCourses: [] },
        systemHealth: { database: 'healthy' },
      };

      mockRequest = {
        user: { userId: 'admin123', role: 'admin' },
      };

      (StatisticsService.getAdminDashboard as jest.Mock).mockResolvedValue(mockDashboardData);

      await StatisticsController.getAdminDashboard(mockRequest as any, mockResponse as Response);

      expect(StatisticsService.getAdminDashboard).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('should handle service errors', async () => {
      mockRequest = {
        user: { userId: 'admin123', role: 'admin' },
      };

      (StatisticsService.getAdminDashboard as jest.Mock).mockRejectedValue(
        new Error('Service error'),
      );

      await StatisticsController.getAdminDashboard(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  describe('updateStudentProgress', () => {
    it('should update student progress successfully', async () => {
      const progressData = {
        type: 'section',
        completedSections: ['section1'],
        timeSpent: 30,
      };

      mockRequest = {
        params: { userId: 'student123', courseId: 'course123' },
        body: progressData,
        user: { userId: 'student123', role: 'student' },
      };

      const mockResult = {
        success: true,
        data: { progressPercentage: 75 },
        message: 'Progress updated successfully',
      };

      (StatisticsService.updateStudentProgress as jest.Mock).mockResolvedValue(mockResult);

      await StatisticsController.updateStudentProgress(
        mockRequest as any,
        mockResponse as Response,
      );

      expect(StatisticsService.updateStudentProgress).toHaveBeenCalledWith(
        'student123',
        'course123',
        progressData,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('should return bad request when parameters are missing', async () => {
      mockRequest = {
        params: { userId: 'student123' }, // Missing courseId
        body: { type: 'section' },
        user: { userId: 'student123', role: 'student' },
      };

      await StatisticsController.updateStudentProgress(
        mockRequest as any,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('should return bad request when progress data is invalid', async () => {
      mockRequest = {
        params: { userId: 'student123', courseId: 'course123' },
        body: null, // Invalid body
        user: { userId: 'student123', role: 'student' },
      };

      await StatisticsController.updateStudentProgress(
        mockRequest as any,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });

    it('should handle service failure', async () => {
      mockRequest = {
        params: { userId: 'student123', courseId: 'course123' },
        body: { type: 'section' },
        user: { userId: 'student123', role: 'student' },
      };

      const mockResult = {
        success: false,
        error: 'Student not found',
      };

      (StatisticsService.updateStudentProgress as jest.Mock).mockResolvedValue(mockResult);

      await StatisticsController.updateStudentProgress(
        mockRequest as any,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('getCourseAnalytics', () => {
    it('should return course analytics successfully', async () => {
      const mockAnalytics = {
        overview: { totalStudents: 50, completionRate: 80 },
        progressDistribution: [],
        performanceMetrics: [],
        engagementMetrics: [],
      };

      mockRequest = {
        params: { courseId: 'course123' },
        user: { userId: 'teacher123', role: 'teacher' },
      };

      (StatisticsService.getCourseAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      await StatisticsController.getCourseAnalytics(mockRequest as any, mockResponse as Response);

      expect(StatisticsService.getCourseAnalytics).toHaveBeenCalledWith('course123');
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('should return bad request when courseId is missing', async () => {
      mockRequest = {
        params: {},
        user: { userId: 'teacher123', role: 'teacher' },
      };

      await StatisticsController.getCourseAnalytics(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('getPlatformAnalytics', () => {
    it('should return platform analytics successfully', async () => {
      const mockAnalytics = {
        platformStats: { totalUsers: 1000 },
        userBreakdown: { students: 800 },
      };

      mockRequest = {
        user: { userId: 'admin123', role: 'admin' },
      };

      (StatisticsService.getAdminDashboard as jest.Mock).mockResolvedValue(mockAnalytics);

      await StatisticsController.getPlatformAnalytics(mockRequest as any, mockResponse as Response);

      expect(StatisticsService.getAdminDashboard).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });
  });

  describe('markSectionComplete', () => {
    it('should mark section as completed successfully', async () => {
      mockRequest = {
        body: { userId: 'student123', courseId: 'course123', sectionId: 'section123' },
        user: { userId: 'student123', role: 'student' },
      };

      const mockResult = {
        success: true,
        data: { progressPercentage: 85 },
      };

      (StatisticsService.updateStudentProgress as jest.Mock).mockResolvedValue(mockResult);

      await StatisticsController.markSectionComplete(mockRequest as any, mockResponse as Response);

      expect(StatisticsService.updateStudentProgress).toHaveBeenCalledWith(
        'student123',
        'course123',
        expect.objectContaining({
          completedSections: ['section123'],
          timeSpent: 15,
        }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('should return bad request when required fields are missing', async () => {
      mockRequest = {
        body: { userId: 'student123' }, // Missing courseId and sectionId
        user: { userId: 'student123', role: 'student' },
      };

      await StatisticsController.markSectionComplete(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('markExerciseComplete', () => {
    it('should mark exercise as completed successfully', async () => {
      mockRequest = {
        body: { userId: 'student123', courseId: 'course123', exerciseId: 'exercise123', score: 95 },
        user: { userId: 'student123', role: 'student' },
      };

      const mockResult = {
        success: true,
        data: { progressPercentage: 90 },
      };

      (StatisticsService.updateStudentProgress as jest.Mock).mockResolvedValue(mockResult);

      await StatisticsController.markExerciseComplete(mockRequest as any, mockResponse as Response);

      expect(StatisticsService.updateStudentProgress).toHaveBeenCalledWith(
        'student123',
        'course123',
        expect.objectContaining({
          completedExercises: ['exercise123'],
          timeSpent: 30,
        }),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('should return bad request when required fields are missing', async () => {
      mockRequest = {
        body: { userId: 'student123', courseId: 'course123' }, // Missing exerciseId
        user: { userId: 'student123', role: 'student' },
      };

      await StatisticsController.markExerciseComplete(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('getUserAchievements', () => {
    it('should return user achievements successfully', async () => {
      const mockDashboardData = {
        achievements: [
          { id: 'first-course', title: 'Course Completer', description: 'Completed first course' },
        ],
      };

      mockRequest = {
        params: { userId: 'student123' },
        user: { userId: 'student123', role: 'student' },
      };

      (StatisticsService.getStudentDashboard as jest.Mock).mockResolvedValue(mockDashboardData);

      await StatisticsController.getUserAchievements(mockRequest as any, mockResponse as Response);

      expect(StatisticsService.getStudentDashboard).toHaveBeenCalledWith('student123');
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('should return bad request when userId is missing', async () => {
      mockRequest = {
        params: {},
        user: { userId: 'student123', role: 'student' },
      };

      await StatisticsController.getUserAchievements(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('healthCheck', () => {
    it('should return health check data successfully', async () => {
      const { UserModel } = require('@yggdrasil/database-schemas');
      (UserModel.countDocuments as jest.Mock).mockResolvedValue(150);

      await StatisticsController.healthCheck(mockRequest as Request, mockResponse as Response);

      expect(UserModel.countDocuments).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const { UserModel } = require('@yggdrasil/database-schemas');
      (UserModel.countDocuments as jest.Mock).mockRejectedValue(new Error('Database error'));

      await StatisticsController.healthCheck(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });
});
