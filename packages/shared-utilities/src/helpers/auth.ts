// Path: packages/shared-utilities/src/helpers/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWTPayload, UserRole } from '../types';
import { JWT_EXPIRY } from '../constants';

export class AuthHelper {
  private static jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
  private static jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain password with a hashed password
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate access token
   */
  static generateAccessToken(payload: { id: string; email: string; role: UserRole }): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: JWT_EXPIRY.ACCESS_TOKEN,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: { id: string; email: string; role: UserRole }): string {
    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: JWT_EXPIRY.REFRESH_TOKEN,
    });
  }

  /**
   * Generate password reset token
   */
  static generatePasswordResetToken(payload: { id: string; email: string }): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: JWT_EXPIRY.PASSWORD_RESET,
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtRefreshSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Verify password reset token
   */
  static verifyPasswordResetToken(token: string): { id: string; email: string } {
    try {
      return jwt.verify(token, this.jwtSecret) as { id: string; email: string };
    } catch (error) {
      throw new Error('Invalid or expired password reset token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Check if user has required role
   */
  static hasRole(userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean {
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole);
    }
    return userRole === requiredRole;
  }

  /**
   * Check if user has admin privileges
   */
  static isAdmin(userRole: UserRole): boolean {
    return userRole === 'admin';
  }

  /**
   * Check if user has staff privileges (admin or staff)
   */
  static isStaff(userRole: UserRole): boolean {
    return userRole === 'admin' || userRole === 'staff';
  }

  /**
   * Check if user has teacher privileges (admin, staff, or teacher)
   */
  static isTeacher(userRole: UserRole): boolean {
    return userRole === 'admin' || userRole === 'staff' || userRole === 'teacher';
  }

  /**
   * Generate a secure random string for session IDs, etc.
   */
  static generateSecureRandom(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}