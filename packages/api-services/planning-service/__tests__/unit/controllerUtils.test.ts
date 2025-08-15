// packages/api-services/planning-service/__tests__/unit/controllerUtils.test.ts
// Unit tests for controller utility functions

import { Response } from 'express';
import { AuthRequest } from '@yggdrasil/shared-utilities';
import {
  RoleValidator,
  ValidationHelper,
  ResponseUtils,
  ControllerPatterns,
} from '../../src/utils/controllerUtils';
import { z } from 'zod';

// Mock ResponseHelper
jest.mock('@yggdrasil/shared-utilities', () => ({
  ResponseHelper: {
    success: jest.fn((data, message) => ({ success: true, data, message, statusCode: 200 })),
    error: jest.fn(message => ({ success: false, message, statusCode: 500 })),
    badRequest: jest.fn(message => ({ success: false, message, statusCode: 400 })),
    notFound: jest.fn(message => ({ success: false, message, statusCode: 404 })),
    forbidden: jest.fn(message => ({ success: false, message, statusCode: 403 })),
  },
}));

describe('Controller Utilities', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      user: {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'admin',
      },
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('RoleValidator', () => {
    describe('isAdminOrStaff', () => {
      it('should return true for admin role', () => {
        expect(RoleValidator.isAdminOrStaff('admin')).toBe(true);
      });

      it('should return true for staff role', () => {
        expect(RoleValidator.isAdminOrStaff('staff')).toBe(true);
      });

      it('should return false for other roles', () => {
        expect(RoleValidator.isAdminOrStaff('teacher')).toBe(false);
        expect(RoleValidator.isAdminOrStaff('student')).toBe(false);
      });
    });

    describe('isTeacherOrAbove', () => {
      it('should return true for teacher, admin, and staff roles', () => {
        expect(RoleValidator.isTeacherOrAbove('teacher')).toBe(true);
        expect(RoleValidator.isTeacherOrAbove('admin')).toBe(true);
        expect(RoleValidator.isTeacherOrAbove('staff')).toBe(true);
      });

      it('should return false for student role', () => {
        expect(RoleValidator.isTeacherOrAbove('student')).toBe(false);
      });
    });

    describe('validateAdminOrStaff', () => {
      it('should return null for admin user', () => {
        mockRequest.user!.role = 'admin';
        const result = RoleValidator.validateAdminOrStaff(
          mockRequest as AuthRequest,
          'test action',
        );
        expect(result).toBeNull();
      });

      it('should return null for staff user', () => {
        mockRequest.user!.role = 'staff';
        const result = RoleValidator.validateAdminOrStaff(
          mockRequest as AuthRequest,
          'test action',
        );
        expect(result).toBeNull();
      });

      it('should return error for non-admin/staff user', () => {
        mockRequest.user!.role = 'teacher';
        const result = RoleValidator.validateAdminOrStaff(
          mockRequest as AuthRequest,
          'test action',
        );
        expect(result).toBeTruthy();
      });
    });

    describe('validateStudentAccess', () => {
      it('should return null when student accesses own data', () => {
        mockRequest.user!.role = 'student';
        mockRequest.user!._id = '507f1f77bcf86cd799439011';

        const result = RoleValidator.validateStudentAccess(
          mockRequest as AuthRequest,
          '507f1f77bcf86cd799439011',
          'view',
        );
        expect(result).toBeNull();
      });

      it('should return error when student accesses other student data', () => {
        mockRequest.user!.role = 'student';
        mockRequest.user!._id = '507f1f77bcf86cd799439011';

        const result = RoleValidator.validateStudentAccess(
          mockRequest as AuthRequest,
          '507f1f77bcf86cd799439012',
          'view',
        );
        expect(result).toBeTruthy();
      });

      it('should return null for non-student users', () => {
        mockRequest.user!.role = 'admin';

        const result = RoleValidator.validateStudentAccess(
          mockRequest as AuthRequest,
          '507f1f77bcf86cd799439012',
          'view',
        );
        expect(result).toBeNull();
      });
    });
  });

  describe('ValidationHelper', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      age: z.number().min(0, 'Age must be positive'),
    });

    describe('validateBody', () => {
      it('should return data when validation passes', () => {
        const validData = { name: 'John', age: 25 };
        const result = ValidationHelper.validateBody(testSchema, validData);

        expect(result.data).toEqual(validData);
        expect(result.error).toBeNull();
      });

      it('should return error when validation fails', () => {
        const invalidData = { name: '', age: -1 };
        const result = ValidationHelper.validateBody(testSchema, invalidData);

        expect(result.data).toBeNull();
        expect(result.error).toBeTruthy();
      });
    });

    describe('validateParams', () => {
      it('should validate parameters correctly', () => {
        const paramSchema = z.object({
          id: z.string().min(1, 'ID is required'),
        });

        const validParams = { id: '123' };
        const result = ValidationHelper.validateParams(paramSchema, validParams);

        expect(result.data).toEqual(validParams);
        expect(result.error).toBeNull();
      });
    });

    describe('validateQuery', () => {
      it('should validate query parameters correctly', () => {
        const querySchema = z.object({
          page: z.string().optional(),
          limit: z.string().optional(),
        });

        const validQuery = { page: '1', limit: '10' };
        const result = ValidationHelper.validateQuery(querySchema, validQuery);

        expect(result.data).toEqual(validQuery);
        expect(result.error).toBeNull();
      });
    });
  });

  describe('ResponseUtils', () => {
    describe('handleAsync', () => {
      it('should handle successful operations', async () => {
        const mockOperation = jest.fn().mockResolvedValue({ id: 1, name: 'Test' });

        await ResponseUtils.handleAsync(
          mockOperation,
          'Operation successful',
          mockResponse as Response,
        );

        expect(mockOperation).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it('should handle failed operations', async () => {
        const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

        await ResponseUtils.handleAsync(
          mockOperation,
          'Operation successful',
          mockResponse as Response,
        );

        expect(mockOperation).toHaveBeenCalled();
        // Should handle error response
      });

      it('should use custom status code', async () => {
        const mockOperation = jest.fn().mockResolvedValue({ id: 1 });

        await ResponseUtils.handleAsync(
          mockOperation,
          'Created successfully',
          mockResponse as Response,
          201,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });
    });

    describe('handleNotFound', () => {
      it('should handle not found responses consistently', () => {
        ResponseUtils.handleNotFound(mockResponse as Response, 'User');
        expect(mockResponse.status).toHaveBeenCalled();
      });
    });

    describe('handleValidationError', () => {
      it('should handle validation errors consistently', () => {
        const mockError = { statusCode: 400, message: 'Validation failed' };
        ResponseUtils.handleValidationError(mockResponse as Response, mockError);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });
  });

  describe('ControllerPatterns', () => {
    describe('handleGet', () => {
      it('should handle successful get operations', async () => {
        const mockOperation = jest.fn().mockResolvedValue({ id: '123', name: 'Test Resource' });

        await ControllerPatterns.handleGet(
          mockRequest as AuthRequest,
          mockResponse as Response,
          '123',
          mockOperation,
          'Resource',
        );

        expect(mockOperation).toHaveBeenCalledWith('123');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it('should handle resource not found', async () => {
        const mockOperation = jest.fn().mockResolvedValue(null);

        await ControllerPatterns.handleGet(
          mockRequest as AuthRequest,
          mockResponse as Response,
          '123',
          mockOperation,
          'Resource',
        );

        expect(mockOperation).toHaveBeenCalledWith('123');
        // Should handle not found error
      });
    });

    describe('handleCreate', () => {
      it('should handle successful creation with proper role', async () => {
        const createSchema = z.object({
          name: z.string().min(1, 'Name is required'),
        });

        mockRequest.body = { name: 'Test Resource' };
        mockRequest.user!.role = 'admin';

        const mockOperation = jest.fn().mockResolvedValue({ id: '123', name: 'Test Resource' });

        await ControllerPatterns.handleCreate(
          mockRequest as AuthRequest,
          mockResponse as Response,
          createSchema,
          mockOperation,
          'Resource',
          'adminOrStaff',
        );

        expect(mockOperation).toHaveBeenCalledWith(
          { name: 'Test Resource' },
          '507f1f77bcf86cd799439011',
        );
        expect(mockResponse.status).toHaveBeenCalledWith(201);
      });

      it('should reject creation for insufficient role', async () => {
        const createSchema = z.object({
          name: z.string().min(1, 'Name is required'),
        });

        mockRequest.user!.role = 'student';
        const mockOperation = jest.fn();

        await ControllerPatterns.handleCreate(
          mockRequest as AuthRequest,
          mockResponse as Response,
          createSchema,
          mockOperation,
          'Resource',
          'adminOrStaff',
        );

        expect(mockOperation).not.toHaveBeenCalled();
        // Should handle unauthorized access
      });

      it('should handle validation errors in creation', async () => {
        const createSchema = z.object({
          name: z.string().min(1, 'Name is required'),
        });

        mockRequest.body = { name: '' }; // Invalid data
        mockRequest.user!.role = 'admin';

        const mockOperation = jest.fn();

        await ControllerPatterns.handleCreate(
          mockRequest as AuthRequest,
          mockResponse as Response,
          createSchema,
          mockOperation,
          'Resource',
          'adminOrStaff',
        );

        expect(mockOperation).not.toHaveBeenCalled();
        // Should handle validation error
      });
    });

    describe('handleUpdate', () => {
      it('should handle successful updates', async () => {
        const updateSchema = z.object({
          name: z.string().optional(),
        });

        mockRequest.body = { name: 'Updated Name' };
        mockRequest.user!.role = 'admin';

        const mockOperation = jest.fn().mockResolvedValue({ id: '123', name: 'Updated Name' });

        await ControllerPatterns.handleUpdate(
          mockRequest as AuthRequest,
          mockResponse as Response,
          '123',
          updateSchema,
          mockOperation,
          'Resource',
          'adminOrStaff',
        );

        expect(mockOperation).toHaveBeenCalledWith('123', { name: 'Updated Name' });
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });
    });

    describe('handleDelete', () => {
      it('should handle successful deletion', async () => {
        mockRequest.user!.role = 'admin';
        const mockOperation = jest.fn().mockResolvedValue(true);

        await ControllerPatterns.handleDelete(
          mockRequest as AuthRequest,
          mockResponse as Response,
          '123',
          mockOperation,
          'Resource',
          'admin',
        );

        expect(mockOperation).toHaveBeenCalledWith('123');
        expect(mockResponse.status).toHaveBeenCalledWith(200);
      });

      it('should reject deletion for insufficient role', async () => {
        mockRequest.user!.role = 'staff';
        const mockOperation = jest.fn();

        await ControllerPatterns.handleDelete(
          mockRequest as AuthRequest,
          mockResponse as Response,
          '123',
          mockOperation,
          'Resource',
          'admin',
        );

        expect(mockOperation).not.toHaveBeenCalled();
        // Should handle unauthorized access
      });
    });
  });
});
