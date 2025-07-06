"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorUtils = exports.jwtErrorHandler = exports.mongoErrorHandler = exports.validationErrorHandler = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.ServiceUnavailableError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.CustomError = exports.setAuditLogger = void 0;
const constants_1 = require("../constants");
// Global audit logger instance (can be injected)
let auditLogger = null;
// Function to inject audit logger implementation
const setAuditLogger = (logger) => {
    auditLogger = logger;
};
exports.setAuditLogger = setAuditLogger;
class CustomError extends Error {
    constructor(message, statusCode = constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'UNKNOWN_ERROR', details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.CustomError = CustomError;
class ValidationError extends CustomError {
    constructor(message, details) {
        super(message, constants_1.HTTP_STATUS.BAD_REQUEST, 'VALIDATION_ERROR', details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends CustomError {
    constructor(message = 'Authentication required') {
        super(message, constants_1.HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends CustomError {
    constructor(message = 'Insufficient permissions') {
        super(message, constants_1.HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR');
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends CustomError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, constants_1.HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends CustomError {
    constructor(message, details) {
        super(message, constants_1.HTTP_STATUS.CONFLICT, 'CONFLICT_ERROR', details);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends CustomError {
    constructor(message = 'Rate limit exceeded') {
        super(message, constants_1.HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMIT_ERROR');
    }
}
exports.RateLimitError = RateLimitError;
class ServiceUnavailableError extends CustomError {
    constructor(service = 'Service') {
        super(`${service} temporarily unavailable`, constants_1.HTTP_STATUS.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE');
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
/**
 * Error handling middleware for Express applications
 */
const errorHandler = (error, req, res, next) => {
    // Default error properties
    const statusCode = error.statusCode || constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const code = error.code || 'INTERNAL_ERROR';
    const message = error.message || 'Internal server error';
    // Log the error
    logError(error, req);
    // Audit log for security-related errors
    if (shouldAuditError(error, statusCode)) {
        auditError(error, req).catch(auditErr => {
            console.error('Failed to audit error:', auditErr);
        });
    }
    // Prepare error response
    const errorResponse = {
        success: false,
        error: message,
        code,
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
    };
    // Add details in development mode
    if (process.env.NODE_ENV === 'development') {
        errorResponse.details = error.details;
        errorResponse.stack = error.stack;
    }
    // Add validation errors if present
    if (error instanceof ValidationError && error.details) {
        errorResponse.validationErrors = error.details;
    }
    // Send error response
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
/**
 * Async error wrapper for route handlers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        try {
            const result = fn(req, res, next);
            Promise.resolve(result).catch(next);
        }
        catch (error) {
            next(error);
        }
    };
};
exports.asyncHandler = asyncHandler;
/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.method} ${req.path}`);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
/**
 * Validation error handler for Joi/Zod validation
 */
const validationErrorHandler = (error) => {
    if (error.name === 'ValidationError' || error.name === 'ZodError') {
        const details = error.issues || error.details || [{ message: error.message }];
        const messages = details.map((detail) => detail.message || detail.msg);
        return new ValidationError(messages.join('; '), details);
    }
    return error;
};
exports.validationErrorHandler = validationErrorHandler;
/**
 * MongoDB error handler
 */
const mongoErrorHandler = (error) => {
    if (error.name === 'MongoServerError' || error.name === 'MongoError') {
        switch (error.code) {
            case 11000: // Duplicate key error
                const field = Object.keys(error.keyPattern || {})[0] || 'field';
                return new ConflictError(`${field} already exists`, {
                    field,
                    value: error.keyValue?.[field]
                });
            case 16755: // Invalid ObjectId
                return new ValidationError('Invalid ID format');
            default:
                return new CustomError('Database operation failed', constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
        }
    }
    if (error.name === 'CastError') {
        return new ValidationError(`Invalid ${error.path}: ${error.value}`);
    }
    return error;
};
exports.mongoErrorHandler = mongoErrorHandler;
/**
 * JWT error handler
 */
const jwtErrorHandler = (error) => {
    if (error.name === 'JsonWebTokenError') {
        return new AuthenticationError('Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
        return new AuthenticationError('Token expired');
    }
    return error;
};
exports.jwtErrorHandler = jwtErrorHandler;
/**
 * Log error with appropriate level
 */
const logError = (error, req) => {
    const logContext = {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack,
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
    };
    if (error.statusCode && error.statusCode >= 500) {
        console.error('Server Error:', logContext);
    }
    else if (error.statusCode && error.statusCode >= 400) {
        console.warn('Client Error:', logContext);
    }
    else {
        console.info('Error:', logContext);
    }
};
/**
 * Determine if error should be audited
 */
const shouldAuditError = (error, statusCode) => {
    // Audit security-related errors
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        return true;
    }
    // Audit server errors
    if (statusCode >= 500) {
        return true;
    }
    // Audit suspicious client errors
    if (statusCode === constants_1.HTTP_STATUS.TOO_MANY_REQUESTS) {
        return true;
    }
    return false;
};
/**
 * Create audit log entry for error
 */
const auditError = async (error, req) => {
    try {
        // Only log if audit logger is available
        if (!auditLogger) {
            return;
        }
        const userId = req.user?.id || 'anonymous';
        const action = determineErrorAction(error);
        await auditLogger.logAction(userId, action, 'system', {
            error: {
                message: error.message,
                code: error.code,
                statusCode: error.statusCode
            },
            request: {
                method: req.method,
                url: req.url,
                userAgent: req.get('User-Agent'),
                requestId: req.requestId
            }
        }, {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionId,
            severity: determineSeverity(error),
            category: 'security'
        });
    }
    catch (auditError) {
        console.error('Failed to create audit log for error:', auditError);
    }
};
/**
 * Determine audit action based on error type
 */
const determineErrorAction = (error) => {
    if (error instanceof AuthenticationError) {
        return 'authentication_failed';
    }
    if (error instanceof AuthorizationError) {
        return 'access_denied';
    }
    if (error instanceof RateLimitError) {
        return 'rate_limit_exceeded';
    }
    if (error.statusCode && error.statusCode >= 500) {
        return 'system_error';
    }
    return 'client_error';
};
/**
 * Determine error severity for audit logs
 */
const determineSeverity = (error) => {
    if (error.statusCode && error.statusCode >= 500) {
        return 'high';
    }
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        return 'medium';
    }
    if (error instanceof RateLimitError) {
        return 'medium';
    }
    return 'low';
};
/**
 * Error handling utilities
 */
exports.ErrorUtils = {
    /**
     * Create a standardized error response
     */
    createErrorResponse: (error, requestId) => {
        return {
            success: false,
            error: error.message,
            code: error.code
        };
    },
    /**
     * Check if error is operational (expected) or programming error
     */
    isOperationalError: (error) => {
        return error.isOperational === true;
    },
    /**
     * Chain multiple error handlers
     */
    chainErrorHandlers: (...handlers) => {
        return (error) => {
            return handlers.reduce((err, handler) => {
                try {
                    return handler(err);
                }
                catch (handlerError) {
                    return err; // Return original error if handler fails
                }
            }, error);
        };
    }
};
// Export common error types for easy importing
// Note: HTTP_STATUS and ResponseHelper are already exported from their respective modules
//# sourceMappingURL=errorHandler.js.map