// Integration tests for Course API endpoints
import request from 'supertest';
import express from 'express';
import { CourseModel, UserModel } from '@101-school/database-schemas';
import courseRoutes from '../../src/routes/courseRoutes';
import mongoose from 'mongoose';

// Mock authentication middleware for testing
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  // Only set user data if test headers are provided
  if (req.headers['test-user-id'] && req.headers['test-user-role']) {
    req.user = {
      id: req.headers['test-user-id'],
      role: req.headers['test-user-role']
    };
  }
  // If no test headers, req.user remains undefined (for auth tests)
  next();
};

describe('Course API Endpoints Integration Tests', () => {
  let app: express.Application;
  let server: any;
  let instructorId: string;
  let studentId: string;
  let adminId: string;
  let courseId: string;
  let enrolledCourseId: string;

  beforeAll(async () => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    app.use('/courses', courseRoutes);

    // Start test server
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Reset mock data (setup file provides comprehensive mocks)
    if (CourseModel.__resetMockData) {
      CourseModel.__resetMockData();
    }
    if (UserModel.__resetMockUsers) {
      UserModel.__resetMockUsers();
    }

    // Create test users using the mocked UserModel
    const instructor = await UserModel.create({
      email: `instructor-${Date.now()}@example.com`,
      password: 'hashedPassword',
      role: 'teacher',
      profile: { firstName: 'John', lastName: 'Instructor' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    });

    const student = await UserModel.create({
      email: `student-${Date.now()}@example.com`,
      password: 'hashedPassword',
      role: 'student',
      profile: { firstName: 'Jane', lastName: 'Student' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    });

    const admin = await UserModel.create({
      email: `admin-${Date.now()}@example.com`,
      password: 'hashedPassword',
      role: 'admin',
      profile: { firstName: 'Admin', lastName: 'User' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    });

    instructorId = instructor._id.toString();
    studentId = student._id.toString();
    adminId = admin._id.toString();

    // Create test courses using the mocked CourseModel
    const course = await CourseModel.create({
      title: 'Integration Test Course',
      description: 'Course for integration testing',
      code: 'INT101',
      credits: 3,
      level: 'beginner',
      category: 'programming',
      instructor: instructorId,
      instructorInfo: {
        firstName: 'John',
        lastName: 'Instructor',
        email: instructor.email
      },
      duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
      schedule: [],
      capacity: 30,
      enrolledStudents: [],
      tags: ['integration', 'test'],
      status: 'published',
      visibility: 'public',
      chapters: [],
      resources: [],
      assessments: [],
      isActive: true,
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      enrollmentDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });

    const enrolledCourse = await CourseModel.create({
      title: 'Enrolled Integration Course',
      description: 'Course with student enrolled',
      code: 'ENR_INT101',
      credits: 3,
      level: 'intermediate',
      category: 'design',
      instructor: instructorId,
      instructorInfo: {
        firstName: 'John',
        lastName: 'Instructor',
        email: instructor.email
      },
      duration: { weeks: 8, hoursPerWeek: 3, totalHours: 24 },
      schedule: [],
      capacity: 20,
      enrolledStudents: [studentId],
      tags: ['enrolled', 'integration'],
      status: 'published',
      visibility: 'public',
      chapters: [],
      resources: [],
      assessments: [],
      isActive: true,
      startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      enrollmentDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    });

    courseId = course._id.toString();
    enrolledCourseId = enrolledCourse._id.toString();
  });

  describe('GET /courses', () => {
    it('should get all courses with default pagination', async () => {
      const response = await request(app)
        .get('/courses')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBe(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter courses by category', async () => {
      const response = await request(app)
        .get('/courses?category=programming')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('programming');
    });

    it('should filter courses by level', async () => {
      const response = await request(app)
        .get('/courses?level=intermediate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].level).toBe('intermediate');
    });

    it('should search courses by query', async () => {
      const response = await request(app)
        .get('/courses?q=Integration')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/courses?limit=1&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.hasMore).toBe(true);
    });

    it('should sort courses by title', async () => {
      const response = await request(app)
        .get('/courses?sortBy=title&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].title).toBe('Enrolled Integration Course');
    });
  });

  describe('GET /courses/:courseId', () => {
    it('should get course by ID', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(courseId);
      expect(response.body.data.title).toBe('Integration Test Course');
    });

    it('should return 404 for non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439016';
      const response = await request(app)
        .get(`/courses/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Course not found');
    });

    it('should return 404 for invalid course ID format', async () => {
      const response = await request(app)
        .get('/courses/invalid-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid course ID format');
    });
  });

  describe('POST /courses', () => {
    const validCourseData = {
      title: 'New Course via API',
      description: 'Created through API integration test',
      code: 'API101',
      credits: 3,
      level: 'beginner',
      category: 'programming',
      duration: {
        weeks: 12,
        hoursPerWeek: 4,
        totalHours: 48
      },
      schedule: [],
      capacity: 30,
      tags: ['api', 'test'],
      visibility: 'public',
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
    };

    it('should create course as instructor', async () => {
      // Convert dates to ISO strings as they would be sent over HTTP
      const courseDataForAPI = {
        ...validCourseData,
        startDate: validCourseData.startDate.toISOString(),
        endDate: validCourseData.endDate.toISOString()
      };

      const response = await request(app)
        .post('/courses')
        .set('test-user-id', instructorId)
        .set('test-user-role', 'teacher')
        .send(courseDataForAPI);

      // Log the response for debugging
      if (response.status !== 201) {
        console.log('Course creation failed:', response.status, response.body);
        console.log('Sent data:', courseDataForAPI);
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(validCourseData.title);
      expect(response.body.data.code).toBe(validCourseData.code);
      expect(response.body.data.status).toBe('draft');
    });

    it('should create course as admin', async () => {
      // Convert dates to ISO strings as they would be sent over HTTP
      const courseDataForAPI = {
        ...validCourseData,
        startDate: validCourseData.startDate.toISOString(),
        endDate: validCourseData.endDate.toISOString()
      };

      const response = await request(app)
        .post('/courses')
        .set('test-user-id', adminId)
        .set('test-user-role', 'admin')
        .send(courseDataForAPI)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(validCourseData.title);
    });

    it('should return 401 for unauthorized user', async () => {
      // Convert dates to ISO strings as they would be sent over HTTP
      const courseDataForAPI = {
        ...validCourseData,
        startDate: validCourseData.startDate.toISOString(),
        endDate: validCourseData.endDate.toISOString()
      };

      const response = await request(app)
        .post('/courses')
        .send(courseDataForAPI)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized - instructor ID required');
    });

    it('should return 400 for invalid course data', async () => {
      const invalidData = { ...validCourseData, title: '' };
      const response = await request(app)
        .post('/courses')
        .set('test-user-id', instructorId)
        .set('test-user-role', 'teacher')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });
  });

  describe('PUT /courses/:courseId', () => {
    const updateData = {
      title: 'Updated Course Title',
      description: 'Updated description',
      credits: 4
    };

    it('should update course as instructor', async () => {
      const response = await request(app)
        .put(`/courses/${courseId}`)
        .set('test-user-id', instructorId)
        .set('test-user-role', 'teacher')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should update course as admin', async () => {
      const response = await request(app)
        .put(`/courses/${courseId}`)
        .set('test-user-id', adminId)
        .set('test-user-role', 'admin')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });

    it('should return 401 for unauthorized user', async () => {
      const response = await request(app)
        .put(`/courses/${courseId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized - user ID required');
    });

    it('should return 400 for unauthorized student', async () => {
      const response = await request(app)
        .put(`/courses/${courseId}`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions to update this course');
    });
  });

  describe('DELETE /courses/:courseId', () => {
    it('should delete course as instructor', async () => {
      const response = await request(app)
        .delete(`/courses/${courseId}`)
        .set('test-user-id', instructorId)
        .set('test-user-role', 'teacher')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should delete course as admin', async () => {
      const response = await request(app)
        .delete(`/courses/${courseId}`)
        .set('test-user-id', adminId)
        .set('test-user-role', 'admin')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 401 for unauthorized user', async () => {
      const response = await request(app)
        .delete(`/courses/${courseId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized - user ID required');
    });

    it('should return 400 for unauthorized student', async () => {
      const response = await request(app)
        .delete(`/courses/${courseId}`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions to delete this course');
    });
  });

  describe('PATCH /courses/:courseId/publish', () => {
    beforeEach(async () => {
      // Ensure course is in draft status using the mocked method
      await CourseModel.findByIdAndUpdate(courseId, { status: 'draft' });
    });

    it('should publish course as instructor', async () => {
      const response = await request(app)
        .patch(`/courses/${courseId}/publish`)
        .set('test-user-id', instructorId)
        .set('test-user-role', 'teacher')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
    });

    it('should publish course as admin', async () => {
      const response = await request(app)
        .patch(`/courses/${courseId}/publish`)
        .set('test-user-id', adminId)
        .set('test-user-role', 'admin')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
    });

    it('should return 401 for unauthorized user', async () => {
      const response = await request(app)
        .patch(`/courses/${courseId}/publish`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /courses/:courseId/archive', () => {
    it('should archive course as instructor', async () => {
      const response = await request(app)
        .patch(`/courses/${courseId}/archive`)
        .set('test-user-id', instructorId)
        .set('test-user-role', 'teacher')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('archived');
    });

    it('should archive course as admin', async () => {
      const response = await request(app)
        .patch(`/courses/${courseId}/archive`)
        .set('test-user-id', adminId)
        .set('test-user-role', 'admin')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('archived');
    });
  });

  describe('POST /courses/:courseId/enroll', () => {
    it('should enroll student in course', async () => {
      const response = await request(app)
        .post(`/courses/${courseId}/enroll`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .send({ studentId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enrollmentDate).toBeDefined();
    });

    it('should return 400 for missing student ID', async () => {
      const response = await request(app)
        .post(`/courses/${courseId}/enroll`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Student ID is required');
    });
  });

  describe('POST /courses/:courseId/unenroll', () => {
    it('should unenroll student from course', async () => {
      const response = await request(app)
        .post(`/courses/${enrolledCourseId}/unenroll`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .send({ studentId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 for missing student ID', async () => {
      const response = await request(app)
        .post(`/courses/${enrolledCourseId}/unenroll`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Student ID is required');
    });
  });

  describe('GET /courses/:courseId/enrollment-status', () => {
    it('should get enrollment status for enrolled student', async () => {
      const response = await request(app)
        .get(`/courses/${enrolledCourseId}/enrollment-status`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enrolled).toBe(true);
    });

    it('should get enrollment status for non-enrolled student', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}/enrollment-status`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enrolled).toBe(false);
    });

    it('should return 401 for unauthorized user', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}/enrollment-status`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /courses/:courseId/eligibility', () => {
    it('should check enrollment eligibility for eligible student', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}/eligibility`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eligible).toBe(true);
    });

    it('should check enrollment eligibility for already enrolled student', async () => {
      const response = await request(app)
        .get(`/courses/${enrolledCourseId}/eligibility`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.reason).toContain('Already enrolled');
    });
  });

  describe('GET /courses/:courseId/progress', () => {
    it('should get course progress for enrolled student', async () => {
      const response = await request(app)
        .get(`/courses/${enrolledCourseId}/progress`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.completionPercentage).toBeDefined();
      expect(response.body.data.timeSpent).toBeDefined();
    });

    it('should return 400 for non-enrolled student', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}/progress`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User is not enrolled in this course');
    });
  });

  describe('PUT /courses/:courseId/progress', () => {
    const progressData = {
      chapterId: 'chapter1',
      completed: true,
      timeSpent: 60
    };

    it('should update course progress for enrolled student', async () => {
      const response = await request(app)
        .put(`/courses/${enrolledCourseId}/progress`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .send(progressData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Progress updated successfully');
    });

    it('should return 400 for non-enrolled student', async () => {
      const response = await request(app)
        .put(`/courses/${courseId}/progress`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .send(progressData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User is not enrolled in this course');
    });
  });

  describe('GET /courses/:courseId/feedback', () => {
    it('should get course feedback', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}/feedback`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.averageRating).toBeDefined();
      expect(response.body.data.totalReviews).toBeDefined();
      expect(Array.isArray(response.body.data.feedback)).toBe(true);
    });
  });

  describe('POST /courses/:courseId/feedback', () => {
    const feedbackData = {
      rating: 5,
      comment: 'Excellent course!',
      anonymous: false
    };

    it('should submit feedback for enrolled student', async () => {
      const response = await request(app)
        .post(`/courses/${enrolledCourseId}/feedback`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .send(feedbackData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Feedback submitted successfully');
    });

    it('should return 400 for non-enrolled student', async () => {
      const response = await request(app)
        .post(`/courses/${courseId}/feedback`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .send(feedbackData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Only enrolled students can submit feedback');
    });

    it('should return 400 for invalid rating', async () => {
      const invalidFeedback = { ...feedbackData, rating: 6 };
      const response = await request(app)
        .post(`/courses/${enrolledCourseId}/feedback`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .send(invalidFeedback)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Rating must be between 1 and 5');
    });
  });

  describe('GET /courses/:courseId/prerequisites', () => {
    it('should get course prerequisites', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}/prerequisites`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.prerequisites)).toBe(true);
      expect(Array.isArray(response.body.data.completed)).toBe(true);
      expect(Array.isArray(response.body.data.missing)).toBe(true);
    });
  });

  describe('GET /courses/enrolled', () => {
    it('should get enrolled courses for student', async () => {
      const response = await request(app)
        .get('/courses/enrolled')
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBe(1);
    });

    it('should return empty array for user with no enrollments', async () => {
      const response = await request(app)
        .get('/courses/enrolled')
        .set('test-user-id', adminId)
        .set('test-user-role', 'admin')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /courses/categories', () => {
    it('should get course categories', async () => {
      const response = await request(app)
        .get('/courses/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.categories)).toBe(true);
      expect(response.body.data.categories).toContain('programming');
      expect(response.body.data.categories).toContain('design');
    });
  });

  describe('GET /courses/levels', () => {
    it('should get course levels', async () => {
      const response = await request(app)
        .get('/courses/levels')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.levels)).toBe(true);
      expect(response.body.data.levels).toContain('beginner');
      expect(response.body.data.levels).toContain('intermediate');
      expect(response.body.data.levels).toContain('advanced');
      expect(response.body.data.levels).toContain('expert');
    });
  });

  describe('GET /courses/stats', () => {
    it('should get course statistics', async () => {
      const response = await request(app)
        .get('/courses/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(typeof response.body.data.totalCourses).toBe('number');
      expect(typeof response.body.data.publishedCourses).toBe('number');
    });
  });

  describe('GET /courses/:courseId/export', () => {
    it('should export course data as JSON for instructor', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}/export?format=json`)
        .set('test-user-id', instructorId)
        .set('test-user-role', 'teacher')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should export course data as CSV for instructor', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}/export?format=csv`)
        .set('test-user-id', instructorId)
        .set('test-user-role', 'teacher')
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should return 400 for unauthorized user', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}/export?format=json`)
        .set('test-user-id', studentId)
        .set('test-user-role', 'student')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions to export course data');
    });

    it('should return 400 for unsupported format', async () => {
      const response = await request(app)
        .get(`/courses/${courseId}/export?format=pdf`)
        .set('test-user-id', instructorId)
        .set('test-user-role', 'teacher')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unsupported export format. Use json or csv.');
    });
  });

  describe('GET /courses/instructor/:instructorId', () => {
    it('should get courses by instructor', async () => {
      const response = await request(app)
        .get(`/courses/instructor/${instructorId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBe(2);
    });

    it('should return empty array for instructor with no courses', async () => {
      const response = await request(app)
        .get(`/courses/instructor/${adminId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should return 400 for invalid instructor ID', async () => {
      const response = await request(app)
        .get('/courses/instructor/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid instructor ID format');
    });
  });

  describe('Error handling', () => {
    it('should handle 500 errors gracefully', async () => {
      // Mock database error by making find throw
      const originalFind = CourseModel.find;
      CourseModel.find = jest.fn().mockImplementation(() => {
        throw new Error('Database connection error');
      });

      try {
        const response = await request(app)
          .get('/courses')
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Internal server error');
      } finally {
        // Restore original method in finally block to ensure it's always restored
        CourseModel.find = originalFind;
      }
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/courses')
        .set('test-user-id', instructorId)
        .set('test-user-role', 'teacher')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express automatically handles malformed JSON
    });
  });
});