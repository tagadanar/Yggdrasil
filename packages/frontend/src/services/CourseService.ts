import { Course, CreateCourseData, UpdateCourseData, CourseSearchFilters } from '../types/course';

export interface User {
  _id: string;
  email: string;
  role: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

class CourseService {
  private baseUrl = '/api/courses';

  async getCourses(filters?: CourseSearchFilters): Promise<ApiResponse<PaginatedResponse<Course>>> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.q) queryParams.append('q', filters.q);
      if (filters?.category) queryParams.append('category', filters.category);
      if (filters?.level) queryParams.append('level', filters.level);
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.offset !== undefined) queryParams.append('offset', filters.offset.toString());

      const response = await fetch(`${this.baseUrl}?${queryParams}`);
      const data = await response.json();
      
      return { success: response.ok, data };
    } catch (error) {
      return { success: false, error: 'Failed to fetch courses' };
    }
  }

  async getCourse(id: string): Promise<ApiResponse<Course>> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      const data = await response.json();
      
      return { success: response.ok, data };
    } catch (error) {
      return { success: false, error: 'Failed to fetch course' };
    }
  }

  async createCourse(courseData: CreateCourseData): Promise<ApiResponse<Course>> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });
      const data = await response.json();
      
      return { success: response.ok, data };
    } catch (error) {
      return { success: false, error: 'Failed to create course' };
    }
  }

  async updateCourse(id: string, courseData: UpdateCourseData): Promise<ApiResponse<Course>> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });
      const data = await response.json();
      
      return { success: response.ok, data };
    } catch (error) {
      return { success: false, error: 'Failed to update course' };
    }
  }

  async deleteCourse(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });
      
      return { success: response.ok };
    } catch (error) {
      return { success: false, error: 'Failed to delete course' };
    }
  }

  async enrollStudent(courseId: string, studentId: string): Promise<ApiResponse<Course>> {
    try {
      const response = await fetch(`${this.baseUrl}/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await response.json();
      
      return { success: response.ok, data };
    } catch (error) {
      return { success: false, error: 'Failed to enroll student' };
    }
  }

  async unenrollStudent(courseId: string, studentId: string): Promise<ApiResponse<Course>> {
    try {
      const response = await fetch(`${this.baseUrl}/${courseId}/unenroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await response.json();
      
      return { success: response.ok, data };
    } catch (error) {
      return { success: false, error: 'Failed to unenroll student' };
    }
  }

  async getEnrolledStudents(courseId: string): Promise<ApiResponse<User[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/${courseId}/students`);
      const data = await response.json();
      
      return { success: response.ok, data };
    } catch (error) {
      return { success: false, error: 'Failed to fetch enrolled students' };
    }
  }
}

export default new CourseService();