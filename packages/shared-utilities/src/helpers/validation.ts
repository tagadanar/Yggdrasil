// Path: packages/shared-utilities/src/helpers/validation.ts
import validator from 'validator';
import { ApiResponse } from '../types';
import { ZodError, ZodSchema } from 'zod';

export class ValidationHelper {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    return validator.isEmail(email);
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): { isValid: boolean; errors: string[] } {
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
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate phone number format
   */
  static isValidPhoneNumber(phone: string): boolean {
    return validator.isMobilePhone(phone, 'any', { strictMode: false });
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(html: string): string {
    return validator.escape(html);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
    });
  }

  /**
   * Validate file size
   */
  static isValidFileSize(size: number, maxSize: number): boolean {
    return size <= maxSize;
  }

  /**
   * Validate file type
   */
  static isValidFileType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate date range
   */
  static isValidDateRange(startDate: Date, endDate: Date): boolean {
    return endDate > startDate;
  }

  /**
   * Validate Zod schema and return formatted errors
   */
  static validateSchema<T>(schema: ZodSchema<T>, data: any): { 
    success: boolean; 
    data?: T; 
    errors?: string[] 
  } {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => {
          const path = err.path.join('.');
          return path ? `${path}: ${err.message}` : err.message;
        });
        return { success: false, errors };
      }
      return { success: false, errors: ['Validation failed'] };
    }
  }

  /**
   * Create API error response from validation errors
   */
  static createValidationErrorResponse(errors: string[]): ApiResponse {
    return {
      success: false,
      error: 'Validation failed',
      message: errors.join('; '),
    };
  }

  /**
   * Normalize email address
   */
  static normalizeEmail(email: string): string {
    return validator.normalizeEmail(email, {
      all_lowercase: true,
      gmail_remove_dots: false,
    }) || email.toLowerCase();
  }

  /**
   * Validate MongoDB ObjectId format
   */
  static isValidObjectId(id: string): boolean {
    return validator.isMongoId(id);
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page?: number, limit?: number): {
    page: number;
    limit: number;
    skip: number;
  } {
    const validPage = Math.max(1, page || 1);
    const defaultLimit = limit === undefined ? 10 : limit;
    const validLimit = Math.min(100, Math.max(1, defaultLimit));
    const skip = (validPage - 1) * validLimit;

    return { page: validPage, limit: validLimit, skip };
  }

  /**
   * Validate search query
   */
  static sanitizeSearchQuery(query?: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }
    
    // Remove special regex characters and trim
    return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
  }

  /**
   * Validate array of IDs
   */
  static validateIdArray(ids: any[]): string[] {
    if (!Array.isArray(ids)) {
      return [];
    }
    
    return ids.filter(id => 
      typeof id === 'string' && this.isValidObjectId(id)
    );
  }
}