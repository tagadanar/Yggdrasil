import { MetricsService } from '../../src/services/MetricsService';
import { MetricsConfig } from '../../src/types/gateway';

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let mockConfig: MetricsConfig;

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      collectRequestMetrics: true,
      collectErrorMetrics: true,
      collectResponseTimeMetrics: true
    };
    metricsService = new MetricsService(mockConfig);
  });

  describe('Constructor', () => {
    it('should initialize with provided config', () => {
      const config: MetricsConfig = {
        enabled: true,
        collectRequestMetrics: false,
        collectErrorMetrics: true,
        collectResponseTimeMetrics: true
      };
      
      const service = new MetricsService(config);
      expect(service).toBeInstanceOf(MetricsService);
    });
  });

  describe('recordRequest', () => {
    it('should record a successful request', () => {
      metricsService.recordRequest('auth-service', 'GET', 200, 150);
      
      const metrics = metricsService.getServiceMetrics('auth-service');
      const key = 'auth-service_GET';
      
      expect(metrics[key]).toBeDefined();
      expect(metrics[key].requestCount).toBe(1);
      expect(metrics[key].errorCount).toBe(0);
      expect(metrics[key].totalResponseTime).toBe(150);
      expect(metrics[key].minResponseTime).toBe(150);
      expect(metrics[key].maxResponseTime).toBe(150);
      expect(metrics[key].lastRequestTime).toBeInstanceOf(Date);
    });

    it('should record an error request', () => {
      metricsService.recordRequest('user-service', 'POST', 404, 80);
      
      const metrics = metricsService.getServiceMetrics('user-service');
      const key = 'user-service_POST';
      
      expect(metrics[key].requestCount).toBe(1);
      expect(metrics[key].errorCount).toBe(1);
      expect(metrics[key].totalResponseTime).toBe(80);
    });

    it('should not record when metrics are disabled', () => {
      const disabledConfig: MetricsConfig = { ...mockConfig, enabled: false };
      const disabledService = new MetricsService(disabledConfig);
      
      disabledService.recordRequest('test-service', 'GET', 200, 100);
      
      const metrics = disabledService.getAllMetrics();
      expect(Object.keys(metrics)).toHaveLength(0);
    });

    it('should aggregate multiple requests for same service/method', () => {
      metricsService.recordRequest('course-service', 'GET', 200, 100);
      metricsService.recordRequest('course-service', 'GET', 200, 200);
      metricsService.recordRequest('course-service', 'GET', 500, 150);
      
      const metrics = metricsService.getServiceMetrics('course-service');
      const key = 'course-service_GET';
      
      expect(metrics[key].requestCount).toBe(3);
      expect(metrics[key].errorCount).toBe(1); // Only the 500 status
      expect(metrics[key].totalResponseTime).toBe(450); // 100 + 200 + 150
      expect(metrics[key].minResponseTime).toBe(100);
      expect(metrics[key].maxResponseTime).toBe(200);
    });

    it('should handle different HTTP methods separately', () => {
      metricsService.recordRequest('api-service', 'GET', 200, 100);
      metricsService.recordRequest('api-service', 'POST', 201, 150);
      metricsService.recordRequest('api-service', 'PUT', 200, 120);
      
      const metrics = metricsService.getServiceMetrics('api-service');
      
      expect(Object.keys(metrics)).toHaveLength(3);
      expect(metrics['api-service_GET']).toBeDefined();
      expect(metrics['api-service_POST']).toBeDefined();
      expect(metrics['api-service_PUT']).toBeDefined();
    });

    it('should categorize error status codes correctly', () => {
      const testCases = [
        { status: 200, isError: false },
        { status: 201, isError: false },
        { status: 301, isError: false },
        { status: 400, isError: true },
        { status: 401, isError: true },
        { status: 404, isError: true },
        { status: 500, isError: true },
        { status: 503, isError: true }
      ];
      
      testCases.forEach(({ status, isError }, index) => {
        metricsService.recordRequest('test-service', `METHOD${index}`, status, 100);
      });
      
      const metrics = metricsService.getServiceMetrics('test-service');
      
      testCases.forEach(({ status, isError }, index) => {
        const key = `test-service_METHOD${index}`;
        expect(metrics[key].errorCount).toBe(isError ? 1 : 0);
      });
    });
  });

  describe('recordError', () => {
    it('should record error using recordRequest method', () => {
      const spy = jest.spyOn(metricsService, 'recordRequest');
      
      metricsService.recordError('error-service', 'POST', 500, 200);
      
      expect(spy).toHaveBeenCalledWith('error-service', 'POST', 500, 200);
      
      spy.mockRestore();
    });
  });

  describe('getAverageResponseTime', () => {
    it('should calculate average response time for a service', () => {
      metricsService.recordRequest('calc-service', 'GET', 200, 100);
      metricsService.recordRequest('calc-service', 'GET', 200, 200);
      metricsService.recordRequest('calc-service', 'POST', 201, 150);
      
      const avgTime = metricsService.getAverageResponseTime('calc-service');
      expect(avgTime).toBe(150); // (100 + 200 + 150) / 3
    });

    it('should return 0 for service with no requests', () => {
      const avgTime = metricsService.getAverageResponseTime('non-existent');
      expect(avgTime).toBe(0);
    });

    it('should only include requests for specified service', () => {
      metricsService.recordRequest('service-a', 'GET', 200, 100);
      metricsService.recordRequest('service-b', 'GET', 200, 300);
      metricsService.recordRequest('service-a', 'POST', 201, 200);
      
      const avgTimeA = metricsService.getAverageResponseTime('service-a');
      const avgTimeB = metricsService.getAverageResponseTime('service-b');
      
      expect(avgTimeA).toBe(150); // (100 + 200) / 2
      expect(avgTimeB).toBe(300); // 300 / 1
    });
  });

  describe('getErrorCount', () => {
    it('should return total error count for a service', () => {
      metricsService.recordRequest('error-service', 'GET', 200, 100); // Not error
      metricsService.recordRequest('error-service', 'GET', 404, 150); // Error
      metricsService.recordRequest('error-service', 'POST', 500, 200); // Error
      metricsService.recordRequest('error-service', 'PUT', 201, 120); // Not error
      
      const errorCount = metricsService.getErrorCount('error-service');
      expect(errorCount).toBe(2);
    });

    it('should return 0 for service with no errors', () => {
      metricsService.recordRequest('success-service', 'GET', 200, 100);
      metricsService.recordRequest('success-service', 'POST', 201, 150);
      
      const errorCount = metricsService.getErrorCount('success-service');
      expect(errorCount).toBe(0);
    });

    it('should return 0 for non-existent service', () => {
      const errorCount = metricsService.getErrorCount('non-existent');
      expect(errorCount).toBe(0);
    });
  });

  describe('getRequestCount', () => {
    it('should return total request count for a service', () => {
      metricsService.recordRequest('count-service', 'GET', 200, 100);
      metricsService.recordRequest('count-service', 'POST', 201, 150);
      metricsService.recordRequest('count-service', 'GET', 404, 80);
      metricsService.recordRequest('count-service', 'DELETE', 200, 120);
      
      const requestCount = metricsService.getRequestCount('count-service');
      expect(requestCount).toBe(4);
    });

    it('should return 0 for non-existent service', () => {
      const requestCount = metricsService.getRequestCount('non-existent');
      expect(requestCount).toBe(0);
    });

    it('should only count requests for specified service', () => {
      metricsService.recordRequest('service-x', 'GET', 200, 100);
      metricsService.recordRequest('service-y', 'GET', 200, 150);
      metricsService.recordRequest('service-x', 'POST', 201, 120);
      
      const countX = metricsService.getRequestCount('service-x');
      const countY = metricsService.getRequestCount('service-y');
      
      expect(countX).toBe(2);
      expect(countY).toBe(1);
    });
  });

  describe('getAllMetrics', () => {
    it('should return all recorded metrics', () => {
      metricsService.recordRequest('service-1', 'GET', 200, 100);
      metricsService.recordRequest('service-1', 'POST', 201, 150);
      metricsService.recordRequest('service-2', 'GET', 404, 80);
      
      const allMetrics = metricsService.getAllMetrics();
      
      expect(Object.keys(allMetrics)).toHaveLength(3);
      expect(allMetrics['service-1_GET']).toBeDefined();
      expect(allMetrics['service-1_POST']).toBeDefined();
      expect(allMetrics['service-2_GET']).toBeDefined();
    });

    it('should return deep copies of metrics', () => {
      metricsService.recordRequest('service', 'GET', 200, 100);
      
      const metrics = metricsService.getAllMetrics();
      metrics['service_GET'].requestCount = 999;
      
      // Original should not be modified
      const originalMetrics = metricsService.getAllMetrics();
      expect(originalMetrics['service_GET'].requestCount).toBe(1);
    });

    it('should return empty object when no metrics recorded', () => {
      const allMetrics = metricsService.getAllMetrics();
      expect(allMetrics).toEqual({});
    });
  });

  describe('getServiceMetrics', () => {
    it('should return metrics only for specified service', () => {
      metricsService.recordRequest('auth-service', 'GET', 200, 100);
      metricsService.recordRequest('auth-service', 'POST', 201, 150);
      metricsService.recordRequest('user-service', 'GET', 200, 80);
      metricsService.recordRequest('course-service', 'PUT', 200, 120);
      
      const authMetrics = metricsService.getServiceMetrics('auth-service');
      
      expect(Object.keys(authMetrics)).toHaveLength(2);
      expect(authMetrics['auth-service_GET']).toBeDefined();
      expect(authMetrics['auth-service_POST']).toBeDefined();
      expect(authMetrics['user-service_GET']).toBeUndefined();
      expect(authMetrics['course-service_PUT']).toBeUndefined();
    });

    it('should return empty object for non-existent service', () => {
      metricsService.recordRequest('existing-service', 'GET', 200, 100);
      
      const metrics = metricsService.getServiceMetrics('non-existent-service');
      expect(metrics).toEqual({});
    });

    it('should return deep copies of service metrics', () => {
      metricsService.recordRequest('test-service', 'GET', 200, 100);
      
      const metrics = metricsService.getServiceMetrics('test-service');
      metrics['test-service_GET'].requestCount = 999;
      
      // Original should not be modified
      const originalMetrics = metricsService.getServiceMetrics('test-service');
      expect(originalMetrics['test-service_GET'].requestCount).toBe(1);
    });

    it('should handle service names that are prefixes of other services', () => {
      metricsService.recordRequest('auth', 'GET', 200, 100);
      metricsService.recordRequest('auth-service', 'GET', 200, 150);
      metricsService.recordRequest('auth-service-v2', 'POST', 201, 200);
      
      const authMetrics = metricsService.getServiceMetrics('auth');
      
      // Should return all services that start with 'auth'
      expect(Object.keys(authMetrics)).toHaveLength(3);
      expect(authMetrics['auth_GET']).toBeDefined();
      expect(authMetrics['auth-service_GET']).toBeDefined();
      expect(authMetrics['auth-service-v2_POST']).toBeDefined();
    });
  });

  describe('resetMetrics', () => {
    beforeEach(() => {
      metricsService.recordRequest('service-1', 'GET', 200, 100);
      metricsService.recordRequest('service-1', 'POST', 201, 150);
      metricsService.recordRequest('service-2', 'GET', 404, 80);
      metricsService.recordRequest('service-3', 'PUT', 200, 120);
    });

    it('should reset all metrics when no service specified', () => {
      expect(Object.keys(metricsService.getAllMetrics())).toHaveLength(4);
      
      metricsService.resetMetrics();
      
      expect(Object.keys(metricsService.getAllMetrics())).toHaveLength(0);
    });

    it('should reset metrics only for specified service', () => {
      expect(Object.keys(metricsService.getAllMetrics())).toHaveLength(4);
      
      metricsService.resetMetrics('service-1');
      
      const remainingMetrics = metricsService.getAllMetrics();
      expect(Object.keys(remainingMetrics)).toHaveLength(2);
      expect(remainingMetrics['service-1_GET']).toBeUndefined();
      expect(remainingMetrics['service-1_POST']).toBeUndefined();
      expect(remainingMetrics['service-2_GET']).toBeDefined();
      expect(remainingMetrics['service-3_PUT']).toBeDefined();
    });

    it('should handle resetting non-existent service gracefully', () => {
      const initialCount = Object.keys(metricsService.getAllMetrics()).length;
      
      metricsService.resetMetrics('non-existent-service');
      
      const finalCount = Object.keys(metricsService.getAllMetrics()).length;
      expect(finalCount).toBe(initialCount);
    });

    it('should handle service names that are prefixes', () => {
      metricsService.recordRequest('auth', 'GET', 200, 100);
      metricsService.recordRequest('auth-service', 'GET', 200, 150);
      
      metricsService.resetMetrics('auth');
      
      const remainingMetrics = metricsService.getAllMetrics();
      // Should remove both 'auth' and 'auth-service' metrics
      expect(remainingMetrics['auth_GET']).toBeUndefined();
      expect(remainingMetrics['auth-service_GET']).toBeUndefined();
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle zero response time', () => {
      metricsService.recordRequest('fast-service', 'GET', 200, 0);
      
      const metrics = metricsService.getServiceMetrics('fast-service');
      expect(metrics['fast-service_GET'].minResponseTime).toBe(0);
      expect(metrics['fast-service_GET'].maxResponseTime).toBe(0);
      expect(metrics['fast-service_GET'].totalResponseTime).toBe(0);
    });

    it('should handle very large response times', () => {
      const largeTime = Number.MAX_SAFE_INTEGER;
      metricsService.recordRequest('slow-service', 'GET', 200, largeTime);
      
      const metrics = metricsService.getServiceMetrics('slow-service');
      expect(metrics['slow-service_GET'].maxResponseTime).toBe(largeTime);
    });

    it('should handle many requests efficiently', () => {
      const startTime = Date.now();
      
      // Record 10,000 requests
      for (let i = 0; i < 10000; i++) {
        metricsService.recordRequest('load-test', 'GET', 200, i % 1000);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      
      const metrics = metricsService.getServiceMetrics('load-test');
      expect(metrics['load-test_GET'].requestCount).toBe(10000);
    });

    it('should handle concurrent access patterns', () => {
      const promises = [];
      
      // Simulate concurrent requests
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            metricsService.recordRequest('concurrent-service', 'GET', 200, i);
          })
        );
      }
      
      return Promise.all(promises).then(() => {
        const metrics = metricsService.getServiceMetrics('concurrent-service');
        expect(metrics['concurrent-service_GET'].requestCount).toBe(100);
      });
    });

    it('should maintain metric integrity with mixed operations', () => {
      // Mix of successful and error requests with different response times
      const testData = [
        { method: 'GET', status: 200, time: 50 },
        { method: 'GET', status: 404, time: 30 },
        { method: 'POST', status: 201, time: 100 },
        { method: 'GET', status: 500, time: 200 },
        { method: 'PUT', status: 200, time: 75 },
        { method: 'GET', status: 200, time: 25 }
      ];
      
      testData.forEach(({ method, status, time }) => {
        metricsService.recordRequest('integrity-test', method, status, time);
      });
      
      const getMetrics = metricsService.getServiceMetrics('integrity-test')['integrity-test_GET'];
      expect(getMetrics.requestCount).toBe(4); // 4 GET requests
      expect(getMetrics.errorCount).toBe(2); // 404 and 500
      expect(getMetrics.minResponseTime).toBe(25);
      expect(getMetrics.maxResponseTime).toBe(200);
      expect(getMetrics.totalResponseTime).toBe(305); // 50+30+200+25
      
      const postMetrics = metricsService.getServiceMetrics('integrity-test')['integrity-test_POST'];
      expect(postMetrics.requestCount).toBe(1);
      expect(postMetrics.errorCount).toBe(0);
      
      const avgTime = metricsService.getAverageResponseTime('integrity-test');
      expect(avgTime).toBe(80); // (50+30+100+200+75+25) / 6
    });
  });

  describe('Timestamp Handling', () => {
    it('should update lastRequestTime for each request', () => {
      const before = new Date();
      
      metricsService.recordRequest('time-service', 'GET', 200, 100);
      
      const after = new Date();
      const metrics = metricsService.getServiceMetrics('time-service');
      const lastRequestTime = metrics['time-service_GET'].lastRequestTime;
      
      expect(lastRequestTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastRequestTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update lastRequestTime on subsequent requests', () => {
      metricsService.recordRequest('time-service', 'GET', 200, 100);
      const firstTime = metricsService.getServiceMetrics('time-service')['time-service_GET'].lastRequestTime;
      
      // Wait a small amount
      setTimeout(() => {
        metricsService.recordRequest('time-service', 'GET', 200, 150);
        const secondTime = metricsService.getServiceMetrics('time-service')['time-service_GET'].lastRequestTime;
        
        expect(secondTime.getTime()).toBeGreaterThan(firstTime.getTime());
      }, 10);
    });
  });
});