// packages/api-services/planning-service/src/utils/controllerUtils.ts
// Shared utilities for controllers to eliminate duplicate patterns

import { Response } from 'express';
import { AuthRequest, ResponseHelper } from '@yggdrasil/shared-utilities';
import { z } from 'zod';

// =============================================================================
// ROLE VALIDATION UTILITIES
// =============================================================================

export class RoleValidator {
  /**
   * Check if user has admin or staff role
   */
  static isAdminOrStaff(userRole: string): boolean {
    return ['admin', 'staff'].includes(userRole);
  }

  /**
   * Check if user has teacher level or above (teacher, admin, staff)
   */
  static isTeacherOrAbove(userRole: string): boolean {
    return ['teacher', 'admin', 'staff'].includes(userRole);
  }

  /**
   * Validate admin or staff role and return error response if not authorized
   */
  static validateAdminOrStaff(req: AuthRequest, action: string): any | null {
    if (!this.isAdminOrStaff(req.user!.role)) {
      return ResponseHelper.forbidden(`Only admin and staff can ${action}`);
    }
    return null;
  }

  /**
   * Validate admin only access and return error response if not authorized
   */
  static validateAdminOnly(req: AuthRequest, action: string): any | null {
    if (req.user!.role !== 'admin') {
      return ResponseHelper.forbidden(`Only admin can ${action}`);
    }
    return null;
  }

  /**
   * Validate teacher or above access and return error response if not authorized
   */
  static validateTeacherOrAbove(req: AuthRequest, action: string): any | null {
    if (!this.isTeacherOrAbove(req.user!.role)) {
      return ResponseHelper.forbidden(`Only teachers, admin and staff can ${action}`);
    }
    return null;
  }

  /**
   * Validate student access to their own resources
   */
  static validateStudentAccess(req: AuthRequest, studentId: string, action: string): any | null {
    if (req.user!.role === 'student' && req.user!._id.toString() !== studentId) {
      return ResponseHelper.forbidden(`Students can only ${action} their own data`);
    }
    return null;
  }
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

export class ValidationHelper {
  /**
   * Validate request body with Zod schema and return error response if invalid
   */
  static validateBody<T>(
    schema: z.ZodSchema<T>,
    body: any,
  ): { data: T; error: null } | { data: null; error: any } {
    const validation = schema.safeParse(body);
    if (!validation.success) {
      return {
        data: null,
        error: ResponseHelper.badRequest(validation.error.errors[0]!.message),
      };
    }
    return { data: validation.data, error: null };
  }

  /**
   * Validate request parameters with Zod schema and return error response if invalid
   */
  static validateParams<T>(
    schema: z.ZodSchema<T>,
    params: any,
  ): { data: T; error: null } | { data: null; error: any } {
    const validation = schema.safeParse(params);
    if (!validation.success) {
      return {
        data: null,
        error: ResponseHelper.badRequest(validation.error.errors[0]!.message),
      };
    }
    return { data: validation.data, error: null };
  }

