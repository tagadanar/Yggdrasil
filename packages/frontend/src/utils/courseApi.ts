// Course API utilities
import { 
  Course, 
  CreateCourseData, 
  UpdateCourseData, 
  CourseSearchFilters, 
  CourseEnrollmentResult,
  CourseStats 
} from '../types/course';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

// Helper function to make authenticated API calls
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'An error occurred' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('API call failed:', error);
    return { success: false, error: 'Network error' };
  }
}

// Course API functions
export const courseApi = {
  // Get all courses with optional filters
  async getCourses(filters?: CourseSearchFilters) {
    const queryParams = filters ? new URLSearchParams(filters as any).toString() : '';
    const endpoint = `/courses${queryParams ? `?${queryParams}` : ''}`;
    
    return apiCall<{
      courses: Course[];
      total: number;
      pagination?: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(endpoint);
  },

  // Get a specific course by ID
  async getCourse(courseId: string) {
    return apiCall<Course>(`/courses/${courseId}`);
  },

  // Create a new course (instructors/admins only)
  async createCourse(courseData: CreateCourseData) {
    return apiCall<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  // Update an existing course
  async updateCourse(courseId: string, courseData: UpdateCourseData) {
    return apiCall<Course>(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  // Delete a course
  async deleteCourse(courseId: string) {
    return apiCall<{ message: string }>(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  },

  // Enroll in a course
  async enrollInCourse(courseId: string, studentId?: string) {
    const token = localStorage.getItem('token');
    // In a real app, studentId would be extracted from token on backend
    // For now, we'll send a placeholder since backend expects it
    return apiCall<CourseEnrollmentResult>(`/courses/${courseId}/enroll`, {
      method: 'POST',
      body: JSON.stringify({ studentId: studentId || 'current-user' })
    });
  },

  // Unenroll from a course
  async unenrollFromCourse(courseId: string, studentId?: string) {
    return apiCall<{ message: string }>(`/courses/${courseId}/unenroll`, {
      method: 'POST',
      body: JSON.stringify({ studentId: studentId || 'current-user' })
    });
  },

  // Get courses by instructor
  async getCoursesByInstructor(instructorId: string) {
    return apiCall<Course[]>(`/courses/instructor/${instructorId}`);
  },

  // Get enrolled courses for current user
  async getEnrolledCourses() {
    return apiCall<Course[]>('/courses/enrolled');
  },

  // Publish a course (change status from draft to published)
  async publishCourse(courseId: string) {
    return apiCall<Course>(`/courses/${courseId}/publish`, {
      method: 'PATCH',
    });
  },

  // Archive a course
  async archiveCourse(courseId: string) {
    return apiCall<Course>(`/courses/${courseId}/archive`, {
      method: 'PATCH',
    });
  },

  // Get course statistics
  async getCourseStats() {
    return apiCall<CourseStats>('/courses/stats');
  },

  // Search courses
  async searchCourses(query: string, filters?: CourseSearchFilters) {
    const searchParams = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    
    return apiCall<{
      courses: Course[];
      total: number;
      pagination?: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(`/courses?${searchParams.toString()}`);
  },

  // Check if user can enroll in course
  async checkEnrollmentEligibility(courseId: string) {
    return apiCall<{
      eligible: boolean;
      reason?: string;
      waitlistPosition?: number;
    }>(`/courses/${courseId}/eligibility`);
  },

  // Get course enrollment status for current user
  async getEnrollmentStatus(courseId: string) {
    return apiCall<{
      enrolled: boolean;
      enrollmentDate?: Date;
      waitlisted?: boolean;
      position?: number;
    }>(`/courses/${courseId}/enrollment-status`);
  },

  // Get course prerequisites
  async getCoursePrerequisites(courseId: string) {
    return apiCall<{
      prerequisites: Course[];
      completed: string[];
      missing: string[];
    }>(`/courses/${courseId}/prerequisites`);
  },

  // Submit course feedback/rating
  async submitCourseFeedback(courseId: string, feedback: {
    rating: number;
    comment?: string;
    anonymous?: boolean;
  }) {
    return apiCall<{ message: string }>(`/courses/${courseId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  },

  // Get course feedback
  async getCourseFeedback(courseId: string) {
    return apiCall<{
      averageRating: number;
      totalReviews: number;
      feedback: Array<{
        rating: number;
        comment?: string;
        author?: string;
        date: Date;
        anonymous: boolean;
      }>;
    }>(`/courses/${courseId}/feedback`);
  },

  // Get course completion progress for current user
  async getCourseProgress(courseId: string) {
    return apiCall<{
      completionPercentage: number;
      chaptersCompleted: string[];
      sectionsCompleted: string[];
      exercisesCompleted: string[];
      timeSpent: number;
      lastAccessDate: Date;
    }>(`/courses/${courseId}/progress`);
  },

  // Update course progress
  async updateProgress(courseId: string, progressData: {
    chapterId?: string;
    sectionId?: string;
    exerciseId?: string;
    completed: boolean;
    timeSpent?: number;
  }) {
    return apiCall<{ message: string }>(`/courses/${courseId}/progress`, {
      method: 'PUT',
      body: JSON.stringify(progressData),
    });
  },

  // Get course categories for filters
  async getCategories() {
    return apiCall<{ categories: string[] }>('/courses/categories');
  },

  // Get course levels for filters
  async getLevels() {
    return apiCall<{ levels: string[] }>('/courses/levels');
  },

  // Export course data
  async exportCourseData(courseId: string, format: 'pdf' | 'json' | 'csv') {
    const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}/export?format=${format}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },

  // Import course data
  async importCourseData(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/courses/import`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Import failed' };
    }

    return { success: true, data };
  }
};