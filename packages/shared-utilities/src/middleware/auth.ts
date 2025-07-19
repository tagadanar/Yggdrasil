// packages/shared-utilities/src/middleware/auth.ts
// Centralized authentication middleware for all services

import { Request, Response, NextFunction } from 'express';
import { SharedJWTHelper } from '../helpers/jwt';
import { ResponseHelper } from '../helpers/response';
import { JWTPayload } from '../types/auth';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: string;
    }
  }
}

/**
 * Centralized Authentication Middleware
 * Use this in all services for consistent JWT authentication
 */
export class AuthMiddleware {
  /**
   * Verify JWT token and attach user data to request
   * This is the fast version that only verifies the token without database lookup
   */
  static verifyToken(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader) {
        const response = ResponseHelper.unauthorized('Access token required');
        res.status(response.statusCode!).json(response);
        return;
      }

      const token = SharedJWTHelper.extractTokenFromHeader(authHeader);
      
      if (!token) {
        const response = ResponseHelper.unauthorized('Invalid authorization header format');
        res.status(response.statusCode!).json(response);
        return;
      }

      const verification = SharedJWTHelper.verifyAccessToken(token);
      
      if (!verification.success) {
        const response = ResponseHelper.unauthorized(verification.error || 'Token verification failed');
        res.status(response.statusCode!).json(response);
        return;
      }

      // Attach user data to request
      req.user = verification.data!;
      req.userId = verification.data!.userId || verification.data!.id;
      
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      const response = ResponseHelper.unauthorized('Authentication failed');
      res.status(response.statusCode!).json(response);
    }
  }

  /**
   * Verify JWT token with database user lookup
   * Use this when you need to verify the user still exists and is active
   * Requires passing a UserModel or user lookup function
   */
  static verifyTokenWithUserLookup(userLookupFn: (id: string) => Promise<any>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        console.log('🔒 AUTH MIDDLEWARE: Starting token verification with user lookup');
        console.log('🔒 AUTH MIDDLEWARE: Request URL:', req.url);
        console.log('🔒 AUTH MIDDLEWARE: Request method:', req.method);
        
        const authHeader = req.header('Authorization');
        console.log('🔒 AUTH MIDDLEWARE: Auth header present:', !!authHeader);
        
        if (!authHeader) {
          console.log('❌ AUTH MIDDLEWARE: No Authorization header found');
          const response = ResponseHelper.unauthorized('Access token required');
          res.status(response.statusCode!).json(response);
          return;
        }

        const token = SharedJWTHelper.extractTokenFromHeader(authHeader);
        console.log('🔒 AUTH MIDDLEWARE: Token extracted:', !!token);
        console.log('🔒 AUTH MIDDLEWARE: Token preview:', token ? token.substring(0, 20) + '...' : 'null');
        
        if (!token) {
          console.log('❌ AUTH MIDDLEWARE: Invalid authorization header format');
          const response = ResponseHelper.unauthorized('Invalid authorization header format');
          res.status(response.statusCode!).json(response);
          return;
        }

        console.log('🔒 AUTH MIDDLEWARE: Verifying access token...');
        const verification = SharedJWTHelper.verifyAccessToken(token);
        console.log('🔒 AUTH MIDDLEWARE: Token verification result:', {
          success: verification.success,
          error: verification.error,
          hasData: !!verification.data
        });
        
        if (!verification.success) {
          console.log('❌ AUTH MIDDLEWARE: Token verification failed:', verification.error);
          const response = ResponseHelper.unauthorized(verification.error || 'Token verification failed');
          res.status(response.statusCode!).json(response);
          return;
        }

        // Look up user in database
        const userId = verification.data!.userId || verification.data!.id;
        console.log('🔒 AUTH MIDDLEWARE: User ID from token:', userId);
        console.log('🔒 AUTH MIDDLEWARE: Calling userLookupFn...');
        
        const user = await userLookupFn(userId);
        console.log('🔒 AUTH MIDDLEWARE: User lookup result:', {
          found: !!user,
          email: user?.email,
          isActive: user?.isActive
        });
        
        if (!user) {
          console.log('❌ AUTH MIDDLEWARE: User not found for ID:', userId);
          const response = ResponseHelper.unauthorized('User not found');
          res.status(response.statusCode!).json(response);
          return;
        }

        if (!user.isActive) {
          console.log('❌ AUTH MIDDLEWARE: User account is inactive for ID:', userId);
          const response = ResponseHelper.unauthorized('User account is inactive');
          res.status(response.statusCode!).json(response);
          return;
        }

        console.log('✅ AUTH MIDDLEWARE: User authenticated successfully');
        // Attach both token data and full user data to request
        req.user = user;
        req.userId = userId;
        
        next();
      } catch (error) {
        console.error('💥 AUTH MIDDLEWARE: Exception during user lookup:', error);
        const response = ResponseHelper.unauthorized('Authentication failed');
        res.status(response.statusCode!).json(response);
      }
    };
  }

  /**
   * Verify token and require specific role
   */
  static requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // First verify token
      AuthMiddleware.verifyToken(req, res, () => {
        if (!req.user) {
          const response = ResponseHelper.unauthorized('User not authenticated');
          res.status(response.statusCode!).json(response);
          return;
        }

        if (!allowedRoles.includes(req.user.role)) {
          const response = ResponseHelper.forbidden('Insufficient permissions');
          res.status(response.statusCode!).json(response);
          return;
        }

        next();
      });
    };
  }

  /**
   * Optional authentication - attach user if token is valid but don't require it
   */
  static optionalAuth(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.header('Authorization');
      
      if (!authHeader) {
        next();
        return;
      }

      const token = SharedJWTHelper.extractTokenFromHeader(authHeader);
      
      if (!token) {
        next();
        return;
      }

      const verification = SharedJWTHelper.verifyAccessToken(token);
      
      if (verification.success) {
        req.user = verification.data!;
        req.userId = verification.data!.userId || verification.data!.id;
      }

      next();
    } catch (error) {
      // Ignore errors in optional auth - just continue without user
      next();
    }
  }

  /**
   * Admin only middleware
   */
  static adminOnly = AuthMiddleware.requireRole('admin');

  /**
   * Staff and admin middleware
   */
  static staffOnly = AuthMiddleware.requireRole('admin', 'staff');

  /**
   * Teacher, staff and admin middleware
   */
  static teacherAndAbove = AuthMiddleware.requireRole('admin', 'staff', 'teacher');

  /**
   * All authenticated users
   */
  static authenticated = AuthMiddleware.verifyToken;
}

/**
 * Cookie-based authentication for browser-based apps
 */
export class CookieAuthMiddleware {
  /**
   * Set JWT token as httpOnly cookie
   */
  static setCookieToken(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Set access token cookie
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    // Set refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
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

      req.user = verification.data!;
      req.userId = verification.data!.userId || verification.data!.id;
      
      next();
    } catch (error) {
      console.error('Cookie auth middleware error:', error);
      const response = ResponseHelper.unauthorized('Authentication failed');
      res.status(response.statusCode!).json(response);
    }
  }
}

// Export convenience functions
export const {
  verifyToken,
  requireRole,
  optionalAuth,
  adminOnly,
  staffOnly,
  teacherAndAbove,
  authenticated
} = AuthMiddleware;

export default AuthMiddleware;