  /**
   * Validate request query with Zod schema and return error response if invalid
   */
  static validateQuery<T>(
    schema: z.ZodSchema<T>,
    query: any,
  ): { data: T; error: null } | { data: null; error: any } {
    const validation = schema.safeParse(query);
    if (!validation.success) {
      return {
        data: null,
        error: ResponseHelper.badRequest(validation.error.errors[0]!.message),
      };
    }
    return { data: validation.data, error: null };
  }
}

// =============================================================================
// PARAMETER VALIDATION SCHEMAS
// =============================================================================

export const CommonSchemas = {
  objectId: z.object({
    id: z.string().min(1, 'ID is required'),
  }),

  studentId: z.object({
    studentId: z.string().min(1, 'Student ID is required'),
  }),

  promotionId: z.object({
    promotionId: z.string().min(1, 'Promotion ID is required'),
  }),

  eventId: z.object({
    eventId: z.string().min(1, 'Event ID is required'),
  }),

  courseId: z.object({
    courseId: z.string().min(1, 'Course ID is required'),
  }),

  pagination: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a number').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

// =============================================================================
// RESPONSE UTILITIES
// =============================================================================

export class ResponseUtils {
  /**
   * Handle async controller operation with consistent error handling
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    successMessage: string,
    res: Response,
    statusCode: number = 200,
  ): Promise<Response> {
    try {
      const result = await operation();
      const successResponse = ResponseHelper.success(result, successMessage);
      return res.status(statusCode).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  /**
   * Handle not found response consistently
   */
  static handleNotFound(res: Response, resource: string): Response {
    const errorResponse = ResponseHelper.notFound(`${resource} not found`);
    return res.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Handle validation error response consistently
   */
  static handleValidationError(res: Response, error: any): Response {
    return res.status(error.statusCode).json(error);
  }

  /**
   * Handle unauthorized access consistently
   */
  static handleUnauthorized(res: Response, error: any): Response {
    return res.status(error.statusCode).json(error);
  }
}

// =============================================================================
// CONTROLLER PATTERN UTILITIES
// =============================================================================

export class ControllerPatterns {
  /**
   * Standard CRUD get operation pattern
   */
  static async handleGet<T>(
    _req: AuthRequest,
    res: Response,
    id: string,
    operation: (id: string) => Promise<T | null>,
    resourceName: string,
  ): Promise<Response> {
    return ResponseUtils.handleAsync(
      async () => {
        const result = await operation(id);
        if (!result) {
          throw new Error(`${resourceName} not found`);
        }
        return result;
      },
      `${resourceName} retrieved successfully`,
      res,
    );
  }

  /**
   * Standard CRUD create operation pattern with role validation
   */
  static async handleCreate<T, D>(
    req: AuthRequest,
    res: Response,
    validationSchema: z.ZodSchema<D>,
    operation: (data: D, userId: string) => Promise<T>,
    resourceName: string,
    requiredRole: 'admin' | 'adminOrStaff' | 'teacherOrAbove' = 'adminOrStaff',
  ): Promise<Response> {
    // Role validation
    const roleError = this.validateRole(req, requiredRole, `create ${resourceName}`);
    if (roleError) {
      return ResponseUtils.handleUnauthorized(res, roleError);
    }

    // Input validation
    const validation = ValidationHelper.validateBody(validationSchema, req.body);
    if (validation.error) {
      return ResponseUtils.handleValidationError(res, validation.error);
    }

    // Execute operation
    return ResponseUtils.handleAsync(
      () => operation(validation.data!, req.user!._id.toString()),
      `${resourceName} created successfully`,
      res,
      201,
    );
  }

  /**
   * Standard CRUD update operation pattern with role validation
   */
  static async handleUpdate<T, D>(
    req: AuthRequest,
    res: Response,
    id: string,
    validationSchema: z.ZodSchema<D>,
    operation: (id: string, data: D) => Promise<T | null>,
    resourceName: string,
    requiredRole: 'admin' | 'adminOrStaff' | 'teacherOrAbove' = 'adminOrStaff',
  ): Promise<Response> {
    // Role validation
    const roleError = this.validateRole(req, requiredRole, `update ${resourceName}`);
    if (roleError) {
      return ResponseUtils.handleUnauthorized(res, roleError);
    }

    // Input validation
    const validation = ValidationHelper.validateBody(validationSchema, req.body);
    if (validation.error) {
      return ResponseUtils.handleValidationError(res, validation.error);
    }

    // Execute operation
    return ResponseUtils.handleAsync(
      async () => {
        const result = await operation(id, validation.data!);
        if (!result) {
          throw new Error(`${resourceName} not found`);
        }
        return result;
      },
      `${resourceName} updated successfully`,
      res,
    );
  }

  /**
   * Standard CRUD delete operation pattern with role validation
   */
  static async handleDelete(
    req: AuthRequest,
    res: Response,
    id: string,
    operation: (id: string) => Promise<boolean>,
    resourceName: string,
    requiredRole: 'admin' | 'adminOrStaff' | 'teacherOrAbove' = 'admin',
  ): Promise<Response> {
    // Role validation
    const roleError = this.validateRole(req, requiredRole, `delete ${resourceName}`);
    if (roleError) {
      return ResponseUtils.handleUnauthorized(res, roleError);
    }

    // Execute operation
    return ResponseUtils.handleAsync(
      async () => {
        const deleted = await operation(id);
        if (!deleted) {
          throw new Error(`${resourceName} not found`);
        }
        return null;
      },
      `${resourceName} deleted successfully`,
      res,
    );
  }

  private static validateRole(req: AuthRequest, role: string, action: string): any | null {
    switch (role) {
      case 'admin':
        return RoleValidator.validateAdminOnly(req, action);
      case 'adminOrStaff':
        return RoleValidator.validateAdminOrStaff(req, action);
      case 'teacherOrAbove':
        return RoleValidator.validateTeacherOrAbove(req, action);
      default:
        return null;
    }
  }
}
