import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { SERVICES } from '../setup/globalSetup';

/**
 * API Test Helper for functional tests
 */
export class ApiTestHelper {
  private clients: Map<string, AxiosInstance> = new Map();
  private authTokens: Map<string, string> = new Map();

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize HTTP clients for all services
   */
  private initializeClients(): void {
    SERVICES.forEach(service => {
      const client = axios.create({
        baseURL: `http://localhost:${service.port}`,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Add request interceptor for auth tokens
      client.interceptors.request.use((config) => {
        const token = this.authTokens.get(service.name);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });

      // Add response interceptor for error handling
      client.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response) {
            // Server responded with error status
            console.error(`❌ ${service.name} API Error:`, {
              status: error.response.status,
              data: error.response.data,
              url: error.config?.url
            });
          } else if (error.request) {
            // Request made but no response
            console.error(`❌ ${service.name} Network Error:`, error.message);
          }
          return Promise.reject(error);
        }
      );

      this.clients.set(service.name, client);
    });
  }

  /**
   * Get HTTP client for a service
   */
  getClient(serviceName: string): AxiosInstance {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`No client found for service: ${serviceName}`);
    }
    return client;
  }

  /**
   * Set authentication token for a service
   */
  setAuthToken(serviceName: string, token: string): void {
    this.authTokens.set(serviceName, token);
  }

  /**
   * Remove authentication token for a service
   */
  removeAuthToken(serviceName: string): void {
    this.authTokens.delete(serviceName);
  }

  /**
   * Clear all authentication tokens
   */
  clearAuthTokens(): void {
    this.authTokens.clear();
  }

  /**
   * Make authenticated request to auth service
   */
  async auth(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.getClient('auth-service').request({
      url: `/api/auth${endpoint}`,
      ...config
    });
  }

  /**
   * Make authenticated request to user service
   */
  async user(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.getClient('user-service').request({
      url: `/api/users${endpoint}`,
      ...config
    });
  }

  /**
   * Make authenticated request to course service
   */
  async course(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.getClient('course-service').request({
      url: `/api/courses${endpoint}`,
      ...config
    });
  }

  /**
   * Make authenticated request to planning service
   */
  async planning(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.getClient('planning-service').request({
      url: `/api/planning${endpoint}`,
      ...config
    });
  }

  /**
   * Make authenticated request to news service
   */
  async news(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.getClient('news-service').request({
      url: `/api/news${endpoint}`,
      ...config
    });
  }

  /**
   * Make authenticated request to statistics service
   */
  async statistics(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.getClient('statistics-service').request({
      url: `/api/statistics${endpoint}`,
      ...config
    });
  }

  /**
   * Make authenticated request to notification service
   */
  async notification(endpoint: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    return this.getClient('notification-service').request({
      url: `/api/notifications${endpoint}`,
      ...config
    });
  }

  /**
   * Register a new user and get auth token
   */
  async registerUser(userData: {
    email: string;
    password: string;
    role: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  }): Promise<{ user: any; tokens: any }> {
    const response = await this.auth('/register', {
      method: 'POST',
      data: userData
    });

    const { user, tokens } = response.data.data;
    
    // Set auth token for all services
    if (tokens?.accessToken) {
      SERVICES.forEach(service => {
        this.setAuthToken(service.name, tokens.accessToken);
      });
    }

    return { user, tokens };
  }

  /**
   * Login user and get auth token
   */
  async loginUser(email: string, password: string): Promise<{ user: any; tokens: any }> {
    const response = await this.auth('/login', {
      method: 'POST',
      data: { email, password }
    });

    const { user, tokens } = response.data.data;
    
    // Set auth token for all services
    if (tokens?.accessToken) {
      SERVICES.forEach(service => {
        this.setAuthToken(service.name, tokens.accessToken);
      });
    }

    return { user, tokens };
  }

  /**
   * Logout user and clear tokens
   */
  async logoutUser(): Promise<void> {
    try {
      await this.auth('/logout', { method: 'POST' });
    } catch (error) {
      // Logout might fail if token is expired, but we still want to clear local tokens
    }
    
    this.clearAuthTokens();
  }

  /**
   * Wait for all services to be healthy
   */
  async waitForServices(): Promise<void> {
    const healthChecks = SERVICES.map(async (service) => {
      const client = this.getClient(service.name);
      const maxAttempts = 30;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await client.get(service.healthEndpoint);
          return true;
        } catch (error) {
          if (attempt === maxAttempts) {
            throw new Error(`Service ${service.name} is not healthy after ${maxAttempts} attempts`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    });

    await Promise.all(healthChecks);
  }

  /**
   * Create test data helper
   */
  createTestData() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    return {
      user: {
        student: {
          email: `student-${timestamp}-${random}@test.com`,
          password: 'TestPassword123!',
          role: 'student',
          profile: {
            firstName: 'Test',
            lastName: 'Student'
          }
        },
        teacher: {
          email: `teacher-${timestamp}-${random}@test.com`,
          password: 'TestPassword123!',
          role: 'teacher',
          profile: {
            firstName: 'Test',
            lastName: 'Teacher'
          }
        },
        admin: {
          email: `admin-${timestamp}-${random}@test.com`,
          password: 'TestPassword123!',
          role: 'admin',
          profile: {
            firstName: 'Test',
            lastName: 'Admin'
          }
        }
      },
      course: {
        title: 'Test Course',
        description: 'A test course for functional testing',
        category: 'Programming',
        level: 'beginner',
        maxStudents: 30,
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        endDate: new Date(Date.now() + 86400000 * 30), // 30 days from now
        schedule: {
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '11:00'
        }
      },
      event: {
        title: 'Test Event',
        description: 'A test event for functional testing',
        type: 'meeting',
        category: 'academic',
        startDate: new Date(Date.now() + 86400000), // Tomorrow
        endDate: new Date(Date.now() + 86400000 + 3600000), // Tomorrow + 1 hour
        location: 'Test Room'
      },
      article: {
        title: 'Test Article',
        content: 'This is a test article for functional testing',
        category: 'announcement',
        tags: ['test', 'functional'],
        isPublished: true
      }
    };
  }
}

// Export singleton instance
export const apiHelper = new ApiTestHelper();