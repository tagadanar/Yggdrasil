// packages/frontend/src/lib/api/news.ts
// API client for news and announcements management

import axios, { AxiosInstance } from 'axios';
import { tokenStorage } from '@/lib/auth/tokenStorage';

// Dynamic News Service URL detection for worker-specific testing
function getNewsServiceUrl(): string {
  // In test environment, detect worker-specific News Service URL from frontend port
  if (process.env.NODE_ENV === 'test' || typeof window !== 'undefined') {
    const frontendPort = typeof window !== 'undefined' 
      ? parseInt(window.location.port, 10) 
      : parseInt(process.env['PORT'] || '3000', 10);
    
    // Calculate news service port from frontend port (frontend + 3)
    const newsPort = frontendPort + 3;
    
    // Use localhost if we're in a test environment or browser
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
      return `http://localhost:${newsPort}`;
    }
  }
  
  // Fallback to environment variable or default
  return process.env['NEXT_PUBLIC_NEWS_SERVICE_URL'] || 'http://localhost:3003';
}

const NEWS_SERVICE_URL = getNewsServiceUrl();

// Create axios instance for news service
const newsApiClient: AxiosInstance = axios.create({
  baseURL: `${NEWS_SERVICE_URL}/api/news`,
  timeout: 30000, // Increased from 10s to 30s for test environments
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to news service requests
newsApiClient.interceptors.request.use(
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
newsApiClient.interceptors.response.use(
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
            return newsApiClient(originalRequest);
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

// News management API methods
export const newsApi = {
  // =============================================================================
  // NEWS ARTICLE CRUD OPERATIONS
  // =============================================================================

  // Get all published news articles (public)
  async getPublishedNews(filters: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await newsApiClient.get(`/?${params.toString()}`);
    return response.data;
  },

  // Get all news articles (including drafts for authorized users)
  async getAllNews(filters: {
    category?: string;
    status?: 'draft' | 'published' | 'archived';
    search?: string;
    author?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.author) params.append('author', filters.author);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await newsApiClient.get(`/admin?${params.toString()}`);
    return response.data;
  },

  // Get single news article by ID
  async getNewsById(newsId: string) {
    const response = await newsApiClient.get(`/${newsId}`);
    return response.data;
  },

  // Get news article by slug
  async getNewsBySlug(slug: string) {
    const response = await newsApiClient.get(`/slug/${slug}`);
    return response.data;
  },

  // Create new news article
  async createNews(newsData: {
    title: string;
    content: string;
    category: 'announcements' | 'academic' | 'events' | 'general' | 'course-updates';
    excerpt?: string;
    tags?: string[];
    featuredImage?: string;
    status?: 'draft' | 'published';
    publishedAt?: string;
    linkedCourse?: string;
  }) {
    const response = await newsApiClient.post('/', newsData);
    return response.data;
  },

  // Update news article
  async updateNews(newsId: string, updateData: {
    title?: string;
    content?: string;
    category?: 'announcements' | 'academic' | 'events' | 'general' | 'course-updates';
    excerpt?: string;
    tags?: string[];
    featuredImage?: string;
    status?: 'draft' | 'published' | 'archived';
    publishedAt?: string;
    linkedCourse?: string;
  }) {
    const response = await newsApiClient.put(`/${newsId}`, updateData);
    return response.data;
  },

  // Delete news article
  async deleteNews(newsId: string) {
    const response = await newsApiClient.delete(`/${newsId}`);
    return response.data;
  },

  // Publish/unpublish news article
  async publishNews(newsId: string, publish: boolean) {
    const response = await newsApiClient.patch(`/${newsId}/publish`, { publish });
    return response.data;
  },

  // Archive/restore news article
  async archiveNews(newsId: string, archive: boolean) {
    const response = await newsApiClient.patch(`/${newsId}/archive`, { archive });
    return response.data;
  },

  // =============================================================================
  // NEWS CATEGORIES AND FILTERING
  // =============================================================================

  // Get available news categories
  async getNewsCategories() {
    const response = await newsApiClient.get('/categories');
    return response.data;
  },

  // Get news by category
  async getNewsByCategory(category: string, options: {
    page?: number;
    limit?: number;
    status?: 'published' | 'all';
  } = {}) {
    const params = new URLSearchParams();
    params.append('category', category);
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.status) params.append('status', options.status);

    const response = await newsApiClient.get(`/category?${params.toString()}`);
    return response.data;
  },

  // Search news articles
  async searchNews(query: string, filters: {
    category?: string;
    status?: 'published' | 'all';
    author?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    params.append('search', query);
    
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.author) params.append('author', filters.author);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await newsApiClient.get(`/search?${params.toString()}`);
    return response.data;
  },

  // =============================================================================
  // COURSE-LINKED NEWS
  // =============================================================================

  // Get news linked to a specific course
  async getNewsByCourse(courseId: string) {
    const response = await newsApiClient.get(`/course/${courseId}`);
    return response.data;
  },

  // Link news article to course
  async linkNewsToCourse(newsId: string, courseId: string) {
    const response = await newsApiClient.patch(`/${newsId}/link-course`, { courseId });
    return response.data;
  },

  // Unlink news article from course
  async unlinkNewsFromCourse(newsId: string) {
    const response = await newsApiClient.patch(`/${newsId}/unlink-course`);
    return response.data;
  },

  // =============================================================================
  // FEATURED AND TRENDING NEWS
  // =============================================================================

  // Get featured news articles
  async getFeaturedNews(limit: number = 5) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());

    const response = await newsApiClient.get(`/featured?${params.toString()}`);
    return response.data;
  },

  // Set news article as featured
  async setNewsFeatured(newsId: string, featured: boolean) {
    const response = await newsApiClient.patch(`/${newsId}/featured`, { featured });
    return response.data;
  },

  // Get trending/popular news
  async getTrendingNews(timeframe: 'day' | 'week' | 'month' = 'week', limit: number = 10) {
    const params = new URLSearchParams();
    params.append('timeframe', timeframe);
    params.append('limit', limit.toString());

    const response = await newsApiClient.get(`/trending?${params.toString()}`);
    return response.data;
  },

  // =============================================================================
  // USER INTERACTIONS
  // =============================================================================

  // Mark news article as read
  async markAsRead(newsId: string) {
    const response = await newsApiClient.post(`/${newsId}/read`);
    return response.data;
  },

  // Get user's reading history
  async getReadingHistory(userId?: string) {
    const params = userId ? `?userId=${userId}` : '';
    const response = await newsApiClient.get(`/reading-history${params}`);
    return response.data;
  },

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  // Get recent news (last 7 days)
  async getRecentNews(limit: number = 10) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    
    const response = await newsApiClient.get(`/recent?${params.toString()}`);
    return response.data;
  },

  // Get news statistics (for admin dashboard)
  async getNewsStatistics() {
    const response = await newsApiClient.get('/statistics');
    return response.data;
  },

  // Health check for news service
  async healthCheck() {
    const response = await newsApiClient.get('/health');
    return response.data;
  }
};

export default newsApi;