// Comprehensive tests for new CourseService endpoints
import { CourseService } from '../../src/services/CourseService';
import { CourseModel, UserModel } from '@101-school/database-schemas';
import { CreateCourseData } from '@101-school/shared-utilities';
import mongoose from 'mongoose';

describe('CourseService - New Endpoints Comprehensive Tests', () => {
  let instructorId: string;
  let studentId: string;
  let adminId: string;
  let courseId: string;
  let enrolledCourseId: string;
  let fullCourseId: string;

  beforeEach(async () => {
    // Clean collections
    await CourseModel.deleteMany({});
    await UserModel.deleteMany({});

    // Create test users
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

    instructorId = (instructor._id as any).toString();
    studentId = (student._id as any).toString();
    adminId = (admin._id as any).toString();

    // Create test courses
    const course = await CourseModel.create({
      title: 'Available Course',
      description: 'Course with open enrollment',
      code: 'AVAIL101',
      credits: 3,
      level: 'beginner',
      category: 'programming',
      instructor: instructorId,
      duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
      schedule: [],
      capacity: 30,
      enrolledStudents: [],
      prerequisites: ['BASIC101'],
      tags: ['available'],
      status: 'published',
      visibility: 'public',
      chapters: [],
      resources: [],
      assessments: [],
      isActive: true,
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
      enrollmentDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
    });

    const enrolledCourse = await CourseModel.create({
      title: 'Enrolled Course',
      description: 'Course with student enrolled',
      code: 'ENR101',
      credits: 3,
      level: 'intermediate',
      category: 'design',
      instructor: instructorId,
      duration: { weeks: 8, hoursPerWeek: 3, totalHours: 24 },
      schedule: [],
      capacity: 20,
      enrolledStudents: [studentId],
      tags: ['enrolled'],
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

    const fullCourse = await CourseModel.create({
      title: 'Full Course',
      description: 'Course at capacity',
      code: 'FULL101',
      credits: 2,
      level: 'advanced',
      category: 'math',
      instructor: instructorId,
      duration: { weeks: 6, hoursPerWeek: 2, totalHours: 12 },
      schedule: [],
      capacity: 2,
      enrolledStudents: ['student1', 'student2'],
      tags: ['full'],
      status: 'published',
      visibility: 'public',
      chapters: [],
      resources: [],
      assessments: [],
      isActive: true,
      startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      enrollmentDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    });

    courseId = (course._id as any).toString();
    enrolledCourseId = (enrolledCourse._id as any).toString();
    fullCourseId = (fullCourse._id as any).toString();
  });

  describe('getEnrollmentStatus', () => {
    it('should return correct enrollment status for enrolled student', async () => {
      const result = await CourseService.getEnrollmentStatus(enrolledCourseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.enrolled).toBe(true);
      expect(result.data.waitlisted).toBe(false);
      expect(result.data.position).toBeNull();
      expect(result.data.enrollmentDate).toBeDefined();
    });

    it('should return correct enrollment status for non-enrolled student', async () => {
      const result = await CourseService.getEnrollmentStatus(courseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.enrolled).toBe(false);
      expect(result.data.waitlisted).toBe(false);
      expect(result.data.position).toBeNull();
      expect(result.data.enrollmentDate).toBeUndefined();
    });

    it('should handle invalid course ID format', async () => {
      const result = await CourseService.getEnrollmentStatus('invalid-id', studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should handle non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await CourseService.getEnrollmentStatus(fakeId, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });

    it('should handle empty course ID', async () => {
      const result = await CourseService.getEnrollmentStatus('', studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should handle null user ID', async () => {
      const result = await CourseService.getEnrollmentStatus(courseId, '');

      expect(result.success).toBe(true);
      expect(result.data.enrolled).toBe(false);
    });
  });

  describe('checkEnrollmentEligibility', () => {
    it('should return eligible for valid student and open course', async () => {
      const result = await CourseService.checkEnrollmentEligibility(courseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.eligible).toBe(true);
      expect(result.data.reason).toBeUndefined();
    });

    it('should return not eligible for already enrolled student', async () => {
      const result = await CourseService.checkEnrollmentEligibility(enrolledCourseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.eligible).toBe(false);
      expect(result.data.reason).toBe('Already enrolled in this course');
    });

    it('should return not eligible for full capacity course', async () => {
      const result = await CourseService.checkEnrollmentEligibility(fullCourseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.eligible).toBe(false);
      expect(result.data.reason).toBe('Course is at full capacity');
      expect(result.data.waitlistPosition).toBe(1);
    });

    it('should return not eligible for draft course', async () => {
      await CourseModel.findByIdAndUpdate(courseId, { status: 'draft' });
      const result = await CourseService.checkEnrollmentEligibility(courseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.eligible).toBe(false);
      expect(result.data.reason).toBe('Course is not currently available for enrollment');
    });

    it('should return not eligible for archived course', async () => {
      await CourseModel.findByIdAndUpdate(courseId, { status: 'archived' });
      const result = await CourseService.checkEnrollmentEligibility(courseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.eligible).toBe(false);
      expect(result.data.reason).toBe('Course is not currently available for enrollment');
    });

    it('should return not eligible for past enrollment deadline', async () => {
      await CourseModel.findByIdAndUpdate(courseId, {
        enrollmentDeadline: new Date('2020-01-01')
      });
      const result = await CourseService.checkEnrollmentEligibility(courseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.eligible).toBe(false);
      expect(result.data.reason).toBe('Enrollment deadline has passed');
    });

    it('should handle non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439012';
      const result = await CourseService.checkEnrollmentEligibility(courseId, fakeUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle invalid course ID format', async () => {
      const result = await CourseService.checkEnrollmentEligibility('invalid-id', studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should handle non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await CourseService.checkEnrollmentEligibility(fakeId, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });
  });

  describe('getCourseProgress', () => {
    it('should return progress for enrolled student', async () => {
      const result = await CourseService.getCourseProgress(enrolledCourseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data.completionPercentage).toBe('number');
      expect(result.data.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(result.data.completionPercentage).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.data.chaptersCompleted)).toBe(true);
      expect(Array.isArray(result.data.sectionsCompleted)).toBe(true);
      expect(Array.isArray(result.data.exercisesCompleted)).toBe(true);
      expect(typeof result.data.timeSpent).toBe('number');
      expect(result.data.lastAccessDate).toBeDefined();
    });

    it('should return error for non-enrolled student', async () => {
      const result = await CourseService.getCourseProgress(courseId, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is not enrolled in this course');
    });

    it('should handle invalid course ID', async () => {
      const result = await CourseService.getCourseProgress('invalid-id', studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should handle non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await CourseService.getCourseProgress(fakeId, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });
  });

  describe('updateCourseProgress', () => {
    const validProgressData = {
      chapterId: 'chapter1',
      sectionId: 'section1',
      completed: true,
      timeSpent: 60
    };

    it('should update progress for enrolled student', async () => {
      const result = await CourseService.updateCourseProgress(enrolledCourseId, studentId, validProgressData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.message).toBe('Progress updated successfully');
      expect(result.data.updatedAt).toBeDefined();
    });

    it('should handle progress update with minimal data', async () => {
      const minimalData = { completed: true };
      const result = await CourseService.updateCourseProgress(enrolledCourseId, studentId, minimalData);

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Progress updated successfully');
    });

    it('should handle progress update with exercise completion', async () => {
      const exerciseData = {
        exerciseId: 'exercise1',
        completed: true,
        timeSpent: 30
      };
      const result = await CourseService.updateCourseProgress(enrolledCourseId, studentId, exerciseData);

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Progress updated successfully');
    });

    it('should return error for non-enrolled student', async () => {
      const result = await CourseService.updateCourseProgress(courseId, studentId, validProgressData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is not enrolled in this course');
    });

    it('should handle invalid course ID', async () => {
      const result = await CourseService.updateCourseProgress('invalid-id', studentId, validProgressData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should handle non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await CourseService.updateCourseProgress(fakeId, studentId, validProgressData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });
  });

  describe('getCourseFeedback', () => {
    it('should return feedback for existing course', async () => {
      const result = await CourseService.getCourseFeedback(courseId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data.averageRating).toBe('number');
      expect(result.data.averageRating).toBeGreaterThanOrEqual(0);
      expect(result.data.averageRating).toBeLessThanOrEqual(5);
      expect(typeof result.data.totalReviews).toBe('number');
      expect(result.data.totalReviews).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.data.feedback)).toBe(true);
    });

    it('should return feedback with proper structure', async () => {
      const result = await CourseService.getCourseFeedback(courseId);

      expect(result.success).toBe(true);
      if (result.data.feedback.length > 0) {
        const feedback = result.data.feedback[0];
        expect(typeof feedback.rating).toBe('number');
        expect(feedback.rating).toBeGreaterThanOrEqual(1);
        expect(feedback.rating).toBeLessThanOrEqual(5);
        expect(typeof feedback.anonymous).toBe('boolean');
        expect(feedback.date).toBeDefined();
      }
    });

    it('should handle invalid course ID', async () => {
      const result = await CourseService.getCourseFeedback('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should handle non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await CourseService.getCourseFeedback(fakeId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });
  });

  describe('submitCourseFeedback', () => {
    const validFeedbackData = {
      rating: 5,
      comment: 'Excellent course with great content!',
      anonymous: false
    };

    it('should submit feedback for enrolled student', async () => {
      const result = await CourseService.submitCourseFeedback(enrolledCourseId, studentId, validFeedbackData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.message).toBe('Feedback submitted successfully');
      expect(result.data.submittedAt).toBeDefined();
    });

    it('should submit anonymous feedback', async () => {
      const anonymousFeedback = { ...validFeedbackData, anonymous: true };
      const result = await CourseService.submitCourseFeedback(enrolledCourseId, studentId, anonymousFeedback);

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Feedback submitted successfully');
    });

    it('should submit feedback without comment', async () => {
      const feedbackData = { rating: 4, anonymous: false };
      const result = await CourseService.submitCourseFeedback(enrolledCourseId, studentId, feedbackData);

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Feedback submitted successfully');
    });

    it('should validate rating range - too high', async () => {
      const invalidFeedback = { ...validFeedbackData, rating: 6 };
      const result = await CourseService.submitCourseFeedback(enrolledCourseId, studentId, invalidFeedback);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rating must be between 1 and 5');
    });

    it('should validate rating range - too low', async () => {
      const invalidFeedback = { ...validFeedbackData, rating: 0 };
      const result = await CourseService.submitCourseFeedback(enrolledCourseId, studentId, invalidFeedback);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rating must be between 1 and 5');
    });

    it('should validate missing rating', async () => {
      const invalidFeedback = { comment: 'Missing rating' };
      const result = await CourseService.submitCourseFeedback(enrolledCourseId, studentId, invalidFeedback);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rating must be between 1 and 5');
    });

    it('should return error for non-enrolled student', async () => {
      const result = await CourseService.submitCourseFeedback(courseId, studentId, validFeedbackData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only enrolled students can submit feedback');
    });

    it('should handle invalid course ID', async () => {
      const result = await CourseService.submitCourseFeedback('invalid-id', studentId, validFeedbackData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should handle non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await CourseService.submitCourseFeedback(fakeId, studentId, validFeedbackData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });
  });

  describe('getCoursePrerequisites', () => {
    beforeEach(async () => {
      // Create a prerequisite course
      await CourseModel.create({
        title: 'Basic Programming',
        description: 'Basic programming concepts',
        code: 'BASIC101',
        credits: 2,
        level: 'beginner',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 8, hoursPerWeek: 3, totalHours: 24 },
        schedule: [],
        capacity: 50,
        enrolledStudents: [],
        tags: ['basic'],
        status: 'published',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-01')
      });
    });

    it('should return prerequisites for course with user ID', async () => {
      const result = await CourseService.getCoursePrerequisites(courseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.prerequisites)).toBe(true);
      expect(Array.isArray(result.data.completed)).toBe(true);
      expect(Array.isArray(result.data.missing)).toBe(true);
      expect(result.data.prerequisites.length).toBe(1);
      expect(result.data.prerequisites[0].code).toBe('BASIC101');
      expect(result.data.missing.length).toBe(1);
      expect(result.data.missing[0]).toBe('BASIC101');
    });

    it('should return prerequisites for course without user ID', async () => {
      const result = await CourseService.getCoursePrerequisites(courseId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.prerequisites)).toBe(true);
      expect(Array.isArray(result.data.completed)).toBe(true);
      expect(Array.isArray(result.data.missing)).toBe(true);
      expect(result.data.prerequisites.length).toBe(1);
    });

    it('should handle course with no prerequisites', async () => {
      const result = await CourseService.getCoursePrerequisites(enrolledCourseId, studentId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.prerequisites.length).toBe(0);
      expect(result.data.completed.length).toBe(0);
      expect(result.data.missing.length).toBe(0);
    });

    it('should handle invalid course ID', async () => {
      const result = await CourseService.getCoursePrerequisites('invalid-id', studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should handle non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await CourseService.getCoursePrerequisites(fakeId, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });
  });

  describe('getEnrolledCourses', () => {
    it('should return enrolled courses for student', async () => {
      const result = await CourseService.getEnrolledCourses(studentId);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.courses)).toBe(true);
      expect(result.total).toBe(1);
      expect(result.courses![0].title).toBe('Enrolled Course');
      expect(result.courses![0].code).toBe('ENR101');
    });

    it('should return empty array for user with no enrollments', async () => {
      const result = await CourseService.getEnrolledCourses(adminId);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.courses)).toBe(true);
      expect(result.courses!.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should not return inactive courses', async () => {
      // Deactivate the enrolled course
      await CourseModel.findByIdAndUpdate(enrolledCourseId, { isActive: false });

      const result = await CourseService.getEnrolledCourses(studentId);

      expect(result.success).toBe(true);
      expect(result.courses!.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should handle non-existent user ID', async () => {
      const fakeUserId = '507f1f77bcf86cd799439012';
      const result = await CourseService.getEnrolledCourses(fakeUserId);

      expect(result.success).toBe(true);
      expect(result.courses!.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getCategories', () => {
    it('should return distinct course categories', async () => {
      const result = await CourseService.getCategories();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.categories)).toBe(true);
      expect(result.data.categories.length).toBeGreaterThan(0);
      expect(result.data.categories).toContain('programming');
      expect(result.data.categories).toContain('design');
      expect(result.data.categories).toContain('math');
    });

    it('should return sorted categories', async () => {
      const result = await CourseService.getCategories();

      expect(result.success).toBe(true);
      const categories = result.data.categories;
      const sortedCategories = [...categories].sort();
      expect(categories).toEqual(sortedCategories);
    });

    it('should only include categories from active courses', async () => {
      // Create an inactive course with a unique category
      await CourseModel.create({
        title: 'Inactive Course',
        description: 'This course is inactive',
        code: 'INACTIVE101',
        credits: 1,
        level: 'beginner',
        category: 'inactive-category',
        instructor: instructorId,
        duration: { weeks: 1, hoursPerWeek: 1, totalHours: 1 },
        schedule: [],
        capacity: 10,
        enrolledStudents: [],
        tags: [],
        status: 'published',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: false,
        startDate: new Date(),
        endDate: new Date()
      });

      const result = await CourseService.getCategories();

      expect(result.success).toBe(true);
      expect(result.data.categories).not.toContain('inactive-category');
    });
  });

  describe('getLevels', () => {
    it('should return predefined course levels', async () => {
      const result = await CourseService.getLevels();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data.levels)).toBe(true);
      expect(result.data.levels).toEqual(['beginner', 'intermediate', 'advanced', 'expert']);
    });

    it('should always return the same levels regardless of database state', async () => {
      // Clear all courses from database
      await CourseModel.deleteMany({});

      const result = await CourseService.getLevels();

      expect(result.success).toBe(true);
      expect(result.data.levels).toEqual(['beginner', 'intermediate', 'advanced', 'expert']);
    });
  });

  describe('exportCourseData', () => {
    it('should export course data as JSON for instructor', async () => {
      const result = await CourseService.exportCourseData(courseId, instructorId, 'json');

      expect(result.success).toBe(true);
      expect(result.contentType).toBe('application/json');
      expect(result.filename).toContain('AVAIL101');
      expect(result.filename).toContain('.json');
      expect(typeof result.data).toBe('string');

      const parsedData = JSON.parse(result.data!);
      expect(parsedData.title).toBe('Available Course');
      expect(parsedData.code).toBe('AVAIL101');
      expect(parsedData.instructor).toBeDefined();
      expect(parsedData.exportedAt).toBeDefined();
    });

    it('should export course data as CSV for instructor', async () => {
      const result = await CourseService.exportCourseData(courseId, instructorId, 'csv');

      expect(result.success).toBe(true);
      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toContain('AVAIL101');
      expect(result.filename).toContain('.csv');
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('title,description,code');
      expect(result.data).toContain('Available Course');
    });

    it('should allow admin to export any course', async () => {
      const result = await CourseService.exportCourseData(courseId, adminId, 'json');

      expect(result.success).toBe(true);
      expect(result.contentType).toBe('application/json');
    });

    it('should return error for unsupported format', async () => {
      const result = await CourseService.exportCourseData(courseId, instructorId, 'pdf');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported export format. Use json or csv.');
    });

    it('should return error for unauthorized user', async () => {
      const result = await CourseService.exportCourseData(courseId, studentId, 'json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to export course data');
    });

    it('should handle invalid course ID', async () => {
      const result = await CourseService.exportCourseData('invalid-id', instructorId, 'json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should handle non-existent course', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await CourseService.exportCourseData(fakeId, instructorId, 'json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });

    it('should handle non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439012';
      const result = await CourseService.exportCourseData(courseId, fakeUserId, 'json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('importCourseData', () => {
    const mockJsonFile = {
      originalname: 'course-data.json',
      mimetype: 'application/json',
      size: 1024,
      buffer: Buffer.from('{"title": "Imported Course"}')
    };

    const mockCsvFile = {
      originalname: 'course-data.csv',
      mimetype: 'text/csv',
      size: 512,
      buffer: Buffer.from('title,description\nImported Course,Test Description')
    };

    it('should handle import request from instructor', async () => {
      const result = await CourseService.importCourseData(mockJsonFile, instructorId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain('not yet implemented');
      expect(result.data.filename).toBe('course-data.json');
      expect(result.data.importedAt).toBeDefined();
    });

    it('should handle import request from admin', async () => {
      const result = await CourseService.importCourseData(mockJsonFile, adminId);

      expect(result.success).toBe(true);
      expect(result.data.message).toContain('not yet implemented');
    });

    it('should handle CSV file import', async () => {
      const result = await CourseService.importCourseData(mockCsvFile, instructorId);

      expect(result.success).toBe(true);
      expect(result.data.filename).toBe('course-data.csv');
    });

    it('should return error for unauthorized user', async () => {
      const result = await CourseService.importCourseData(mockJsonFile, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to import course data');
    });

    it('should handle non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439012';
      const result = await CourseService.importCourseData(mockJsonFile, fakeUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock a database error
      const originalFind = CourseModel.findById;
      CourseModel.findById = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const result = await CourseService.getEnrollmentStatus(courseId, studentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get enrollment status');

      // Restore original method
      CourseModel.findById = originalFind;
    });

    it('should handle null/undefined parameters safely', async () => {
      const result = await CourseService.getCourseProgress('', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should validate MongoDB ObjectId format properly', async () => {
      const invalidIds = ['123', 'invalid', '', null, undefined];

      for (const invalidId of invalidIds) {
        const result = await CourseService.getEnrollmentStatus(invalidId as any, studentId);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid course ID format');
      }
    });

    it('should handle concurrent enrollment checks', async () => {
      // Simulate multiple concurrent enrollment eligibility checks
      const promises = Array.from({ length: 5 }, () =>
        CourseService.checkEnrollmentEligibility(courseId, studentId)
      );

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data.eligible).toBe(true);
      });
    });

    it('should handle large progress data objects', async () => {
      const largeProgressData = {
        chapterId: 'chapter1',
        sectionId: 'section1',
        completed: true,
        timeSpent: 120,
        metadata: {
          userAgent: 'Mozilla/5.0...',
          sessionId: 'session123',
          additionalData: Array.from({ length: 100 }, (_, i) => `data${i}`)
        }
      };

      const result = await CourseService.updateCourseProgress(enrolledCourseId, studentId, largeProgressData);

      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Progress updated successfully');
    });
  });
});