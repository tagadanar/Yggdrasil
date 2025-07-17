// packages/api-services/statistics-service/__tests__/unit/StatisticsController.test.ts
// Unit tests for StatisticsController

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { StatisticsController } from '../../src/controllers/StatisticsController';
import { StatisticsService } from '../../src/services/StatisticsService';
import { authenticateToken } from '../../src/middleware/authMiddleware';
import { 
  UserModel, 
  CourseModel, 
  CourseEnrollmentModel 
} from '@yggdrasil/database-schemas';

// Mock the authentication middleware
jest.mock('../../src/middleware/authMiddleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      userId: 'test-user-123',
      id: 'test-user-123',
      role: 'student',
      email: 'test@example.com'
    };
    next();
  }
}));

describe('StatisticsController Unit Tests', () => {
  let app: express.Application;
  let testUserId: string;
  let testTeacherId: string;
  let testCourseId: string;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Define routes
    app.get('/api/statistics/dashboard/student/:userId', authenticateToken, StatisticsController.getStudentDashboard);
    app.get('/api/statistics/dashboard/teacher/:userId', authenticateToken, StatisticsController.getTeacherDashboard);
    app.get('/api/statistics/dashboard/admin', authenticateToken, StatisticsController.getAdminDashboard);
    app.put('/api/statistics/progress/student/:userId/course/:courseId', authenticateToken, StatisticsController.updateStudentProgress);
    app.get('/api/statistics/analytics/course/:courseId', authenticateToken, StatisticsController.getCourseAnalytics);
    app.get('/api/statistics/health-check', StatisticsController.healthCheck);
  });

  beforeEach(async () => {
    // Create test data
    const testUser = new UserModel({
      email: 'student@test.com',
      password: 'hashedpassword',
      role: 'student',
      profile: { firstName: 'Test', lastName: 'Student' },
      isActive: true
    });
    await testUser.save();
    testUserId = testUser._id.toString();

    const testTeacher = new UserModel({
      email: 'teacher@test.com',
      password: 'hashedpassword',
      role: 'teacher',
      profile: { firstName: 'Test', lastName: 'Teacher' },
      isActive: true
    });
    await testTeacher.save();
    testTeacherId = testTeacher._id.toString();

    const testCourse = new CourseModel({
      title: 'Test Course',
      description: 'Test Description',
      slug: 'test-course',
      category: 'Programming',
      level: 'beginner',
      status: 'published',
      instructor: {
        _id: testTeacherId,
        name: 'Test Teacher',
        email: 'teacher@test.com'
      },
      collaborators: [],
      thumbnail: '',
      tags: ['test'],
      prerequisites: [],
      estimatedDuration: 120,
      chapters: [],
      resources: [],
      settings: {
        isPublic: true,
        allowEnrollment: true,
        requiresApproval: false,
        allowLateSubmissions: true,
        enableDiscussions: true,
        enableCollaboration: false
      },
      stats: {
        enrolledStudents: 0,
        completedStudents: 0,
        averageProgress: 0,
        totalViews: 0
      },
      version: 1,
      lastModified: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await testCourse.save();
    testCourseId = testCourse._id.toString();
  });

  describe('GET /api/statistics/dashboard/student/:userId', () => {
    it('should return student dashboard successfully', async () => {
      const response = await request(app)
        .get(`/api/statistics/dashboard/student/${testUserId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.learningStats).toBeDefined();
      expect(response.body.data.courseProgress).toBeDefined();
      expect(response.body.data.recentActivity).toBeDefined();
      expect(response.body.data.achievements).toBeDefined();
    });

    it('should handle invalid user ID', async () => {
      const invalidUserId = 'invalid-id';
      
      const response = await request(app)
        .get(`/api/statistics/dashboard/student/${invalidUserId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return correct response structure', async () => {
      const response = await request(app)
        .get(`/api/statistics/dashboard/student/${testUserId}`)
        .expect(200);

      const { data } = response.body;
      
      // Verify learning stats structure
      expect(data.learningStats).toMatchObject({
        totalCourses: expect.any(Number),
        activeCourses: expect.any(Number),
        completedCourses: expect.any(Number),
        totalTimeSpent: expect.any(Number),
        averageProgress: expect.any(Number),
        weeklyGoal: expect.any(Number),
        weeklyProgress: expect.any(Number),
        currentStreak: expect.any(Number),
        totalExercises: expect.any(Number),
        completedExercises: expect.any(Number),
        averageScore: expect.any(Number)
      });

      expect(Array.isArray(data.courseProgress)).toBe(true);
      expect(Array.isArray(data.recentActivity)).toBe(true);
      expect(Array.isArray(data.achievements)).toBe(true);
    });
  });

  describe('GET /api/statistics/dashboard/teacher/:userId', () => {
    it('should return teacher dashboard successfully', async () => {
      const response = await request(app)
        .get(`/api/statistics/dashboard/teacher/${testTeacherId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.courseStats).toBeDefined();
      expect(response.body.data.courseAnalytics).toBeDefined();
      expect(response.body.data.recentSubmissions).toBeDefined();
    });

    it('should return correct teacher dashboard structure', async () => {
      const response = await request(app)
        .get(`/api/statistics/dashboard/teacher/${testTeacherId}`)
        .expect(200);

      const { data } = response.body;
      
      expect(data.courseStats).toMatchObject({
        totalCourses: expect.any(Number),
        publishedCourses: expect.any(Number),
        draftCourses: expect.any(Number),
        totalStudents: expect.any(Number),
        activeStudents: expect.any(Number),
        averageProgress: expect.any(Number),
        totalSubmissions: expect.any(Number),
        pendingGrading: expect.any(Number)
      });

      expect(Array.isArray(data.courseAnalytics)).toBe(true);
      expect(Array.isArray(data.recentSubmissions)).toBe(true);
    });
  });

  describe('GET /api/statistics/dashboard/admin', () => {
    it('should return admin dashboard successfully', async () => {
      const response = await request(app)
        .get('/api/statistics/dashboard/admin')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.platformStats).toBeDefined();
      expect(response.body.data.userBreakdown).toBeDefined();
      expect(response.body.data.courseMetrics).toBeDefined();
      expect(response.body.data.systemHealth).toBeDefined();
    });

    it('should return correct admin dashboard structure', async () => {
      const response = await request(app)
        .get('/api/statistics/dashboard/admin')
        .expect(200);

      const { data } = response.body;
      
      expect(data.platformStats).toMatchObject({
        totalUsers: expect.any(Number),
        activeUsers: expect.any(Number),
        totalCourses: expect.any(Number),
        totalEnrollments: expect.any(Number),
        totalSubmissions: expect.any(Number),
        platformEngagement: expect.any(Number)
      });

      expect(data.userBreakdown).toMatchObject({
        students: expect.any(Number),
        teachers: expect.any(Number),
        staff: expect.any(Number),
        admins: expect.any(Number)
      });

      expect(data.courseMetrics).toHaveProperty('mostPopularCourses');
      expect(data.courseMetrics).toHaveProperty('topPerformingCourses');
      expect(data.systemHealth).toHaveProperty('database');
      expect(data.systemHealth).toHaveProperty('services');
    });
  });

  describe('PUT /api/statistics/progress/student/:userId/course/:courseId', () => {
    beforeEach(async () => {
      // Create enrollment for progress updates
      const enrollment = new CourseEnrollmentModel({
        studentId: testUserId,
        courseId: testCourseId,
        enrollmentDate: new Date(),
        enrollmentStatus: 'active',
        progress: {
          overallProgress: 0,
          completedSections: [],
          completedExercises: [],
          timeSpent: 0,
          lastAccessedAt: new Date()
        }
      });
      await enrollment.save();
    });

    it('should update student progress successfully', async () => {
      const progressUpdate = {
        type: 'section_complete',
        sectionId: 'section-123',
        timeSpent: 30
      };

      const response = await request(app)
        .put(`/api/statistics/progress/student/${testUserId}/course/${testCourseId}`)
        .send(progressUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated successfully');
    });

    it('should validate required fields', async () => {
      const invalidUpdate = {
        timeSpent: 30
        // Missing type field
      };

      const response = await request(app)
        .put(`/api/statistics/progress/student/${testUserId}/course/${testCourseId}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('type is required');
    });

    it('should handle non-existent enrollment', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId().toString();
      const progressUpdate = {
        type: 'section_complete',
        sectionId: 'section-123',
        timeSpent: 30
      };

      const response = await request(app)
        .put(`/api/statistics/progress/student/${nonExistentUserId}/course/${testCourseId}`)
        .send(progressUpdate)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Enrollment not found');
    });

    it('should validate progress update type', async () => {
      const invalidUpdate = {
        type: 'invalid_type',
        timeSpent: 30
      };

      const response = await request(app)
        .put(`/api/statistics/progress/student/${testUserId}/course/${testCourseId}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid progress update type');
    });
  });

  describe('GET /api/statistics/analytics/course/:courseId', () => {
    it('should return course analytics successfully', async () => {
      const response = await request(app)
        .get(`/api/statistics/analytics/course/${testCourseId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.courseInfo).toBeDefined();
      expect(response.body.data.enrollmentStats).toBeDefined();
      expect(response.body.data.progressStats).toBeDefined();
      expect(response.body.data.timeStats).toBeDefined();
    });

    it('should handle non-existent course', async () => {
      const nonExistentCourseId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .get(`/api/statistics/analytics/course/${nonExistentCourseId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.courseInfo).toBeNull();
      expect(response.body.data.enrollmentStats.totalEnrollments).toBe(0);
    });

    it('should return correct analytics structure', async () => {
      const response = await request(app)
        .get(`/api/statistics/analytics/course/${testCourseId}`)
        .expect(200);

      const { data } = response.body;
      
      expect(data.enrollmentStats).toMatchObject({
        totalEnrollments: expect.any(Number),
        activeEnrollments: expect.any(Number),
        completedEnrollments: expect.any(Number),
        dropoutRate: expect.any(Number)
      });

      expect(data.progressStats).toMatchObject({
        averageProgress: expect.any(Number),
        progressDistribution: expect.any(Array)
      });

      expect(data.timeStats).toMatchObject({
        averageTimeSpent: expect.any(Number),
        totalTimeSpent: expect.any(Number)
      });
    });
  });

  describe('GET /api/statistics/health-check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/statistics/health-check')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.database).toBe('connected');
      expect(response.body.data.uptime).toBeDefined();
    });

    it('should include memory usage information', async () => {
      const response = await request(app)
        .get('/api/statistics/health-check')
        .expect(200);

      expect(response.body.data.memory).toBeDefined();
      expect(response.body.data.memory.used).toBeDefined();
      expect(response.body.data.memory.total).toBeDefined();
      expect(response.body.data.memory.percentage).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .put(`/api/statistics/progress/student/${testUserId}/course/${testCourseId}`)
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid MongoDB ObjectId', async () => {
      const invalidId = 'invalid-mongodb-id';
      
      const response = await request(app)
        .get(`/api/statistics/dashboard/student/${invalidId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle missing required parameters', async () => {
      const response = await request(app)
        .put(`/api/statistics/progress/student/${testUserId}/course/${testCourseId}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Response Format Validation', () => {
    it('should always return consistent response format', async () => {
      const endpoints = [
        `/api/statistics/dashboard/student/${testUserId}`,
        `/api/statistics/dashboard/teacher/${testTeacherId}`,
        '/api/statistics/dashboard/admin',
        `/api/statistics/analytics/course/${testCourseId}`,
        '/api/statistics/health-check'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body.success).toBe(true);
      }
    });

    it('should return error responses in consistent format', async () => {
      const invalidUserId = 'invalid-id';
      
      const response = await request(app)
        .get(`/api/statistics/dashboard/student/${invalidUserId}`)
        .expect(500);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get(`/api/statistics/dashboard/student/${testUserId}`)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get(`/api/statistics/dashboard/student/${testUserId}`)
          .expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });
    });
  });
});