import { ApiResponse } from '../types';
import { ZodSchema } from 'zod';
export declare class ValidationHelper {
    /**
     * Validate email format
     */
    static isValidEmail(email: string): boolean;
    /**
     * Validate password strength
     */
    static isValidPassword(password: string): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Validate phone number format
     */
    static isValidPhoneNumber(phone: string): boolean;
    /**
     * Sanitize HTML content
     */
    static sanitizeHtml(html: string): string;
    /**
     * Validate URL format
     */
    static isValidUrl(url: string): boolean;
    /**
     * Validate file size
     */
    static isValidFileSize(size: number, maxSize: number): boolean;
    /**
     * Validate file type
     */
    static isValidFileType(mimeType: string, allowedTypes: string[]): boolean;
    /**
     * Validate date range
     */
    static isValidDateRange(startDate: Date, endDate: Date): boolean;
    /**
     * Validate Zod schema and return formatted errors
     */
    static validateSchema<T>(schema: ZodSchema<T>, data: any): {
        success: boolean;
        data?: T;
        errors?: string[];
    };
    /**
     * Create API error response from validation errors
     */
    static createValidationErrorResponse(errors: string[]): ApiResponse;
    /**
     * Normalize email address
     */
    static normalizeEmail(email: string): string;
    /**
     * Validate MongoDB ObjectId format
     */
    static isValidObjectId(id: string): boolean;
    /**
     * Validate pagination parameters
     */
    static validatePagination(page?: number, limit?: number): {
        page: number;
        limit: number;
        skip: number;
    };
    /**
     * Validate search query
     */
    static sanitizeSearchQuery(query?: string): string;
    /**
     * Validate array of IDs
     */
    static validateIdArray(ids: any[]): string[];
}
//# sourceMappingURL=validation.d.ts.map