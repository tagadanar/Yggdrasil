"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationHelper = void 0;
// Path: packages/shared-utilities/src/helpers/validation.ts
const validator_1 = __importDefault(require("validator"));
const zod_1 = require("zod");
class ValidationHelper {
    /**
     * Validate email format
     */
    static isValidEmail(email) {
        return validator_1.default.isEmail(email);
    }
    /**
     * Validate password strength
     */
    static isValidPassword(password) {
        const errors = [];
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
    static isValidPhoneNumber(phone) {
        return validator_1.default.isMobilePhone(phone, 'any', { strictMode: false });
    }
    /**
     * Sanitize HTML content
     */
    static sanitizeHtml(html) {
        return validator_1.default.escape(html);
    }
    /**
     * Validate URL format
     */
    static isValidUrl(url) {
        return validator_1.default.isURL(url, {
            protocols: ['http', 'https'],
            require_protocol: true,
        });
    }
    /**
     * Validate file size
     */
    static isValidFileSize(size, maxSize) {
        return size <= maxSize;
    }
    /**
     * Validate file type
     */
    static isValidFileType(mimeType, allowedTypes) {
        return allowedTypes.includes(mimeType);
    }
    /**
     * Validate date range
     */
    static isValidDateRange(startDate, endDate) {
        return endDate > startDate;
    }
    /**
     * Validate Zod schema and return formatted errors
     */
    static validateSchema(schema, data) {
        try {
            const result = schema.parse(data);
            return { success: true, data: result };
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
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
    static createValidationErrorResponse(errors) {
        return {
            success: false,
            error: 'Validation failed',
            message: errors.join('; '),
        };
    }
    /**
     * Normalize email address
     */
    static normalizeEmail(email) {
        return validator_1.default.normalizeEmail(email, {
            all_lowercase: true,
            gmail_remove_dots: false,
        }) || email.toLowerCase();
    }
    /**
     * Validate MongoDB ObjectId format
     */
    static isValidObjectId(id) {
        return validator_1.default.isMongoId(id);
    }
    /**
     * Validate pagination parameters
     */
    static validatePagination(page, limit) {
        const validPage = Math.max(1, page || 1);
        const defaultLimit = limit === undefined ? 10 : limit;
        const validLimit = Math.min(100, Math.max(1, defaultLimit));
        const skip = (validPage - 1) * validLimit;
        return { page: validPage, limit: validLimit, skip };
    }
    /**
     * Validate search query
     */
    static sanitizeSearchQuery(query) {
        if (!query || typeof query !== 'string') {
            return '';
        }
        // Remove special regex characters and trim
        return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
    }
    /**
     * Validate array of IDs
     */
    static validateIdArray(ids) {
        if (!Array.isArray(ids)) {
            return [];
        }
        return ids.filter(id => typeof id === 'string' && this.isValidObjectId(id));
    }
}
exports.ValidationHelper = ValidationHelper;
//# sourceMappingURL=validation.js.map