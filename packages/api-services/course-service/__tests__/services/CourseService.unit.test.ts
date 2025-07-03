// Path: packages/api-services/course-service/__tests__/services/CourseService.unit.test.ts

// Mock all external dependencies
const mockCourseModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  deleteMany: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  findByInstructor: jest.fn()
};

const mockUserModel = {
  create: jest.fn(),
  findById: jest.fn(),
  deleteMany: jest.fn()
};

const mockValidationHelper = {
  validateSchema: jest.fn()
};

const mockErrorHelper = {
  handleServiceError: jest.fn()
};

const mockCreateCourseSchema = {};

const mockMongoose = {
  Types: {
    ObjectId: {
      isValid: jest.fn()
    }
  }
};

// Mock the imports
jest.mock('mongoose', () => mockMongoose);
jest.mock('@101-school/database-schemas', () => ({
  CourseModel: mockCourseModel,
  UserModel: mockUserModel
}));
jest.mock('@101-school/shared-utilities', () => ({
  ValidationHelper: mockValidationHelper,
  ErrorHelper: mockErrorHelper,
  createCourseSchema: mockCreateCourseSchema
}));

import { CourseService } from '../../src/services/CourseService';

describe('CourseService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should successfully create a course', async () => {
      // Arrange
      const courseData = {
        title: 'Test Course',
        description: 'Test Description',
        code: 'TEST101',
        credits: 3,
        level: 'beginner' as any,
        category: 'programming' as any,
        duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
        schedule: [],
        capacity: 30,
        visibility: 'public' as any,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-09-01')
      };

      const instructorId = 'instructor123';
      const mockInstructor = {
        _id: instructorId,
        role: 'teacher',
        profile: { firstName: 'John', lastName: 'Doe' },
        email: 'john@example.com'
      };

      const mockCourse = {
        _id: 'course123',
        ...courseData,
        instructor: instructorId
      };

      mockValidationHelper.validateSchema.mockReturnValue({ success: true });
      mockUserModel.findById.mockResolvedValue(mockInstructor);
      mockCourseModel.findOne.mockResolvedValue(null); // No existing course
      mockCourseModel.create.mockResolvedValue(mockCourse);

      // Act
      const result = await CourseService.createCourse(courseData, instructorId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.course).toEqual(mockCourse);
      expect(mockValidationHelper.validateSchema).toHaveBeenCalled();
      expect(mockUserModel.findById).toHaveBeenCalledWith(instructorId);
      expect(mockCourseModel.findOne).toHaveBeenCalledWith({ code: 'TEST101' });
      expect(mockCourseModel.create).toHaveBeenCalled();
    });

    it('should fail validation for invalid course data', async () => {
      // Arrange
      const invalidCourseData = {
        title: '',
        description: 'Test Description'
      };
      const instructorId = 'instructor123';

      mockValidationHelper.validateSchema.mockReturnValue({
        success: false,
        errors: ['Title is required']
      });

      // Act
      const result = await CourseService.createCourse(invalidCourseData as any, instructorId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
      expect(mockValidationHelper.validateSchema).toHaveBeenCalled();
    });

    it('should fail when instructor is not found', async () => {
      // Arrange
      const courseData = {
        title: 'Test Course',
        description: 'Test Description',
        code: 'TEST101'
      };
      const instructorId = 'nonexistent123';

      mockValidationHelper.validateSchema.mockReturnValue({ success: true });
      mockUserModel.findById.mockResolvedValue(null);

      // Act
      const result = await CourseService.createCourse(courseData as any, instructorId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Instructor not found');
    });

    it('should fail when instructor lacks permission', async () => {
      // Arrange
      const courseData = {
        title: 'Test Course',
        description: 'Test Description',
        code: 'TEST101'
      };
      const instructorId = 'student123';
      const mockStudent = {
        _id: instructorId,
        role: 'student'
      };

      mockValidationHelper.validateSchema.mockReturnValue({ success: true });
      mockUserModel.findById.mockResolvedValue(mockStudent);

      // Act
      const result = await CourseService.createCourse(courseData as any, instructorId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User does not have permission to create courses');
    });

    it('should fail when course code already exists', async () => {
      // Arrange
      const courseData = {
        title: 'Test Course',
        description: 'Test Description',
        code: 'TEST101'
      };
      const instructorId = 'instructor123';
      const mockInstructor = { role: 'teacher' };
      const existingCourse = { _id: 'existing123', code: 'TEST101' };

      mockValidationHelper.validateSchema.mockReturnValue({ success: true });
      mockUserModel.findById.mockResolvedValue(mockInstructor);
      mockCourseModel.findOne.mockResolvedValue(existingCourse);

      // Act
      const result = await CourseService.createCourse(courseData as any, instructorId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Course code already exists');
    });
  });

  describe('getCourse', () => {
    it('should successfully get a course by ID', async () => {
      // Arrange
      const courseId = 'course123';
      const mockCourse = {
        _id: courseId,
        title: 'Test Course',
        populate: jest.fn().mockReturnThis()
      };

      mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);
      mockCourseModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockCourse)
        })
      });

      // Act
      const result = await CourseService.getCourse(courseId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.course).toEqual(mockCourse);
      expect(mockMongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(courseId);
    });

    it('should fail for invalid course ID format', async () => {
      // Arrange
      const invalidId = 'invalid-id';

      mockMongoose.Types.ObjectId.isValid.mockReturnValue(false);

      // Act
      const result = await CourseService.getCourse(invalidId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid course ID format');
    });

    it('should fail when course is not found', async () => {
      // Arrange
      const courseId = 'nonexistent123';

      mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);
      mockCourseModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      // Act
      const result = await CourseService.getCourse(courseId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });
  });

  describe('enrollStudent', () => {
    it('should successfully enroll a student', async () => {
      // Arrange
      const courseId = 'course123';
      const studentId = 'student123';
      const mockCourse = {
        _id: courseId,
        canStudentEnroll: jest.fn().mockResolvedValue(true),
        enrollStudent: jest.fn().mockResolvedValue(true)
      };
      const mockStudent = { _id: studentId };

      mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);
      mockCourseModel.findById.mockResolvedValue(mockCourse);
      mockUserModel.findById.mockResolvedValue(mockStudent);

      // Act
      const result = await CourseService.enrollStudent(courseId, studentId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Student enrolled successfully');
      expect(mockCourse.canStudentEnroll).toHaveBeenCalledWith(studentId);
      expect(mockCourse.enrollStudent).toHaveBeenCalledWith(studentId);
    });

    it('should fail for invalid IDs', async () => {
      // Arrange
      const invalidCourseId = 'invalid';
      const studentId = 'student123';

      mockMongoose.Types.ObjectId.isValid.mockReturnValue(false);

      // Act
      const result = await CourseService.enrollStudent(invalidCourseId, studentId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid ID format');
    });

    it('should fail when course is not found', async () => {
      // Arrange
      const courseId = 'nonexistent123';
      const studentId = 'student123';

      mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);
      mockCourseModel.findById.mockResolvedValue(null);

      // Act
      const result = await CourseService.enrollStudent(courseId, studentId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Course not found');
    });

    it('should fail when student is not found', async () => {
      // Arrange
      const courseId = 'course123';
      const studentId = 'nonexistent123';
      const mockCourse = { _id: courseId };

      mockMongoose.Types.ObjectId.isValid.mockReturnValue(true);
      mockCourseModel.findById.mockResolvedValue(mockCourse);
      mockUserModel.findById.mockResolvedValue(null);

      // Act
      const result = await CourseService.enrollStudent(courseId, studentId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Student not found');
    });
  });

  describe('searchCourses', () => {
    it('should successfully search courses', async () => {
      // Arrange
      const query = 'JavaScript';
      const filters = { category: 'programming' as any };
      const mockCourses = [
        { _id: 'course1', title: 'JavaScript Basics' },
        { _id: 'course2', title: 'Advanced JavaScript' }
      ];

      mockCourseModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockResolvedValue(mockCourses)
            })
          })
        })
      });
      mockCourseModel.countDocuments.mockResolvedValue(2);

      // Act
      const result = await CourseService.searchCourses(query, filters);

      // Assert
      expect(result.success).toBe(true);
      expect(result.courses).toEqual(mockCourses);
      expect(result.total).toBe(2);
    });
  });

  describe('getCourseStats', () => {
    it('should successfully get course statistics', async () => {
      // Arrange
      const mockStats = [{ totalCourses: 10, publishedCourses: 8, totalEnrollments: 50 }];
      const mockCategoryStats = [{ _id: 'programming', count: 5 }];
      const mockInstructorStats = [{ _id: 'instructor1', courseCount: 3 }];

      mockCourseModel.aggregate
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockCategoryStats)
        .mockResolvedValueOnce(mockInstructorStats);

      // Act
      const result = await CourseService.getCourseStats();

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats!.totalCourses).toBe(10);
      expect(result.stats!.publishedCourses).toBe(8);
      expect(result.stats!.totalEnrollments).toBe(50);
    });
  });
});