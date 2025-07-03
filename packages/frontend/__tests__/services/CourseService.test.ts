import CourseService, { User, ApiResponse, PaginatedResponse } from '../../src/services/CourseService';
import { Course, CreateCourseData, UpdateCourseData } from '../../src/types/course';

// Mock fetch globally
global.fetch = jest.fn();

describe('CourseService', () => {
  let instructorId: string;
  let studentId: string;
  let adminId: string;
  let courseId: string;

  const mockInstructor: User = {
    _id: 'instructor123',
    email: 'instructor@test.com',
    role: 'teacher',
    profile: {
      firstName: 'John',
      lastName: 'Teacher'
    }
  };

  const mockStudent: User = {
    _id: 'student123',
    email: 'student@test.com',
    role: 'student',
    profile: {
      firstName: 'Jane',
      lastName: 'Student'
    }
  };

  const mockAdmin: User = {
    _id: 'admin123',
    email: 'admin@test.com',
    role: 'admin',
    profile: {
      firstName: 'Admin',
      lastName: 'User'
    }
  };

  const mockCourse: Course = {
    _id: 'course123',
    title: 'Test Course',
    description: 'A test course',
    code: 'TEST-101',
    credits: 3,
    level: 'beginner',
    category: 'test',
    instructor: 'instructor123',
    instructorInfo: {
      firstName: 'John',
      lastName: 'Teacher',
      email: 'instructor@test.com'
    },
    duration: {
      weeks: 12,
      hoursPerWeek: 3,
      totalHours: 36
    },
    schedule: [],
    capacity: 30,
    enrolledStudents: [],
    prerequisites: [],
    tags: ['test'],
    status: 'published',
    visibility: 'public',
    chapters: [],
    resources: [],
    assessments: [],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-05-01'),
    enrollmentDeadline: new Date('2024-01-25')
  };

  beforeEach(() => {
    // Set up test data with proper typing
    const instructor = mockInstructor as User & { _id: string };
    const student = mockStudent as User & { _id: string };
    const admin = mockAdmin as User & { _id: string };
    
    instructorId = instructor._id;
    studentId = student._id;
    adminId = admin._id;

    // Reset fetch mock
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('getCourses', () => {
    it('should fetch courses successfully', async () => {
      const mockResponse: PaginatedResponse<Course> = {
        items: [mockCourse],
        total: 1,
        page: 1,
        limit: 10
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await CourseService.getCourses();

      expect(fetch).toHaveBeenCalledWith('/api/courses?');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should handle fetch error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      const result = await CourseService.getCourses();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch courses');
    });

    it('should apply filters correctly', async () => {
      const filters = {
        q: 'test',
        category: 'programming',
        level: 'beginner',
        limit: 5,
        offset: 0
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], total: 0, page: 1, limit: 5 }),
      } as Response);

      await CourseService.getCourses(filters);

      expect(fetch).toHaveBeenCalledWith('/api/courses?q=test&category=programming&level=beginner&limit=5&offset=0');
    });
  });

  describe('getCourse', () => {
    it('should fetch a single course successfully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourse,
      } as Response);

      const result = await CourseService.getCourse('course123');

      expect(fetch).toHaveBeenCalledWith('/api/courses/course123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCourse);
    });

    it('should handle fetch error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      const result = await CourseService.getCourse('course123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch course');
    });
  });

  describe('createCourse', () => {
    it('should create a course successfully', async () => {
      const course = mockCourse as Course & { _id: string };
      courseId = course._id;

      const courseData: CreateCourseData = {
        title: 'New Course',
        description: 'A new course',
        code: 'NEW-101',
        credits: 3,
        level: 'beginner',
        category: 'test',
        instructor: instructorId,
        instructorInfo: {
          firstName: 'John',
          lastName: 'Teacher',
          email: 'instructor@test.com'
        },
        duration: {
          weeks: 12,
          hoursPerWeek: 3,
          totalHours: 36
        },
        schedule: [],
        capacity: 30,
        prerequisites: [],
        tags: ['test'],
        status: 'published',
        visibility: 'public',
        chapters: [],
        resources: [],
        assessments: [],
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-05-01'),
        enrollmentDeadline: new Date('2024-01-25')
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourse,
      } as Response);

      const result = await CourseService.createCourse(courseData);

      expect(fetch).toHaveBeenCalledWith('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCourse);
    });

    it('should handle create error', async () => {
      const courseData = {} as CreateCourseData;

      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      const result = await CourseService.createCourse(courseData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create course');
    });
  });

  describe('updateCourse', () => {
    it('should update a course successfully', async () => {
      const course = mockCourse as Course & { _id: string };
      courseId = course._id;

      const updateData: UpdateCourseData = {
        title: 'Updated Course Title'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockCourse, ...updateData }),
      } as Response);

      const result = await CourseService.updateCourse(courseId, updateData);

      expect(fetch).toHaveBeenCalledWith(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      expect(result.success).toBe(true);
    });

    it('should handle update error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      const result = await CourseService.updateCourse('course123', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update course');
    });
  });

  describe('deleteCourse', () => {
    it('should delete a course successfully', async () => {
      const course = mockCourse as Course & { _id: string };
      courseId = course._id;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await CourseService.deleteCourse(courseId);

      expect(fetch).toHaveBeenCalledWith(`/api/courses/${courseId}`, {
        method: 'DELETE',
      });
      expect(result.success).toBe(true);
    });

    it('should handle delete error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      const result = await CourseService.deleteCourse('course123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete course');
    });
  });

  describe('enrollStudent', () => {
    it('should enroll a student successfully', async () => {
      const course = mockCourse as Course & { _id: string };
      courseId = course._id;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourse,
      } as Response);

      const result = await CourseService.enrollStudent(courseId, studentId);

      expect(fetch).toHaveBeenCalledWith(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      expect(result.success).toBe(true);
    });

    it('should handle enrollment error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      const result = await CourseService.enrollStudent('course123', 'student123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to enroll student');
    });
  });

  describe('unenrollStudent', () => {
    it('should unenroll a student successfully', async () => {
      const course = mockCourse as Course & { _id: string };
      courseId = course._id;
      
      const student2 = { ...mockStudent, _id: 'student456' } as User & { _id: string };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourse,
      } as Response);

      const result = await CourseService.unenrollStudent(courseId, student2._id);

      expect(fetch).toHaveBeenCalledWith(`/api/courses/${courseId}/unenroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student2._id }),
      });
      expect(result.success).toBe(true);
    });

    it('should handle unenrollment error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      const result = await CourseService.unenrollStudent('course123', 'student123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to unenroll student');
    });
  });

  describe('getEnrolledStudents', () => {
    it('should fetch enrolled students successfully', async () => {
      const students = [mockStudent];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => students,
      } as Response);

      const result = await CourseService.getEnrolledStudents('course123');

      expect(fetch).toHaveBeenCalledWith('/api/courses/course123/students');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(students);
    });

    it('should handle fetch students error', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      const result = await CourseService.getEnrolledStudents('course123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch enrolled students');
    });
  });
});