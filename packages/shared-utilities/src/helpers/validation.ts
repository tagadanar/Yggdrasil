// packages/shared-utilities/src/helpers/validation.ts
// Validation helper functions

import { z } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string; value?: any }>;
}

export class ValidationHelper {
  /**
   * Validate data against a Zod schema
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const validatedData = schema.parse(data);
      return {
        success: true,
        data: validatedData,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.code === 'invalid_type' ? undefined : (data as any)?.[err.path[0]],
        }));

        return {
          success: false,
          errors,
        };
      }

      return {
        success: false,
        errors: [{ field: 'unknown', message: 'Validation failed' }],
      };
    }
  }

  /**
   * Validate email format using regex
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize string input to prevent XSS attacks
   * Removes/escapes potentially dangerous characters and patterns
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      // Remove/escape HTML entities and dangerous characters
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/&/g, '&amp;') // Escape ampersands
      .replace(/"/g, '&quot;') // Escape quotes
      .replace(/'/g, '&#x27;') // Escape single quotes
      .replace(/\//g, '&#x2F;') // Escape forward slashes
      // Remove common XSS patterns
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/data:/gi, '') // Remove data: protocol (can be dangerous)
      .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Validate MongoDB ObjectId format
   */
  static isValidObjectId(id: string): boolean {
    const objectIdRegex = /^[a-fA-F0-9]{24}$/;
    return objectIdRegex.test(id);
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: { size: number; mimetype: string },
    options: { maxSize: number; allowedTypes: string[] }
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (file.size > options.maxSize) {
      errors.push(`File size must be less than ${Math.round(options.maxSize / 1024 / 1024)}MB`);
    }

    if (!options.allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: number, limit?: number): { page: number; limit: number } {
    const validPage = Math.max(1, Math.floor(page || 1));
    const validLimit = Math.min(100, Math.max(1, Math.floor(limit || 10)));

    return { page: validPage, limit: validLimit };
  }
}