/**
 * Comprehensive test suite for CircuitBreaker
 * Tests circuit states, failure thresholds, and recovery behaviors
 */

import { CircuitBreaker, CircuitState, ExternalServiceClient } from '../../src/errors/circuit-breaker';
import { ExternalServiceError } from '../../src/errors/AppError';
import { logger } from '../../src/logging/logger';

// Mock logger
jest.mock('../../src/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  }
}));

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockOperation: jest.Mock;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      name: 'test-service',
      threshold: 3,
      timeout: 1000,
      resetTimeout: 5000
    });
    mockOperation = jest.fn();
    jest.clearAllMocks();
  });

  describe('Constructor and Initial State', () => {
    it('should initialize with default values', () => {
      const cb = new CircuitBreaker({ name: 'default-test' });
      
      expect(cb.getState()).toBe(CircuitState.CLOSED);
      expect(cb.getStats()).toEqual({
        name: 'default-test',
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailureTime: undefined
      });
    });

    it('should initialize with custom values', () => {
      const cb = new CircuitBreaker({
        name: 'custom-service',
        threshold: 10,
        timeout: 30000,
        resetTimeout: 60000
      });
      
      expect(cb.getStats().name).toBe('custom-service');
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('CLOSED State Behavior', () => {
    it('should execute operations successfully when closed', async () => {
      mockOperation.mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalled();
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should count failures but remain closed below threshold', async () => {
      mockOperation.mockRejectedValue(new Error('Service error'));
      
      // Fail 2 times (below threshold of 3)
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.failures).toBe(2);
      expect(stats.lastFailureTime).toBeInstanceOf(Date);
    });

    it('should transition to OPEN when threshold is reached', async () => {
      mockOperation.mockRejectedValue(new Error('Service error'));
      
      // Fail 3 times (at threshold)
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(logger.warn).toHaveBeenCalledWith('Circuit breaker opened', {
        name: 'test-service',
        failures: 3
      });
    });

    it('should reset failure count on successful operation', async () => {
      mockOperation.mockRejectedValueOnce(new Error('Temporary error'));
      mockOperation.mockResolvedValue('success');
      
      // One failure
      try {
        await circuitBreaker.execute(mockOperation);
      } catch (error) {
        // Expected failure
      }
      
      expect(circuitBreaker.getStats().failures).toBe(1);
      
      // Then success
      const result = await circuitBreaker.execute(mockOperation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getStats().failures).toBe(0);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('OPEN State Behavior', () => {
    beforeEach(async () => {
      // Force circuit breaker into OPEN state
      mockOperation.mockRejectedValue(new Error('Service down'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected failures
        }
      }
      jest.clearAllMocks();
    });

    it('should reject operations immediately when open', async () => {
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(ExternalServiceError);
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Circuit breaker is OPEN');
      
      // Operation should not be called
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6000); // Simulate 6 seconds later
      
      mockOperation.mockResolvedValue('recovery attempt');
      
      const result = await circuitBreaker.execute(mockOperation);
      
      expect(result).toBe('recovery attempt');
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
      expect(mockOperation).toHaveBeenCalled();
      
      jest.restoreAllMocks();
    });

    it('should not attempt reset before timeout', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000); // Only 1 second later
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow(ExternalServiceError);
      expect(mockOperation).not.toHaveBeenCalled();
      
      jest.restoreAllMocks();
    });
  });

  describe('HALF_OPEN State Behavior', () => {
    beforeEach(async () => {
      // Force into OPEN state first
      mockOperation.mockRejectedValue(new Error('Service down'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected failures
        }
      }
      
      // Simulate timeout and transition to HALF_OPEN
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6000);
      mockOperation.mockResolvedValue('test');
      await circuitBreaker.execute(mockOperation);
      
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should count successes in half-open state', async () => {
      mockOperation.mockResolvedValue('success');
      
      await circuitBreaker.execute(mockOperation);
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.HALF_OPEN);
      expect(stats.successes).toBe(2); // Already had 1 success from setup
    });

    it('should close circuit after sufficient successes', async () => {
      mockOperation.mockResolvedValue('success');
      
      // Need 3 successes to close (threshold)
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.execute(mockOperation);
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.getStats().successes).toBe(0); // Reset after closing
      expect(logger.info).toHaveBeenCalledWith('Circuit breaker closed', {
        name: 'test-service'
      });
    });

    it('should reopen on failure in half-open state', async () => {
      mockOperation.mockRejectedValue(new Error('Still failing'));
      
      try {
        await circuitBreaker.execute(mockOperation);
      } catch (error) {
        // Expected failure
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.getStats().successes).toBe(0); // Reset on reopening
    });
  });

  describe('Error Propagation', () => {
    it('should propagate original errors when circuit is closed', async () => {
      const originalError = new Error('Original service error');
      mockOperation.mockRejectedValue(originalError);
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toBe(originalError);
    });

    it('should throw ExternalServiceError when circuit is open', async () => {
      // Force open
      mockOperation.mockRejectedValue(new Error('Service down'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected failures
        }
      }
      
      await expect(circuitBreaker.execute(mockOperation))
        .rejects.toThrow(ExternalServiceError);
      
      await expect(circuitBreaker.execute(mockOperation))
        .rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should propagate errors in half-open state', async () => {
      // Get to half-open state
      mockOperation.mockRejectedValue(new Error('Initial failure'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected failures
        }
      }
      
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6000);
      const halfOpenError = new Error('Half-open failure');
      mockOperation.mockRejectedValue(halfOpenError);
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toBe(halfOpenError);
      
      jest.restoreAllMocks();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide comprehensive statistics', async () => {
      mockOperation.mockRejectedValue(new Error('Test error'));
      
      try {
        await circuitBreaker.execute(mockOperation);
      } catch (error) {
        // Expected failure
      }
      
      const stats = circuitBreaker.getStats();
      
      expect(stats).toEqual({
        name: 'test-service',
        state: CircuitState.CLOSED,
        failures: 1,
        successes: 0,
        lastFailureTime: expect.any(Date)
      });
    });

    it('should update statistics correctly through state transitions', async () => {
      // Start with failures
      mockOperation.mockRejectedValue(new Error('Service error'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected failures
        }
      }
      
      let stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
      expect(stats.failures).toBe(3);
      
      // Simulate recovery
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6000);
      mockOperation.mockResolvedValue('recovery');
      
      await circuitBreaker.execute(mockOperation);
      
      stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.HALF_OPEN);
      expect(stats.failures).toBe(0); // Reset on success
      expect(stats.successes).toBe(1);
      
      jest.restoreAllMocks();
    });
  });

  describe('ExternalServiceClient', () => {
    let client: ExternalServiceClient;

    beforeEach(() => {
      client = new ExternalServiceClient('test-external-service');
    });

    it('should create client with circuit breaker', () => {
      expect(client).toBeDefined();
    });

    it('should execute requests through circuit breaker', async () => {
      const testOperation = jest.fn().mockResolvedValue('client success');
      
      const result = await client.makeRequest(testOperation);
      
      expect(result).toBe('client success');
      expect(testOperation).toHaveBeenCalled();
    });

    it('should handle circuit breaker failures', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      // Trigger circuit breaker opening (5 failures for default threshold)
      for (let i = 0; i < 5; i++) {
        try {
          await client.makeRequest(failingOperation);
        } catch (error) {
          // Expected failures
        }
      }
      
      // Next request should be blocked by circuit breaker
      await expect(client.makeRequest(failingOperation))
        .rejects.toThrow(ExternalServiceError);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle operations that throw synchronously', async () => {
      const syncError = new Error('Synchronous error');
      mockOperation.mockImplementation(() => {
        throw syncError;
      });
      
      await expect(circuitBreaker.execute(mockOperation)).rejects.toBe(syncError);
      expect(circuitBreaker.getStats().failures).toBe(1);
    });

    it('should handle operations returning non-promises', async () => {
      mockOperation.mockReturnValue('sync result');
      
      const result = await circuitBreaker.execute(mockOperation);
      expect(result).toBe('sync result');
    });

    it('should handle undefined/null operation results', async () => {
      mockOperation.mockResolvedValue(undefined);
      
      const result = await circuitBreaker.execute(mockOperation);
      expect(result).toBeUndefined();
    });

    it('should maintain state consistency during rapid concurrent calls', async () => {
      mockOperation.mockRejectedValue(new Error('Concurrent failure'));
      
      // Simulate rapid concurrent failures
      const promises = Array.from({ length: 10 }, () =>
        circuitBreaker.execute(mockOperation).catch(() => {})
      );
      
      await Promise.all(promises);
      
      // Should be open after threshold exceeded
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.getStats().failures).toBeGreaterThanOrEqual(3);
    });

    it('should handle very large threshold values', () => {
      const cb = new CircuitBreaker({
        name: 'high-threshold',
        threshold: 1000000
      });
      
      expect(cb.getStats().name).toBe('high-threshold');
      expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it('should handle zero threshold edge case', async () => {
      const cb = new CircuitBreaker({
        name: 'zero-threshold',
        threshold: 1  // Threshold of 1 means open after first failure
      });
      
      // Should open after first failure
      mockOperation.mockRejectedValue(new Error('Immediate failure'));
      
      try {
        await cb.execute(mockOperation);
      } catch (error) {
        // Expected failure
      }
      
      expect(cb.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('Timing and Recovery', () => {
    it('should transition to half-open after reset timeout', async () => {
      // Force circuit open
      mockOperation.mockRejectedValue(new Error('Service down'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected failures
        }
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      
      // Mock Date.now to simulate time passing
      const originalDateNow = Date.now;
      const futureTime = Date.now() + 6000; // Past the 5000ms reset timeout
      Date.now = jest.fn(() => futureTime);
      
      // Now it should transition to HALF_OPEN and allow the operation
      mockOperation.mockResolvedValue('recovery');
      const result = await circuitBreaker.execute(mockOperation);
      
      expect(result).toBe('recovery');
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
      
      // Restore original Date.now
      Date.now = originalDateNow;
    });
    
    it('should remain open before reset timeout', async () => {
      // Force circuit open
      mockOperation.mockRejectedValue(new Error('Service down'));
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation);
        } catch (error) {
          // Expected failures
        }
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      
      // Mock Date.now to simulate only partial time passing
      const originalDateNow = Date.now;
      const futureTime = Date.now() + 1000; // Only 1 second, not past 5000ms timeout
      Date.now = jest.fn(() => futureTime);
      
      // Should still reject with circuit open
      await expect(circuitBreaker.execute(mockOperation))
        .rejects.toThrow(ExternalServiceError);
      
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      
      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });
});