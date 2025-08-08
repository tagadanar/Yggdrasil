// packages/api-services/planning-service/__tests__/unit/ProgressController.test.ts
// Real controller tests for ProgressController - NO MOCKS

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { ProgressController } from '../../src/controllers/ProgressController';
import { ProgressTrackingService } from '../../src/services/ProgressTrackingService';
import { 
  UserModel,
  EventModel,
  PromotionModel,
  CourseModel,
  EventAttendanceModel,
  PromotionProgressModel
} from '@yggdrasil/database-schemas';
import jwt from 'jsonwebtoken';

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-test';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-development-only';

describe('ProgressController - Real Controller Tests', () => {
  let app: express.Application;
  let progressController: ProgressController;
  let progressService: ProgressTrackingService;
  
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  
  let testPromotionId: string;
  let testStudentId: string;
  let testTeacherId: string;
  let testAdminId: string;
  let testCourseId: string;
  let testEventId: string;
  
  // Test data cleanup tracking
  const testDocumentIds: string[] = [];

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_URI);
    
    // Create Express app and controller
    app = express();
    app.use(express.json());
    
    progressService = new ProgressTrackingService();
    progressController = new ProgressController(progressService);
    
    // Setup routes manually for testing
    app.post('/api/progress/events/:eventId/attendance', 
      async (req, res) => progressController.markAttendance(req, res));
    app.get('/api/progress/my-progress', 
      async (req, res) => progressController.getMyProgress(req, res));
    app.get('/api/progress/students/:studentId', 
      async (req, res) => progressController.getStudentProgress(req, res));
    app.put('/api/progress/course', 
      async (req, res) => progressController.updateCourseProgress(req, res));
    app.get('/api/progress/promotions/:promotionId/statistics', 
      async (req, res) => progressController.getPromotionStatistics(req, res));
    
    // Create test data
    
    // 1. Create admin
    const admin = new UserModel({
      email: 'controller.admin@example.com',
      passwordHash: 'test_hash',
      role: 'admin',
      profile: { firstName: 'Controller', lastName: 'Admin' },
      isActive: true,
      isEmailVerified: true
    });
    await admin.save();
    testAdminId = admin._id.toString();
    testDocumentIds.push(`users:${testAdminId}`);

    // 2. Create teacher
    const teacher = new UserModel({
      email: 'controller.teacher@example.com',
      passwordHash: 'test_hash',
      role: 'teacher',
      profile: { firstName: 'Controller', lastName: 'Teacher' },
      isActive: true,
      isEmailVerified: true
    });
    await teacher.save();
    testTeacherId = teacher._id.toString();
    testDocumentIds.push(`users:${testTeacherId}`);

    // 3. Create student
    const student = new UserModel({
      email: 'controller.student@example.com',
      passwordHash: 'test_hash',
      role: 'student',
      profile: { firstName: 'Controller', lastName: 'Student' },
      isActive: true,
      isEmailVerified: true
    });
    await student.save();
    testStudentId = student._id.toString();
    testDocumentIds.push(`users:${testStudentId}`);

    // 4. Create promotion
    const promotion = new PromotionModel({
      name: 'Controller Test Promotion',
      semester: 1,
      intake: 'september',
      academicYear: '2024-2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-01-31'),
      studentIds: [student._id],
      eventIds: [],
      status: 'active',
      createdBy: admin._id
    });
    await promotion.save();
    testPromotionId = promotion._id.toString();
    testDocumentIds.push(`promotions:${testPromotionId}`);

    // 5. Create course
    const course = new CourseModel({
      title: 'Controller Test Course',
      description: 'Test course for controller testing',
      slug: 'controller-test-course',
      category: 'programming',
      level: 'beginner',
      status: 'published',
      instructor: teacher._id,
      chapters: [
        {
          title: 'Test Chapter',
          description: 'Test chapter',
          sections: [
            {
              title: 'Test Section',
              exercises: [
                { title: 'Test Exercise', type: 'quiz' }
              ]
            }
          ]
        }
      ]
    });
    await course.save();
    testCourseId = course._id.toString();
    testDocumentIds.push(`courses:${testCourseId}`);

    // 6. Create event
    const event = new EventModel({
      title: 'Controller Test Event',
      description: 'Test event for controller',
      type: 'lecture',
      startDate: new Date(),
      endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
      isPublic: false,
      promotionIds: [promotion._id],
      linkedCourse: course._id,
      teacherId: teacher._id
    });
    await event.save();
    testEventId = event._id.toString();
    testDocumentIds.push(`events:${testEventId}`);

    // Generate JWT tokens
    adminToken = jwt.sign({ userId: testAdminId, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    teacherToken = jwt.sign({ userId: testTeacherId, role: 'teacher' }, JWT_SECRET, { expiresIn: '1h' });
    studentToken = jwt.sign({ userId: testStudentId, role: 'student' }, JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Cleanup all test data
    await PromotionProgressModel.deleteMany({ promotionId: testPromotionId });
    await EventAttendanceModel.deleteMany({ promotionId: testPromotionId });
    
    for (const docId of testDocumentIds) {
      const [collection, id] = docId.split(':');
      const collectionMap: { [key: string]: any } = {
        'users': UserModel,
        'events': EventModel,
        'promotions': PromotionModel,
        'courses': CourseModel
      };
      
      if (collectionMap[collection]) {
        await collectionMap[collection].deleteOne({ _id: id });
      }
    }
    
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear progress data before each test
    await PromotionProgressModel.deleteMany({ promotionId: testPromotionId });
    await EventAttendanceModel.deleteMany({ promotionId: testPromotionId });
  });

  describe('markAttendance', () => {
    it('should mark attendance successfully with valid data', async () => {
      // Mock authenticated user
      app.use((req, res, next) => {
        req.user = { userId: testTeacherId, role: 'teacher' };
        next();
      });

      const response = await request(app)
        .post(`/api/progress/events/${testEventId}/attendance`)
        .send({
          studentId: testStudentId,
          attended: true,
          notes: 'Present and engaged'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.attended).toBe(true);
      expect(response.body.data.notes).toBe('Present and engaged');
    });

    it('should handle validation errors correctly', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testTeacherId, role: 'teacher' };
        next();
      });

      const response = await request(app)
        .post(`/api/progress/events/${testEventId}/attendance`)
        .send({
          // Missing required studentId
          attended: true
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should handle service errors gracefully', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testTeacherId, role: 'teacher' };
        next();
      });

      // Use invalid eventId to trigger service error
      const response = await request(app)
        .post('/api/progress/events/invalid-id/attendance')
        .send({
          studentId: testStudentId,
          attended: true
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('getMyProgress', () => {
    it('should return student progress successfully', async () => {
      // Create some progress data first
      await progressService.updateCourseProgress(
        testStudentId,
        testPromotionId,
        {
          courseId: testCourseId,
          progressPercentage: 50
        }
      );

      app.use((req, res, next) => {
        req.user = { userId: testStudentId, role: 'student' };
        next();
      });

      const response = await request(app)
        .get('/api/progress/my-progress')
        .query({ promotionId: testPromotionId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.studentId).toBe(testStudentId);
      expect(response.body.data.promotionId).toBe(testPromotionId);
      expect(typeof response.body.data.overallProgress).toBe('number');
    });

    it('should require promotionId parameter', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testStudentId, role: 'student' };
        next();
      });

      const response = await request(app)
        .get('/api/progress/my-progress');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('getStudentProgress', () => {
    beforeEach(async () => {
      // Create progress data
      await progressService.updateCourseProgress(
        testStudentId,
        testPromotionId,
        {
          courseId: testCourseId,
          progressPercentage: 75,
          averageScore: 85
        }
      );
    });

    it('should allow admin to view any student progress', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testAdminId, role: 'admin' };
        next();
      });

      const response = await request(app)
        .get(`/api/progress/students/${testStudentId}`)
        .query({ promotionId: testPromotionId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.overallProgress).toBeGreaterThan(50);
    });

    it('should allow student to view own progress', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testStudentId, role: 'student' };
        next();
      });

      const response = await request(app)
        .get(`/api/progress/students/${testStudentId}`)
        .query({ promotionId: testPromotionId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent student from viewing other student progress', async () => {
      const otherStudentId = new mongoose.Types.ObjectId().toString();
      
      app.use((req, res, next) => {
        req.user = { userId: testStudentId, role: 'student' };
        next();
      });

      const response = await request(app)
        .get(`/api/progress/students/${otherStudentId}`)
        .query({ promotionId: testPromotionId });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('updateCourseProgress', () => {
    it('should allow admin to update course progress', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testAdminId, role: 'admin' };
        next();
      });

      const response = await request(app)
        .put('/api/progress/course')
        .send({
          studentId: testStudentId,
          promotionId: testPromotionId,
          courseProgress: {
            courseId: testCourseId,
            progressPercentage: 80,
            averageScore: 90
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.coursesProgress).toHaveLength(1);
    });

    it('should prevent non-admin from updating course progress', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testStudentId, role: 'student' };
        next();
      });

      const response = await request(app)
        .put('/api/progress/course')
        .send({
          studentId: testStudentId,
          promotionId: testPromotionId,
          courseProgress: {
            courseId: testCourseId,
            progressPercentage: 80
          }
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testAdminId, role: 'admin' };
        next();
      });

      const response = await request(app)
        .put('/api/progress/course')
        .send({
          studentId: testStudentId
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('getPromotionStatistics', () => {
    beforeEach(async () => {
      // Create diverse progress data
      await progressService.updateCourseProgress(
        testStudentId,
        testPromotionId,
        {
          courseId: testCourseId,
          progressPercentage: 90,
          averageScore: 95
        }
      );
    });

    it('should return promotion statistics for admin', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testAdminId, role: 'admin' };
        next();
      });

      const response = await request(app)
        .get(`/api/progress/promotions/${testPromotionId}/statistics`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(typeof response.body.data.averageProgress).toBe('number');
      expect(typeof response.body.data.averageAttendance).toBe('number');
      expect(typeof response.body.data.completionRate).toBe('number');
    });

    it('should allow teacher to view promotion statistics', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testTeacherId, role: 'teacher' };
        next();
      });

      const response = await request(app)
        .get(`/api/progress/promotions/${testPromotionId}/statistics`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent student from viewing promotion statistics', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testStudentId, role: 'student' };
        next();
      });

      const response = await request(app)
        .get(`/api/progress/promotions/${testPromotionId}/statistics`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing authentication gracefully', async () => {
      // Don't add auth middleware
      const response = await request(app)
        .get('/api/progress/my-progress')
        .query({ promotionId: testPromotionId });

      expect(response.status).toBe(401);
    });

    it('should handle invalid promotion IDs gracefully', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testAdminId, role: 'admin' };
        next();
      });

      const response = await request(app)
        .get('/api/progress/promotions/invalid-id/statistics');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle malformed request data gracefully', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testAdminId, role: 'admin' };
        next();
      });

      const response = await request(app)
        .put('/api/progress/course')
        .send({
          invalidField: 'invalid data'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent success response format', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testStudentId, role: 'student' };
        next();
      });

      const response = await request(app)
        .get('/api/progress/my-progress')
        .query({ promotionId: testPromotionId });

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(true);
    });

    it('should return consistent error response format', async () => {
      app.use((req, res, next) => {
        req.user = { userId: testStudentId, role: 'student' };
        next();
      });

      const response = await request(app)
        .get('/api/progress/my-progress');

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body.success).toBe(false);
    });
  });
});