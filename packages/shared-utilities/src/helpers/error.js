"use strict";
// Path: packages/shared-utilities/src/helpers/error.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHelper = void 0;
class ErrorHelper {
    /**
     * Handle service errors with consistent format
     */
    static handleServiceError(message, error) {
        console.error(`${message}:`, error);
        if (error.name === 'ValidationError') {
            return { success: false, error: `Validation failed: ${error.message}` };
        }
        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            if (error.code === 11000) {
                return { success: false, error: 'Resource already exists' };
            }
            return { success: false, error: 'Database operation failed' };
        }
        return { success: false, error: `${message}: ${error.message || 'Unknown error'}` };
    }
}
exports.ErrorHelper = ErrorHelper;
//# sourceMappingURL=error.js.map