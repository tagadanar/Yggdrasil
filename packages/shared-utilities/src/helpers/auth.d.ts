import { JWTPayload, UserRole } from '../types';
export declare class AuthHelper {
    private static jwtSecret;
    private static jwtRefreshSecret;
    /**
     * Hash a password using bcrypt
     */
    static hashPassword(password: string): Promise<string>;
    /**
     * Compare a plain password with a hashed password
     */
    static comparePassword(password: string, hashedPassword: string): Promise<boolean>;
    /**
     * Generate access token
     */
    static generateAccessToken(payload: {
        id: string;
        email: string;
        role: UserRole;
    }): string;
    /**
     * Generate refresh token
     */
    static generateRefreshToken(payload: {
        id: string;
        email: string;
        role: UserRole;
    }): string;
    /**
     * Generate password reset token
     */
    static generatePasswordResetToken(payload: {
        id: string;
        email: string;
    }): string;
    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): JWTPayload;
    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token: string): JWTPayload;
    /**
     * Verify password reset token
     */
    static verifyPasswordResetToken(token: string): {
        id: string;
        email: string;
    };
    /**
     * Extract token from Authorization header
     */
    static extractTokenFromHeader(authHeader?: string): string | null;
    /**
     * Check if user has required role
     */
    static hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean;
    /**
     * Check if user has admin privileges
     */
    static isAdmin(userRole: UserRole): boolean;
    /**
     * Check if user has staff privileges (admin or staff)
     */
    static isStaff(userRole: UserRole): boolean;
    /**
     * Check if user has teacher privileges (admin, staff, or teacher)
     */
    static isTeacher(userRole: UserRole): boolean;
    /**
     * Generate a secure random string for session IDs, etc.
     */
    static generateSecureRandom(length?: number): string;
}
//# sourceMappingURL=auth.d.ts.map