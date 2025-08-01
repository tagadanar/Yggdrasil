// packages/frontend/src/lib/api/client.ts
// API client configuration with axios

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { tokenStorage } from '@/lib/auth/tokenStorage';

// Dynamic API URL detection for worker-specific testing
function getApiUrl(): string {
  // In test environment, detect worker-specific API URL from frontend port
  if (process.env.NODE_ENV === 'test' || typeof window !== 'undefined') {
    const frontendPort = typeof window !== 'undefined' 
      ? parseInt(window.location.port, 10) 
      : parseInt(process.env['PORT'] || '3000', 10);
    
    // Calculate auth service port from frontend port (frontend + 1)
    const authPort = frontendPort + 1;
    
    // Use localhost if we're in a test environment or browser
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
      return `http://localhost:${authPort}`;
    }
  }
  
  // Fallback to environment variable or default
  return process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';
}

const BASE_URL = getApiUrl();


// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000, // Increased from 10s to 30s for test environments
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies with requests
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
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

// Create separate axios instance for refresh calls (no interceptors to prevent loops)
const refreshClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token refresh state management
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If we get a 401 and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        try {
          // Use separate refresh client to avoid interceptor loops
          const response = await refreshClient.post('/auth/refresh', {
            refreshToken,
          });
          
          if (response.data.success && response.data.data.tokens) {
            const tokens = response.data.data.tokens;
            tokenStorage.setTokens(tokens);
            
            // Process queued requests
            processQueue(null, tokens.accessToken);
            
            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            return apiClient(originalRequest);
          } else {
            throw new Error('Token refresh failed: Invalid response');
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens and process queue with error
          tokenStorage.clearTokens();
          processQueue(refreshError, null);
          // Let the ProtectedRoute component handle redirect
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token, clear tokens and process queue with error
        tokenStorage.clearTokens();
        processQueue(new Error('No refresh token'), null);
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// Dynamic User Service URL detection for worker-specific testing
function getUserServiceUrl(): string {
  // In test environment, detect worker-specific User Service URL from frontend port
  if (process.env.NODE_ENV === 'test' || typeof window !== 'undefined') {
    const frontendPort = typeof window !== 'undefined' 
      ? parseInt(window.location.port, 10) 
      : parseInt(process.env['PORT'] || '3000', 10);
    
    // Calculate user service port from frontend port (frontend + 2)
    const userPort = frontendPort + 2;
    
    // Use localhost if we're in a test environment or browser
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
      return `http://localhost:${userPort}`;
    }
  }
  
  // Fallback to environment variable or default
  return process.env['NEXT_PUBLIC_USER_SERVICE_URL'] || 'http://localhost:3002';
}

const USER_SERVICE_URL = getUserServiceUrl();


// Create separate axios instance for user service
const userApiClient: AxiosInstance = axios.create({
  baseURL: `${USER_SERVICE_URL}/api`,
  timeout: 30000, // Increased from 10s to 30s for test environments
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to user service requests
userApiClient.interceptors.request.use(
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

// User management API methods
export const userApi = {
  // List all users (admin only)
  async listUsers() {
    const response = await userApiClient.get('/users');
    return response.data;
  },

  // Create new user (admin only)
  async createUser(userData: {
    email: string;
    password: string;
    role: string;
    profile: {
      firstName: string;
      lastName: string;
      department?: string;
      title?: string;
      grade?: string;
      studentId?: string;
    };
  }) {
    const response = await userApiClient.post('/users', userData);
    return response.data;
  },

  // Update user profile by ID (requires ownership or admin)
  async updateUser(userId: string, profileData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    department?: string;
    studentId?: string;
    bio?: string;
    officeHours?: string;
    specialties?: string[];
    contactInfo?: {
      phone?: string;
      address?: string;
    };
  }) {
    const response = await userApiClient.patch(`/users/${userId}/profile`, profileData);
    return response.data;
  },

  // Update current user's profile
  async updateProfile(profileData: {
    firstName?: string;
    lastName?: string;
    department?: string;
    studentId?: string;
    bio?: string;
    officeHours?: string;
    specialties?: string[];
    contactInfo?: {
      phone?: string;
      address?: string;
    };
  }) {
    const response = await userApiClient.put('/users/profile', profileData);
    return response.data;
  },

  // Delete user (admin only)
  async deleteUser(userId: string) {
    const response = await userApiClient.delete(`/users/${userId}`);
    return response.data;
  },

  // Get user by ID
  async getUserById(userId: string) {
    const response = await userApiClient.get(`/users/${userId}`);
    return response.data;
  }
};

export default apiClient;