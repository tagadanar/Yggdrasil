"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthHelper = void 0;
// Path: packages/shared-utilities/src/helpers/auth.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const constants_1 = require("../constants");
class AuthHelper {
    /**
     * Hash a password using bcrypt
     */
    static async hashPassword(password) {
        const saltRounds = 12;
        return bcryptjs_1.default.hash(password, saltRounds);
    }
    /**
     * Compare a plain password with a hashed password
     */
    static async comparePassword(password, hashedPassword) {
        return bcryptjs_1.default.compare(password, hashedPassword);
    }
    /**
     * Generate access token
     */
    static generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.jwtSecret, {
            expiresIn: constants_1.JWT_EXPIRY.ACCESS_TOKEN,
        });
    }
    /**
     * Generate refresh token
     */
    static generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.jwtRefreshSecret, {
            expiresIn: constants_1.JWT_EXPIRY.REFRESH_TOKEN,
        });
    }
    /**
     * Generate password reset token
     */
    static generatePasswordResetToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.jwtSecret, {
            expiresIn: constants_1.JWT_EXPIRY.PASSWORD_RESET,
        });
    }
    /**
     * Verify access token
     */
    static verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.jwtSecret);
        }
        catch (error) {
            throw new Error('Invalid or expired access token');
        }
    }
    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.jwtRefreshSecret);
        }
        catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }
    /**
     * Verify password reset token
     */
    static verifyPasswordResetToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.jwtSecret);
        }
        catch (error) {
            throw new Error('Invalid or expired password reset token');
        }
    }
    /**
     * Extract token from Authorization header
     */
    static extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
    /**
     * Check if user has required role
     */
    static hasRole(userRole, requiredRole) {
        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(userRole);
        }
        return userRole === requiredRole;
    }
    /**
     * Check if user has admin privileges
     */
    static isAdmin(userRole) {
        return userRole === 'admin';
    }
    /**
     * Check if user has staff privileges (admin or staff)
     */
    static isStaff(userRole) {
        return userRole === 'admin' || userRole === 'staff';
    }
    /**
     * Check if user has teacher privileges (admin, staff, or teacher)
     */
    static isTeacher(userRole) {
        return userRole === 'admin' || userRole === 'staff' || userRole === 'teacher';
    }
    /**
     * Generate a secure random string for session IDs, etc.
     */
    static generateSecureRandom(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
exports.AuthHelper = AuthHelper;
AuthHelper.jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
AuthHelper.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
//# sourceMappingURL=auth.js.map