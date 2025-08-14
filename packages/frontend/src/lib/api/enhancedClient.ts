// packages/frontend/src/lib/api/enhancedClient.ts
// Enhanced API client with improved error handling, retry logic, and logging

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import { tokenStorage } from '@/lib/auth/tokenStorage';
import { errorHandler } from '@/lib/errors/errorHandler';
import { createComponentLogger } from '@/lib/errors/logger';
import { ErrorType } from '@/lib/errors/types';

const logger = createComponentLogger('API');

// Dynamic API URL detection for worker-specific testing
function getApiUrl(): string {
  if (process.env.NODE_ENV === 'test' || typeof window !== 'undefined') {
    const frontendPort = typeof window !== 'undefined' 
      ? parseInt(window.location.port, 10) 
      : parseInt(process.env['PORT'] || '3000', 10);
    
    const authPort = frontendPort + 1;
    
    if (typeof window !== 'undefined' || process.env.NODE_ENV === 'test') {
      return `http://localhost:${authPort}`;
    }
  }
  
  return process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';
}

const BASE_URL = getApiUrl();

// Request body type for API calls
type RequestBody = Record<string, unknown> | unknown[] | FormData | string | null;

// Enhanced request configuration interface
interface EnhancedRequestConfig extends AxiosRequestConfig {
  skipErrorHandling?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  component?: string;
  action?: string;
  silent?: boolean; // Don't log errors if true
}

// Response wrapper interface
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// Token queue item interface
interface QueueItem {
  resolve: (value: string) => void;
  reject: (reason?: Error) => void;
}

class EnhancedApiClient {
  private client: AxiosInstance;
  private refreshClient: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: QueueItem[] = [];

