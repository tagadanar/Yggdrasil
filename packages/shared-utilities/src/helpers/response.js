"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseHelper = void 0;
const constants_1 = require("../constants");
class ResponseHelper {
    /**
     * Create success response
     */
    static success(data, message) {
        return {
            success: true,
            data,
            message,
        };
    }
    /**
     * Create error response
     */
    static error(error, message) {
        return {
            success: false,
            error,
            message,
        };
    }
    /**
     * Create paginated response
     */
    static paginated(data, page, limit, total, message) {
        const totalPages = Math.ceil(total / limit);
        return {
            success: true,
            data,
            message,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
    /**
     * Create validation error response
     */
    static validationError(errors) {
        return {
            success: false,
            error: 'Validation failed',
            message: errors.join('; '),
        };
    }
    /**
     * Create authentication error response
     */
    static authError(message = 'Authentication failed') {
        return {
            success: false,
            error: 'Authentication error',
            message,
        };
    }
    /**
     * Create authorization error response
     */
    static authorizationError(message = 'Access denied') {
        return {
            success: false,
            error: 'Authorization error',
            message,
        };
    }
    /**
     * Create not found error response
     */
    static notFound(resource = 'Resource') {
        return {
            success: false,
            error: 'Not found',
            message: `${resource} not found`,
        };
    }
    /**
     * Create conflict error response
     */
    static conflict(message = 'Resource already exists') {
        return {
            success: false,
            error: 'Conflict',
            message,
        };
    }
    /**
     * Create internal server error response
     */
    static internalError(message = 'Internal server error') {
        return {
            success: false,
            error: 'Internal server error',
            message,
        };
    }
    /**
     * Get HTTP status code based on response type
     */
    static getStatusCode(response) {
        if (response.success) {
            return constants_1.HTTP_STATUS.OK;
        }
        switch (response.error) {
            case 'Validation failed':
                return constants_1.HTTP_STATUS.BAD_REQUEST;
            case 'Authentication error':
                return constants_1.HTTP_STATUS.UNAUTHORIZED;
            case 'Authorization error':
                return constants_1.HTTP_STATUS.FORBIDDEN;
            case 'Not found':
                return constants_1.HTTP_STATUS.NOT_FOUND;
            case 'Conflict':
                return constants_1.HTTP_STATUS.CONFLICT;
            case 'Internal server error':
                return constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR;
            default:
                return constants_1.HTTP_STATUS.BAD_REQUEST;
        }
    }
    /**
     * Create response with proper HTTP status
     */
    static createResponse(res, response, statusCode) {
        const status = statusCode || this.getStatusCode(response);
        return res.status(status).json(response);
    }
    /**
     * Handle async route wrapper
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
    /**
     * Create standardized error for logging
     */
    static createLogError(error, context) {
        return {
            message: error.message || 'Unknown error',
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.ResponseHelper = ResponseHelper;
//# sourceMappingURL=response.js.map