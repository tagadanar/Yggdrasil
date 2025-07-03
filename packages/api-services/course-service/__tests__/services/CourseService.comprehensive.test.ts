// Path: packages/api-services/course-service/__tests__/services/CourseService.comprehensive.test.ts
import { CourseService } from '../../src/services/CourseService';
import { CourseModel, UserModel } from '@101-school/database-schemas';
import { CreateCourseData, UpdateCourseData, CourseSearchFilters } from '@101-school/shared-utilities';
import mongoose from 'mongoose';

describe('CourseService - Comprehensive Tests', () => {
  let instructorId: string;
  let studentId: string;
  let adminId: string;
  let staffId: string;
  let courseId: string;

  beforeEach(async () => {
    // Clean collections
    await CourseModel.deleteMany({});
    await UserModel.deleteMany({});

    // Create test users with complete profiles
    const instructor = await UserModel.create({
      email: `instructor-${Date.now()}@example.com`,
      password: 'hashedPassword',
      role: 'teacher',
      profile: { firstName: 'John', lastName: 'Instructor' },
      preferences: {
        language: 'fr',
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
        language: 'fr',
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
        language: 'fr',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    });

    const staff = await UserModel.create({
      email: `staff-${Date.now()}@example.com`,
      password: 'hashedPassword',
      role: 'staff',
      profile: { firstName: 'Staff', lastName: 'Member' },
      preferences: {
        language: 'fr',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    });

    instructorId = (instructor._id as any).toString();
    studentId = (student._id as any).toString();
    adminId = (admin._id as any).toString();
    staffId = (staff._id as any).toString();
  });

  describe('createCourse - Comprehensive Tests', () => {
    const validCourseData: CreateCourseData = {
      title: 'Advanced JavaScript Programming',
      description: 'Learn advanced JavaScript concepts including async/await, closures, and more',
      code: 'ADVJS301',
      credits: 4,
      level: 'advanced',
      category: 'programming',
      duration: {
        weeks: 16,
        hoursPerWeek: 5,
        totalHours: 80
      },
      schedule: [{
        dayOfWeek: 2,
        startTime: '14:00',
        endTime: '16:00',
        location: 'Lab B2',
        type: 'practical'
      }],
      capacity: 25,
      tags: ['javascript', 'advanced', 'async', 'programming'],
      visibility: 'public',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-15'),
      prerequisites: ['Basic JavaScript', 'ES6 Fundamentals']
    };

    it('should create course with all fields populated correctly', async () => {
      const result = await CourseService.createCourse(validCourseData, instructorId);

      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
      expect(result.course.title).toBe(validCourseData.title);
      expect(result.course.code).toBe(validCourseData.code.toUpperCase());
      expect(result.course.instructor.toString()).toBe(instructorId);
      expect(result.course.status).toBe('draft');
      expect(result.course.isActive).toBe(true);
      expect(result.course.instructorInfo).toBeDefined();
      expect(result.course.instructorInfo.firstName).toBe('John');
      expect(result.course.instructorInfo.lastName).toBe('Instructor');
      expect(result.course.enrolledStudents).toEqual([]);
      expect(result.course.chapters).toEqual([]);
      expect(result.course.resources).toEqual([]);
      expect(result.course.assessments).toEqual([]);
    });

    it('should convert course code to uppercase', async () => {
      const courseData = { ...validCourseData, code: 'low101' };
      const result = await CourseService.createCourse(courseData, instructorId);

      expect(result.success).toBe(true);
      expect(result.course.code).toBe('LOW101');
    });

    it('should reject invalid course data - missing title', async () => {
      const invalidData = { ...validCourseData, title: '' };
      const result = await CourseService.createCourse(invalidData, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should reject invalid course data - missing description', async () => {
      const invalidData = { ...validCourseData, description: '' };
      const result = await CourseService.createCourse(invalidData, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should reject invalid course data - missing code', async () => {
      const invalidData = { ...validCourseData, code: '' };
      const result = await CourseService.createCourse(invalidData, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should reject course with end date before start date', async () => {
      const invalidData = { 
        ...validCourseData, 
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-09-01')
      };
      const result = await CourseService.createCourse(invalidData, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course validation failed: endDate: End date must be after start date');
    });

    it('should reject course with equal start and end dates', async () => {
      const date = new Date('2024-09-01');
      const invalidData = { 
        ...validCourseData, 
        startDate: date,
        endDate: date
      };
      const result = await CourseService.createCourse(invalidData, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course validation failed: endDate: End date must be after start date');
    });

    it('should reject course creation with non-existent instructor', async () => {
      const fakeInstructorId = '507f1f77bcf86cd799439013';
      const result = await CourseService.createCourse(validCourseData, fakeInstructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Instructor not found');
    });

    it('should reject course creation when user is not instructor/admin/staff', async () => {
      const result = await CourseService.createCourse(validCourseData, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User does not have permission to create courses');
    });

    it('should allow admin to create courses', async () => {
      const result = await CourseService.createCourse(validCourseData, adminId);

      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
    });

    it('should allow staff to create courses', async () => {
      const result = await CourseService.createCourse(validCourseData, staffId);

      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
    });

    it('should prevent duplicate course codes', async () => {
      // Create first course
      await CourseService.createCourse(validCourseData, instructorId);

      // Try to create second course with same code
      const duplicateData = { ...validCourseData, title: 'Different Title' };
      const result = await CourseService.createCourse(duplicateData, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course code already exists');
    });

    it('should handle database errors gracefully', async () => {
      // Force a database error by providing invalid data that passes initial validation
      const invalidData = { ...validCourseData };
      // Temporarily mock CourseModel.create to throw an error
      const originalCreate = CourseModel.create;
      (CourseModel as any).create = jest.fn().mockRejectedValue(new Error('Database connection error'));

      const result = await CourseService.createCourse(invalidData, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore original method
      CourseModel.create = originalCreate;
    });

    it('should create course with minimal required fields', async () => {
      const minimalData: CreateCourseData = {
        title: 'Minimal Course',
        description: 'A minimal course description',
        code: 'MIN101',
        credits: 1,
        level: 'beginner',
        category: 'programming',
        duration: {
          weeks: 1,
          hoursPerWeek: 1,
          totalHours: 1
        },
        schedule: [],
        capacity: 1,
        tags: [],
        visibility: 'public',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-08')
      };

      const result = await CourseService.createCourse(minimalData, instructorId);

      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
    });
  });

  describe('getCourse - Comprehensive Tests', () => {
    beforeEach(async () => {
      const course = await CourseModel.create({
        title: 'Test Course for Get',
        description: 'Test description',
        code: 'GETTEST101',
        credits: 3,
        level: 'intermediate',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
        schedule: [],
        capacity: 30,
        enrolledStudents: [studentId],
        tags: ['test', 'get'],
        status: 'published',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-05-01')
      });
      courseId = (course._id as any).toString();
    });

    it('should get course with populated instructor and students', async () => {
      const result = await CourseService.getCourse(courseId);

      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
      expect(result.course._id.toString()).toBe(courseId);
      expect(result.course.title).toBe('Test Course for Get');
      expect(result.course.instructor).toBeDefined();
      expect(result.course.enrolledStudents).toBeDefined();
    });

    it('should return error for invalid course ID format', async () => {
      const result = await CourseService.getCourse('invalid-id-format');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should return error for non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439014';
      const result = await CourseService.getCourse(fakeId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });

    it('should handle database errors during course retrieval', async () => {
      // Mock CourseModel.findById to throw an error
      const originalFindById = CourseModel.findById;
      (CourseModel as any).findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection error');
      });

      const result = await CourseService.getCourse(courseId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore original method
      CourseModel.findById = originalFindById;
    });
  });

  describe('updateCourse - Comprehensive Tests', () => {
    beforeEach(async () => {
      const course = await CourseModel.create({
        title: 'Original Course Title',
        description: 'Original description',
        code: 'UPDATE101',
        credits: 3,
        level: 'beginner',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
        schedule: [],
        capacity: 30,
        enrolledStudents: [],
        tags: ['original'],
        status: 'draft',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-05-01')
      });
      courseId = (course._id as any).toString();
    });

    it('should update course successfully by instructor', async () => {
      const updateData: UpdateCourseData = {
        title: 'Updated Course Title',
        description: 'Updated description with more details',
        credits: 4,
        level: 'intermediate',
        tags: ['updated', 'comprehensive', 'test'],
        capacity: 35
      };

      const result = await CourseService.updateCourse(courseId, updateData, instructorId);

      expect(result.success).toBe(true);
      expect(result.course.title).toBe('Updated Course Title');
      expect(result.course.description).toBe('Updated description with more details');
      expect(result.course.credits).toBe(4);
      expect(result.course.level).toBe('intermediate');
      expect(result.course.tags).toEqual(['updated', 'comprehensive', 'test']);
      expect(result.course.capacity).toBe(35);
    });

    it('should update course successfully by admin', async () => {
      const updateData: UpdateCourseData = {
        title: 'Admin Updated Title',
        status: 'published'
      };

      const result = await CourseService.updateCourse(courseId, updateData, adminId);

      expect(result.success).toBe(true);
      expect(result.course.title).toBe('Admin Updated Title');
      expect(result.course.status).toBe('published');
    });

    it('should update course successfully by staff', async () => {
      const updateData: UpdateCourseData = {
        title: 'Staff Updated Title',
        visibility: 'private'
      };

      const result = await CourseService.updateCourse(courseId, updateData, staffId);

      expect(result.success).toBe(true);
      expect(result.course.title).toBe('Staff Updated Title');
      expect(result.course.visibility).toBe('private');
    });

    it('should reject update by unauthorized user (student)', async () => {
      const updateData: UpdateCourseData = {
        title: 'Unauthorized Update'
      };

      const result = await CourseService.updateCourse(courseId, updateData, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to update this course');
    });

    it('should reject update with invalid course ID format', async () => {
      const updateData: UpdateCourseData = { title: 'New Title' };
      const result = await CourseService.updateCourse('invalid-id', updateData, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should reject update for non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439014';
      const updateData: UpdateCourseData = { title: 'New Title' };
      const result = await CourseService.updateCourse(fakeId, updateData, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });

    it('should reject update with non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439015';
      const updateData: UpdateCourseData = { title: 'New Title' };
      const result = await CourseService.updateCourse(courseId, updateData, fakeUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should reject update with invalid date range', async () => {
      const updateData: UpdateCourseData = {
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-11-01')
      };

      const result = await CourseService.updateCourse(courseId, updateData, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('End date must be after start date');
    });

    it('should update dates correctly when valid', async () => {
      const updateData: UpdateCourseData = {
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-06-01')
      };

      const result = await CourseService.updateCourse(courseId, updateData, instructorId);

      expect(result.success).toBe(true);
      expect(new Date(result.course.startDate)).toEqual(updateData.startDate);
      expect(new Date(result.course.endDate)).toEqual(updateData.endDate);
    });

    it('should handle partial updates correctly', async () => {
      const updateData: UpdateCourseData = {
        description: 'Only description updated'
      };

      const result = await CourseService.updateCourse(courseId, updateData, instructorId);

      expect(result.success).toBe(true);
      expect(result.course.description).toBe('Only description updated');
      expect(result.course.title).toBe('Original Course Title'); // Should remain unchanged
    });
  });

  describe('deleteCourse - Comprehensive Tests', () => {
    beforeEach(async () => {
      const course = await CourseModel.create({
        title: 'Course to Delete',
        description: 'This course will be deleted',
        code: 'DELETE101',
        credits: 3,
        level: 'beginner',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
        schedule: [],
        capacity: 30,
        enrolledStudents: [],
        tags: ['delete', 'test'],
        status: 'draft',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-05-01')
      });
      courseId = (course._id as any).toString();
    });

    it('should delete course successfully (soft delete)', async () => {
      const result = await CourseService.deleteCourse(courseId, instructorId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');

      // Verify course is soft deleted
      const course = await CourseModel.findById(courseId);
      expect(course).toBeDefined();
      expect((course as any).isActive).toBe(false);
      expect((course as any).status).toBe('archived');
    });

    it('should allow admin to delete any course', async () => {
      const result = await CourseService.deleteCourse(courseId, adminId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
    });

    it('should allow staff to delete courses', async () => {
      const result = await CourseService.deleteCourse(courseId, staffId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
    });

    it('should reject deletion by unauthorized user', async () => {
      const result = await CourseService.deleteCourse(courseId, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to delete this course');
    });

    it('should prevent deletion of published course with enrollments', async () => {
      // Update course to published with enrollments
      await CourseModel.findByIdAndUpdate(courseId, {
        status: 'published',
        enrolledStudents: [studentId]
      });

      const result = await CourseService.deleteCourse(courseId, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete published course with enrolled students. Archive it instead.');
    });

    it('should allow deletion of published course without enrollments', async () => {
      // Update course to published without enrollments
      await CourseModel.findByIdAndUpdate(courseId, {
        status: 'published',
        enrolledStudents: []
      });

      const result = await CourseService.deleteCourse(courseId, instructorId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
    });

    it('should reject deletion with invalid course ID', async () => {
      const result = await CourseService.deleteCourse('invalid-id', instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should reject deletion for non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439014';
      const result = await CourseService.deleteCourse(fakeId, instructorId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });

    it('should reject deletion with non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439015';
      const result = await CourseService.deleteCourse(courseId, fakeUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('publishCourse - Comprehensive Tests', () => {
    beforeEach(async () => {
      const course = await CourseModel.create({
        title: 'Course to Publish',
        description: 'This course will be published',
        code: 'PUBLISH101',
        credits: 3,
        level: 'beginner',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
        schedule: [],
        capacity: 30,
        enrolledStudents: [],
        tags: ['publish', 'test'],
        status: 'draft',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-05-01')
      });
      courseId = (course._id as any).toString();
    });

    it('should publish course successfully', async () => {
      const result = await CourseService.publishCourse(courseId, instructorId);

      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
      expect(result.course.status).toBe('published');
    });

    it('should allow admin to publish course', async () => {
      const result = await CourseService.publishCourse(courseId, adminId);

      expect(result.success).toBe(true);
      expect(result.course.status).toBe('published');
    });

    it('should reject publish by unauthorized user', async () => {
      const result = await CourseService.publishCourse(courseId, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to update this course');
    });
  });

  describe('archiveCourse - Comprehensive Tests', () => {
    beforeEach(async () => {
      const course = await CourseModel.create({
        title: 'Course to Archive',
        description: 'This course will be archived',
        code: 'ARCHIVE101',
        credits: 3,
        level: 'beginner',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
        schedule: [],
        capacity: 30,
        enrolledStudents: [],
        tags: ['archive', 'test'],
        status: 'published',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-05-01')
      });
      courseId = (course._id as any).toString();
    });

    it('should archive course successfully', async () => {
      const result = await CourseService.archiveCourse(courseId, instructorId);

      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
      expect(result.course.status).toBe('archived');
    });

    it('should allow admin to archive course', async () => {
      const result = await CourseService.archiveCourse(courseId, adminId);

      expect(result.success).toBe(true);
      expect(result.course.status).toBe('archived');
    });

    it('should reject archive by unauthorized user', async () => {
      const result = await CourseService.archiveCourse(courseId, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to update this course');
    });
  });

  describe('getCoursesByInstructor - Comprehensive Tests', () => {
    beforeEach(async () => {
      // Create multiple courses for the instructor
      await CourseModel.create({
        title: 'Instructor Course 1',
        description: 'First course by instructor',
        code: 'INST101',
        credits: 3,
        level: 'beginner',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
        schedule: [],
        capacity: 30,
        enrolledStudents: [],
        tags: ['instructor'],
        status: 'published',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-05-01')
      });

      await CourseModel.create({
        title: 'Instructor Course 2',
        description: 'Second course by instructor',
        code: 'INST102',
        credits: 4,
        level: 'intermediate',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 16, hoursPerWeek: 5, totalHours: 80 },
        schedule: [],
        capacity: 25,
        enrolledStudents: [],
        tags: ['instructor'],
        status: 'draft',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-07-01')
      });
    });

    it('should get all courses by instructor', async () => {
      const result = await CourseService.getCoursesByInstructor(instructorId);
      
      expect(result.success).toBe(true);
      expect(result.courses).toBeDefined();
      expect(result.courses!.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should return empty array for instructor with no courses', async () => {
      const result = await CourseService.getCoursesByInstructor(adminId);

      expect(result.success).toBe(true);
      expect(result.courses).toBeDefined();
      expect(result.courses!.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should reject invalid instructor ID format', async () => {
      const result = await CourseService.getCoursesByInstructor('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid instructor ID format');
    });
  });
});