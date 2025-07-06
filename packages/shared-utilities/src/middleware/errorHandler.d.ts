import { Request, Response, NextFunction } from 'express';
export interface AuditLogger {
    logAction(userId: string, action: string, resourceType: string, details: any, metadata?: any): Promise<void>;
}
export declare const setAuditLogger: (logger: AuditLogger) => void;
export interface AppError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
    isOperational?: boolean;
}
export declare class CustomError extends Error implements AppError {
    statusCode: number;
    code: string;
    details?: any;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string, details?: any);
}
export declare class ValidationError extends CustomError {
    constructor(message: string, details?: any);
}
export declare class AuthenticationError extends CustomError {
    constructor(message?: string);
}
export declare class AuthorizationError extends CustomError {
    constructor(message?: string);
}
export declare class NotFoundError extends CustomError {
    constructor(resource?: string);
}
export declare class ConflictError extends CustomError {
    constructor(message: string, details?: any);
}
export declare class RateLimitError extends CustomError {
    constructor(message?: string);
}
export declare class ServiceUnavailableError extends CustomError {
    constructor(service?: string);
}
/**
 * Error handling middleware for Express applications
 */
export declare const errorHandler: (error: AppError, req: Request, res: Response, next: NextFunction) => void;
/**
 * Async error wrapper for route handlers
 */
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * 404 Not Found handler
 */
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Validation error handler for Joi/Zod validation
 */
export declare const validationErrorHandler: (error: any) => ValidationError;
/**
 * MongoDB error handler
 */
export declare const mongoErrorHandler: (error: any) => AppError;
/**
 * JWT error handler
 */
export declare const jwtErrorHandler: (error: any) => AppError;
/**
 * Error handling utilities
 */
export declare const ErrorUtils: {
    /**
     * Create a standardized error response
     */
    createErrorResponse: (error: AppError, requestId?: string) => {
        success: boolean;
        error: string;
        code: string | undefined;
    };
    /**
     * Check if error is operational (expected) or programming error
     */
    isOperationalError: (error: AppError) => boolean;
    /**
     * Chain multiple error handlers
     */
    chainErrorHandlers: (...handlers: Array<(error: any) => AppError>) => (error: any) => AppError;
};
//# sourceMappingURL=errorHandler.d.ts.map