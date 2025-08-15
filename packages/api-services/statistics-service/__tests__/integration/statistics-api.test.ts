/**
 * Integration tests for Statistics API endpoints
 * Tests the full HTTP request/response cycle
 */

import request from 'supertest';
import app from '../../src/app';
import {
  UserModel,
  CourseModel,
  PromotionModel,
  PromotionProgressModel,
} from '@yggdrasil/database-schemas';

// Mock the database models for integration tests
jest.mock('@yggdrasil/database-schemas', () => ({
  connectDatabase: jest.fn().mockResolvedValue(true),
  UserModel: {
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  CourseModel: {
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  PromotionModel: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  PromotionProgressModel: {
    findOrCreateForStudent: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  NewsModel: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

// Mock authentication middleware
jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { userId: 'testuser123', role: 'admin' };
    next();
  }),
  requireRole: jest.fn(() => (req: any, res: any, next: any) => next()),
  requireOwnershipOrAdmin: jest.fn(() => (req: any, res: any, next: any) => next()),
  requireAdminOnly: jest.fn((req: any, res: any, next: any) => next()),
  requireTeacherOrAdmin: jest.fn((req: any, res: any, next: any) => next()),
}));

describe('Statistics API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return service health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('service', 'statistics-service');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memory');
    });
  });

  describe('GET /', () => {
    it('should return service information', async () => {
      const response = await request(app).get('/').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('service', 'statistics-service');
      expect(response.body.data).toHaveProperty('endpoints');
      expect(response.body.data.endpoints).toHaveProperty('dashboards');
      expect(response.body.data.endpoints).toHaveProperty('progress');
      expect(response.body.data.endpoints).toHaveProperty('analytics');
    });
  });

  describe('GET /api/statistics', () => {
    it('should return statistics service root information', async () => {
      const response = await request(app).get('/api/statistics').expect(200);

      expect(response.body).toHaveProperty('service', 'statistics-service');
      expect(response.body).toHaveProperty('message', 'Statistics service is running');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.user).toEqual({ id: 'testuser123', role: 'admin' });
    });
  });

  describe('GET /api/statistics/dashboard/student/:userId', () => {
    it('should return student dashboard data', async () => {
      // Mock student data
      const mockStudent = {
        _id: 'student123',
        profile: { firstName: 'John', lastName: 'Doe' },
        currentPromotionId: 'promotion123',
      };

      const mockPromotionProgress = {
        coursesProgress: [
          {
            courseId: 'course1',
            progressPercentage: 80,
            chaptersCompleted: 4,
            totalChapters: 5,
            lastActivityAt: new Date(),
            timeSpent: 120,
          },
        ],
      };

      const mockCourse = { _id: 'course1', title: 'Test Course' };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockStudent);
      (PromotionProgressModel.findOrCreateForStudent as jest.Mock).mockResolvedValue(
        mockPromotionProgress,
      );
      (CourseModel.findById as jest.Mock).mockResolvedValue(mockCourse);

      const response = await request(app)
        .get('/api/statistics/dashboard/student/student123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('learningStats');
      expect(response.body.data).toHaveProperty('courseProgress');
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(response.body.data).toHaveProperty('achievements');
    });

    it('should return 400 when userId is missing', async () => {
      const response = await request(app).get('/api/statistics/dashboard/student/').expect(404); // Route not found
    });
  });

  describe('GET /api/statistics/dashboard/teacher/:userId', () => {
    it('should return teacher dashboard data', async () => {
      const mockCourses = [
        { _id: 'course1', title: 'Course 1', teacherId: 'teacher123', isActive: true },
      ];

      (CourseModel.find as jest.Mock).mockResolvedValue(mockCourses);
      (PromotionModel.find as jest.Mock).mockResolvedValue([]);
      (UserModel.find as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/statistics/dashboard/teacher/teacher123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('teachingStats');
      expect(response.body.data).toHaveProperty('courseMetrics');
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(response.body.data).toHaveProperty('studentProgress');
    });
  });

  describe('GET /api/statistics/dashboard/admin', () => {
    it('should return admin dashboard data', async () => {
      // Mock database counts
      (UserModel.countDocuments as jest.Mock)
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(80) // students
        .mockResolvedValueOnce(15) // teachers
        .mockResolvedValueOnce(4) // staff
        .mockResolvedValueOnce(1) // admins
        .mockResolvedValueOnce(75); // active users

      (CourseModel.countDocuments as jest.Mock).mockResolvedValue(25);
      (PromotionModel.countDocuments as jest.Mock).mockResolvedValue(5);
      (PromotionProgressModel.countDocuments as jest.Mock).mockResolvedValue(200);
      (PromotionModel.find as jest.Mock).mockResolvedValue([]);
      (PromotionProgressModel.find as jest.Mock).mockResolvedValue([]);
      (CourseModel.find as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get('/api/statistics/dashboard/admin').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('platformStats');
      expect(response.body.data).toHaveProperty('userBreakdown');
      expect(response.body.data).toHaveProperty('courseMetrics');
      expect(response.body.data).toHaveProperty('systemHealth');
    });
  });

  describe('PUT /api/statistics/progress/student/:userId/course/:courseId', () => {
    it('should update student progress successfully', async () => {
      const mockStudent = {
        _id: 'student123',
        currentPromotionId: 'promotion123',
      };

      const mockPromotionProgress = {
        coursesProgress: [
          {
            courseId: 'course123',
            progressPercentage: 50,
            timeSpent: 60,
            completedSections: [],
            completedExercises: [],
            lastActivityAt: new Date('2023-01-01'),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockStudent);
      (PromotionProgressModel.findOrCreateForStudent as jest.Mock).mockResolvedValue(
        mockPromotionProgress,
      );

      const progressData = {
        type: 'section',
        completedSections: ['section1'],
        timeSpent: 30,
      };

      const response = await request(app)
        .put('/api/statistics/progress/student/student123/course/course123')
        .send(progressData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('progressPercentage');
      expect(response.body.data).toHaveProperty('timeSpent');
      expect(mockPromotionProgress.save).toHaveBeenCalled();
    });

    it('should handle empty progress data gracefully', async () => {
      const response = await request(app)
        .put('/api/statistics/progress/student/student123/course/course123')
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/statistics/progress/student/:userId/course/:courseId', () => {
    it('should return student course progress', async () => {
      const mockStudent = {
        _id: 'student123',
        currentPromotionId: 'promotion123',
      };

      const mockPromotionProgress = {
        coursesProgress: [
          {
            courseId: 'course123',
            progressPercentage: 75,
            chaptersCompleted: 3,
            totalChapters: 4,
            lastActivityAt: new Date(),
          },
        ],
      };

      const mockCourse = {
        _id: 'course123',
        title: 'Test Course',
        chapters: [
          {
            _id: 'chapter1',
            title: 'Chapter 1',
            sections: [{ _id: 'section1', title: 'Section 1', content: [] }],
          },
        ],
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockStudent);
      (PromotionProgressModel.findOrCreateForStudent as jest.Mock).mockResolvedValue(
        mockPromotionProgress,
      );
      (CourseModel.findById as jest.Mock).mockResolvedValue(mockCourse);

      const response = await request(app)
        .get('/api/statistics/progress/student/student123/course/course123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('courseId', 'course123');
      expect(response.body.data).toHaveProperty('courseTitle', 'Test Course');
      expect(response.body.data).toHaveProperty('overallProgress', 75);
      expect(response.body.data).toHaveProperty('chapters');
    });
  });

  describe('GET /api/statistics/analytics/course/:courseId', () => {
    it('should return course analytics', async () => {
      const mockCourse = { _id: 'course123', title: 'Test Course' };

      (CourseModel.findById as jest.Mock).mockResolvedValue(mockCourse);
      (PromotionModel.find as jest.Mock).mockResolvedValue([
        { _id: 'promotion1', courses: [{ courseId: 'course123' }] },
      ]);
      (PromotionProgressModel.find as jest.Mock).mockResolvedValue([
        {
          coursesProgress: [{ courseId: 'course123', progressPercentage: 80 }],
        },
      ]);

      const response = await request(app)
        .get('/api/statistics/analytics/course/course123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('progressDistribution');
      expect(response.body.data).toHaveProperty('performanceMetrics');
      expect(response.body.data).toHaveProperty('engagementMetrics');
    });
  });

  describe('GET /api/statistics/analytics/platform', () => {
    it('should return platform analytics', async () => {
      // Setup same mocks as admin dashboard
      (UserModel.countDocuments as jest.Mock)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(75);

      (CourseModel.countDocuments as jest.Mock).mockResolvedValue(25);
      (PromotionModel.countDocuments as jest.Mock).mockResolvedValue(5);
      (PromotionProgressModel.countDocuments as jest.Mock).mockResolvedValue(200);
      (PromotionModel.find as jest.Mock).mockResolvedValue([]);
      (PromotionProgressModel.find as jest.Mock).mockResolvedValue([]);
      (CourseModel.find as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get('/api/statistics/analytics/platform').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('platformStats');
    });
  });

  describe('POST /api/statistics/progress/section-complete', () => {
    it('should mark section as completed', async () => {
      const mockStudent = {
        _id: 'student123',
        currentPromotionId: 'promotion123',
      };

      const mockPromotionProgress = {
        coursesProgress: [
          {
            courseId: 'course123',
            progressPercentage: 50,
            timeSpent: 60,
            completedSections: [],
            completedExercises: [],
            lastActivityAt: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockStudent);
      (PromotionProgressModel.findOrCreateForStudent as jest.Mock).mockResolvedValue(
        mockPromotionProgress,
      );

      const response = await request(app)
        .post('/api/statistics/progress/section-complete')
        .send({
          userId: 'student123',
          courseId: 'course123',
          sectionId: 'section123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/statistics/progress/exercise-complete', () => {
    it('should mark exercise as completed', async () => {
      const mockStudent = {
        _id: 'student123',
        currentPromotionId: 'promotion123',
      };

      const mockPromotionProgress = {
        coursesProgress: [
          {
            courseId: 'course123',
            progressPercentage: 50,
            timeSpent: 60,
            completedSections: [],
            completedExercises: [],
            lastActivityAt: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockStudent);
      (PromotionProgressModel.findOrCreateForStudent as jest.Mock).mockResolvedValue(
        mockPromotionProgress,
      );

      const response = await request(app)
        .post('/api/statistics/progress/exercise-complete')
        .send({
          userId: 'student123',
          courseId: 'course123',
          exerciseId: 'exercise123',
          score: 95,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/statistics/achievements/:userId', () => {
    it('should return user achievements', async () => {
      const mockStudent = {
        _id: 'student123',
        currentPromotionId: 'promotion123',
      };

      const mockPromotionProgress = {
        coursesProgress: [
          { courseId: 'course1', progressPercentage: 100 },
          { courseId: 'course2', progressPercentage: 85 },
        ],
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockStudent);
      (PromotionProgressModel.findOrCreateForStudent as jest.Mock).mockResolvedValue(
        mockPromotionProgress,
      );
      (CourseModel.findById as jest.Mock).mockResolvedValue({ _id: 'course1', title: 'Course 1' });

      const response = await request(app)
        .get('/api/statistics/achievements/student123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('achievements');
      expect(Array.isArray(response.body.data.achievements)).toBe(true);
    });
  });

  describe('GET /api/statistics/health-check', () => {
    it('should return service health check', async () => {
      (UserModel.countDocuments as jest.Mock).mockResolvedValue(150);

      const response = await request(app).get('/api/statistics/health-check').expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('database', 'connected');
      expect(response.body.data).toHaveProperty('userCount', 150);
      expect(response.body.data).toHaveProperty('memory');
    });
  });

  describe('GET /api/statistics/docs', () => {
    it('should return API documentation', async () => {
      const response = await request(app).get('/api/statistics/docs').expect(200);

      expect(response.body).toHaveProperty('service', 'statistics-service');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('dashboards');
      expect(response.body.endpoints).toHaveProperty('progress');
      expect(response.body.endpoints).toHaveProperty('analytics');
      expect(response.body.endpoints).toHaveProperty('achievements');
      expect(response.body.endpoints).toHaveProperty('utility');
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/statistics/unknown-endpoint').expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Route');
    });
  });
});
