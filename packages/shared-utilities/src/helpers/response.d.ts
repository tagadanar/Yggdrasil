import { ApiResponse, PaginatedResponse } from '../types';
export declare class ResponseHelper {
    /**
     * Create success response
     */
    static success<T>(data?: T, message?: string): ApiResponse<T>;
    /**
     * Create error response
     */
    static error(error: string, message?: string): ApiResponse;
    /**
     * Create paginated response
     */
    static paginated<T>(data: T[], page: number, limit: number, total: number, message?: string): PaginatedResponse<T>;
    /**
     * Create validation error response
     */
    static validationError(errors: string[]): ApiResponse;
    /**
     * Create authentication error response
     */
    static authError(message?: string): ApiResponse;
    /**
     * Create authorization error response
     */
    static authorizationError(message?: string): ApiResponse;
    /**
     * Create not found error response
     */
    static notFound(resource?: string): ApiResponse;
    /**
     * Create conflict error response
     */
    static conflict(message?: string): ApiResponse;
    /**
     * Create internal server error response
     */
    static internalError(message?: string): ApiResponse;
    /**
     * Get HTTP status code based on response type
     */
    static getStatusCode(response: ApiResponse): number;
    /**
     * Create response with proper HTTP status
     */
    static createResponse(res: any, response: ApiResponse, statusCode?: number): any;
    /**
     * Handle async route wrapper
     */
    static asyncHandler(fn: Function): (req: any, res: any, next: any) => void;
    /**
     * Create standardized error for logging
     */
    static createLogError(error: any, context?: string): {
        message: string;
        stack?: string;
        context?: string;
        timestamp: string;
    };
}
//# sourceMappingURL=response.d.ts.map