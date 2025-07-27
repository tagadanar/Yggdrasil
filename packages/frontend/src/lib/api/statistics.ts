// packages/frontend/src/lib/api/statistics.ts
// API client for statistics service

import axios, { AxiosInstance } from 'axios';
import { tokenStorage } from '@/lib/auth/tokenStorage';

// Dynamic Statistics Service URL detection for worker-specific testing
function getStatisticsServiceUrl(): string {
  // In test environment, detect worker-specific Statistics Service URL from frontend port
  if (process.env.NODE_ENV === 'test' || typeof window !== 'undefined') {
    const frontendPort = typeof window !== 'undefined' 
      ? parseInt(window.location.port, 10) 
      : parseInt(process.env['PORT'] || '3000', 10);
    
    // Calculate statistics service port from frontend port (frontend + 6)
    const statisticsPort = frontendPort + 6;
    
    // Use localhost if we're in a test environment or browser
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
      return `http://localhost:${statisticsPort}`;
    }
  }
  
  // Fallback to environment variable or default
  return process.env['NEXT_PUBLIC_STATISTICS_SERVICE_URL'] || 'http://localhost:3006';
}

const STATISTICS_SERVICE_URL = getStatisticsServiceUrl();

// Create axios instance for statistics service
const statisticsApiClient: AxiosInstance = axios.create({
  baseURL: `${STATISTICS_SERVICE_URL}/api/statistics`,
  timeout: 30000, // Increased from 10s to 30s for test environments
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to statistics service requests
statisticsApiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
statisticsApiClient.interceptors.response.use(
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
            return statisticsApiClient(originalRequest);
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
  }
);

interface StudentDashboardData {
  learningStats: {
    totalCourses: number;
    activeCourses: number;
    completedCourses: number;
    totalTimeSpent: number; // minutes
    averageProgress: number;
    weeklyGoal: number; // minutes
    weeklyProgress: number; // minutes
    currentStreak: number; // days
    totalExercises: number;
    completedExercises: number;
    averageScore: number;
  };
  courseProgress: {
    courseId: string;
    courseTitle: string;
    progress: number;
    timeSpent: number;
    lastAccessed: Date;
    enrollmentStatus: 'active' | 'completed' | 'dropped';
    instructor: string;
    estimatedCompletion: Date;
  }[];
  recentActivity: {
    id: string;
    type: 'exercise' | 'section' | 'course_complete' | 'assignment';
    courseTitle: string;
    activityTitle: string;
    completedAt: Date;
    score?: number;
  }[];
  achievements: {
    id: string;
    title: string;
    description: string;
    iconName: string;
    unlockedAt: Date;
    category: 'progress' | 'streak' | 'score' | 'completion';
  }[];
}

interface TeacherDashboardData {
  courseStats: {
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    totalStudents: number;
    activeStudents: number;
    averageProgress: number;
    totalSubmissions: number;
    pendingGrading: number;
  };
  courseAnalytics: {
    courseId: string;
    courseTitle: string;
    enrolledStudents: number;
    completedStudents: number;
    averageProgress: number;
    averageScore: number;
    lastActivity: Date;
  }[];
  recentSubmissions: {
    submissionId: string;
    studentName: string;
    courseName: string;
    exerciseTitle: string;
    submittedAt: Date;
    needsGrading: boolean;
  }[];
}

interface AdminDashboardData {
  platformStats: {
    totalUsers: number;
    activeUsers: number;
    totalCourses: number;
    totalEnrollments: number;
    totalSubmissions: number;
    platformEngagement: number;
  };
  userBreakdown: {
    students: number;
    teachers: number;
    staff: number;
    admins: number;
  };
  courseMetrics: {
    mostPopularCourses: {
      courseId: string;
      title: string;
      enrollments: number;
    }[];
    topPerformingCourses: {
      courseId: string;
      title: string;
      averageScore: number;
      completionRate: number;
    }[];
  };
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    services: {
      name: string;
      status: 'healthy' | 'warning' | 'error';
    }[];
  };
}