  constructor() {
    // Main client with interceptors
    this.client = axios.create({
      baseURL: `${BASE_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    // Refresh client without interceptors to prevent loops
    this.refreshClient = axios.create({
      baseURL: `${BASE_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const enhancedConfig = config as EnhancedRequestConfig;
        const token = tokenStorage.getAccessToken();
        if (token) {
          config.headers = config.headers || new AxiosHeaders();
          config.headers.set('Authorization', `Bearer ${token}`);
        }

        // Log request if not silent
        if (!enhancedConfig.silent) {
          logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            component: enhancedConfig.component,
            action: enhancedConfig.action,
          });
        }

        return config;
      },
      (error) => {
        logger.error('API Request setup failed', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const config = response.config as EnhancedRequestConfig;
        
        if (!config.silent) {
          logger.debug(`API Response: ${response.status} ${config.method?.toUpperCase()} ${config.url}`, {
            status: response.status,
            component: config.component,
          });
        }

        return response;
      },
      async (error) => {
        const config = error.config as EnhancedRequestConfig;
        
        // Handle token refresh for 401 errors
        if (error.response?.status === 401 && !(config as any)._retry) {
          return this.handleTokenRefresh(error);
        }

        // Enhanced error handling
        if (!config.skipErrorHandling) {
          const appError = errorHandler.parseError(error, {
            component: config.component || 'API',
            action: config.action,
          });

          if (!config.silent) {
            logger.error(`API Error: ${config.method?.toUpperCase()} ${config.url}`, {
              status: error.response?.status,
              error: appError,
              component: config.component,
            });
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async handleTokenRefresh(error: AxiosError) {
    const originalRequest = error.config;

    // Check if originalRequest exists
    if (!originalRequest) {
      throw new Error('Request configuration is missing');
    }

    // If already refreshing, queue this request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return this.client(originalRequest);
      }).catch((err) => {
        return Promise.reject(err);
      });
    }

    (originalRequest as any)._retry = true;
    this.isRefreshing = true;
    
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        logger.info('Attempting token refresh');
        
        const response = await this.refreshClient.post('/auth/refresh', {
          refreshToken,
        });
        
        if (response.data.success && response.data.data.tokens) {
          const tokens = response.data.data.tokens;
          tokenStorage.setTokens(tokens);
          
          logger.info('Token refresh successful');
          
          // Process queued requests
          this.processQueue(null, tokens.accessToken);
          
          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          }
          return this.client(originalRequest);
        } else {
          throw new Error('Token refresh failed: Invalid response');
        }
      } catch (refreshError) {
        logger.error('Token refresh failed', { error: refreshError });
        
        // Clear tokens and process queue with error
        tokenStorage.clearTokens();
        this.processQueue(refreshError instanceof Error ? refreshError : new Error('Token refresh failed'), null);
        
        throw refreshError;
      } finally {
        this.isRefreshing = false;
      }
    } else {
      // No refresh token available
      logger.warn('No refresh token available for token refresh');
      tokenStorage.clearTokens();
      this.processQueue(new Error('No refresh token'), null);
      this.isRefreshing = false;
      throw error;
    }
  }

  private processQueue(error: Error | null, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else if (token) {
        resolve(token);
      } else {
        reject(new Error('No token provided'));
      }
    });
    
    this.failedQueue = [];
  }

  // Enhanced request methods with retry logic
  async get<T = any>(
    url: string,
    config: EnhancedRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    return this.requestWithRetry('get', url, undefined, config);
  }

  async post<T = unknown>(
    url: string,
    data?: RequestBody,
    config: EnhancedRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    return this.requestWithRetry('post', url, data, config);
  }

  async put<T = unknown>(
    url: string,
    data?: RequestBody,
    config: EnhancedRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    return this.requestWithRetry('put', url, data, config);
  }

  async delete<T = unknown>(
    url: string,
    config: EnhancedRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    return this.requestWithRetry('delete', url, undefined, config);
  }

  async patch<T = unknown>(
    url: string,
    data?: RequestBody,
    config: EnhancedRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    return this.requestWithRetry('patch', url, data, config);
  }

  // Request with retry logic
  private async requestWithRetry<T = unknown>(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    url: string,
    data?: RequestBody,
    config: EnhancedRequestConfig = {}
  ): Promise<AxiosResponse<T>> {
    const {
      maxRetries = 0, // No retries by default, must be explicitly enabled
      retryDelay = 1000,
      component = 'API',
      action,
      ...axiosConfig
    } = config;

    const shouldRetry = (error: AxiosError, attempt: number): boolean => {
      // Only retry on network errors, timeouts, or 5xx server errors
      const isRetryableError = 
        !error.response || // Network error
        error.code === 'ECONNABORTED' || // Timeout
        (error.response.status >= 500 && error.response.status < 600); // Server error

      return isRetryableError && attempt < maxRetries;
    };

    let attempt = 0;
    let lastError: AxiosError | undefined;

    while (attempt <= maxRetries) {
      try {
        const requestConfig: EnhancedRequestConfig = {
          ...axiosConfig,
          component,
          action,
        };

        let response: AxiosResponse<T>;
        
        switch (method) {
          case 'get':
            response = await this.client.get(url, requestConfig);
            break;
          case 'post':
            response = await this.client.post(url, data, requestConfig);
            break;
          case 'put':
            response = await this.client.put(url, data, requestConfig);
            break;
          case 'delete':
            response = await this.client.delete(url, requestConfig);
            break;
          case 'patch':
            response = await this.client.patch(url, data, requestConfig);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        // Success - clear any previous errors
        if (attempt > 0) {
          logger.info(`Request succeeded after ${attempt} retries`, { 
            method: method.toUpperCase(), 
            url,
            component 
          });
        }

        return response;
      } catch (error: unknown) {
        lastError = error as AxiosError;
        
        if (shouldRetry(lastError, attempt)) {
          attempt++;
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          
          logger.warn(`Request failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`, {
            method: method.toUpperCase(),
            url,
            error: lastError.message || 'Unknown error',
            component
          });
          
          await this.sleep(delay);
        } else {
          // No more retries or not retryable
          throw error;
        }
      }
    }

    throw lastError || new Error('Request failed with unknown error');
  }

  // Utility methods
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Create a component-specific API client
  createComponentClient(componentName: string) {
    return {
      get: <T = any>(url: string, config: Omit<EnhancedRequestConfig, 'component'> = {}) =>
        this.get<T>(url, { ...config, component: componentName }),
      
      post: <T = unknown>(url: string, data?: RequestBody, config: Omit<EnhancedRequestConfig, 'component'> = {}) =>
        this.post<T>(url, data, { ...config, component: componentName }),
      
      put: <T = unknown>(url: string, data?: RequestBody, config: Omit<EnhancedRequestConfig, 'component'> = {}) =>
        this.put<T>(url, data, { ...config, component: componentName }),
      
      delete: <T = unknown>(url: string, config: Omit<EnhancedRequestConfig, 'component'> = {}) =>
        this.delete<T>(url, { ...config, component: componentName }),
      
      patch: <T = unknown>(url: string, data?: RequestBody, config: Omit<EnhancedRequestConfig, 'component'> = {}) =>
        this.patch<T>(url, data, { ...config, component: componentName }),
    };
  }

  // Get the underlying axios instance for direct use if needed
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Create singleton instance
export const enhancedApiClient = new EnhancedApiClient();

// Export component client creator for convenience
export const createComponentApiClient = (componentName: string) => 
  enhancedApiClient.createComponentClient(componentName);