// packages/shared-utilities/src/middleware/auth.ts
// Centralized authentication middleware for all services
// Enhanced version with clean logging and better extensibility

import { Request, Response, NextFunction } from 'express';
import { SharedJWTHelper } from '../helpers/jwt';
import { ResponseHelper } from '../helpers/response';
// import { JWTPayload } from '../types/auth'; // Unused import
import { EnhancedAuthMiddleware, AuthFactory, AuthenticatedUser } from './auth-enhanced';
import { AuthRequest } from '../types/auth';
import { logger } from '@yggdrasil/shared-utilities';

// Request interface is extended in auth-enhanced.ts

/**
 * Centralized Authentication Middleware
 * Use this in all services for consistent JWT authentication
 *
 * @deprecated Use EnhancedAuthMiddleware for new implementations
 */
export class AuthMiddleware {
  /**
   * Verify JWT token and attach user data to request
   * This is the fast version that only verifies the token without database lookup
   */
  static verifyToken = EnhancedAuthMiddleware.verifyToken;

  /**
   * Verify JWT token with database user lookup
   * Use this when you need to verify the user still exists and is active
   * Requires passing a UserModel or user lookup function
   *
   * @deprecated The debug logging version has been cleaned up
   */
  static verifyTokenWithUserLookup(userLookupFn: (id: string) => Promise<any>) {
    return EnhancedAuthMiddleware.verifyTokenWithUserLookup(userLookupFn);
  }

  /**
   * Verify token and require specific role
   */
  static requireRole = EnhancedAuthMiddleware.requireRole;

  /**
   * Optional authentication - attach user if token is valid but don't require it
   */
  static optionalAuth = EnhancedAuthMiddleware.optionalAuth;

  /**
   * Admin only middleware
   */
  static adminOnly = EnhancedAuthMiddleware.adminOnly;

  /**
   * Staff and admin middleware
   */
  static staffOnly = EnhancedAuthMiddleware.staffOnly;

  /**
   * Teacher, staff and admin middleware
   */
  static teacherAndAbove = EnhancedAuthMiddleware.teacherAndAbove;

  /**
   * All authenticated users
   */
  static authenticated = EnhancedAuthMiddleware.authenticated;
}

/**
 * Cookie-based authentication for browser-based apps
 */
export class CookieAuthMiddleware {
  /**
   * Set JWT token as httpOnly cookie
   */
  static setCookieToken(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
    const isProduction = process.env['NODE_ENV'] === 'production';

    // Set access token cookie
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    // Set refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  /**
   * Clear authentication cookies
   */
  static clearCookieTokens(res: Response): void {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
  }

  /**
   * Verify token from cookie
   */
  static verifyTokenFromCookie(req: Request, res: Response, next: NextFunction): void {
    try {
      const token = req.cookies?.accessToken;

      if (!token) {
        const response = ResponseHelper.unauthorized('Access token required');
        res.status(response.statusCode!).json(response);
        return;
      }

      const verification = SharedJWTHelper.verifyAccessToken(token);

      if (!verification.success) {
        // Try to refresh token if available
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
          // This would need to be implemented with refresh token logic
          const response = ResponseHelper.unauthorized('Token expired, refresh required');
          res.status(response.statusCode!).json(response);
          return;
        }

        const response = ResponseHelper.unauthorized(verification.error || 'Token verification failed');
        res.status(response.statusCode!).json(response);
        return;
      }

      // Convert JWTPayload to AuthenticatedUser format
      const tokenData = verification.data!;
      req.user = {
        id: tokenData.userId || tokenData.id,
        userId: tokenData.userId || tokenData.id,
        email: tokenData.email,
        role: tokenData.role,
        isActive: true, // Assume active since we're not doing DB lookup
        tokenVersion: tokenData.tokenVersion,
      };
      req.userId = req.user.id;

      next();
    } catch (error) {
      if (process.env['NODE_ENV'] !== 'production') {
        logger.error('Cookie auth middleware error:', error);
      }
      const response = ResponseHelper.unauthorized('Authentication failed');
      res.status(response.statusCode!).json(response);
    }
  }
}

// Export convenience functions (backwards compatibility)
export const {
  verifyToken,
  requireRole,
  optionalAuth,
  adminOnly,
  staffOnly,
  teacherAndAbove,
  authenticated,
} = AuthMiddleware;

// Export new enhanced system
export { EnhancedAuthMiddleware, AuthFactory };
export type { AuthRequest, AuthenticatedUser };

export default AuthMiddleware;
