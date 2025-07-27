// packages/shared-utilities/src/patterns/service-client.ts
import axios, { AxiosInstance } from 'axios';
import CircuitBreaker from 'opossum';
import { Cache } from '../cache/cache';
import { logger } from '../logging/logger';

export interface ServiceClientOptions {
  baseURL: string;
  timeout?: number;
  cache?: boolean;
  cacheTTL?: number;
  circuitBreaker?: boolean;
}

export class ServiceClient {
  private axios: AxiosInstance;
  private breaker?: CircuitBreaker;
  private cache?: Cache;

  constructor(
    private serviceName: string,
    options: ServiceClientOptions,
  ) {
    this.axios = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 5000,
      headers: {
        'X-Service-Name': process.env['SERVICE_NAME'] || 'unknown',
        'X-Service-Version': process.env['SERVICE_VERSION'] || '1.0.0',
      },
    });

    if (options.cache) {
      this.cache = new Cache({
        ttl: options.cacheTTL || 60000,
        max: 1000,
      });
    }

    if (options.circuitBreaker) {
      this.setupCircuitBreaker();
    }

    this.setupInterceptors();
  }

  private setupCircuitBreaker() {
    const options = {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    };

    this.breaker = new CircuitBreaker((config: any) => this.axios.request(config), options);

    this.breaker.on('open', () => {
      logger.warn(`Circuit breaker opened for ${this.serviceName}`);
    });

    this.breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for ${this.serviceName}`);
    });

    this.breaker.on('close', () => {
      logger.info(`Circuit breaker closed for ${this.serviceName}`);
    });
  }

  private setupInterceptors() {
    // Request interceptor for tracing
    this.axios.interceptors.request.use(
      config => {
        config.headers!['X-Request-ID'] = config.headers!['X-Request-ID'] || require('uuid').v4();
        config.headers!['X-Request-Start'] = Date.now().toString();
        return config;
      },
      error => Promise.reject(error),
    );

    // Response interceptor for metrics
    this.axios.interceptors.response.use(
      response => {
        const duration =
          Date.now() - parseInt(response.config.headers!['X-Request-Start'] as string);

        logger.debug(`${this.serviceName} request completed`, {
          method: response.config.method,
          url: response.config.url,
          status: response.status,
          duration,
        });

        return response;
      },
      error => {
        logger.error(`${this.serviceName} request failed`, {
          method: error.config?.method,
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });

        return Promise.reject(error);
      },
    );
  }

  async get<T>(path: string, options?: any): Promise<T> {
    const cacheKey = `GET:${path}:${JSON.stringify(options?.params || {})}`;

    // Check cache
    if (this.cache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    // Make request
    const response = await this.request<T>({
      method: 'GET',
      url: path,
      ...options,
    });

    // Cache response
    if (this.cache && response !== null && response !== undefined) {
      this.cache.set(cacheKey, response);
    }

    return response;
  }

  async post<T>(path: string, data?: any, options?: any): Promise<T> {
    return this.request<T>({
      method: 'POST',
      url: path,
      data,
      ...options,
    });
  }

  async put<T>(path: string, data?: any, options?: any): Promise<T> {
    return this.request<T>({
      method: 'PUT',
      url: path,
      data,
      ...options,
    });
  }

  async delete<T>(path: string, options?: any): Promise<T> {
    return this.request<T>({
      method: 'DELETE',
      url: path,
      ...options,
    });
  }

  private async request<T>(config: any): Promise<T> {
    try {
      let response: any;

      if (this.breaker) {
        response = await this.breaker.fire(config);
      } else {
        response = await this.axios.request(config);
      }

      return response.data as T;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ServiceClientError(
          this.serviceName,
          error.response?.status || 0,
          error.response?.data?.error?.message || error.message,
        );
      }
      throw error;
    }
  }

  // Invalidate cache
  invalidateCache(pattern?: string) {
    if (this.cache) {
      if (pattern) {
        this.cache.deletePattern(pattern);
      } else {
        this.cache.clear();
      }
    }
  }
}

export class ServiceClientError extends Error {
  constructor(
    public service: string,
    public statusCode: number,
    message: string,
  ) {
    super(`${service} error (${statusCode}): ${message}`);
    this.name = 'ServiceClientError';
  }
}

// Service client factory
export class ServiceClientFactory {
  private static clients = new Map<string, ServiceClient>();

  static create(serviceName: string, options: ServiceClientOptions): ServiceClient {
    const key = `${serviceName}:${options.baseURL}`;

    if (!this.clients.has(key)) {
      this.clients.set(key, new ServiceClient(serviceName, options));
    }

    return this.clients.get(key)!;
  }

  static getUserServiceClient(): ServiceClient {
    return this.create('user-service', {
      baseURL: process.env['USER_SERVICE_URL'] || 'http://localhost:3002',
      cache: true,
      cacheTTL: 300000, // 5 minutes
      circuitBreaker: true,
    });
  }

  static getCourseServiceClient(): ServiceClient {
    return this.create('course-service', {
      baseURL: process.env['COURSE_SERVICE_URL'] || 'http://localhost:3004',
      cache: true,
      cacheTTL: 600000, // 10 minutes
      circuitBreaker: true,
    });
  }

  static getAuthServiceClient(): ServiceClient {
    return this.create('auth-service', {
      baseURL: process.env['AUTH_SERVICE_URL'] || 'http://localhost:3001',
      cache: false, // Don't cache auth operations
      circuitBreaker: true,
    });
  }

  static getEnrollmentServiceClient(): ServiceClient {
    return this.create('enrollment-service', {
      baseURL: process.env['ENROLLMENT_SERVICE_URL'] || 'http://localhost:3007',
      cache: true,
      cacheTTL: 180000, // 3 minutes
      circuitBreaker: true,
    });
  }

  static getNewsServiceClient(): ServiceClient {
    return this.create('news-service', {
      baseURL: process.env['NEWS_SERVICE_URL'] || 'http://localhost:3003',
      cache: true,
      cacheTTL: 600000, // 10 minutes
      circuitBreaker: true,
    });
  }

  static getPlanningServiceClient(): ServiceClient {
    return this.create('planning-service', {
      baseURL: process.env['PLANNING_SERVICE_URL'] || 'http://localhost:3005',
      cache: true,
      cacheTTL: 300000, // 5 minutes
      circuitBreaker: true,
    });
  }

  static getStatisticsServiceClient(): ServiceClient {
    return this.create('statistics-service', {
      baseURL: process.env['STATISTICS_SERVICE_URL'] || 'http://localhost:3006',
      cache: true,
      cacheTTL: 600000, // 10 minutes
      circuitBreaker: true,
    });
  }
}
