// packages/shared-utilities/__tests__/unit/ResponseHelper.test.ts
// Test coverage for ResponseHelper class

import { ResponseHelper } from '../../src/helpers/response';
import { HTTP_STATUS } from '../../src/constants';

describe('ResponseHelper', () => {
  describe('success', () => {
    it('should create successful response with data', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Operation successful';
      
      const response = ResponseHelper.success(data, message);
      
      expect(response).toEqual({
        success: true,
        data,
        message,
        timestamp: expect.any(String),
      });
      
      // Validate ISO timestamp format
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });

    it('should create successful response without message', () => {
      const data = { test: true };
      
      const response = ResponseHelper.success(data);
      
      expect(response).toEqual({
        success: true,
        data,
        message: undefined,
        timestamp: expect.any(String),
      });
    });

    it('should handle null data', () => {
      const response = ResponseHelper.success(null);
      
      expect(response.success).toBe(true);
      expect(response.data).toBe(null);
    });
  });

  describe('error', () => {
    it('should create error response with default status code', () => {
      const errorMessage = 'Something went wrong';
      
      const response = ResponseHelper.error(errorMessage);
      
      expect(response).toEqual({
        success: false,
        error: errorMessage,
        message: errorMessage,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String),
        details: undefined,
      });
    });

    it('should create error response with custom status code', () => {
      const errorMessage = 'Bad request';
      const statusCode = HTTP_STATUS.BAD_REQUEST;
      
      const response = ResponseHelper.error(errorMessage, statusCode);
      
      expect(response).toEqual({
        success: false,
        error: errorMessage,
        message: errorMessage,
        statusCode,
        timestamp: expect.any(String),
        details: undefined,
      });
    });

    it('should create error response with details', () => {
      const errorMessage = 'Validation failed';
      const details = { field: 'email', issue: 'Invalid format' };
      
      const response = ResponseHelper.error(errorMessage, HTTP_STATUS.BAD_REQUEST, details);
      
      expect(response).toEqual({
        success: false,
        error: errorMessage,
        message: errorMessage,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        timestamp: expect.any(String),
        details,
      });
    });
  });

  describe('validationError', () => {
    it('should create validation error response with single error', () => {
      const validationErrors = [
        { field: 'email', message: 'Email is required', value: '' }
      ];
      
      const response = ResponseHelper.validationError(validationErrors);
      
      expect(response).toEqual({
        success: false,
        error: 'Email is required',
        message: 'Email is required',
        statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        timestamp: expect.any(String),
        details: {
          validationErrors,
        },
      });
    });

    it('should create validation error response with multiple errors', () => {
      const validationErrors = [
        { field: 'email', message: 'Email is required', value: '' },
        { field: 'password', message: 'Password too weak', value: '123' }
      ];
      
      const response = ResponseHelper.validationError(validationErrors);
      
      expect(response).toEqual({
        success: false,
        error: 'Email is required, Password too weak',
        message: 'Email is required, Password too weak',
        statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
        timestamp: expect.any(String),
        details: {
          validationErrors,
        },
      });
    });

    it('should handle empty validation errors array', () => {
      const response = ResponseHelper.validationError([]);
      
      expect(response.error).toBe('Validation failed');
      expect(response.message).toBe('Validation failed');
    });
  });

  describe('paginated', () => {
    it('should create paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const page = 1;
      const limit = 10;
      const total = 25;
      const message = 'Data retrieved';
      
      const response = ResponseHelper.paginated(data, page, limit, total, message);
      
      expect(response).toEqual({
        success: true,
        data,
        message,
        timestamp: expect.any(String),
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: false,
        },
      });
    });

    it('should calculate pagination correctly for last page', () => {
      const data = [{ id: 21 }, { id: 22 }];
      const page = 3;
      const limit = 10;
      const total = 22;
      
      const response = ResponseHelper.paginated(data, page, limit, total);
      
      expect(response.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 22,
        totalPages: 3,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });

    it('should handle single page scenarios', () => {
      const data = [{ id: 1 }];
      const page = 1;
      const limit = 10;
      const total = 1;
      
      const response = ResponseHelper.paginated(data, page, limit, total);
      
      expect(response.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });
  });

  describe('convenience methods', () => {
    it('notFound should create 404 error', () => {
      const response = ResponseHelper.notFound('User');
      
      expect(response).toEqual({
        success: false,
        error: 'User not found',
        message: 'User not found',
        statusCode: HTTP_STATUS.NOT_FOUND,
        timestamp: expect.any(String),
        details: undefined,
      });
    });

    it('notFound should use default resource name', () => {
      const response = ResponseHelper.notFound();
      
      expect(response.error).toBe('Resource not found');
    });

    it('unauthorized should create 401 error', () => {
      const message = 'Access token expired';
      const response = ResponseHelper.unauthorized(message);
      
      expect(response).toEqual({
        success: false,
        error: message,
        message,
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        timestamp: expect.any(String),
        details: undefined,
      });
    });

    it('unauthorized should use default message', () => {
      const response = ResponseHelper.unauthorized();
      
      expect(response.error).toBe('Unauthorized access');
    });

    it('forbidden should create 403 error', () => {
      const message = 'Admin access required';
      const response = ResponseHelper.forbidden(message);
      
      expect(response.statusCode).toBe(HTTP_STATUS.FORBIDDEN);
      expect(response.error).toBe(message);
    });

    it('conflict should create 409 error', () => {
      const message = 'Email already exists';
      const response = ResponseHelper.conflict(message);
      
      expect(response.statusCode).toBe(HTTP_STATUS.CONFLICT);
      expect(response.error).toBe(message);
    });

    it('badRequest should create 400 error', () => {
      const message = 'Invalid request format';
      const response = ResponseHelper.badRequest(message);
      
      expect(response.statusCode).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(response.error).toBe(message);
    });
  });

  describe('timestamp consistency', () => {
    it('should generate valid ISO timestamps', () => {
      const response1 = ResponseHelper.success({ test: 1 });
      const response2 = ResponseHelper.error('Test error');
      
      // Both should have valid ISO timestamps
      expect(() => new Date(response1.timestamp)).not.toThrow();
      expect(() => new Date(response2.timestamp)).not.toThrow();
      
      // Timestamps should be recent (within last second)
      const now = new Date();
      const timestamp1 = new Date(response1.timestamp);
      const timestamp2 = new Date(response2.timestamp);
      
      expect(now.getTime() - timestamp1.getTime()).toBeLessThan(1000);
      expect(now.getTime() - timestamp2.getTime()).toBeLessThan(1000);
    });
  });
});