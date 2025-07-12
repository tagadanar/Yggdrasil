/**
 * HTTP API Client for functional testing
 * Provides a standardized way to make HTTP requests to services
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { testEnvironment } from '../config/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: testEnvironment.timeouts.api,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        if (testEnvironment.logging.level === 'debug') {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
        }
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        if (testEnvironment.logging.level === 'debug') {
          console.log(`[API] ${response.status} ${response.config.url}`, response.data);
        }
        return response;
      },
      (error) => {
        // Better error handling with more context
        const status = error.response?.status || 'Network Error';
        const url = error.config?.url || 'Unknown URL';
        const method = error.config?.method?.toUpperCase() || 'REQUEST';
        
        if (testEnvironment.logging.level === 'debug') {
          console.error(`[API] ${method} ${status} ${url}`, error.response?.data || error.message);
        } else if (testEnvironment.logging.level === 'error') {
          // Only show network/connection errors in non-debug mode
          if (!error.response) {
            console.error(`[API] Network error: ${method} ${url} - ${error.message}`);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set authentication token for future requests
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = undefined;
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Make a GET request
   */
  async get<T = any>(path: string, options?: RequestOptions): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.retryRequest(() => this.client.get(path, this.buildConfig(options)));
  }

  /**
   * Make a POST request
   */
  async post<T = any>(path: string, data?: any, options?: RequestOptions): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.retryRequest(() => this.client.post(path, data, this.buildConfig(options)));
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(path: string, data?: any, options?: RequestOptions): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.retryRequest(() => this.client.put(path, data, this.buildConfig(options)));
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(path: string, data?: any, options?: RequestOptions): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.retryRequest(() => this.client.patch(path, data, this.buildConfig(options)));
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(path: string, options?: RequestOptions): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.retryRequest(() => this.client.delete(path, this.buildConfig(options)));
  }

  /**
   * Upload a file using multipart/form-data
   */
  async uploadFile<T = any>(path: string, formData: FormData, options?: RequestOptions): Promise<AxiosResponse<ApiResponse<T>>> {
    const config = this.buildConfig(options);
    config.headers = {
      ...config.headers,
      'Content-Type': 'multipart/form-data',
    };
    return this.retryRequest(() => this.client.post(path, formData, config));
  }

  /**
   * Make a raw request (returns full response, not just data)
   */
  async raw<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.retryRequest(() => this.client.request(config));
  }

  /**
   * Check if service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Make raw request with custom config
   */
  async raw<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.retryRequest(() => this.client.request<T>(config));
  }

  /**
   * Build axios config from options
   */
  private buildConfig(options?: RequestOptions): AxiosRequestConfig {
    return {
      timeout: options?.timeout || testEnvironment.timeouts.api,
      headers: options?.headers || {},
    };
  }

  /**
   * Retry request with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    attempt: number = 1,
    maxAttempts: number = testEnvironment.retry.attempts
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      if (attempt >= maxAttempts) {
        throw error;
      }

      // Don't retry on 4xx errors (except 429 Too Many Requests)
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
        throw error;
      }

      // Wait before retry with exponential backoff
      const delay = testEnvironment.retry.delay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      return this.retryRequest(requestFn, attempt + 1, maxAttempts);
    }
  }
}

/**
 * Create API client for a specific service
 */
export function createApiClient(service: keyof typeof testEnvironment.services, authToken?: string): ApiClient {
  const baseUrl = testEnvironment.services[service];
  if (!baseUrl) {
    throw new Error(`Service URL not configured for: ${service}`);
  }
  return new ApiClient(baseUrl, authToken);
}

export default ApiClient;