interface CourseProgressData {
  courseId: string;
  courseTitle: string;
  enrollmentStatus: 'active' | 'completed' | 'dropped';
  overallProgress: number;
  timeSpent: number;
  lastAccessedAt: Date;
  completedSections: string[];
  completedExercises: string[];
  chapters: {
    id: string;
    title: string;
    isCompleted: boolean;
    sections: {
      id: string;
      title: string;
      isCompleted: boolean;
      items: {
        id: string;
        title: string;
        type: string;
        isCompleted: boolean;
        isOptional: boolean;
        estimatedMinutes: number;
      }[];
    }[];
  }[];
}

export class StatisticsApi {
  
  // =============================================================================
  // DASHBOARD ENDPOINTS
  // =============================================================================

  /**
   * Get student dashboard data
   */
  static async getStudentDashboard(userId: string): Promise<{ success: boolean; data?: StudentDashboardData; error?: string }> {
    try {
      const response = await statisticsApiClient.get(`/dashboard/student/${userId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error fetching student dashboard:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch student dashboard'
      };
    }
  }

  /**
   * Get teacher dashboard data
   */
  static async getTeacherDashboard(userId: string): Promise<{ success: boolean; data?: TeacherDashboardData; error?: string }> {
    try {
      const response = await statisticsApiClient.get(`/dashboard/teacher/${userId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error fetching teacher dashboard:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch teacher dashboard'
      };
    }
  }

  /**
   * Get admin dashboard data
   */
  static async getAdminDashboard(): Promise<{ success: boolean; data?: AdminDashboardData; error?: string }> {
    try {
      const response = await statisticsApiClient.get('/dashboard/admin');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error fetching admin dashboard:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch admin dashboard'
      };
    }
  }

  // =============================================================================
  // PROGRESS TRACKING ENDPOINTS
  // =============================================================================

  /**
   * Update student progress
   */
  static async updateStudentProgress(
    userId: string, 
    courseId: string, 
    progressUpdate: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await statisticsApiClient.put(
        `/progress/student/${userId}/course/${courseId}`,
        progressUpdate
      );
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error updating student progress:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update student progress'
      };
    }
  }

  /**
   * Get student course progress
   */
  static async getStudentCourseProgress(
    userId: string, 
    courseId: string
  ): Promise<{ success: boolean; data?: CourseProgressData; error?: string }> {
    try {
      const response = await statisticsApiClient.get(
        `/progress/student/${userId}/course/${courseId}`
      );
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error fetching student course progress:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch student course progress'
      };
    }
  }

  /**
   * Mark section as completed
   */
  static async markSectionComplete(
    userId: string, 
    courseId: string, 
    sectionId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await statisticsApiClient.post(
        '/progress/section-complete',
        { userId, courseId, sectionId }
      );
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error marking section complete:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to mark section as completed'
      };
    }
  }

  /**
   * Mark exercise as completed
   */
  static async markExerciseComplete(
    userId: string, 
    courseId: string, 
    exerciseId: string, 
    score?: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await statisticsApiClient.post(
        '/progress/exercise-complete',
        { userId, courseId, exerciseId, score }
      );
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error marking exercise complete:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to mark exercise as completed'
      };
    }
  }

  // =============================================================================
  // ANALYTICS ENDPOINTS
  // =============================================================================

  /**
   * Get course analytics
   */
  static async getCourseAnalytics(courseId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await statisticsApiClient.get(`/analytics/course/${courseId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error fetching course analytics:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch course analytics'
      };
    }
  }

  /**
   * Get platform analytics
   */
  static async getPlatformAnalytics(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await statisticsApiClient.get('/analytics/platform');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error fetching platform analytics:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch platform analytics'
      };
    }
  }

  // =============================================================================
  // ACHIEVEMENT ENDPOINTS
  // =============================================================================

  /**
   * Get user achievements
   */
  static async getUserAchievements(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await statisticsApiClient.get(`/achievements/${userId}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error fetching user achievements:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch user achievements'
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Test statistics service health
   */
  static async healthCheck(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await statisticsApiClient.get('/health-check');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error checking statistics service health:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Statistics service health check failed'
      };
    }
  }
}

export default StatisticsApi;