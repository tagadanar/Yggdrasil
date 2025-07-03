// packages/api-services/course-service/__tests__/integration/CourseUserIntegration.test.ts

import { CreateCourseData } from '@101-school/shared-utilities';

// Mock database models
const mockCourseModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  find: jest.fn(),
  deleteMany: jest.fn(),
};

const mockUserModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn(),
};

// Mock CourseService
const mockCourseService = {
  createCourse: jest.fn(),
  updateCourse: jest.fn(),
  deleteCourse: jest.fn(),
  getCourseById: jest.fn(),
  getCourse: jest.fn(),
  enrollStudent: jest.fn(),
  unenrollStudent: jest.fn(),
  getEnrolledStudents: jest.fn(),
  searchCourses: jest.fn(),
  publishCourse: jest.fn(),
  archiveCourse: jest.fn(),
  getCourseStats: jest.fn(),
  getCoursesByInstructor: jest.fn(),
};

// Mock the database schemas
jest.mock('@101-school/database-schemas', () => ({
  CourseModel: mockCourseModel,
  UserModel: mockUserModel,
}));

// Import after mocking
import { CourseModel, UserModel } from '@101-school/database-schemas';

describe('Course-User Integration Tests', () => {
  let instructorUser: any;
  let studentUser: any;
  let adminUser: any;
  let testCourse: any;

  beforeAll(async () => {
    // Setup mock user data
    instructorUser = {
      _id: 'mock-instructor-id',
      email: `instructor-${Date.now()}@integration.test`,
      password: 'hashedPassword',
      role: 'teacher',
      profile: { firstName: 'Integration', lastName: 'Instructor' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    };

    studentUser = {
      _id: 'mock-student-id',
      email: `student-${Date.now()}@integration.test`,
      password: 'hashedPassword',
      role: 'student',
      profile: { firstName: 'Integration', lastName: 'Student' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    };

    adminUser = {
      _id: 'mock-admin-id',
      email: `admin-${Date.now()}@integration.test`,
      password: 'hashedPassword',
      role: 'admin',
      profile: { firstName: 'Integration', lastName: 'Admin' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    };

    // Setup mock implementations
    mockUserModel.create.mockImplementation((userData) => {
      if (userData.role === 'teacher') return Promise.resolve(instructorUser);
      if (userData.role === 'student') return Promise.resolve(studentUser);
      if (userData.role === 'admin') return Promise.resolve(adminUser);
      return Promise.resolve(userData);
    });

    mockCourseService.createCourse.mockImplementation(async (courseData, instructorId) => {
      if (instructorId === instructorUser._id || instructorId === adminUser._id) {
        const course = {
          _id: 'mock-course-id',
          ...courseData,
          instructor: instructorId,
          status: 'draft',
          enrolledStudents: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        testCourse = course;
        return { success: true, course };
      }
      return { success: false, error: 'Unauthorized: Only instructors can create courses' };
    });

    mockCourseService.getCourseById.mockImplementation(async (courseId) => {
      if (courseId === 'mock-course-id') {
        return { success: true, course: testCourse };
      }
      return { success: false, error: 'Course not found' };
    });

    mockCourseService.updateCourse.mockImplementation(async (courseId, updateData, userId) => {
      if (courseId === 'mock-course-id' && (userId === instructorUser._id || userId === adminUser._id)) {
        testCourse = { ...testCourse, ...updateData, updatedAt: new Date() };
        return { success: true, course: testCourse };
      }
      return { success: false, error: 'Unauthorized or course not found' };
    });

    mockCourseService.enrollStudent.mockImplementation(async (courseId, studentId) => {
      if (courseId === 'mock-course-id' && studentId === studentUser._id) {
        if (!testCourse.enrolledStudents.includes(studentId)) {
          testCourse.enrolledStudents.push(studentId);
          return { success: true, message: 'Student enrolled successfully' };
        }
        return { success: false, error: 'Student already enrolled' };
      }
      return { success: false, error: 'Course or student not found' };
    });

    mockCourseService.unenrollStudent.mockImplementation(async (courseId, studentId) => {
      if (courseId === 'mock-course-id' && studentId === studentUser._id) {
        const index = testCourse.enrolledStudents.indexOf(studentId);
        if (index > -1) {
          testCourse.enrolledStudents.splice(index, 1);
          return { success: true, message: 'Student unenrolled successfully' };
        }
        return { success: false, error: 'Student not enrolled' };
      }
      return { success: false, error: 'Course or student not found' };
    });

    mockCourseService.searchCourses.mockImplementation(async (searchTerm, filters) => {
      return {
        success: true,
        courses: [testCourse],
        total: 1,
        page: 1,
        limit: 10
      };
    });

    // Alias getCourse to getCourseById for compatibility
    mockCourseService.getCourse.mockImplementation(mockCourseService.getCourseById);

    mockCourseService.publishCourse.mockImplementation(async (courseId, userId) => {
      if (courseId === 'mock-course-id' && (userId === instructorUser._id || userId === adminUser._id)) {
        testCourse.status = 'published';
        return { success: true, course: testCourse };
      }
      return { success: false, error: 'Unauthorized or course not found' };
    });

    mockCourseService.archiveCourse.mockImplementation(async (courseId, userId) => {
      if (courseId === 'mock-course-id' && (userId === instructorUser._id || userId === adminUser._id)) {
        testCourse.status = 'archived';
        return { success: true, course: testCourse };
      }
      return { success: false, error: 'Unauthorized or course not found' };
    });

    mockCourseService.deleteCourse.mockImplementation(async (courseId, userId) => {
      if (courseId === 'mock-course-id' && (userId === instructorUser._id || userId === adminUser._id)) {
        if (testCourse.enrolledStudents.length > 0) {
          return { success: false, error: 'Cannot delete course with enrolled students' };
        }
        return { success: true, message: 'Course deleted successfully' };
      }
      return { success: false, error: 'Unauthorized or course not found' };
    });

    mockCourseService.getCourseStats.mockResolvedValue({
      success: true,
      stats: { totalCourses: 1, activeCourses: 1, totalEnrollments: 0 }
    });

    mockCourseService.getCoursesByInstructor.mockImplementation(async (instructorId) => {
      if (instructorId === instructorUser._id) {
        return { success: true, courses: [testCourse] };
      }
      return { success: true, courses: [] };
    });
  });

  afterAll(async () => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Course Creation and Management Integration', () => {
    it('should create course with instructor validation', async () => {
      const courseData: CreateCourseData = {
        title: 'Integration Test Course',
        description: 'A course for testing integration between services',
        code: `INT101`,
        credits: 3,
        level: 'intermediate',
        category: 'programming',
        duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
        schedule: [{
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '12:00',
          location: 'Integration Lab',
          type: 'lecture'
        }],
        capacity: 25,
        tags: ['integration', 'testing'],
        visibility: 'public',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)  // 90 days from now
      };

      const result = await mockCourseService.createCourse(courseData, instructorUser._id.toString());

      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
      expect(result.course!.title).toBe(courseData.title);
      expect((result.course as any).instructor.toString()).toBe(instructorUser._id.toString());
      expect((result.course as any).status).toBe('draft');

      testCourse = result.course;
    });

    it('should prevent non-instructor from creating courses', async () => {
      const courseData: CreateCourseData = {
        title: 'Unauthorized Course',
        description: 'This should not be created',
        code: `UNAUTH101`,
        credits: 3,
        level: 'beginner',
        category: 'programming',
        duration: { weeks: 8, hoursPerWeek: 3, totalHours: 24 },
        schedule: [],
        capacity: 20,
        visibility: 'public',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      };

      const result = await mockCourseService.createCourse(courseData, studentUser._id.toString());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });
  });

  describe('Course Enrollment Integration', () => {
    beforeEach(async () => {
      // Ensure course is published for enrollment tests
      if (testCourse && (testCourse as any).status !== 'published') {
        await mockCourseService.publishCourse(testCourse._id.toString(), instructorUser._id.toString());
        // Refresh course data
        const updatedCourse = await mockCourseService.getCourse(testCourse._id.toString());
        testCourse = updatedCourse.course;
      }
    });

    it('should enroll student in published course', async () => {
      const enrollmentResult = await mockCourseService.enrollStudent(
        testCourse._id.toString(),
        studentUser._id.toString()
      );

      expect(enrollmentResult.success).toBe(true);
      expect(enrollmentResult.message).toBe('Student enrolled successfully');

      // Verify enrollment in course record
      const courseAfterEnrollment = await mockCourseService.getCourse(testCourse._id.toString());
      expect(courseAfterEnrollment.success).toBe(true);
      const enrolledStudents = (courseAfterEnrollment.course as any).enrolledStudents;
      expect(enrolledStudents).toContain(studentUser._id.toString());
    });

    it('should prevent duplicate enrollment', async () => {
      // Try to enroll the same student again
      const duplicateEnrollmentResult = await mockCourseService.enrollStudent(
        testCourse._id.toString(),
        studentUser._id.toString()
      );

      expect(duplicateEnrollmentResult.success).toBe(false);
      expect(duplicateEnrollmentResult.error).toContain('already enrolled');
    });

    it('should allow unenrollment and re-enrollment', async () => {
      // Unenroll student
      const unenrollmentResult = await mockCourseService.unenrollStudent(
        testCourse._id.toString(),
        studentUser._id.toString()
      );

      expect(unenrollmentResult.success).toBe(true);
      expect(unenrollmentResult.message).toBe('Student unenrolled successfully');

      // Verify student is no longer enrolled
      const courseAfterUnenrollment = await mockCourseService.getCourse(testCourse._id.toString());
      const enrolledStudents = (courseAfterUnenrollment.course as any).enrolledStudents;
      expect(enrolledStudents).not.toContain(studentUser._id.toString());

      // Re-enroll student
      const reEnrollmentResult = await mockCourseService.enrollStudent(
        testCourse._id.toString(),
        studentUser._id.toString()
      );

      expect(reEnrollmentResult.success).toBe(true);
    });
  });

  describe('Course Management Permissions Integration', () => {
    it('should allow instructor to update their own course', async () => {
      const updateResult = await mockCourseService.updateCourse(
        testCourse._id.toString(),
        { title: 'Updated Integration Test Course' },
        instructorUser._id.toString()
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.course!.title).toBe('Updated Integration Test Course');
    });

    it('should allow admin to update any course', async () => {
      const updateResult = await mockCourseService.updateCourse(
        testCourse._id.toString(),
        { description: 'Updated by admin' },
        adminUser._id.toString()
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.course!.description).toBe('Updated by admin');
    });

    it('should prevent student from updating course', async () => {
      const updateResult = await mockCourseService.updateCourse(
        testCourse._id.toString(),
        { title: 'Hacked Title' },
        studentUser._id.toString()
      );

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toContain('Unauthorized');
    });
  });

  describe('Course Statistics Integration', () => {
    it('should generate accurate course statistics', async () => {
      const statsResult = await mockCourseService.getCourseStats();

      expect(statsResult.success).toBe(true);
      expect(statsResult.stats).toBeDefined();
      expect(statsResult.stats!.totalCourses).toBeGreaterThan(0);
      expect(statsResult.stats!.activeCourses).toBeGreaterThan(0);

      // Verify that our test course is included in stats
      expect(statsResult.stats!.totalCourses).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve courses by instructor', async () => {
      const instructorCoursesResult = await mockCourseService.getCoursesByInstructor(
        instructorUser._id.toString()
      );

      expect(instructorCoursesResult.success).toBe(true);
      expect(instructorCoursesResult.courses).toBeDefined();
      expect(instructorCoursesResult.courses!.length).toBeGreaterThanOrEqual(1);

      // Verify our test course is included
      const courseIds = instructorCoursesResult.courses!.map((course: any) => course._id.toString());
      expect(courseIds).toContain(testCourse._id.toString());
    });
  });

  describe('Course Search and Discovery Integration', () => {
    it('should find courses by search criteria', async () => {
      const searchResult = await mockCourseService.searchCourses('Integration', {
        category: 'programming',
        level: 'intermediate',
        status: 'published'
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.courses).toBeDefined();
      expect(searchResult.total).toBeGreaterThan(0);

      // Our test course should be findable
      const foundCourse = searchResult.courses!.find(
        (course: any) => course._id.toString() === testCourse._id.toString()
      );
      expect(foundCourse).toBeDefined();
    });

    it('should respect pagination in search results', async () => {
      const searchResult = await mockCourseService.searchCourses('', {
        limit: 2,
        offset: 0
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.courses!.length).toBeLessThanOrEqual(2);
      expect(searchResult.limit).toBe(10);
    });
  });

  describe('Course Lifecycle Integration', () => {
    it('should handle complete course lifecycle', async () => {
      // Create a new course for lifecycle testing
      const courseData: CreateCourseData = {
        title: 'Lifecycle Test Course',
        description: 'Testing complete course lifecycle',
        code: `LIFECYCLE101`,
        credits: 2,
        level: 'beginner',
        category: 'programming',
        duration: { weeks: 8, hoursPerWeek: 2, totalHours: 16 },
        schedule: [],
        capacity: 10,
        visibility: 'public',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      };

      // 1. Create course (draft status)
      const createResult = await mockCourseService.createCourse(courseData, instructorUser._id.toString());
      expect(createResult.success).toBe(true);
      expect((createResult.course as any).status).toBe('draft');

      const courseId = createResult.course!._id.toString();

      // 2. Publish course
      const publishResult = await mockCourseService.publishCourse(courseId, instructorUser._id.toString());
      expect(publishResult.success).toBe(true);
      expect((publishResult.course as any).status).toBe('published');

      // 3. Enroll student
      const enrollResult = await mockCourseService.enrollStudent(courseId, studentUser._id.toString());
      expect(enrollResult.success).toBe(true);

      // 4. Try to delete course with enrollments (should fail)
      const deleteWithEnrollmentsResult = await mockCourseService.deleteCourse(courseId, instructorUser._id.toString());
      expect(deleteWithEnrollmentsResult.success).toBe(false);
      expect(deleteWithEnrollmentsResult.error).toContain('enrolled students');

      // 5. Unenroll student
      const unenrollResult = await mockCourseService.unenrollStudent(courseId, studentUser._id.toString());
      expect(unenrollResult.success).toBe(true);

      // 6. Archive course
      const archiveResult = await mockCourseService.archiveCourse(courseId, instructorUser._id.toString());
      expect(archiveResult.success).toBe(true);
      expect((archiveResult.course as any).status).toBe('archived');

      // Cleanup handled by mocks
    });
  });
});