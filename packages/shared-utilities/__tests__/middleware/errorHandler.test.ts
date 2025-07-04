import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  validationErrorHandler,
  mongoErrorHandler,
  jwtErrorHandler,
  CustomError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  ErrorUtils,
  AppError
} from '../../src/middleware/errorHandler';
import { HTTP_STATUS } from '../../src/constants';

// Mock dependencies
jest.mock('../../../database-schemas/src', () => ({
  AuditLogModel: {
    logAction: jest.fn().mockResolvedValue(true)
  }
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {
      method: 'GET',
      path: '/test',
      url: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      user: { id: 'user123' },
      requestId: 'req123'
    } as any;
    
    mockResponse = {
      status: mockStatus,
      json: mockJson
    } as any;
    
    mockNext = jest.fn();
    
    // Clear console mocks
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom Error Classes', () => {
    describe('CustomError', () => {
      it('should create custom error with default values', () => {
        const error = new CustomError('Test error');
        
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(error.code).toBe('UNKNOWN_ERROR');
        expect(error.isOperational).toBe(true);
        expect(error.name).toBe('CustomError');
      });

      it('should create custom error with all parameters', () => {
        const details = { field: 'value' };
        const error = new CustomError('Test error', 400, 'TEST_ERROR', details);
        
        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('TEST_ERROR');
        expect(error.details).toBe(details);
        expect(error.isOperational).toBe(true);
      });
    });

    describe('ValidationError', () => {
      it('should create validation error', () => {
        const details = [{ field: 'email', message: 'Invalid email' }];
        const error = new ValidationError('Validation failed', details);
        
        expect(error.message).toBe('Validation failed');
        expect(error.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toBe(details);
      });
    });

    describe('AuthenticationError', () => {
      it('should create authentication error with default message', () => {
        const error = new AuthenticationError();
        
        expect(error.message).toBe('Authentication required');
        expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
      });

      it('should create authentication error with custom message', () => {
        const error = new AuthenticationError('Invalid credentials');
        
        expect(error.message).toBe('Invalid credentials');
        expect(error.statusCode).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(error.code).toBe('AUTHENTICATION_ERROR');
      });
    });

    describe('AuthorizationError', () => {
      it('should create authorization error', () => {
        const error = new AuthorizationError('Access denied');
        
        expect(error.message).toBe('Access denied');
        expect(error.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
        expect(error.code).toBe('AUTHORIZATION_ERROR');
      });
    });

    describe('NotFoundError', () => {
      it('should create not found error with default resource', () => {
        const error = new NotFoundError();
        
        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
        expect(error.code).toBe('NOT_FOUND');
      });

      it('should create not found error with custom resource', () => {
        const error = new NotFoundError('User');
        
        expect(error.message).toBe('User not found');
        expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
        expect(error.code).toBe('NOT_FOUND');
      });
    });

    describe('ConflictError', () => {
      it('should create conflict error', () => {
        const details = { field: 'email', value: 'test@example.com' };
        const error = new ConflictError('Email already exists', details);
        
        expect(error.message).toBe('Email already exists');
        expect(error.statusCode).toBe(HTTP_STATUS.CONFLICT);
        expect(error.code).toBe('CONFLICT_ERROR');
        expect(error.details).toBe(details);
      });
    });

    describe('RateLimitError', () => {
      it('should create rate limit error', () => {
        const error = new RateLimitError();
        
        expect(error.message).toBe('Rate limit exceeded');
        expect(error.statusCode).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        expect(error.code).toBe('RATE_LIMIT_ERROR');
      });
    });

    describe('ServiceUnavailableError', () => {
      it('should create service unavailable error', () => {
        const error = new ServiceUnavailableError('Database');
        
        expect(error.message).toBe('Database temporarily unavailable');
        expect(error.statusCode).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(error.code).toBe('SERVICE_UNAVAILABLE');
      });
    });
  });

  describe('Error Handler Middleware', () => {
    it('should handle custom error correctly', () => {
      const error = new ValidationError('Validation failed', [{ field: 'email' }]);
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        requestId: 'req123',
        validationErrors: [{ field: 'email' }]
      }));
    });

    it('should handle generic error with defaults', () => {
      const error = new Error('Generic error') as AppError;
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Generic error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(String),
        requestId: 'req123'
      }));
    });

    it('should include details and stack in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new CustomError('Test error', 400, 'TEST_ERROR', { detail: 'test' });
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        details: { detail: 'test' },
        stack: expect.any(String)
      }));
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new CustomError('Test error', 400, 'TEST_ERROR', { detail: 'test' });
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      const response = mockJson.mock.calls[0][0];
      expect(response.details).toBeUndefined();
      expect(response.stack).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should log server errors', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new CustomError('Server error', 500, 'SERVER_ERROR');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(consoleSpy).toHaveBeenCalledWith('Server Error:', expect.any(Object));
    });

    it('should log client errors as warnings', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      const error = new ValidationError('Client error');
      
      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(consoleSpy).toHaveBeenCalledWith('Client Error:', expect.any(Object));
    });
  });

  describe('Async Handler', () => {
    it('should handle successful async function', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);
      
      await wrappedFn(mockRequest, mockResponse, mockNext);
      
      expect(asyncFn).toHaveBeenCalledWith(mockRequest, mockResponse, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass errors to next function', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);
      
      await wrappedFn(mockRequest, mockResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle sync functions that throw', async () => {
      const error = new Error('Sync error');
      const syncFn = jest.fn().mockImplementation(() => {
        throw error;
      });
      const wrappedFn = asyncHandler(syncFn);
      
      try {
        await wrappedFn(mockRequest, mockResponse, mockNext);
      } catch (e) {
        // The asyncHandler should catch the error and call next, not throw
      }
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Not Found Handler', () => {
    it('should create not found error for route', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route GET /test not found',
          statusCode: HTTP_STATUS.NOT_FOUND,
          code: 'NOT_FOUND'
        })
      );
    });
  });

  describe('Validation Error Handler', () => {
    it('should handle Joi validation error', () => {
      const joiError = {
        name: 'ValidationError',
        details: [
          { message: 'email is required' },
          { message: 'password is required' }
        ]
      };
      
      const result = validationErrorHandler(joiError);
      
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('email is required; password is required');
      expect(result.details).toBe(joiError.details);
    });

    it('should handle Zod validation error', () => {
      const zodError = {
        name: 'ZodError',
        issues: [
          { message: 'Invalid email format' },
          { message: 'Password too short' }
        ]
      };
      
      const result = validationErrorHandler(zodError);
      
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Invalid email format; Password too short');
      expect(result.details).toBe(zodError.issues);
    });

    it('should pass through non-validation errors', () => {
      const regularError = new Error('Regular error');
      const result = validationErrorHandler(regularError);
      
      expect(result).toBe(regularError);
    });
  });

  describe('MongoDB Error Handler', () => {
    it('should handle duplicate key error', () => {
      const mongoError = {
        name: 'MongoServerError',
        code: 11000,
        keyPattern: { email: 1 },
        keyValue: { email: 'test@example.com' }
      };
      
      const result = mongoErrorHandler(mongoError);
      
      expect(result).toBeInstanceOf(ConflictError);
      expect(result.message).toBe('email already exists');
      expect(result.details).toEqual({
        field: 'email',
        value: 'test@example.com'
      });
    });

    it('should handle invalid ObjectId error', () => {
      const mongoError = {
        name: 'MongoServerError',
        code: 16755
      };
      
      const result = mongoErrorHandler(mongoError);
      
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Invalid ID format');
    });

    it('should handle cast error', () => {
      const castError = {
        name: 'CastError',
        path: 'userId',
        value: 'invalid-id'
      };
      
      const result = mongoErrorHandler(castError);
      
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('Invalid userId: invalid-id');
    });

    it('should handle generic mongo error', () => {
      const mongoError = {
        name: 'MongoServerError',
        code: 9999 // Unknown code
      };
      
      const result = mongoErrorHandler(mongoError);
      
      expect(result).toBeInstanceOf(CustomError);
      expect(result.message).toBe('Database operation failed');
      expect(result.code).toBe('DATABASE_ERROR');
    });

    it('should pass through non-mongo errors', () => {
      const regularError = new Error('Regular error');
      const result = mongoErrorHandler(regularError);
      
      expect(result).toBe(regularError);
    });
  });

  describe('JWT Error Handler', () => {
    it('should handle invalid token error', () => {
      const jwtError = {
        name: 'JsonWebTokenError',
        message: 'invalid token'
      };
      
      const result = jwtErrorHandler(jwtError);
      
      expect(result).toBeInstanceOf(AuthenticationError);
      expect(result.message).toBe('Invalid token');
    });

    it('should handle expired token error', () => {
      const jwtError = {
        name: 'TokenExpiredError',
        message: 'jwt expired'
      };
      
      const result = jwtErrorHandler(jwtError);
      
      expect(result).toBeInstanceOf(AuthenticationError);
      expect(result.message).toBe('Token expired');
    });

    it('should pass through non-JWT errors', () => {
      const regularError = new Error('Regular error');
      const result = jwtErrorHandler(regularError);
      
      expect(result).toBe(regularError);
    });
  });

  describe('Error Utils', () => {
    describe('createErrorResponse', () => {
      it('should create standardized error response', () => {
        const error = new ValidationError('Test error');
        const response = ErrorUtils.createErrorResponse(error, 'req123');
        
        expect(response).toEqual({
          success: false,
          error: 'Test error',
          code: 'VALIDATION_ERROR'
        });
      });
    });

    describe('isOperationalError', () => {
      it('should identify operational errors', () => {
        const operationalError = new CustomError('Operational error');
        const programmingError = new Error('Programming error') as AppError;
        
        expect(ErrorUtils.isOperationalError(operationalError)).toBe(true);
        expect(ErrorUtils.isOperationalError(programmingError)).toBe(false);
      });
    });

    describe('chainErrorHandlers', () => {
      it('should chain multiple error handlers', () => {
        const handler1 = jest.fn().mockImplementation((err) => {
          if (err.name === 'ValidationError') return new ValidationError(err.message);
          return err;
        });
        
        const handler2 = jest.fn().mockImplementation((err) => {
          if (err.name === 'MongoError') return new ConflictError(err.message);
          return err;
        });
        
        const chained = ErrorUtils.chainErrorHandlers(handler1, handler2);
        
        const validationError = { name: 'ValidationError', message: 'Invalid input' };
        const result = chained(validationError);
        
        expect(handler1).toHaveBeenCalledWith(validationError);
        expect(handler2).toHaveBeenCalledWith(expect.any(ValidationError));
        expect(result).toBeInstanceOf(ValidationError);
      });

      it('should handle handler failures gracefully', () => {
        const failingHandler = jest.fn().mockImplementation(() => {
          throw new Error('Handler failed');
        });
        
        const workingHandler = jest.fn().mockImplementation((err) => err);
        
        const chained = ErrorUtils.chainErrorHandlers(failingHandler, workingHandler);
        
        const originalError = new Error('Original error');
        const result = chained(originalError);
        
        expect(result).toBe(originalError);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete error flow', () => {
      // Simulate a MongoDB duplicate key error that goes through the complete flow
      const mongoError = {
        name: 'MongoServerError',
        code: 11000,
        keyPattern: { email: 1 },
        keyValue: { email: 'test@example.com' }
      };
      
      // Process through mongo error handler
      const processedError = mongoErrorHandler(mongoError);
      
      // Pass through error handler middleware
      errorHandler(processedError, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(HTTP_STATUS.CONFLICT);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'email already exists',
        code: 'CONFLICT_ERROR'
      }));
    });

    it('should handle authentication error with audit logging', () => {
      const authError = new AuthenticationError('Invalid credentials');
      
      errorHandler(authError, mockRequest as Request, mockResponse as Response, mockNext);
      
      expect(mockStatus).toHaveBeenCalledWith(HTTP_STATUS.UNAUTHORIZED);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Invalid credentials',
        code: 'AUTHENTICATION_ERROR'
      }));
    });
  });
});