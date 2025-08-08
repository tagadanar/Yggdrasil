// packages/api-services/planning-service/__tests__/integration/progress-api.test.ts
// Real API integration tests for progress endpoints - NO MOCKS

import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import {
  UserModel,
  EventModel,
  PromotionModel,
  CourseModel,
  EventAttendanceModel,
  PromotionProgressModel
} from '@yggdrasil/database-schemas';

// Test configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-test';
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

describe('Progress API Integration Tests - Real HTTP Requests', () => {
  let app: any;
  let adminToken: string;
  let teacherToken: string;
  let student1Token: string;
  let student2Token: string;
  
  let testPromotionId: string;
  let testStudent1Id: string;
  let testStudent2Id: string;
  let testTeacherId: string;
  let testAdminId: string;
  let testCourse1Id: string;
  let testEvent1Id: string;
  let testEvent2Id: string;
  
  // Test data cleanup tracking
  const testDocumentIds: string[] = [];

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_URI);
    
    // Create Express app
    app = await createApp(true); // Skip DB connection as we handle it
    
    // Create comprehensive test data for API testing
    
    // 1. Create admin user
    const adminUser = new UserModel({
      email: 'api.admin@example.com',
      passwordHash: 'test_hash',
      role: 'admin',
      profile: {
        firstName: 'API',
        lastName: 'Admin'
      },
      isActive: true,
      isEmailVerified: true,
      tokenVersion: 0
    });
    await adminUser.save();
    testAdminId = adminUser._id.toString();
    testDocumentIds.push(`users:${testAdminId}`);

    // 2. Create teacher user
    const teacherUser = new UserModel({
      email: 'api.teacher@example.com',
      passwordHash: 'test_hash',
      role: 'teacher',
      profile: {
        firstName: 'API',
        lastName: 'Teacher'
      },
      isActive: true,
      isEmailVerified: true,
      tokenVersion: 0
    });
    await teacherUser.save();
    testTeacherId = teacherUser._id.toString();
    testDocumentIds.push(`users:${testTeacherId}`);

    // 3. Create student users
    const student1 = new UserModel({
      email: 'api.student1@example.com',
      passwordHash: 'test_hash',
      role: 'student',
      profile: {
        firstName: 'API',
        lastName: 'Student1',
        studentId: 'API001'
      },
      isActive: true,
      isEmailVerified: true,
      tokenVersion: 0
    });
    await student1.save();
    testStudent1Id = student1._id.toString();
    testDocumentIds.push(`users:${testStudent1Id}`);

    const student2 = new UserModel({
      email: 'api.student2@example.com',
      passwordHash: 'test_hash',
      role: 'student',
      profile: {
        firstName: 'API',
        lastName: 'Student2',
        studentId: 'API002'
      },
      isActive: true,
      isEmailVerified: true,
      tokenVersion: 0
    });
    await student2.save();
    testStudent2Id = student2._id.toString();
    testDocumentIds.push(`users:${testStudent2Id}`);

    // 4. Create promotion
    const testPromotion = new PromotionModel({
      name: 'API Test Promotion',
      semester: 1,
      intake: 'september',
      academicYear: '2024-2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-01-31'),
      studentIds: [student1._id, student2._id],
      eventIds: [],
      status: 'active',
      createdBy: adminUser._id
    });
    await testPromotion.save();
    testPromotionId = testPromotion._id.toString();
    testDocumentIds.push(`promotions:${testPromotionId}`);

    // Update students with current promotion
    await UserModel.updateMany(
      { _id: { $in: [student1._id, student2._id] } },
      { currentPromotionId: testPromotion._id }
    );

    // 5. Create course
    const testCourse = new CourseModel({
      title: 'API Test Course',
      description: 'Test course for API testing',
      slug: 'api-test-course',
      category: 'programming',
      level: 'beginner',
      status: 'published',
      instructor: teacherUser._id,
      chapters: [
        {
          title: 'API Chapter 1',
          description: 'First chapter',
          sections: [
            {
              title: 'API Section 1.1',
              exercises: [
                { title: 'API Exercise 1', type: 'quiz' },
                { title: 'API Exercise 2', type: 'coding' }
              ]
            }
          ]
        }
      ]
    });
    await testCourse.save();
    testCourse1Id = testCourse._id.toString();
    testDocumentIds.push(`courses:${testCourse1Id}`);

    // 6. Create events
    const event1 = new EventModel({
      title: 'API Test Event 1',
      description: 'First test event for API',
      type: 'lecture',
      startDate: new Date('2024-09-05T09:00:00Z'),
      endDate: new Date('2024-09-05T11:00:00Z'),
      isPublic: false,
      promotionIds: [testPromotion._id],
      linkedCourse: testCourse._id,
      teacherId: teacherUser._id
    });
    await event1.save();
    testEvent1Id = event1._id.toString();
    testDocumentIds.push(`events:${testEvent1Id}`);

    const event2 = new EventModel({
      title: 'API Test Event 2',
      description: 'Second test event for API',
      type: 'lecture',
      startDate: new Date('2024-09-06T14:00:00Z'),
      endDate: new Date('2024-09-06T16:00:00Z'),
      isPublic: false,
      promotionIds: [testPromotion._id],
      linkedCourse: testCourse._id,
      teacherId: teacherUser._id
    });
    await event2.save();
    testEvent2Id = event2._id.toString();
    testDocumentIds.push(`events:${testEvent2Id}`);

    // 7. Generate JWT tokens for authentication
    adminToken = jwt.sign(
      { userId: testAdminId, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    teacherToken = jwt.sign(
      { userId: testTeacherId, role: 'teacher' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    student1Token = jwt.sign(
      { userId: testStudent1Id, role: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    student2Token = jwt.sign(
      { userId: testStudent2Id, role: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup all test data
    await PromotionProgressModel.deleteMany({ 
      promotionId: new mongoose.Types.ObjectId(testPromotionId) 
    });
    await EventAttendanceModel.deleteMany({ 
      promotionId: new mongoose.Types.ObjectId(testPromotionId) 
    });
    
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
    // Clear progress and attendance data before each test
    await PromotionProgressModel.deleteMany({ 
      promotionId: new mongoose.Types.ObjectId(testPromotionId) 
    });
    await EventAttendanceModel.deleteMany({ 
      promotionId: new mongoose.Types.ObjectId(testPromotionId) 
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .post(`/api/progress/events/${testEvent1Id}/attendance`)
        .send({
          studentId: testStudent1Id,
          attended: true
        });

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .post(`/api/progress/events/${testEvent1Id}/attendance`)
        .set('Authorization', 'Bearer invalid-token')
        .send({
          studentId: testStudent1Id,
          attended: true
        });

      expect(response.status).toBe(401);
    });

    it('should enforce role-based access control', async () => {
      // Student trying to access admin-only endpoint
      const response = await request(app)
        .get(`/api/progress/promotions/${testPromotionId}/at-risk`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Attendance Endpoints', () => {
    describe('POST /api/progress/events/:eventId/attendance', () => {
      it('should allow teacher to mark student attendance', async () => {
        const response = await request(app)
          .post(`/api/progress/events/${testEvent1Id}/attendance`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({
            studentId: testStudent1Id,
            attended: true,
            notes: 'Present and engaged'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.attended).toBe(true);
        expect(response.body.data.notes).toBe('Present and engaged');
      });

      it('should allow admin to mark student attendance', async () => {
        const response = await request(app)
          .post(`/api/progress/events/${testEvent1Id}/attendance`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            studentId: testStudent1Id,
            attended: false,
            notes: 'Sick day'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.attended).toBe(false);
      });

      it('should reject student attempting to mark attendance', async () => {
        const response = await request(app)
          .post(`/api/progress/events/${testEvent1Id}/attendance`)
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            studentId: testStudent1Id,
            attended: true
          });

        expect(response.status).toBe(403);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post(`/api/progress/events/${testEvent1Id}/attendance`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({
            attended: true
            // Missing studentId
          });

        expect(response.status).toBe(400);
      });

      it('should handle non-existent event', async () => {
        const invalidEventId = new mongoose.Types.ObjectId().toString();
        
        const response = await request(app)
          .post(`/api/progress/events/${invalidEventId}/attendance`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({
            studentId: testStudent1Id,
            attended: true
          });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/progress/events/:eventId/attendance/bulk', () => {
      it('should handle bulk attendance marking', async () => {
        const attendanceRecords = [
          { studentId: testStudent1Id, attended: true, notes: 'Present' },
          { studentId: testStudent2Id, attended: false, notes: 'Absent' }
        ];

        const response = await request(app)
          .post(`/api/progress/events/${testEvent1Id}/attendance/bulk`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({
            promotionId: testPromotionId,
            attendanceRecords
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should validate bulk attendance request', async () => {
        const response = await request(app)
          .post(`/api/progress/events/${testEvent1Id}/attendance/bulk`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({
            // Missing required fields
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/progress/events/:eventId/attendance', () => {
      beforeEach(async () => {
        // Set up some attendance data
        await request(app)
          .post(`/api/progress/events/${testEvent1Id}/attendance/bulk`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({
            promotionId: testPromotionId,
            attendanceRecords: [
              { studentId: testStudent1Id, attended: true, notes: 'Present' },
              { studentId: testStudent2Id, attended: false, notes: 'Absent' }
            ]
          });
      });

      it('should retrieve event attendance for all users', async () => {
        const response = await request(app)
          .get(`/api/progress/events/${testEvent1Id}/attendance`)
          .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should allow students to view event attendance', async () => {
        const response = await request(app)
          .get(`/api/progress/events/${testEvent1Id}/attendance`)
          .set('Authorization', `Bearer ${student1Token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/progress/students/:studentId/attendance', () => {
      beforeEach(async () => {
        // Create attendance across multiple events
        await request(app)
          .post(`/api/progress/events/${testEvent1Id}/attendance`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({
            studentId: testStudent1Id,
            attended: true,
            notes: 'Event 1 present'
          });

        await request(app)
          .post(`/api/progress/events/${testEvent2Id}/attendance`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({
            studentId: testStudent1Id,
            attended: false,
            notes: 'Event 2 absent'
          });
      });

      it('should allow student to view own attendance', async () => {
        const response = await request(app)
          .get(`/api/progress/students/${testStudent1Id}/attendance`)
          .set('Authorization', `Bearer ${student1Token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should prevent student from viewing other student attendance', async () => {
        const response = await request(app)
          .get(`/api/progress/students/${testStudent2Id}/attendance`)
          .set('Authorization', `Bearer ${student1Token}`);

        expect(response.status).toBe(403);
      });

      it('should allow teacher to view student attendance', async () => {
        const response = await request(app)
          .get(`/api/progress/students/${testStudent1Id}/attendance`)
          .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(200);
      });

      it('should filter by promotion when provided', async () => {
        const response = await request(app)
          .get(`/api/progress/students/${testStudent1Id}/attendance`)
          .set('Authorization', `Bearer ${student1Token}`)
          .query({ promotionId: testPromotionId });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
      });
    });
  });

  describe('Progress Endpoints', () => {
    describe('GET /api/progress/my-progress', () => {
      it('should allow student to view own progress', async () => {
        const response = await request(app)
          .get('/api/progress/my-progress')
          .set('Authorization', `Bearer ${student1Token}`)
          .query({ promotionId: testPromotionId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.studentId).toBe(testStudent1Id);
        expect(response.body.data.promotionId).toBe(testPromotionId);
        expect(typeof response.body.data.overallProgress).toBe('number');
        expect(typeof response.body.data.attendanceRate).toBe('number');
      });

      it('should require promotionId parameter', async () => {
        const response = await request(app)
          .get('/api/progress/my-progress')
          .set('Authorization', `Bearer ${student1Token}`);

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/progress/students/:studentId', () => {
      it('should allow admin to view any student progress', async () => {
        const response = await request(app)
          .get(`/api/progress/students/${testStudent1Id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ promotionId: testPromotionId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should allow student to view own progress', async () => {
        const response = await request(app)
          .get(`/api/progress/students/${testStudent1Id}`)
          .set('Authorization', `Bearer ${student1Token}`)
          .query({ promotionId: testPromotionId });

        expect(response.status).toBe(200);
      });

      it('should prevent student from viewing other student progress', async () => {
        const response = await request(app)
          .get(`/api/progress/students/${testStudent2Id}`)
          .set('Authorization', `Bearer ${student1Token}`)
          .query({ promotionId: testPromotionId });

        expect(response.status).toBe(403);
      });
    });

    describe('GET /api/progress/promotions/:promotionId', () => {
      it('should allow admin to view promotion-wide progress', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should allow teacher to view promotion progress', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}`)
          .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(200);
      });

      it('should prevent student from viewing promotion-wide progress', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}`)
          .set('Authorization', `Bearer ${student1Token}`);

        expect(response.status).toBe(403);
      });
    });

    describe('PUT /api/progress/course', () => {
      it('should allow admin to update course progress', async () => {
        const response = await request(app)
          .put('/api/progress/course')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            studentId: testStudent1Id,
            promotionId: testPromotionId,
            courseProgress: {
              courseId: testCourse1Id,
              progressPercentage: 75,
              chaptersCompleted: 1,
              totalChapters: 2,
              exercisesCompleted: 3,
              totalExercises: 5,
              averageScore: 85
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.coursesProgress).toHaveLength(1);
      });

      it('should prevent non-admin from updating course progress', async () => {
        const response = await request(app)
          .put('/api/progress/course')
          .set('Authorization', `Bearer ${teacherToken}`)
          .send({
            studentId: testStudent1Id,
            promotionId: testPromotionId,
            courseProgress: {
              courseId: testCourse1Id,
              progressPercentage: 50
            }
          });

        expect(response.status).toBe(403);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .put('/api/progress/course')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            studentId: testStudent1Id
            // Missing required fields
          });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/progress/course/complete', () => {
      it('should allow admin to mark course as completed', async () => {
        const response = await request(app)
          .post('/api/progress/course/complete')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            studentId: testStudent1Id,
            promotionId: testPromotionId,
            courseId: testCourse1Id
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.coursesCompleted).toContain(testCourse1Id);
      });

      it('should prevent non-admin from marking course complete', async () => {
        const response = await request(app)
          .post('/api/progress/course/complete')
          .set('Authorization', `Bearer ${student1Token}`)
          .send({
            studentId: testStudent1Id,
            promotionId: testPromotionId,
            courseId: testCourse1Id
          });

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Statistics and Reports Endpoints', () => {
    beforeEach(async () => {
      // Set up some test data for statistics
      await request(app)
        .put('/api/progress/course')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: testStudent1Id,
          promotionId: testPromotionId,
          courseProgress: {
            courseId: testCourse1Id,
            progressPercentage: 90,
            averageScore: 92
          }
        });

      await request(app)
        .put('/api/progress/course')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: testStudent2Id,
          promotionId: testPromotionId,
          courseProgress: {
            courseId: testCourse1Id,
            progressPercentage: 30,
            averageScore: 65
          }
        });
    });

    describe('GET /api/progress/promotions/:promotionId/statistics', () => {
      it('should return promotion statistics for admin', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}/statistics`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(typeof response.body.data.averageProgress).toBe('number');
        expect(typeof response.body.data.averageAttendance).toBe('number');
        expect(typeof response.body.data.completionRate).toBe('number');
        expect(typeof response.body.data.atRiskStudents).toBe('number');
      });

      it('should allow teacher to view statistics', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}/statistics`)
          .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(200);
      });

      it('should prevent student from viewing statistics', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}/statistics`)
          .set('Authorization', `Bearer ${student1Token}`);

        expect(response.status).toBe(403);
      });
    });

    describe('GET /api/progress/promotions/:promotionId/top-performers', () => {
      it('should return top performers for all roles', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}/top-performers`)
          .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should respect limit parameter', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}/top-performers`)
          .set('Authorization', `Bearer ${teacherToken}`)
          .query({ limit: 1 });

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
      });
    });

    describe('GET /api/progress/promotions/:promotionId/at-risk', () => {
      it('should return at-risk students for admin', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}/at-risk`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should prevent teacher from viewing at-risk students', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}/at-risk`)
          .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(403);
      });

      it('should accept threshold parameters', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}/at-risk`)
          .set('Authorization', `Bearer ${adminToken}`)
          .query({
            progressThreshold: 50,
            attendanceThreshold: 80
          });

        expect(response.status).toBe(200);
      });
    });

    describe('GET /api/progress/promotions/:promotionId/report', () => {
      it('should generate progress report for admin', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}/report`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        
        if (response.body.data.length > 0) {
          const report = response.body.data[0];
          expect(report.studentId).toBeDefined();
          expect(report.studentName).toBeDefined();
          expect(typeof report.overallProgress).toBe('number');
          expect(typeof report.attendanceRate).toBe('number');
          expect(['on-track', 'at-risk', 'excelling']).toContain(report.status);
        }
      });

      it('should prevent non-admin from generating reports', async () => {
        const response = await request(app)
          .get(`/api/progress/promotions/${testPromotionId}/report`)
          .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(403);
      });
    });

    describe('POST /api/progress/promotions/:promotionId/recalculate', () => {
      it('should allow admin to trigger recalculation', async () => {
        const response = await request(app)
          .post(`/api/progress/promotions/${testPromotionId}/recalculate`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should prevent non-admin from triggering recalculation', async () => {
        const response = await request(app)
          .post(`/api/progress/promotions/${testPromotionId}/recalculate`)
          .set('Authorization', `Bearer ${teacherToken}`);

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid promotion ID', async () => {
      const invalidPromotionId = 'invalid-id';
      
      const response = await request(app)
        .get(`/api/progress/promotions/${invalidPromotionId}/statistics`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid student ID', async () => {
      const invalidStudentId = 'invalid-id';
      
      const response = await request(app)
        .get(`/api/progress/students/${invalidStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ promotionId: testPromotionId });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle missing required parameters gracefully', async () => {
      const response = await request(app)
        .get(`/api/progress/students/${testStudent1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
        // Missing promotionId query parameter

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle server errors gracefully', async () => {
      // Force an error by using an invalid ObjectId format
      const response = await request(app)
        .post(`/api/progress/events/invalid-object-id/attendance`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: testStudent1Id,
          attended: true
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle complete workflow: attendance + progress + reports', async () => {
      // 1. Mark attendance
      await request(app)
        .post(`/api/progress/events/${testEvent1Id}/attendance`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentId: testStudent1Id,
          attended: true,
          notes: 'Excellent participation'
        });

      // 2. Update course progress
      await request(app)
        .put('/api/progress/course')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: testStudent1Id,
          promotionId: testPromotionId,
          courseProgress: {
            courseId: testCourse1Id,
            progressPercentage: 85,
            averageScore: 90
          }
        });

      // 3. Check student progress
      const progressResponse = await request(app)
        .get(`/api/progress/students/${testStudent1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ promotionId: testPromotionId });

      expect(progressResponse.status).toBe(200);
      expect(progressResponse.body.data.overallProgress).toBeGreaterThan(50);
      expect(progressResponse.body.data.attendanceRate).toBe(100);

      // 4. Generate report
      const reportResponse = await request(app)
        .get(`/api/progress/promotions/${testPromotionId}/report`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reportResponse.status).toBe(200);
      const studentReport = reportResponse.body.data.find(
        (r: any) => r.studentId === testStudent1Id
      );
      expect(studentReport.status).toBe('excelling');
    });

    it('should handle bulk operations with mixed attendance', async () => {
      // Bulk mark attendance with mixed results
      const bulkResponse = await request(app)
        .post(`/api/progress/events/${testEvent1Id}/attendance/bulk`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          promotionId: testPromotionId,
          attendanceRecords: [
            { studentId: testStudent1Id, attended: true, notes: 'Present' },
            { studentId: testStudent2Id, attended: false, notes: 'Sick' }
          ]
        });

      expect(bulkResponse.status).toBe(200);

      // Check attendance was recorded correctly
      const attendanceResponse = await request(app)
        .get(`/api/progress/events/${testEvent1Id}/attendance`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(attendanceResponse.status).toBe(200);
      expect(attendanceResponse.body.data).toHaveLength(2);

      // Verify individual progress was updated
      const student1Progress = await request(app)
        .get(`/api/progress/students/${testStudent1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ promotionId: testPromotionId });

      const student2Progress = await request(app)
        .get(`/api/progress/students/${testStudent2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ promotionId: testPromotionId });

      expect(student1Progress.body.data.attendanceRate).toBe(100);
      expect(student2Progress.body.data.attendanceRate).toBe(0);
    });
  });
});