import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { tokenStorage } from './storage';
import { AuthTokens, User, UserRole } from '@101-school/shared-utilities';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
const USER_SERVICE_URL = process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:3002';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

// Create auth service client
const authClient: AxiosInstance = axios.create({
  baseURL: AUTH_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Create user service client
const userClient: AxiosInstance = axios.create({
  baseURL: USER_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Create fallback API client for other services
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Create frontend API client for internal Next.js API routes
const frontendClient: AxiosInstance = axios.create({
  baseURL: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token to all clients
const addAuthInterceptor = (client: AxiosInstance) => {
  client.interceptors.request.use(
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
};

addAuthInterceptor(authClient);
addAuthInterceptor(userClient);
addAuthInterceptor(apiClient);
addAuthInterceptor(frontendClient);

// Response interceptor to handle token refresh for all clients
const addRefreshInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = tokenStorage.getRefreshToken();
          if (refreshToken) {
            const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/refresh`, {
              refreshToken,
            });

            if (response.data.success) {
              tokenStorage.setTokens(response.data.data.tokens);
              originalRequest.headers.Authorization = `Bearer ${response.data.data.tokens.accessToken}`;
              return client(originalRequest);
            }
          }
        } catch (refreshError) {
          tokenStorage.clearTokens();
          if (typeof window !== 'undefined') {
            // Store current path for redirect after login (if not already on login page)
            const currentPath = window.location.pathname;
            const isPublicPath = ['/login', '/register', '/'].includes(currentPath);
            
            if (!isPublicPath) {
              sessionStorage.setItem('redirectAfterLogin', currentPath);
            }
            
            // Prevent multiple redirects
            if (currentPath !== '/login') {
              window.location.href = '/login';
            }
          }
        }
      }

      return Promise.reject(error);
    }
  );
};

addRefreshInterceptor(authClient);
addRefreshInterceptor(userClient);
addRefreshInterceptor(apiClient);
addRefreshInterceptor(frontendClient);

// API response wrapper
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Authentication API
export const authAPI = {
  login: async (credentials: { email: string; password: string }): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> => {
    const response: AxiosResponse = await authClient.post('/api/auth/login', credentials);
    return response.data;
  },

  register: async (userData: {
    email: string;
    password: string;
    role: UserRole;
    profile: { firstName: string; lastName: string };
  }): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> => {
    const response: AxiosResponse = await authClient.post('/api/auth/register', userData);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> => {
    const response: AxiosResponse = await authClient.post('/api/auth/refresh', { refreshToken });
    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    const response: AxiosResponse = await authClient.post('/api/auth/logout');
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response: AxiosResponse = await authClient.post('/api/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<ApiResponse> => {
    const response: AxiosResponse = await authClient.post('/api/auth/reset-password', { token, password });
    return response.data;
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response: AxiosResponse = await authClient.get('/api/auth/me');
    return response.data;
  },
};

// User API
export const userAPI = {
  getProfile: async (userId?: string): Promise<ApiResponse<User>> => {
    const url = userId ? `/api/users/${userId}` : '/api/users/profile';
    const response: AxiosResponse = await userClient.get(url);
    return response.data;
  },

  updateProfile: async (userId: string, profileData: any): Promise<ApiResponse<User>> => {
    const response: AxiosResponse = await userClient.put(`/api/users/${userId}`, profileData);
    return response.data;
  },

  updatePreferences: async (preferences: any): Promise<ApiResponse<User>> => {
    const response: AxiosResponse = await userClient.put('/api/users/preferences', preferences);
    return response.data;
  },

  uploadPhoto: async (file: File): Promise<ApiResponse<{ photoUrl: string }>> => {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response: AxiosResponse = await userClient.post('/api/users/upload-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  searchUsers: async (params: {
    q?: string;
    role?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ users: User[]; total: number; pagination: any }>> => {
    const response: AxiosResponse = await userClient.get('/api/users/search', { params });
    return response.data;
  },

  getActivity: async (userId: string, params: {
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ activities: any[]; total: number; pagination: any }>> => {
    const response: AxiosResponse = await userClient.get(`/api/users/${userId}/activity`, { params });
    return response.data;
  },

  deactivateUser: async (userId: string): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse = await userClient.post(`/api/users/${userId}/deactivate`);
    return response.data;
  },

  reactivateUser: async (userId: string): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse = await userClient.post(`/api/users/${userId}/reactivate`);
    return response.data;
  },
};

// Course API (placeholder for future implementation)
export const courseAPI = {
  getCourses: async (params?: any): Promise<ApiResponse<any[]>> => {
    const response: AxiosResponse = await apiClient.get('/api/courses', { params });
    return response.data;
  },

  getCourse: async (courseId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.get(`/api/courses/${courseId}`);
    return response.data;
  },
};

// Planning API - Uses frontend API routes (proxy to planning service)
export const planningAPI = {
  getEvents: async (params?: any): Promise<ApiResponse<any[]>> => {
    const response: AxiosResponse = await frontendClient.get('/api/planning/events', { params });
    return response.data;
  },

  createEvent: async (eventData: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await frontendClient.post('/api/planning/events', eventData);
    return response.data;
  },

  getEvent: async (eventId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await frontendClient.get(`/api/planning/events/${eventId}`);
    return response.data;
  },

  updateEvent: async (eventId: string, eventData: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await frontendClient.put(`/api/planning/events/${eventId}`, eventData);
    return response.data;
  },

  deleteEvent: async (eventId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await frontendClient.delete(`/api/planning/events/${eventId}`);
    return response.data;
  },
};

// News API - Complete CRUD operations
export const newsAPI = {
  // Get all news with optional filters
  getNews: async (params?: any): Promise<ApiResponse<any[]>> => {
    const response: AxiosResponse = await apiClient.get('/api/news', { params });
    return response.data;
  },

  // Get single news item by ID
  getNewsItem: async (newsId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.get(`/api/news/${newsId}`);
    return response.data;
  },

  // Create new news item
  createNews: async (newsData: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.post('/api/news', newsData);
    return response.data;
  },

  // Update existing news item
  updateNews: async (newsId: string, newsData: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.put(`/api/news/${newsId}`, newsData);
    return response.data;
  },

  // Delete news item
  deleteNews: async (newsId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.delete(`/api/news/${newsId}`);
    return response.data;
  },

  // Get featured news
  getFeaturedNews: async (params?: any): Promise<ApiResponse<any[]>> => {
    const response: AxiosResponse = await apiClient.get('/api/news/featured', { params });
    return response.data;
  },

  // Get news by category
  getNewsByCategory: async (category: string, params?: any): Promise<ApiResponse<any[]>> => {
    const response: AxiosResponse = await apiClient.get(`/api/news/categories/${category}`, { params });
    return response.data;
  },

  // Toggle news pin status
  togglePin: async (newsId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.patch(`/api/news/${newsId}/pin`);
    return response.data;
  },

  // Publish/unpublish news
  togglePublish: async (newsId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.patch(`/api/news/${newsId}/publish`);
    return response.data;
  },

  // Mark news as read (for analytics)
  markAsRead: async (newsId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.post(`/api/news/${newsId}/read`);
    return response.data;
  },
};

// Statistics API - Complete CRUD operations
export const statisticsAPI = {
  // Dashboard and overview statistics
  getDashboard: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.get('/api/statistics/dashboard');
    return response.data;
  },

  getSystemStats: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.get('/api/statistics/system');
    return response.data;
  },

  // User statistics
  getUserStats: async (userId?: string, params?: any): Promise<ApiResponse<any>> => {
    const url = userId ? `/api/statistics/users/${userId}` : '/api/statistics/users';
    const response: AxiosResponse = await apiClient.get(url, { params });
    return response.data;
  },

  // Course statistics  
  getCourseStats: async (courseId?: string, params?: any): Promise<ApiResponse<any>> => {
    const url = courseId ? `/api/statistics/courses/${courseId}` : '/api/statistics/courses';
    const response: AxiosResponse = await apiClient.get(url, { params });
    return response.data;
  },

  // Attendance statistics
  getAttendance: async (params?: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.get('/api/statistics/attendance', { params });
    return response.data;
  },

  // Grade statistics
  getGrades: async (params?: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.get('/api/statistics/grades', { params });
    return response.data;
  },

  // Engagement statistics
  getEngagement: async (params?: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.get('/api/statistics/engagement', { params });
    return response.data;
  },

  // Reports management (CRUD operations)
  getReports: async (params?: any): Promise<ApiResponse<any[]>> => {
    const response: AxiosResponse = await apiClient.get('/api/statistics/reports', { params });
    return response.data;
  },

  getReport: async (reportId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.get(`/api/statistics/reports/${reportId}`);
    return response.data;
  },

  createReport: async (reportData: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.post('/api/statistics/reports', reportData);
    return response.data;
  },

  updateReport: async (reportId: string, reportData: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.put(`/api/statistics/reports/${reportId}`, reportData);
    return response.data;
  },

  deleteReport: async (reportId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.delete(`/api/statistics/reports/${reportId}`);
    return response.data;
  },

  // Dashboard widgets management
  getWidgets: async (): Promise<ApiResponse<any[]>> => {
    const response: AxiosResponse = await apiClient.get('/api/statistics/widgets');
    return response.data;
  },

  createWidget: async (widgetData: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.post('/api/statistics/widgets', widgetData);
    return response.data;
  },

  updateWidget: async (widgetId: string, widgetData: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.put(`/api/statistics/widgets/${widgetId}`, widgetData);
    return response.data;
  },

  deleteWidget: async (widgetId: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.delete(`/api/statistics/widgets/${widgetId}`);
    return response.data;
  },

  // Export functionality
  exportData: async (type: string, params?: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.post('/api/statistics/export', { type, ...params });
    return response.data;
  },

  // Analytics and insights
  getAnalytics: async (type: string, params?: any): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.get(`/api/statistics/analytics/${type}`, { params });
    return response.data;
  },

  // Real-time updates
  subscribeToUpdates: async (eventTypes: string[]): Promise<ApiResponse<any>> => {
    const response: AxiosResponse = await apiClient.post('/api/statistics/subscribe', { eventTypes });
    return response.data;
  },
};

export default apiClient;