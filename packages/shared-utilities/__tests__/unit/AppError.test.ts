/**
 * Comprehensive test suite for AppError classes
 * Tests all error types and their specific behaviors
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError
} from '../../src/errors/AppError';

describe('AppError Classes', () => {
  
  describe('AppError (Base Class)', () => {
    class TestError extends AppError {
      constructor(message: string) {
        super(message, 400);
      }
    }

    it('should create an error with all required properties', () => {
      const error = new TestError('Test error message');
      
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('TestError');
      expect(error.stack).toBeDefined();
    });

    it('should include context when provided', () => {
      const context = { userId: '123', action: 'test' };
      const error = new TestError('Test with context');
      error.context = context;
      
      expect(error.context).toEqual(context);
    });

    it('should serialize to JSON correctly', () => {
      const context = { test: 'value' };
      const error = new TestError('Serialization test');
      error.context = context;
      
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'TestError',
        message: 'Serialization test',
        statusCode: 400,
        timestamp: error.timestamp,
        context: context,
        stack: error.stack
      });
    });

    it('should set isOperational to false when specified', () => {
      class NonOperationalError extends AppError {
        constructor() {
          super('Critical error', 500, false);
        }
      }
      
      const error = new NonOperationalError();
      expect(error.isOperational).toBe(false);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field errors', () => {
      const validationErrors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password must be at least 8 characters', value: '123' }
      ];
      
      const error = new ValidationError(validationErrors);
      
      expect(error.statusCode).toBe(422);
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.message).toBe('Validation failed: email, password');
      expect(error.context?.errors).toEqual(validationErrors);
    });

    it('should handle single validation error', () => {
      const error = new ValidationError([
        { field: 'username', message: 'Username already exists' }
      ]);
      
      expect(error.message).toBe('Validation failed: username');
      expect(error.validationErrors).toHaveLength(1);
    });

    it('should handle empty validation errors array', () => {
      const error = new ValidationError([]);
      expect(error.message).toBe('Validation failed: ');
      expect(error.validationErrors).toEqual([]);
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with default message', () => {
      const error = new AuthenticationError();
      
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication failed');
      expect(error.isOperational).toBe(true);
    });

    it('should create authentication error with custom message', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
    });

    it('should include context when provided', () => {
      const context = { attemptedEmail: 'test@example.com', ip: '192.168.1.1' };
      const error = new AuthenticationError('Failed login attempt', context);
      
      expect(error.context).toEqual(context);
    });
  });

  describe('AuthorizationError', () => {
    it('should create authorization error with default message', () => {
      const error = new AuthorizationError();
      
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
    });

    it('should create authorization error with custom message and context', () => {
      const context = { requiredRole: 'admin', userRole: 'student' };
      const error = new AuthorizationError('Insufficient privileges', context);
      
      expect(error.message).toBe('Insufficient privileges');
      expect(error.context).toEqual(context);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with resource name only', () => {
      const error = new NotFoundError('User');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.context).toEqual({ resource: 'User', identifier: undefined });
    });

    it('should create not found error with resource and identifier', () => {
      const error = new NotFoundError('Course', '123');
      
      expect(error.message).toBe("Course with id '123' not found");
      expect(error.context).toEqual({ resource: 'Course', identifier: '123' });
    });

    it('should handle numeric identifiers', () => {
      const error = new NotFoundError('Article', 456);
      
      expect(error.message).toBe("Article with id '456' not found");
      expect(error.context?.identifier).toBe(456);
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with message', () => {
      const error = new ConflictError('Email already exists');
      
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already exists');
    });

    it('should include context when provided', () => {
      const context = { email: 'test@example.com', userId: '123' };
      const error = new ConflictError('Duplicate user registration', context);
      
      expect(error.context).toEqual(context);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retry after', () => {
      const error = new RateLimitError(60);
      
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
      expect(error.message).toBe('Too many requests');
      expect(error.context?.retryAfter).toBe(60);
    });

    it('should create rate limit error with custom message', () => {
      const error = new RateLimitError(120, 'API quota exceeded');
      
      expect(error.message).toBe('API quota exceeded');
      expect(error.retryAfter).toBe(120);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create external service error', () => {
      const error = new ExternalServiceError('payment-service', 'Connection timeout');
      
      expect(error.statusCode).toBe(502);
      expect(error.service).toBe('payment-service');
      expect(error.message).toBe('External service error (payment-service): Connection timeout');
      expect(error.context?.service).toBe('payment-service');
    });

    it('should include original error when provided', () => {
      const originalError = new Error('Network error');
      const error = new ExternalServiceError('email-service', 'Failed to send email', originalError);
      
      expect(error.originalError).toBe(originalError);
      expect(error.context?.originalError).toBe('Network error');
    });

    it('should handle undefined original error', () => {
      const error = new ExternalServiceError('test-service', 'Service unavailable');
      
      expect(error.originalError).toBeUndefined();
      expect(error.context?.originalError).toBeUndefined();
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with operation', () => {
      const error = new DatabaseError('user.create');
      
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false); // Database errors are not operational
      expect(error.operation).toBe('user.create');
      expect(error.message).toBe('Database operation failed: user.create');
    });

    it('should include original error when provided', () => {
      const originalError = new Error('Connection lost');
      const error = new DatabaseError('course.update', originalError);
      
      expect(error.originalError).toBe(originalError);
      expect(error.context?.originalError).toBe('Connection lost');
      expect(error.context?.operation).toBe('course.update');
    });
  });

  describe('Error Inheritance and Type Guards', () => {
    it('should maintain proper inheritance chain', () => {
      const validationError = new ValidationError([{ field: 'test', message: 'test' }]);
      
      expect(validationError instanceof ValidationError).toBe(true);
      expect(validationError instanceof AppError).toBe(true);
      expect(validationError instanceof Error).toBe(true);
    });

    it('should allow type discrimination', () => {
      const errors: AppError[] = [
        new ValidationError([{ field: 'test', message: 'test' }]),
        new AuthenticationError(),
        new NotFoundError('User', '123'),
        new RateLimitError(60)
      ];

      errors.forEach(error => {
        if (error instanceof ValidationError) {
          expect(error.validationErrors).toBeDefined();
        } else if (error instanceof NotFoundError) {
          expect(error.context?.resource).toBeDefined();
        } else if (error instanceof RateLimitError) {
          expect(error.retryAfter).toBeDefined();
        }
      });
    });
  });

  describe('Error Context and Metadata', () => {
    it('should preserve context across different error types', () => {
      const baseContext = { requestId: 'req-123', userId: 'user-456' };
      
      const authError = new AuthenticationError('Login failed', baseContext);
      const notFoundError = new NotFoundError('User', 'user-456');
      
      expect(authError.context).toEqual(baseContext);
      expect(notFoundError.context).toEqual({ 
        resource: 'User', 
        identifier: 'user-456' 
      });
    });

    it('should maintain timestamp precision', () => {
      const before = Date.now();
      const error = new AuthenticationError();
      const after = Date.now();
      
      const errorTime = error.timestamp.getTime();
      expect(errorTime).toBeGreaterThanOrEqual(before);
      expect(errorTime).toBeLessThanOrEqual(after);
    });
  });
});