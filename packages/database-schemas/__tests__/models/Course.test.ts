import { CourseModel, Course } from '../../src/models/Course';
import { Database } from '../../src/connection/database';
import { CourseLevel, CourseCategory, CourseStatus } from '@101-school/shared-utilities';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('Course Model', () => {
  let mongoServer: MongoMemoryServer;
  let mongoUri: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await Database.connect(mongoUri);
  });

  afterAll(async () => {
    await Database.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await CourseModel.deleteMany({});
  });

  describe('Schema Validation', () => {
    const validCourseData = {
      title: 'Introduction to JavaScript',
      description: 'Learn the fundamentals of JavaScript programming',
      code: 'JS101',
      credits: 3,
      level: 'beginner' as CourseLevel,
      category: 'programming' as CourseCategory,
      instructor: 'instructor-id-123',
      instructorInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@school.com'
      },
      duration: {
        weeks: 8,
        hoursPerWeek: 3,
        totalHours: 24
      },
      schedule: [{
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '12:00',
        location: 'Room A101',
        type: 'lecture'
      }],
      capacity: 25,
      enrolledStudents: [],
      prerequisites: [],
      tags: ['javascript', 'programming', 'beginner'],
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-03-30')
    };

    it('should create course with valid data', async () => {
      const course = new CourseModel(validCourseData);
      const savedCourse = await course.save();
      
      expect(savedCourse._id).toBeDefined();
      expect(savedCourse.title).toBe('Introduction to JavaScript');
      expect(savedCourse.code).toBe('JS101');
      expect(savedCourse.level).toBe('beginner');
      expect(savedCourse.category).toBe('programming');
      expect(savedCourse.status).toBe('draft'); // Default value
      expect(savedCourse.visibility).toBe('public'); // Default value
      expect(savedCourse.isActive).toBe(true); // Default value
    });

    it('should fail validation for missing required fields', async () => {
      const invalidCourse = new CourseModel({});
      
      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should fail validation for invalid title', async () => {
      const invalidCourse = new CourseModel({
        ...validCourseData,
        title: 'A'.repeat(201) // Too long
      });
      
      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should fail validation for invalid description', async () => {
      const invalidCourse = new CourseModel({
        ...validCourseData,
        description: 'A'.repeat(2001) // Too long
      });
      
      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should fail validation for invalid course code', async () => {
      const invalidCourse = new CourseModel({
        ...validCourseData,
        code: 'invalid-code!' // Invalid format
      });
      
      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should fail validation for invalid credits', async () => {
      const invalidCourse = new CourseModel({
        ...validCourseData,
        credits: 0 // Below minimum
      });
      
      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should fail validation for invalid level', async () => {
      const invalidCourse = new CourseModel({
        ...validCourseData,
        level: 'invalid-level' as CourseLevel
      });
      
      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should fail validation for invalid category', async () => {
      const invalidCourse = new CourseModel({
        ...validCourseData,
        category: 'invalid-category' as CourseCategory
      });
      
      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should fail validation for invalid capacity', async () => {
      const invalidCourse = new CourseModel({
        ...validCourseData,
        capacity: 0 // Below minimum
      });
      
      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should fail validation for invalid schedule time format', async () => {
      const invalidCourse = new CourseModel({
        ...validCourseData,
        schedule: [{
          dayOfWeek: 1,
          startTime: '25:00', // Invalid time
          endTime: '12:00',
          location: 'Room A101',
          type: 'lecture'
        }]
      });
      
      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should fail validation for invalid day of week', async () => {
      const invalidCourse = new CourseModel({
        ...validCourseData,
        schedule: [{
          dayOfWeek: 8, // Invalid day (0-6 allowed)
          startTime: '09:00',
          endTime: '12:00',
          location: 'Room A101',
          type: 'lecture'
        }]
      });
      
      await expect(invalidCourse.save()).rejects.toThrow();
    });

    it('should enforce unique course code', async () => {
      const course1 = new CourseModel(validCourseData);
      await course1.save();
      
      const course2 = new CourseModel({
        ...validCourseData,
        title: 'Advanced JavaScript',
        code: 'JS101' // Duplicate code
      });
      
      await expect(course2.save()).rejects.toThrow();
    });

    it('should validate end date after start date', async () => {
      const invalidCourse = new CourseModel({
        ...validCourseData,
        startDate: new Date('2024-03-30'),
        endDate: new Date('2024-02-01') // End before start
      });
      
      await expect(invalidCourse.save()).rejects.toThrow('End date must be after start date');
    });
  });

  describe('Virtuals', () => {
    let course: Course;

    beforeEach(async () => {
      course = new CourseModel({
        title: 'Test Course',
        description: 'Test description',
        code: 'TEST101',
        credits: 3,
        level: 'beginner' as CourseLevel,
        category: 'programming' as CourseCategory,
        instructor: 'instructor-id',
        duration: {
          weeks: 4,
          hoursPerWeek: 2,
          totalHours: 8
        },
        capacity: 10,
        enrolledStudents: ['student1', 'student2', 'student3'],
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-03-01'),
        status: 'published' as CourseStatus
      });
      await course.save();
    });

    it('should calculate enrollment count correctly', () => {
      expect(course.enrollmentCount).toBe(3);
    });

    it('should calculate available spots correctly', () => {
      expect(course.availableSpots).toBe(7);
    });

    it('should determine enrollment open status correctly', () => {
      const now = new Date();
      const futureCourse = new CourseModel({
        title: 'Future Course',
        description: 'Future description',
        code: 'FUTURE101',
        credits: 3,
        level: 'beginner' as CourseLevel,
        category: 'programming' as CourseCategory,
        instructor: 'instructor-id',
        duration: {
          weeks: 4,
          hoursPerWeek: 2,
          totalHours: 8
        },
        capacity: 10,
        enrolledStudents: [],
        startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        status: 'published' as CourseStatus,
        isActive: true
      });
      
      expect(futureCourse.isEnrollmentOpen).toBe(true);
    });
  });

  describe('Instance Methods', () => {
    let course: Course;

    beforeEach(async () => {
      course = new CourseModel({
        title: 'Test Course',
        description: 'Test description',
        code: 'TEST101',
        credits: 3,
        level: 'beginner' as CourseLevel,
        category: 'programming' as CourseCategory,
        instructor: 'instructor-id',
        duration: {
          weeks: 4,
          hoursPerWeek: 2,
          totalHours: 8
        },
        capacity: 3,
        enrolledStudents: ['student1', 'student2'],
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-03-01'),
        status: 'published' as CourseStatus
      });
      await course.save();
    });

    describe('enrollStudent', () => {
      it('should enroll a new student successfully', async () => {
        const result = await course.enrollStudent('student3');
        expect(result).toBe(true);
        expect(course.enrolledStudents).toContain('student3');
        expect(course.enrolledStudents.length).toBe(3);
      });

      it('should not enroll already enrolled student', async () => {
        const result = await course.enrollStudent('student1');
        expect(result).toBe(false);
        expect(course.enrolledStudents.length).toBe(2);
      });

      it('should not enroll when course is at capacity', async () => {
        await course.enrollStudent('student3'); // Fill to capacity
        const result = await course.enrollStudent('student4');
        expect(result).toBe(false);
        expect(course.enrolledStudents.length).toBe(3);
      });
    });

    describe('unenrollStudent', () => {
      it('should unenroll enrolled student successfully', async () => {
        const result = await course.unenrollStudent('student1');
        expect(result).toBe(true);
        expect(course.enrolledStudents).not.toContain('student1');
        expect(course.enrolledStudents.length).toBe(1);
      });

      it('should not unenroll non-enrolled student', async () => {
        const result = await course.unenrollStudent('student3');
        expect(result).toBe(false);
        expect(course.enrolledStudents.length).toBe(2);
      });
    });

    describe('hasCapacity', () => {
      it('should return true when course has capacity', () => {
        expect(course.hasCapacity()).toBe(true);
      });

      it('should return false when course is at capacity', async () => {
        await course.enrollStudent('student3');
        expect(course.hasCapacity()).toBe(false);
      });
    });

    describe('getEnrollmentCount', () => {
      it('should return correct enrollment count', () => {
        expect(course.getEnrollmentCount()).toBe(2);
      });
    });

    describe('isStudentEnrolled', () => {
      it('should return true for enrolled student', () => {
        expect(course.isStudentEnrolled('student1')).toBe(true);
      });

      it('should return false for non-enrolled student', () => {
        expect(course.isStudentEnrolled('student3')).toBe(false);
      });
    });

    describe('canStudentEnroll', () => {
      it('should return true when student can enroll', async () => {
        const futureCourse = new CourseModel({
          title: 'Future Course',
          description: 'Future description',
          code: 'FUTURE101',
          credits: 3,
          level: 'beginner' as CourseLevel,
          category: 'programming' as CourseCategory,
          instructor: 'instructor-id',
          duration: {
            weeks: 4,
            hoursPerWeek: 2,
            totalHours: 8
          },
          capacity: 10,
          enrolledStudents: [],
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          status: 'published' as CourseStatus,
          isActive: true
        });
        
        const result = await futureCourse.canStudentEnroll('new-student');
        expect(result).toBe(true);
      });

      it('should return false when student is already enrolled', async () => {
        const result = await course.canStudentEnroll('student1');
        expect(result).toBe(false);
      });

      it('should return false when course is at capacity', async () => {
        await course.enrollStudent('student3');
        const result = await course.canStudentEnroll('student4');
        expect(result).toBe(false);
      });

      it('should return false when course is not published', async () => {
        course.status = 'draft';
        await course.save();
        const result = await course.canStudentEnroll('student3');
        expect(result).toBe(false);
      });

      it('should return false when course is not active', async () => {
        course.isActive = false;
        await course.save();
        const result = await course.canStudentEnroll('student3');
        expect(result).toBe(false);
      });
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test courses
      const courses = [
        {
          title: 'JavaScript Basics',
          description: 'Basic JavaScript course',
          code: 'JS101',
          credits: 3,
          level: 'beginner' as CourseLevel,
          category: 'programming' as CourseCategory,
          instructor: 'instructor1',
          duration: { weeks: 4, hoursPerWeek: 2, totalHours: 8 },
          capacity: 10,
          enrolledStudents: ['student1', 'student2'],
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-03-01'),
          status: 'published' as CourseStatus,
          isActive: true
        },
        {
          title: 'Python Advanced',
          description: 'Advanced Python course',
          code: 'PY201',
          credits: 4,
          level: 'advanced' as CourseLevel,
          category: 'programming' as CourseCategory,
          instructor: 'instructor2',
          duration: { weeks: 6, hoursPerWeek: 3, totalHours: 18 },
          capacity: 15,
          enrolledStudents: ['student3', 'student4', 'student5'],
          startDate: new Date('2024-02-15'),
          endDate: new Date('2024-04-01'),
          status: 'published' as CourseStatus,
          isActive: true
        },
        {
          title: 'Web Design',
          description: 'Basic web design course',
          code: 'WD101',
          credits: 2,
          level: 'beginner' as CourseLevel,
          category: 'design' as CourseCategory,
          instructor: 'instructor1',
          duration: { weeks: 3, hoursPerWeek: 2, totalHours: 6 },
          capacity: 8,
          enrolledStudents: [],
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-03-22'),
          status: 'draft' as CourseStatus,
          isActive: true
        }
      ];

      await CourseModel.insertMany(courses);
    });

    describe('findByInstructor', () => {
      it('should find courses by instructor', async () => {
        const courses = await CourseModel.findByInstructor('instructor1');
        expect(courses).toHaveLength(2);
        expect(courses.every(c => c.instructor === 'instructor1')).toBe(true);
      });
    });

    describe('findByCategory', () => {
      it('should find courses by category', async () => {
        const courses = await CourseModel.findByCategory('programming');
        expect(courses).toHaveLength(2);
        expect(courses.every(c => c.category === 'programming')).toBe(true);
      });
    });

    describe('findByLevel', () => {
      it('should find courses by level', async () => {
        const courses = await CourseModel.findByLevel('beginner');
        expect(courses).toHaveLength(1); // Only published beginner courses
        expect(courses.every(c => c.level === 'beginner')).toBe(true);
      });
    });

    describe('findPublished', () => {
      it('should find only published courses', async () => {
        const courses = await CourseModel.findPublished();
        expect(courses).toHaveLength(2);
        expect(courses.every(c => c.status === 'published')).toBe(true);
      });
    });

    describe('findWithAvailableSpots', () => {
      it('should find courses with available spots', async () => {
        const courses = await CourseModel.findWithAvailableSpots();
        expect(courses).toHaveLength(2);
        expect(courses.every(c => c.enrolledStudents.length < c.capacity)).toBe(true);
      });
    });

    describe('searchCourses', () => {
      it('should search courses by text', async () => {
        const courses = await CourseModel.searchCourses('JavaScript');
        expect(courses).toHaveLength(1);
        expect(courses[0].title).toContain('JavaScript');
      });
    });

    describe('getPopularCourses', () => {
      it('should get popular courses by enrollment', async () => {
        const courses = await CourseModel.getPopularCourses(5);
        expect(courses).toHaveLength(2);
        expect(courses[0].enrollmentCount).toBeGreaterThanOrEqual(courses[1].enrollmentCount);
      });
    });

    describe('getCourseStats', () => {
      it('should get course statistics', async () => {
        const stats = await CourseModel.getCourseStats();
        expect(stats).toHaveLength(1);
        expect(stats[0].totalCourses).toBe(3);
        expect(stats[0].publishedCourses).toBe(2);
        expect(stats[0].totalEnrollments).toBe(5);
      });
    });
  });

  describe('Middleware', () => {
    it('should calculate total hours on save', async () => {
      const course = new CourseModel({
        title: 'Test Course',
        description: 'Test description',
        code: 'TEST101',
        credits: 3,
        level: 'beginner' as CourseLevel,
        category: 'programming' as CourseCategory,
        instructor: 'instructor-id',
        duration: {
          weeks: 4,
          hoursPerWeek: 3,
          totalHours: 0 // Will be calculated
        },
        capacity: 10,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-03-01')
      });
      
      await course.save();
      expect(course.duration.totalHours).toBe(12); // 4 weeks * 3 hours/week
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle chapter and resource creation', async () => {
      const course = new CourseModel({
        title: 'Complex Course',
        description: 'Course with chapters and resources',
        code: 'COMPLEX101',
        credits: 5,
        level: 'intermediate' as CourseLevel,
        category: 'programming' as CourseCategory,
        instructor: 'instructor-id',
        duration: {
          weeks: 8,
          hoursPerWeek: 4,
          totalHours: 32
        },
        capacity: 20,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-04-01'),
        chapters: [{
          title: 'Introduction',
          description: 'Course introduction',
          order: 1,
          sections: [{
            title: 'Getting Started',
            description: 'How to get started',
            order: 1,
            content: [{
              type: 'text',
              title: 'Welcome',
              data: 'Welcome to the course',
              order: 1
            }],
            exercises: [{
              title: 'First Exercise',
              description: 'Your first exercise',
              type: 'quiz',
              difficulty: 'easy',
              points: 10,
              instructions: 'Complete this quiz',
              hints: ['Read the material first']
            }],
            estimatedDuration: 30
          }],
          isRequired: true,
          estimatedDuration: 60
        }],
        resources: [{
          title: 'Course Manual',
          description: 'Main course manual',
          type: 'document',
          url: 'https://example.com/manual.pdf',
          isRequired: true,
          order: 1
        }],
        assessments: [{
          title: 'Midterm Exam',
          description: 'Midterm examination',
          type: 'exam',
          weight: 40,
          maxScore: 100,
          instructions: 'Complete all questions',
          isRequired: true
        }]
      });
      
      const savedCourse = await course.save();
      expect(savedCourse.chapters).toHaveLength(1);
      expect(savedCourse.chapters[0].sections).toHaveLength(1);
      expect(savedCourse.resources).toHaveLength(1);
      expect(savedCourse.assessments).toHaveLength(1);
    });
  });
});