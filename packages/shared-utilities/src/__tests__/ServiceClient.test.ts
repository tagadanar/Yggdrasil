// packages/shared-utilities/src/__tests__/ServiceClient.test.ts
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  ServiceClient,
  ServiceClientFactory,
  ServiceClientError,
} from '../patterns/service-client';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.isAxiosError
mockedAxios.isAxiosError = jest.fn();

// Mock circuit breaker
jest.mock('opossum', () => {
  return jest.fn().mockImplementation((fn: any, options: any) => {
    return {
      fire: fn,
      on: jest.fn(),
      stats: {
        failures: 0,
        successes: 0,
        fallbacks: 0,
      },
    };
  });
});

describe('ServiceClient - Phase 4.1 Validation', () => {
  let serviceClient: ServiceClient;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    serviceClient = new ServiceClient('test-service', {
      baseURL: 'http://localhost:3001',
      timeout: 5000,
      cache: true,
      cacheTTL: 60000,
      circuitBreaker: true,
    });
  });

  describe('Service Client Creation', () => {
    test('should create service client with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3001',
        timeout: 5000,
        headers: {
          'X-Service-Name': 'unknown',
          'X-Service-Version': '1.0.0',
        },
      });
    });

    test('should setup interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    test('should create client without optional features', () => {
      const simpleClient = new ServiceClient('simple-service', {
        baseURL: 'http://localhost:3002',
      });

      expect(simpleClient).toBeDefined();
    });
  });

  describe('HTTP Methods', () => {
    beforeEach(() => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true, message: 'test response' },
        status: 200,
        config: { headers: { 'X-Request-Start': Date.now().toString() } },
      });
    });

    test('should perform GET requests', async () => {
      const response = await serviceClient.get('/users/123');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/users/123',
      });
      expect(response).toEqual({ success: true, message: 'test response' });
    });

    test('should perform POST requests with data', async () => {
      const postData = { name: 'John', email: 'john@example.com' };
      const response = await serviceClient.post('/users', postData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/users',
        data: postData,
      });
      expect(response).toEqual({ success: true, message: 'test response' });
    });

    test('should perform PUT requests with data', async () => {
      const putData = { name: 'John Updated' };
      const response = await serviceClient.put('/users/123', putData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/users/123',
        data: putData,
      });
      expect(response).toEqual({ success: true, message: 'test response' });
    });

    test('should perform DELETE requests', async () => {
      const response = await serviceClient.delete('/users/123');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/users/123',
      });
      expect(response).toEqual({ success: true, message: 'test response' });
    });

    test('should pass additional options to requests', async () => {
      const options = {
        headers: { 'Custom-Header': 'value' },
        params: { filter: 'active' },
      };

      await serviceClient.get('/users', options);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/users',
        headers: { 'Custom-Header': 'value' },
        params: { filter: 'active' },
      });
    });
  });

  describe('Caching Functionality', () => {
    beforeEach(() => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { timestamp: Date.now() },
        config: { headers: { 'X-Request-Start': Date.now().toString() } },
      });
    });

    test('should cache GET responses', async () => {
      const response1 = await serviceClient.get('/users/123');
      const response2 = await serviceClient.get('/users/123');

      // Should only make one actual request
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
      expect(response1).toBe(response2); // Same cached response
    });

    test('should not cache non-GET requests', async () => {
      await serviceClient.post('/users', { name: 'John' });
      await serviceClient.post('/users', { name: 'John' });

      // Should make two separate requests
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    test('should consider query parameters in cache key', async () => {
      await serviceClient.get('/users', { params: { page: 1 } });
      await serviceClient.get('/users', { params: { page: 2 } });

      // Different parameters should result in different cache keys
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    test('should allow cache invalidation', async () => {
      await serviceClient.get('/users/123');
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);

      serviceClient.invalidateCache();

      await serviceClient.get('/users/123');
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    test('should support pattern-based cache invalidation', async () => {
      await serviceClient.get('/users/123');
      await serviceClient.get('/courses/456');

      serviceClient.invalidateCache('*/users/*');

      await serviceClient.get('/users/123'); // Should make new request
      await serviceClient.get('/courses/456'); // Should use cache

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    test('should throw ServiceClientError for HTTP errors', async () => {
      const error = {
        response: {
          status: 404,
          data: { error: { message: 'User not found' } },
        },
        message: 'Request failed with status code 404',
      };

      // Mock axios.isAxiosError to return true for this error
      mockedAxios.isAxiosError.mockReturnValue(true);

      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(serviceClient.get('/users/999')).rejects.toThrow(ServiceClientError);

      try {
        await serviceClient.get('/users/999');
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceClientError);
        expect((err as ServiceClientError).service).toBe('test-service');
        expect((err as ServiceClientError).statusCode).toBe(404);
        expect((err as ServiceClientError).message).toContain('User not found');
      }
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.request.mockRejectedValue(networkError);

      await expect(serviceClient.get('/users')).rejects.toThrow('Network Error');
    });

    test('should handle errors without response data', async () => {
      const error = {
        response: {
          status: 500,
        },
        message: 'Internal Server Error',
      };

      // Mock axios.isAxiosError to return true for this error
      mockedAxios.isAxiosError.mockReturnValue(true);

      mockAxiosInstance.request.mockRejectedValue(error);

      try {
        await serviceClient.get('/users');
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceClientError);
        expect((err as ServiceClientError).message).toContain('Internal Server Error');
      }
    });
  });

  describe('Service Client Factory', () => {
    test('should create and reuse service clients', () => {
      const client1 = ServiceClientFactory.create('test-service', {
        baseURL: 'http://localhost:3001',
      });

      const client2 = ServiceClientFactory.create('test-service', {
        baseURL: 'http://localhost:3001',
      });

      expect(client1).toBe(client2); // Should be the same instance
    });

    test('should create different clients for different services', () => {
      const userClient = ServiceClientFactory.create('user-service', {
        baseURL: 'http://localhost:3002',
      });

      const courseClient = ServiceClientFactory.create('course-service', {
        baseURL: 'http://localhost:3004',
      });

      expect(userClient).not.toBe(courseClient);
    });

    test('should provide preconfigured service clients', () => {
      const userClient = ServiceClientFactory.getUserServiceClient();
      const courseClient = ServiceClientFactory.getCourseServiceClient();
      const authClient = ServiceClientFactory.getAuthServiceClient();

      expect(userClient).toBeDefined();
      expect(courseClient).toBeDefined();
      expect(authClient).toBeDefined();
      expect(userClient).not.toBe(courseClient);
    });
  });

  describe('Circuit Breaker Integration', () => {
    test('should use circuit breaker when enabled', async () => {
      const clientWithCB = new ServiceClient('cb-service', {
        baseURL: 'http://localhost:3001',
        circuitBreaker: true,
      });

      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true },
        config: { headers: { 'X-Request-Start': Date.now().toString() } },
      });

      const response = await clientWithCB.get('/test');
      expect(response).toEqual({ success: true });
    });

    test('should handle circuit breaker failures', async () => {
      const clientWithCB = new ServiceClient('cb-service', {
        baseURL: 'http://localhost:3001',
        circuitBreaker: true,
      });

      const error = new Error('Service unavailable');
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(clientWithCB.get('/test')).rejects.toThrow('Service unavailable');
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent requests', async () => {
      mockAxiosInstance.request.mockImplementation(async config => ({
        data: { url: config.url, timestamp: Date.now() },
        config: { headers: { 'X-Request-Start': Date.now().toString() } },
      }));

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(serviceClient.get(`/endpoint/${i}`));
      }

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(10);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(10);
    });

    test('should handle rapid sequential requests', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true },
        config: { headers: { 'X-Request-Start': Date.now().toString() } },
      });

      const startTime = Date.now();

      for (let i = 0; i < 20; i++) {
        await serviceClient.post('/endpoint', { data: i });
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete quickly
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(20);
    });
  });

  describe('Request/Response Interceptors', () => {
    test('should add request headers via interceptors', () => {
      // Verify that interceptors were set up
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();

      // Get the request interceptor function
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];

      const config = { headers: {} };
      const modifiedConfig = requestInterceptor(config);

      expect(modifiedConfig.headers['X-Request-ID']).toBeDefined();
      expect(modifiedConfig.headers['X-Request-Start']).toBeDefined();
    });
  });
});
