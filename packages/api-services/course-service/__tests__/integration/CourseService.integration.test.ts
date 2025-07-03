// Path: packages/api-services/course-service/__tests__/integration/CourseService.integration.test.ts
import { CourseService } from '../../src/services/CourseService';
import { CourseModel, UserModel } from '@101-school/database-schemas';
import { CreateCourseData, CourseSearchFilters } from '@101-school/shared-utilities';
import mongoose from 'mongoose';

describe('CourseService - Integration Tests', () => {
  let instructorId: string;
  let instructor2Id: string;
  let studentId: string;
  let student2Id: string;
  let adminId: string;

  beforeEach(async () => {
    // Clean collections
    await CourseModel.deleteMany({});
    await UserModel.deleteMany({});

    // Create comprehensive test data
    const instructor1 = await UserModel.create({
      email: `instructor1-${Date.now()}@example.com`,
      password: 'hashedPassword',
      role: 'teacher',
      profile: { firstName: 'John', lastName: 'Smith' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    });

    const instructor2 = await UserModel.create({
      email: `instructor2-${Date.now()}@example.com`,
      password: 'hashedPassword',
      role: 'teacher',
      profile: { firstName: 'Jane', lastName: 'Doe' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    });

    const student1 = await UserModel.create({
      email: `student1-${Date.now()}@example.com`,
      password: 'hashedPassword',
      role: 'student',
      profile: { firstName: 'Alice', lastName: 'Johnson' },
      preferences: {
        language: 'en',
        notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    });

    const student2 = await UserModel.create({
      email: `student2-${Date.now()}@example.com`,
      password: 'hashedPassword',
      role: 'student',
      profile: { firstName: 'Bob', lastName: 'Williams' },
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

    instructorId = (instructor1._id as any).toString();
    instructor2Id = (instructor2._id as any).toString();
    studentId = (student1._id as any).toString();
    student2Id = (student2._id as any).toString();
    adminId = (admin._id as any).toString();
  });

  describe('Full Course Lifecycle Integration', () => {
    it('should handle complete course lifecycle: create -> publish -> enroll -> update -> archive', async () => {
      // Step 1: Create course
      const courseData: CreateCourseData = {
        title: 'Full Stack Web Development',
        description: 'Learn modern web development with React, Node.js, and MongoDB',
        code: 'FS101',
        credits: 6,
        level: 'intermediate',
        category: 'web-development',
        duration: {
          weeks: 20,
          hoursPerWeek: 6,
          totalHours: 120
        },
        schedule: [
          {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '12:00',
            location: 'Lab A1',
            type: 'lecture'
          },
          {
            dayOfWeek: 3,
            startTime: '14:00',
            endTime: '17:00',
            location: 'Lab A1',
            type: 'practical'
          }
        ],
        capacity: 30,
        tags: ['react', 'nodejs', 'mongodb', 'fullstack'],
        visibility: 'public',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        endDate: new Date(Date.now() + 170 * 24 * 60 * 60 * 1000), // 170 days from now
        prerequisites: ['Basic HTML/CSS', 'JavaScript Fundamentals']
      };

      const createResult = await CourseService.createCourse(courseData, instructorId);
      expect(createResult.success).toBe(true);
      expect(createResult.course.status).toBe('draft');
      
      const courseId = createResult.course._id.toString();

      // Step 2: Publish course
      const publishResult = await CourseService.publishCourse(courseId, instructorId);
      expect(publishResult.success).toBe(true);
      expect(publishResult.course.status).toBe('published');

      // Step 3: Enroll students
      const enrollment1 = await CourseService.enrollStudent(courseId, studentId);
      expect(enrollment1.success).toBe(true);
      expect(enrollment1.message).toBe('Student enrolled successfully');

      const enrollment2 = await CourseService.enrollStudent(courseId, student2Id);
      expect(enrollment2.success).toBe(true);

      // Step 4: Update course
      const updateResult = await CourseService.updateCourse(courseId, {
        description: 'Updated: Learn modern web development with React, Node.js, MongoDB, and Docker',
        tags: ['react', 'nodejs', 'mongodb', 'fullstack', 'docker']
      }, instructorId);
      expect(updateResult.success).toBe(true);
      expect(updateResult.course.description).toContain('Docker');

      // Step 5: Verify course state
      const getResult = await CourseService.getCourse(courseId);
      expect(getResult.success).toBe(true);
      expect(getResult.course.enrolledStudents).toHaveLength(2);
      expect(getResult.course.status).toBe('published');

      // Step 6: Archive course (should fail with enrollments)
      const archiveResult = await CourseService.archiveCourse(courseId, instructorId);
      expect(archiveResult.success).toBe(true); // Archive should succeed (different from delete)
      expect(archiveResult.course.status).toBe('archived');
    });

    it('should handle enrollment capacity limits and waitlisting', async () => {
      // Create course with small capacity
      const courseData: CreateCourseData = {
        title: 'Limited Capacity Course',
        description: 'A course with limited spots',
        code: 'LIMITED101',
        credits: 3,
        level: 'beginner',
        category: 'programming',
        duration: { weeks: 8, hoursPerWeek: 3, totalHours: 24 },
        schedule: [],
        capacity: 2, // Very small capacity
        tags: ['limited'],
        visibility: 'public',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 86 * 24 * 60 * 60 * 1000)
      };

      const createResult = await CourseService.createCourse(courseData, instructorId);
      expect(createResult.success).toBe(true);
      
      const courseId = createResult.course._id.toString();

      // Publish course
      await CourseService.publishCourse(courseId, instructorId);

      // Enroll first student - should succeed
      const enrollment1 = await CourseService.enrollStudent(courseId, studentId);
      expect(enrollment1.success).toBe(true);

      // Enroll second student - should succeed
      const enrollment2 = await CourseService.enrollStudent(courseId, student2Id);
      expect(enrollment2.success).toBe(true);

      // Try to enroll third student - should fail due to capacity
      const thirdStudent = await UserModel.create({
        email: `student3-${Date.now()}@example.com`,
        password: 'hashedPassword',
        role: 'student',
        profile: { firstName: 'Charlie', lastName: 'Brown' },
        preferences: {
          language: 'en',
          notifications: { email: true, push: true, sms: false, scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
          accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
        },
        isActive: true
      });

      const enrollment3 = await CourseService.enrollStudent(courseId, (thirdStudent._id as any).toString());
      expect(enrollment3.success).toBe(false);
      expect(enrollment3.message).toContain('capacity');
    });

    it('should prevent duplicate enrollments', async () => {
      // Create and publish course
      const courseData: CreateCourseData = {
        title: 'Duplicate Test Course',
        description: 'Testing duplicate enrollments',
        code: 'DUP101',
        credits: 3,
        level: 'beginner',
        category: 'programming',
        duration: { weeks: 8, hoursPerWeek: 3, totalHours: 24 },
        schedule: [],
        capacity: 30,
        tags: ['duplicate'],
        visibility: 'public',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 86 * 24 * 60 * 60 * 1000)
      };

      const createResult = await CourseService.createCourse(courseData, instructorId);
      expect(createResult.success).toBe(true);
      expect(createResult.course).toBeDefined();
      const courseId = createResult.course._id.toString();
      await CourseService.publishCourse(courseId, instructorId);

      // First enrollment - should succeed
      const enrollment1 = await CourseService.enrollStudent(courseId, studentId);
      expect(enrollment1.success).toBe(true);

      // Second enrollment of same student - should fail
      const enrollment2 = await CourseService.enrollStudent(courseId, studentId);
      expect(enrollment2.success).toBe(false);
      expect(enrollment2.message).toBe('Student is already enrolled in this course');
    });
  });

  describe('Search and Filter Integration', () => {
    beforeEach(async () => {
      // Clear existing courses first
      await CourseModel.deleteMany({});
      
      // Create diverse test courses
      const courses = [
        {
          title: 'JavaScript Fundamentals',
          description: 'Learn the basics of JavaScript programming',
          code: 'SEARCH_JS101',
          credits: 3,
          level: 'beginner',
          category: 'programming',
          instructor: instructorId,
          tags: ['javascript', 'programming', 'beginner'],
          status: 'published',
          capacity: 30,
          enrolledStudents: [studentId]
        },
        {
          title: 'Advanced Python Development',
          description: 'Master advanced Python concepts and frameworks',
          code: 'SEARCH_PY301',
          credits: 4,
          level: 'advanced',
          category: 'programming',
          instructor: instructor2Id,
          tags: ['python', 'programming', 'advanced'],
          status: 'published',
          capacity: 25,
          enrolledStudents: []
        },
        {
          title: 'UI/UX Design Principles',
          description: 'Learn user interface and user experience design',
          code: 'SEARCH_DES101',
          credits: 3,
          level: 'intermediate',
          category: 'design',
          instructor: instructorId,
          tags: ['design', 'ui', 'ux'],
          status: 'published',
          capacity: 20,
          enrolledStudents: [studentId, student2Id]
        },
        {
          title: 'Database Management Systems',
          description: 'Comprehensive guide to database design and management',
          code: 'SEARCH_DB201',
          credits: 4,
          level: 'intermediate',
          category: 'database',
          instructor: instructor2Id,
          tags: ['database', 'sql', 'management'],
          status: 'published',
          capacity: 35,
          enrolledStudents: []
        },
        {
          title: 'Draft Course',
          description: 'This course is still in draft',
          code: 'SEARCH_DRAFT',
          credits: 2,
          level: 'beginner',
          category: 'other',
          instructor: instructorId,
          tags: ['draft'],
          status: 'draft',
          capacity: 15,
          enrolledStudents: []
        }
      ];

      for (const courseData of courses) {
        await CourseModel.create({
          ...courseData,
          duration: { weeks: 12, hoursPerWeek: 3, totalHours: 36 },
          schedule: [],
          visibility: 'public',
          chapters: [],
          resources: [],
          assessments: [],
          isActive: true,
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 114 * 24 * 60 * 60 * 1000)
        });
      }
    });

    it('should search courses by title text', async () => {
      const filters: CourseSearchFilters = {};
      const result = await CourseService.searchCourses('JavaScript', filters);

      expect(result.success).toBe(true);
      expect(result.courses).toHaveLength(1);
      expect(result.courses![0].title).toContain('JavaScript');
    });

    it('should search courses by description text', async () => {
      const filters: CourseSearchFilters = {};
      const result = await CourseService.searchCourses('frameworks', filters);

      expect(result.success).toBe(true);
      expect(result.courses).toHaveLength(1);
      expect(result.courses![0].title).toContain('Python');
    });

    it('should filter courses by category', async () => {
      const filters: CourseSearchFilters = {
        category: 'programming'
      };
      const result = await CourseService.searchCourses('', filters);

      expect(result.success).toBe(true);
      expect(result.courses).toHaveLength(2); // Only published programming courses
      result.courses!.forEach(course => {
        expect((course as any).category).toBe('programming');
      });
    });

    it('should filter courses by level', async () => {
      const filters: CourseSearchFilters = {
        level: 'intermediate'
      };
      const result = await CourseService.searchCourses('', filters);

      expect(result.success).toBe(true);
      expect(result.courses).toHaveLength(2);
      result.courses!.forEach(course => {
        expect((course as any).level).toBe('intermediate');
      });
    });

    it('should filter courses by instructor', async () => {
      const filters: CourseSearchFilters = {
        instructor: instructorId
      };
      const result = await CourseService.searchCourses('', filters);

      expect(result.success).toBe(true);
      expect(result.courses).toHaveLength(2); // Only published courses by instructor1
    });

    it('should filter courses by tags', async () => {
      const filters: CourseSearchFilters = {
        tags: ['design']
      };
      const result = await CourseService.searchCourses('', filters);

      expect(result.success).toBe(true);
      expect(result.courses).toHaveLength(1);
      expect(result.courses![0].title).toContain('Design');
    });

    it('should filter courses by credits range', async () => {
      const filters: CourseSearchFilters = {
        minCredits: 4,
        maxCredits: 4
      };
      const result = await CourseService.searchCourses('', filters);

      expect(result.success).toBe(true);
      expect(result.courses).toHaveLength(2);
      result.courses!.forEach(course => {
        expect((course as any).credits).toBe(4);
      });
    });

    it('should filter courses with available spots', async () => {
      const filters: CourseSearchFilters = {
        hasAvailableSpots: true
      };
      const result = await CourseService.searchCourses('', filters);

      expect(result.success).toBe(true);
      expect(result.courses!.length).toBeGreaterThan(0);
      // All returned courses should have available spots
      result.courses!.forEach(course => {
        expect((course as any).enrolledStudents.length).toBeLessThan((course as any).capacity);
      });
    });

    it('should sort courses by title ascending', async () => {
      const filters: CourseSearchFilters = {
        sortBy: 'title',
        sortOrder: 'asc'
      };
      const result = await CourseService.searchCourses('', filters);

      expect(result.success).toBe(true);
      expect(result.courses!.length).toBeGreaterThan(1);
      
      // Check if sorted correctly
      for (let i = 1; i < result.courses!.length; i++) {
        expect(result.courses![i].title >= result.courses![i-1].title).toBe(true);
      }
    });

    it('should paginate results correctly', async () => {
      const filters: CourseSearchFilters = {
        limit: 2,
        offset: 0
      };
      const firstPage = await CourseService.searchCourses('', filters);

      expect(firstPage.success).toBe(true);
      expect(firstPage.courses!.length).toBeLessThanOrEqual(2);
      expect(firstPage.total).toBe(4); // 4 published courses
      expect(firstPage.pagination!.hasMore).toBe(true);

      // Get second page
      const secondPageFilters: CourseSearchFilters = {
        limit: 2,
        offset: 2
      };
      const secondPage = await CourseService.searchCourses('', secondPageFilters);

      expect(secondPage.success).toBe(true);
      expect(secondPage.courses!.length).toBeLessThanOrEqual(2);
      expect(secondPage.pagination!.hasMore).toBe(false);
    });

    it('should combine multiple filters', async () => {
      const filters: CourseSearchFilters = {
        category: 'programming',
        level: 'beginner',
        hasAvailableSpots: true
      };
      const result = await CourseService.searchCourses('', filters);

      expect(result.success).toBe(true);
      if (result.courses!.length > 0) {
        result.courses!.forEach(course => {
          expect((course as any).category).toBe('programming');
          expect((course as any).level).toBe('beginner');
          expect((course as any).enrolledStudents.length).toBeLessThan((course as any).capacity);
        });
      }
    });

    it('should include draft courses when status filter is specified', async () => {
      const filters: CourseSearchFilters = {
        status: 'draft'
      };
      const result = await CourseService.searchCourses('', filters);

      expect(result.success).toBe(true);
      expect(result.courses!.length).toBeGreaterThan(0);
      
      // Should include our test draft course
      const testDraftCourse = result.courses!.find(c => (c as any).title === 'Draft Course');
      expect(testDraftCourse).toBeDefined();
    });
  });

  describe('Statistics Integration', () => {
    beforeEach(async () => {
      // Create courses with different statuses and enrollments
      await CourseModel.create({
        title: 'Stats Course 1',
        description: 'First stats course',
        code: 'STATS101',
        credits: 3,
        level: 'beginner',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 12, hoursPerWeek: 3, totalHours: 36 },
        schedule: [],
        capacity: 30,
        enrolledStudents: [studentId, student2Id],
        tags: ['stats'],
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
        title: 'Stats Course 2',
        description: 'Second stats course',
        code: 'STATS102',
        credits: 4,
        level: 'intermediate',
        category: 'design',
        instructor: instructor2Id,
        duration: { weeks: 16, hoursPerWeek: 4, totalHours: 64 },
        schedule: [],
        capacity: 25,
        enrolledStudents: [studentId],
        tags: ['stats'],
        status: 'published',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-07-01')
      });

      await CourseModel.create({
        title: 'Draft Stats Course',
        description: 'Draft course for stats',
        code: 'STATSDRAFT',
        credits: 2,
        level: 'beginner',
        category: 'other',
        instructor: instructorId,
        duration: { weeks: 8, hoursPerWeek: 2, totalHours: 16 },
        schedule: [],
        capacity: 20,
        enrolledStudents: [],
        tags: ['stats'],
        status: 'draft',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-06-01')
      });
    });

    it('should return accurate course statistics', async () => {
      const result = await CourseService.getCourseStats();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats!.totalCourses).toBe(6); // 3 initial + 3 created in test
      expect(result.stats!.publishedCourses).toBe(2); // 2 published in test
      expect(result.stats!.totalEnrollments).toBe(3); // 2 + 1 + 0
      expect(result.stats!.topCategories).toBeDefined();
      expect(result.stats!.topInstructors).toBeDefined();
    });

    it('should include category statistics', async () => {
      const result = await CourseService.getCourseStats();

      expect(result.success).toBe(true);
      expect(result.stats!.topCategories.length).toBeGreaterThan(0);
      
      // Should include programming and design categories
      const categoryNames = result.stats!.topCategories.map(cat => cat.category);
      expect(categoryNames).toContain('programming');
      expect(categoryNames).toContain('design');
    });

    it('should include instructor statistics', async () => {
      const result = await CourseService.getCourseStats();

      expect(result.success).toBe(true);
      expect(result.stats!.topInstructors.length).toBeGreaterThan(0);
      
      // Should include both instructors
      const instructorIds = result.stats!.topInstructors.map(inst => inst.instructorId.toString());
      expect(instructorIds).toContain(instructorId);
      expect(instructorIds).toContain(instructor2Id);
    });
  });

  describe('Enrollment/Unenrollment Integration', () => {
    let courseId: string;

    beforeEach(async () => {
      // Create a published course for enrollment tests
      const course = await CourseModel.create({
        title: 'Enrollment Test Course',
        description: 'Course for testing enrollment features',
        code: 'ENROLL101',
        credits: 3,
        level: 'beginner',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 12, hoursPerWeek: 3, totalHours: 36 },
        schedule: [],
        capacity: 5,
        enrolledStudents: [],
        tags: ['enrollment'],
        status: 'published',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        endDate: new Date(Date.now() + 114 * 24 * 60 * 60 * 1000) // 114 days from now
      });
      courseId = (course._id as any).toString();
    });

    it('should handle enrollment and unenrollment cycle', async () => {
      // Enroll student
      const enrollResult = await CourseService.enrollStudent(courseId, studentId);
      expect(enrollResult.success).toBe(true);
      expect(enrollResult.message).toBe('Student enrolled successfully');

      // Verify enrollment
      const courseAfterEnroll = await CourseService.getCourse(courseId);
      expect(courseAfterEnroll.course.enrolledStudents).toHaveLength(1);

      // Unenroll student
      const unenrollResult = await CourseService.unenrollStudent(courseId, studentId);
      expect(unenrollResult.success).toBe(true);
      expect(unenrollResult.message).toBe('Student unenrolled successfully');

      // Verify unenrollment
      const courseAfterUnenroll = await CourseService.getCourse(courseId);
      expect(courseAfterUnenroll.course.enrolledStudents).toHaveLength(0);
    });

    it('should prevent enrollment in unpublished courses', async () => {
      // Change course to draft
      await CourseModel.findByIdAndUpdate(courseId, { status: 'draft' });

      const result = await CourseService.enrollStudent(courseId, studentId);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Course is not available for enrollment');
    });

    it('should prevent enrollment after course start date', async () => {
      // Change course start date to past
      await CourseModel.findByIdAndUpdate(courseId, { 
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      });

      const result = await CourseService.enrollStudent(courseId, studentId);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Enrollment period has ended');
    });

    it('should handle invalid student/course IDs in enrollment', async () => {
      // Invalid course ID
      const result1 = await CourseService.enrollStudent('invalid-id', studentId);
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Invalid ID format');

      // Invalid student ID
      const result2 = await CourseService.enrollStudent(courseId, 'invalid-id');
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Invalid ID format');

      // Non-existent course
      const fakeId = '507f1f77bcf86cd799439017';
      const result3 = await CourseService.enrollStudent(fakeId, studentId);
      expect(result3.success).toBe(false);
      expect(result3.error).toBe('Course not found');

      // Non-existent student
      const result4 = await CourseService.enrollStudent(courseId, fakeId);
      expect(result4.success).toBe(false);
      expect(result4.error).toBe('Student not found');
    });

    it('should handle unenrollment of non-enrolled student', async () => {
      const result = await CourseService.unenrollStudent(courseId, studentId);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Student is not enrolled in this course');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would typically involve mocking database errors
      // but in an integration test, we can test actual error scenarios
      
      // Test with malformed MongoDB ObjectId
      const result = await CourseService.getCourse('not-a-valid-object-id');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should handle concurrent enrollment attempts', async () => {
      // Create course with capacity of 1
      const course = await CourseModel.create({
        title: 'Concurrent Test',
        description: 'Testing concurrent enrollments',
        code: 'CONCURRENT101',
        credits: 1,
        level: 'beginner',
        category: 'programming',
        instructor: instructorId,
        duration: { weeks: 4, hoursPerWeek: 1, totalHours: 4 },
        schedule: [],
        capacity: 1,
        enrolledStudents: [],
        tags: ['concurrent'],
        status: 'published',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        isActive: true,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 58 * 24 * 60 * 60 * 1000)
      });

      const courseId = (course._id as any).toString();

      // Try to enroll both students simultaneously
      const [result1, result2] = await Promise.all([
        CourseService.enrollStudent(courseId, studentId),
        CourseService.enrollStudent(courseId, student2Id)
      ]);

      // One should succeed, one should fail
      const successfulEnrollments = [result1, result2].filter(r => r.success);
      const failedEnrollments = [result1, result2].filter(r => !r.success);

      expect(successfulEnrollments).toHaveLength(1);
      expect(failedEnrollments).toHaveLength(1);
    });
  });
});