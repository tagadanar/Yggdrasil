// packages/frontend/src/lib/api/courses.ts
// API client for course management

import axios, { AxiosInstance } from 'axios';
import { tokenStorage } from '@/lib/auth/tokenStorage';

// Dynamic Course Service URL detection for worker-specific testing
function getCourseServiceUrl(): string {
  // In test environment, detect worker-specific Course Service URL from frontend port
  if (process.env.NODE_ENV === 'test' || typeof window !== 'undefined') {
    const frontendPort = typeof window !== 'undefined'
      ? parseInt(window.location.port, 10)
      : parseInt(process.env['PORT'] || '3000', 10);

    // Calculate course service port from frontend port (frontend + 4)
    const coursePort = frontendPort + 4;

    // Use localhost if we're in a test environment or browser
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
      return `http://localhost:${coursePort}`;
    }
  }

  // Fallback to environment variable or default
  return process.env['NEXT_PUBLIC_COURSE_SERVICE_URL'] || 'http://localhost:3004';
}

const COURSE_SERVICE_URL = getCourseServiceUrl();

// Create axios instance for course service
const courseApiClient: AxiosInstance = axios.create({
  baseURL: `${COURSE_SERVICE_URL}/api/courses`,
  timeout: 30000, // Increased from 10s to 30s for test environments
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to course service requests
courseApiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle token refresh
courseApiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If we get a 401 and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        try {
          // Try to refresh the token
          const response = await axios.post(`${process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001'}/api/auth/refresh`, {
            refreshToken,
          });

          if (response.data.success && response.data.data.tokens) {
            const tokens = response.data.data.tokens;
            tokenStorage.setTokens(tokens);

            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            return courseApiClient(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens
          tokenStorage.clearTokens();
          // Let the ProtectedRoute component handle redirect
        }
      } else {
        // No refresh token, clear tokens
        tokenStorage.clearTokens();
        // Let the ProtectedRoute component handle redirect
      }
    }

    return Promise.reject(error);
  },
);

