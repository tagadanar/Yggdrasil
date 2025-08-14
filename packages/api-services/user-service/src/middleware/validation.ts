// packages/api-services/user-service/src/middleware/validation.ts
// Request validation middleware using Zod schemas

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ResponseHelper } from '@yggdrasil/shared-utilities';
import { sanitizeProfile } from '../validation/user-schemas';

export interface ValidationOptions {
  sanitize?: boolean;
  allowUnknown?: boolean;
}

/**
 * Creates validation middleware for request body
 */
export const validateBody = <T>(schema: ZodSchema<T>, options: ValidationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Sanitize input if requested
      let data = req.body;
      if (options.sanitize && data?.profile) {
        data = { ...data, profile: sanitizeProfile(data.profile) };
      }

      const validatedData = schema.parse(data);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        const errorResponse = ResponseHelper.validationError(validationErrors);
        res.status(errorResponse.statusCode).json(errorResponse);
        return;
      }

      const errorResponse = ResponseHelper.badRequest('Invalid request data');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  };
};

/**
 * Creates validation middleware for query parameters
 */
export const validateQuery = <T>(schema: ZodSchema<T>, _options: ValidationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: `query.${err.path.join('.')}`,
          message: err.message,
          code: err.code,
        }));

        const errorResponse = ResponseHelper.validationError(validationErrors);
        res.status(errorResponse.statusCode).json(errorResponse);
        return;
      }

      const errorResponse = ResponseHelper.badRequest('Invalid query parameters');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  };
};

/**
 * Creates validation middleware for URL parameters
 */
export const validateParams = <T>(schema: ZodSchema<T>, _options: ValidationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedParams = schema.parse(req.params);
      req.params = validatedParams as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: `params.${err.path.join('.')}`,
          message: err.message,
          code: err.code,
        }));

        const errorResponse = ResponseHelper.validationError(validationErrors);
        res.status(errorResponse.statusCode).json(errorResponse);
        return;
      }

      const errorResponse = ResponseHelper.badRequest('Invalid URL parameters');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  };
};

/**
 * Combined validation middleware for complex routes
 */
export const validateRequest = <TBody, TQuery, TParams>(options: {
  body?: ZodSchema<TBody>;
  query?: ZodSchema<TQuery>;
  params?: ZodSchema<TParams>;
  sanitize?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate params first (most likely to fail with 404)
      if (options.params) {
        options.params.parse(req.params);
      }

      // Validate query parameters
      if (options.query) {
        const validatedQuery = options.query.parse(req.query);
        req.query = validatedQuery as any;
      }

      // Validate and sanitize body
      if (options.body) {
        let data = req.body;
        if (options.sanitize && data?.profile) {
          data = { ...data, profile: sanitizeProfile(data.profile) };
        }

        const validatedBody = options.body.parse(data);
        req.body = validatedBody;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => {
          const field = err.path.length > 0 ? err.path.join('.') : 'root';
          return {
            field,
            message: err.message,
            code: err.code,
          };
        });

        const errorResponse = ResponseHelper.validationError(validationErrors);
        res.status(errorResponse.statusCode).json(errorResponse);
        return;
      }

      const errorResponse = ResponseHelper.badRequest('Request validation failed');
      res.status(errorResponse.statusCode).json(errorResponse);
    }
  };
};

/**
 * Security-focused sanitization middleware
 */
export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction): void => {
  // Sanitize common XSS vectors
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      return value
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};

/**
 * Rate limiting by user role
 */
export const createRoleBasedRateLimit = () => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // This will be implemented when we add advanced rate limiting
    // For now, just pass through
    next();
  };
};

/**
 * Request size validation
 */
export const validateRequestSize = (maxSizeBytes: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');

    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      const errorResponse = ResponseHelper.badRequest(
        `Request too large. Maximum size is ${maxSizeBytes} bytes`,
      );
      res.status(errorResponse.statusCode).json(errorResponse);
      return;
    }

    next();
  };
};
