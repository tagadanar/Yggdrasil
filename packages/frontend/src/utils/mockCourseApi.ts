// Mock Course API for testing frontend functionality
import { 
  Course, 
  CreateCourseData, 
  UpdateCourseData, 
  CourseSearchFilters, 
  CourseEnrollmentResult,
  CourseStats 
} from '../types/course';

// Mock course data
const mockCourses: Course[] = [
  {
    _id: '1',
    title: 'Introduction to React',
    description: 'Learn the basics of React development with hands-on projects.',
    code: 'CS-101',
    credits: 3,
    level: 'beginner',
    category: 'web-development',
    instructor: 'instructor1',
    instructorInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@university.com'
    },
    duration: {
      weeks: 12,
      hoursPerWeek: 3,
      totalHours: 36
    },
    schedule: [
      {
        dayOfWeek: 'monday',
        startTime: '10:00',
        endTime: '12:00',
        location: 'Room 101'
      }
    ],
    capacity: 30,
    enrolledStudents: ['student1', 'student2'],
    prerequisites: [],
    tags: ['react', 'frontend', 'javascript'],
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
  },
  {
    _id: '2',
    title: 'Advanced Python Programming',
    description: 'Advanced concepts in Python including async programming and data structures.',
    code: 'CS-201',
    credits: 4,
    level: 'advanced',
    category: 'programming',
    instructor: 'instructor2',
    instructorInfo: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@university.com'
    },
    duration: {
      weeks: 16,
      hoursPerWeek: 4,
      totalHours: 64
    },
    schedule: [
      {
        dayOfWeek: 'wednesday',
        startTime: '14:00',
        endTime: '16:00',
        location: 'Room 202'
      }
    ],
    capacity: 25,
    enrolledStudents: ['student3'],
    prerequisites: ['CS-101'],
    tags: ['python', 'programming', 'advanced'],
    status: 'published',
    visibility: 'public',
    chapters: [],
    resources: [],
    assessments: [],
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    startDate: new Date('2024-02-15'),
    endDate: new Date('2024-06-15'),
    enrollmentDeadline: new Date('2024-02-10')
  }
];

// Helper to simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockCourseApi = {
  // Get all courses with optional filters
  async getCourses(filters?: CourseSearchFilters) {
    await delay(500); // Simulate network delay
    
    let filteredCourses = [...mockCourses];
    
    if (filters?.q) {
      const query = filters.q.toLowerCase();
      filteredCourses = filteredCourses.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    if (filters?.category) {
      filteredCourses = filteredCourses.filter(course => course.category === filters.category);
    }
    
    if (filters?.level) {
      filteredCourses = filteredCourses.filter(course => course.level === filters.level);
    }
    
    if (filters?.status) {
      filteredCourses = filteredCourses.filter(course => course.status === filters.status);
    }

    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 10;
    const total = filteredCourses.length;
    const paginatedCourses = filteredCourses.slice(offset, offset + limit);
    
    return {
      success: true,
      data: {
        courses: paginatedCourses,
        total,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    };
  },

  // Get a specific course by ID
  async getCourse(courseId: string) {
    await delay(300);
    
    const course = mockCourses.find(c => c._id === courseId);
    
    if (course) {
      return { success: true, data: course };
    } else {
      return { success: false, error: 'Course not found' };
    }
  },

  // Create a new course
  async createCourse(courseData: CreateCourseData) {
    await delay(800);
    
    const newCourse: Course = {
      _id: `course_${Date.now()}`,
      ...courseData,
      enrolledStudents: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Course;
    
    mockCourses.push(newCourse);
    
    return { success: true, data: newCourse };
  },

  // Update an existing course
  async updateCourse(courseId: string, courseData: UpdateCourseData) {
    await delay(500);
    
    const courseIndex = mockCourses.findIndex(c => c._id === courseId);
    
    if (courseIndex !== -1) {
      mockCourses[courseIndex] = {
        ...mockCourses[courseIndex],
        ...courseData,
        updatedAt: new Date()
      };
      
      return { success: true, data: mockCourses[courseIndex] };
    } else {
      return { success: false, error: 'Course not found' };
    }
  },

  // Delete a course
  async deleteCourse(courseId: string) {
    await delay(400);
    
    const courseIndex = mockCourses.findIndex(c => c._id === courseId);
    
    if (courseIndex !== -1) {
      mockCourses.splice(courseIndex, 1);
      return { success: true, data: { message: 'Course deleted successfully' } };
    } else {
      return { success: false, error: 'Course not found' };
    }
  },

  // Enroll in a course
  async enrollInCourse(courseId: string) {
    await delay(400);
    
    const course = mockCourses.find(c => c._id === courseId);
    
    if (course) {
      // Mock enrollment logic
      return { 
        success: true, 
        data: { 
          enrolled: true, 
          enrollmentDate: new Date(),
          waitlisted: false 
        } as CourseEnrollmentResult 
      };
    } else {
      return { success: false, error: 'Course not found' };
    }
  },

  // Unenroll from a course
  async unenrollFromCourse(courseId: string) {
    await delay(400);
    
    return { success: true, data: { message: 'Successfully unenrolled' } };
  },

  // Get enrollment status
  async getEnrollmentStatus(courseId: string) {
    await delay(200);
    
    return { 
      success: true, 
      data: { 
        enrolled: false, 
        waitlisted: false 
      } 
    };
  },

  // Search courses
  async searchCourses(query: string, filters?: CourseSearchFilters) {
    await delay(300);
    
    return this.getCourses({ ...filters, q: query });
  },

  // Get course progress
  async getCourseProgress(courseId: string) {
    await delay(300);
    
    return {
      success: true,
      data: {
        completionPercentage: 65,
        chaptersCompleted: [],
        sectionsCompleted: [],
        exercisesCompleted: [],
        timeSpent: 1200,
        lastAccessDate: new Date()
      }
    };
  },

  // Update progress
  async updateProgress(courseId: string, progressData: any) {
    await delay(300);
    
    return { success: true, data: { message: 'Progress updated' } };
  },

  // Get course statistics
  async getCourseStats() {
    await delay(400);
    
    return {
      success: true,
      data: {
        totalCourses: mockCourses.length,
        activeCourses: mockCourses.filter(c => c.isActive).length,
        totalEnrollments: 50,
        completionRate: 0.75
      } as CourseStats
    };
  }
};