// Course management API methods
export const courseApi = {
  // =============================================================================
  // COURSE CRUD OPERATIONS
  // =============================================================================

  // Get all published courses (public)
  async getPublishedCourses() {
    const response = await courseApiClient.get('/public/published');
    return response.data;
  },

  // Search courses with filters
  async searchCourses(filters: {
    search?: string;
    category?: string;
    level?: string;
    instructor?: string;
    tags?: string[];
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.level) params.append('level', filters.level);
    if (filters.instructor) params.append('instructor', filters.instructor);
    if (filters.tags) filters.tags.forEach(tag => params.append('tags', tag));
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await courseApiClient.get(`/?${params.toString()}`);
    return response.data;
  },

  // Get user's courses (accessible for students, created for teachers)
  async getMyCourses() {
    const response = await courseApiClient.get('/user/my-courses');
    return response.data;
  },

  // Get course by ID
  async getCourseById(courseId: string) {
    console.log('🔍 DEBUG: courseApi.getCourseById called with courseId:', courseId);
    console.log('🔍 DEBUG: Course service URL:', COURSE_SERVICE_URL);
    console.log('🔍 DEBUG: Making request to:', `${COURSE_SERVICE_URL}/api/courses/${courseId}`);

    const token = tokenStorage.getAccessToken();
    console.log('🔍 DEBUG: Access token available:', !!token);
    console.log('🔍 DEBUG: Access token preview:', token?.substring(0, 20) + '...');

    try {
      const response = await courseApiClient.get(`/${courseId}`);
      console.log('🔍 DEBUG: Course API response:', response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error('🔍 DEBUG: Course API error:', error.response?.status, error.response?.data || error.message);
      console.error('🔍 DEBUG: Full error:', error);
      throw error;
    }
  },

  // Get course by slug
  async getCourseBySlug(slug: string) {
    const response = await courseApiClient.get(`/slug/${slug}`);
    return response.data;
  },

  // Create new course (teachers, staff, admins only)
  async createCourse(courseData: {
    title: string;
    description: string;
    category: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    tags?: string[];
    prerequisites?: string[];
    estimatedDuration?: number;
    settings?: {
      isPublic?: boolean;
      maxStudents?: number;
      startDate?: string;
      endDate?: string;
      allowLateSubmissions?: boolean;
      enableDiscussions?: boolean;
      enableCollaboration?: boolean;
    };
  }) {
    const response = await courseApiClient.post('/', courseData);
    return response.data;
  },

  // Update course
  async updateCourse(courseId: string, updateData: {
    title?: string;
    description?: string;
    category?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    status?: 'draft' | 'published' | 'archived';
    tags?: string[];
    prerequisites?: string[];
    estimatedDuration?: number;
    settings?: {
      isPublic?: boolean;
      maxStudents?: number;
      startDate?: string;
      endDate?: string;
      allowLateSubmissions?: boolean;
      enableDiscussions?: boolean;
      enableCollaboration?: boolean;
    };
  }) {
    const response = await courseApiClient.put(`/${courseId}`, updateData);
    return response.data;
  },

  // Delete course
  async deleteCourse(courseId: string) {
    const response = await courseApiClient.delete(`/${courseId}`);
    return response.data;
  },

  // Publish/unpublish course
  async publishCourse(courseId: string, publish: boolean) {
    const response = await courseApiClient.patch(`/${courseId}/publish`, { publish });
    return response.data;
  },

  // Archive/restore course
  async archiveCourse(courseId: string, archive: boolean) {
    const response = await courseApiClient.patch(`/${courseId}/archive`, { archive });
    return response.data;
  },

  // =============================================================================
  // CHAPTER MANAGEMENT
  // =============================================================================

  // Add chapter to course
  async addChapter(courseId: string, chapterData: {
    title: string;
    description?: string;
    order: number;
  }) {
    const response = await courseApiClient.post(`/${courseId}/chapters`, chapterData);
    return response.data;
  },

  // Update chapter
  async updateChapter(courseId: string, chapterId: string, updateData: {
    title?: string;
    description?: string;
    order?: number;
    isPublished?: boolean;
  }) {
    const response = await courseApiClient.put(`/${courseId}/chapters/${chapterId}`, updateData);
    return response.data;
  },

  // Delete chapter
  async deleteChapter(courseId: string, chapterId: string) {
    const response = await courseApiClient.delete(`/${courseId}/chapters/${chapterId}`);
    return response.data;
  },

  // =============================================================================
  // SECTION MANAGEMENT
  // =============================================================================

  // Add section to chapter
  async addSection(courseId: string, chapterId: string, sectionData: {
    title: string;
    description?: string;
    order: number;
  }) {
    const response = await courseApiClient.post(`/${courseId}/chapters/${chapterId}/sections`, sectionData);
    return response.data;
  },

  // Update section
  async updateSection(courseId: string, chapterId: string, sectionId: string, updateData: {
    title?: string;
    description?: string;
    order?: number;
    isPublished?: boolean;
  }) {
    const response = await courseApiClient.put(`/${courseId}/chapters/${chapterId}/sections/${sectionId}`, updateData);
    return response.data;
  },

  // =============================================================================
  // CONTENT MANAGEMENT
  // =============================================================================

  // Add content to section
  async addContent(courseId: string, chapterId: string, sectionId: string, contentData: {
    type: 'text' | 'video' | 'exercise' | 'quiz' | 'file';
    title?: string;
    order: number;
    data: {
      markdown?: string;
      html?: string;
      videoUrl?: string;
      videoDuration?: number;
      transcript?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    };
  }) {
    const response = await courseApiClient.post(`/${courseId}/chapters/${chapterId}/sections/${sectionId}/content`, contentData);
    return response.data;
  },

  // Update content
  async updateContent(courseId: string, chapterId: string, sectionId: string, contentId: string, updateData: {
    title?: string;
    order?: number;
    data?: {
      markdown?: string;
      html?: string;
      videoUrl?: string;
      videoDuration?: number;
      transcript?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    };
    isPublished?: boolean;
  }) {
    const response = await courseApiClient.put(`/${courseId}/chapters/${chapterId}/sections/${sectionId}/content/${contentId}`, updateData);
    return response.data;
  },

  // =============================================================================
  // EXERCISE SUBMISSIONS
  // =============================================================================

  // Submit exercise solution (students only)
  async submitExercise(exerciseId: string, submissionData: {
    code?: string;
    answer?: string;
    files?: File[];
  }) {
    const response = await courseApiClient.post(`/exercises/${exerciseId}/submit`, submissionData);
    return response.data;
  },

  // Get exercise submissions
  async getExerciseSubmissions(exerciseId: string, studentId?: string) {
    const params = studentId ? `?studentId=${studentId}` : '';
    const response = await courseApiClient.get(`/exercises/${exerciseId}/submissions${params}`);
    return response.data;
  },

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  // Get course categories (based on existing courses)
  async getCourseCategories() {
    // This would typically be a separate endpoint, but for now we'll derive from search
    const response = await courseApiClient.get('/');
    const categories = new Set();

    if (response.data.success && response.data.data.courses) {
      response.data.data.courses.forEach((course: any) => {
        if (course.category) {
          categories.add(course.category);
        }
      });
    }

    return Array.from(categories);
  },

  // Get course instructors (for filtering)
  async getCourseInstructors() {
    const response = await courseApiClient.get('/');
    const instructors = new Map();

    if (response.data.success && response.data.data.courses) {
      response.data.data.courses.forEach((course: any) => {
        if (course.instructor) {
          instructors.set(course.instructor._id, course.instructor);
        }
      });
    }

    return Array.from(instructors.values());
  },
};

export default courseApi;
