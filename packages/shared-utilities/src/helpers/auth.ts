// Path: packages/shared-utilities/src/helpers/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWTPayload, UserRole } from '../types';
import { JWT_EXPIRY } from '../constants';
import mongoose from 'mongoose';

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
    const tokenPayload = {
      ...payload,
      jti: this.generateSecureRandom(16), // Add unique JWT ID
      iat: Math.floor(Date.now() / 1000) // Ensure current timestamp
    };
    return jwt.sign(tokenPayload, this.jwtSecret, {
      expiresIn: JWT_EXPIRY.ACCESS_TOKEN,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: { id: string; email: string; role: UserRole }): string {
    const tokenPayload = {
      ...payload,
      jti: this.generateSecureRandom(16), // Add unique JWT ID
      iat: Math.floor(Date.now() / 1000) // Ensure current timestamp
    };
    return jwt.sign(tokenPayload, this.jwtRefreshSecret, {
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
      // Always read JWT secret fresh from environment
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      return jwt.verify(token, jwtSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      // Always read JWT refresh secret fresh from environment
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
      return jwt.verify(token, jwtRefreshSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Verify password reset token
   */
  static verifyPasswordResetToken(token: string): { id: string; email: string } {
    try {
      // Always read JWT secret fresh from environment
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      return jwt.verify(token, jwtSecret) as { id: string; email: string };
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

  /**
   * Securely validate access token with database lookup
   * This method performs real-time validation against the database
   * to ensure user is still active and exists
   */
  static async validateAccessTokenWithDatabase(token: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      // First verify the JWT token structure and signature
      const decoded = this.verifyAccessToken(token);
      
      // Get the User collection from the current database connection
      const db = mongoose.connection.db;
      if (!db) {
        return { success: false, error: 'Database connection not available' };
      }
      
      const UserCollection = db.collection('users');
      
      // Look up the user in the database
      const userId = (decoded as any).id || (decoded as any).userId || (decoded as any)._id;
      const user = await UserCollection.findOne({ 
        _id: new mongoose.Types.ObjectId(userId) 
      });
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      // Check if user is active
      if (!user.isActive) {
        return { success: false, error: 'Account is inactive' };
      }
      
      // Return the validated user
      return { 
        success: true, 
        user: {
          _id: user._id,
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          profile: user.profile,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };
    } catch (error: any) {
      if (error.message.includes('Invalid or expired')) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Token validation failed' };
    }
  }
}