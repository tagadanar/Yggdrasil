/**
 * Comprehensive test suite for ErrorHandler middleware
 * Tests error logging, response formatting, and error handling behaviors
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorHandler } from '../../src/middleware/error-handler';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError
} from '../../src/errors/AppError';
import { logger } from '../../src/logging/logger';
import { config } from '../../src/config/env-validator';

// Mock logger
jest.mock('../../src/logging/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock config for environment testing
jest.mock('../../src/config/env-validator', () => ({
  config: {
    NODE_ENV: 'development'
  }
}));

describe('ErrorHandler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.SpyInstance;
  let statusSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {
      id: 'req-123',
      method: 'GET',
      originalUrl: '/api/test',
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'Mozilla/5.0 (Test Browser)'
      }
    };

    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    mockResponse = {
      status: statusSpy,
      json: jsonSpy
    };

    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('handle()', () => {
    it('should handle ValidationError correctly', () => {
      const validationErrors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password too short' }
      ];
      const error = new ValidationError(validationErrors);

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(422);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Validation failed: email, password',
            code: 'ValidationError',
            statusCode: 422,
            validationErrors: validationErrors,
            requestId: 'req-123'
          })
        })
      );
    });

    it('should handle AuthenticationError correctly', () => {
      const error = new AuthenticationError('Invalid token');

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Invalid token',
            code: 'AuthenticationError',
            statusCode: 401
          })
        })
      );
    });

    it('should handle RateLimitError with retryAfter', () => {
      const error = new RateLimitError(60, 'Too many requests');

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Too many requests',
            retryAfter: 60
          })
        })
      );
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('User', '123');

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: "User with id '123' not found",
            code: 'NotFoundError',
            statusCode: 404
          })
        })
      );
    });

    it('should handle unexpected errors as internal server errors', () => {
      const error = new Error('Unexpected database connection error');

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Unexpected database connection error',
            code: 'INTERNAL_ERROR',
            statusCode: 500
          })
        })
      );
    });

    it('should mask error messages in production for unexpected errors', () => {
      // Mock production environment
      (config as any).NODE_ENV = 'production';

      const error = new Error('Sensitive database connection string exposed');

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Internal server error' // Should be masked
          })
        })
      );

      // Reset to development
      (config as any).NODE_ENV = 'development';
    });

    it('should include debug information in development', () => {
      const error = new ValidationError([{ field: 'test', message: 'test error' }]);

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = jsonSpy.mock.calls[0][0];
      expect(responseCall.debug).toBeDefined();
      expect(responseCall.debug.stack).toBeDefined();
      expect(responseCall.debug.context).toBeDefined();
    });

    it('should exclude debug information in production', () => {
      (config as any).NODE_ENV = 'production';

      const error = new ValidationError([{ field: 'test', message: 'test error' }]);

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = jsonSpy.mock.calls[0][0];
      expect(responseCall.debug).toBeUndefined();

      // Reset to development
      (config as any).NODE_ENV = 'development';
    });
  });

  describe('Error Logging', () => {
    it('should log operational errors as warnings', () => {
      const error = new AuthenticationError('Login failed');
      const mockUser = { id: 'user-123' };
      mockRequest.user = mockUser;

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Operational error', 
        expect.objectContaining({
          requestId: 'req-123',
          method: 'GET',
          url: '/api/test',
          userId: 'user-123',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Test Browser)',
          error: expect.objectContaining({
            name: 'AuthenticationError',
            message: 'Login failed'
          })
        })
      );
    });

    it('should log unexpected errors as errors', () => {
      const error = new Error('Critical system failure');

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Unexpected error',
        expect.objectContaining({
          requestId: 'req-123',
          error: expect.objectContaining({
            name: 'Error',
            message: 'Critical system failure',
            stack: expect.any(String)
          })
        })
      );
    });

    it('should log non-operational errors as errors', () => {
      const error = new DatabaseError('connection.pool.exhausted');

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith('Unexpected error',
        expect.objectContaining({
          error: expect.objectContaining({
            name: 'DatabaseError'
          })
        })
      );
    });

    it('should handle missing request properties gracefully', () => {
      const minimalRequest = { originalUrl: '/test', headers: {} } as Request;
      const error = new AuthenticationError();

      ErrorHandler.handle(error, minimalRequest, mockResponse as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Operational error',
        expect.objectContaining({
          requestId: undefined,
          method: undefined,
          userId: undefined,
          ip: undefined,
          userAgent: undefined
        })
      );
    });
  });

  describe('asyncHandler()', () => {
    it('should wrap async functions and catch rejections', async () => {
      const asyncFunction = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFunction = ErrorHandler.asyncHandler(asyncFunction);

      await wrappedFunction(mockRequest, mockResponse, mockNext);

      expect(asyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass through successful async functions', async () => {
      const asyncFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = ErrorHandler.asyncHandler(asyncFunction);

      await wrappedFunction(mockRequest, mockResponse, mockNext);

      expect(asyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle synchronous functions', () => {
      const syncFunction = jest.fn().mockReturnValue('sync result');
      const wrappedFunction = ErrorHandler.asyncHandler(syncFunction);

      wrappedFunction(mockRequest, mockResponse, mockNext);

      expect(syncFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not catch synchronous errors in wrapped functions', () => {
      const errorFunction = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      const wrappedFunction = ErrorHandler.asyncHandler(errorFunction);

      // asyncHandler only catches async rejections, not sync errors
      expect(() => {
        wrappedFunction(mockRequest, mockResponse, mockNext);
      }).toThrow('Sync error');
      
      expect(errorFunction).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('notFound()', () => {
    it('should handle 404 errors correctly', () => {
      ErrorHandler.notFound(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: "Route with id '/api/test' not found",
            code: 'NotFoundError',
            statusCode: 404
          })
        })
      );
    });
  });

  describe('Response Format Consistency', () => {
    it('should maintain consistent response structure for all error types', () => {
      const errors = [
        new ValidationError([{ field: 'test', message: 'test' }]),
        new AuthenticationError('Auth failed'),
        new NotFoundError('Resource'),
        new RateLimitError(60),
        new ExternalServiceError('test-service', 'Service down'),
        new DatabaseError('query.failed'),
        new Error('Unexpected error')
      ];

      errors.forEach(error => {
        jest.clearAllMocks();
        ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

        const responseCall = jsonSpy.mock.calls[0][0];
        
        // All responses should have these base properties
        expect(responseCall).toHaveProperty('success', false);
        expect(responseCall.error).toHaveProperty('message');
        expect(responseCall.error).toHaveProperty('statusCode');
        expect(responseCall.error).toHaveProperty('timestamp');
        expect(responseCall.error).toHaveProperty('requestId');
        
        // Status code should match error status code
        expect(statusSpy).toHaveBeenCalledWith(responseCall.error.statusCode);
      });
    });

    it('should include timestamp in ISO format', () => {
      const error = new AuthenticationError();

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = jsonSpy.mock.calls[0][0];
      const timestamp = responseCall.error.timestamp;
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null or undefined error gracefully', () => {
      const nullError = new Error('Null error scenario');

      expect(() => {
        ErrorHandler.handle(nullError, mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
      
      expect(statusSpy).toHaveBeenCalledWith(500);
    });

    it('should handle error with circular references in context', () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;
      
      const error = new AuthenticationError('Test', { circular: circularObject });

      expect(() => {
        ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);
      }).not.toThrow();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new Error(longMessage);

      ErrorHandler.handle(error, mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = jsonSpy.mock.calls[0][0];
      expect(responseCall.error.message).toBe(longMessage);
    });
  });
});