// packages/shared-utilities/src/middleware/auth-enhanced.ts
// Enhanced centralized authentication middleware for all services

import { Request, Response, NextFunction } from 'express';
import { SharedJWTHelper } from '../helpers/jwt';
import { ResponseHelper } from '../helpers/response';
import { LoggerFactory } from '../logging/logger';
// import { JWTPayload } from '../types/auth'; // Unused import

const logger = LoggerFactory.createLogger('auth-enhanced');

// Standard user interface for all services
export interface AuthenticatedUser {
  id: string;           // Primary user ID
  userId?: string;      // Alias for id (backwards compatibility)
  email: string;
  role: 'admin' | 'staff' | 'teacher' | 'student';
  isActive: boolean;
  tokenVersion?: number;
  firstName?: string;
  lastName?: string;
  profile?: any;        // Full profile data if needed
  _id?: any;           // Raw MongoDB _id if needed
}

// Extend Express Request interface with user properties
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      userId?: string;
    }
  }
}

// User lookup function type
export type UserLookupFunction = (id: string) => Promise<any>;

/**
 * Enhanced Authentication Middleware System
 * Provides clean, extensible auth patterns for all services
 */
export class EnhancedAuthMiddleware {
  /**
   * Fast token verification without database lookup
   * Use for lightweight operations that only need basic token validation
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

      // Create standardized user object from token
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
      // Log error for debugging but don't spam console in production
      if (process.env['NODE_ENV'] !== 'production') {
        logger.error('Auth middleware error:', error);
      }
      const response = ResponseHelper.unauthorized('Authentication failed');
      res.status(response.statusCode!).json(response);
    }
  }

  /**
   * Full authentication with database user lookup
   * Use for operations that need to verify user exists and get full user data
   */
  static verifyTokenWithUserLookup(userLookupFn: UserLookupFunction) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

        // Look up user in database
        const userId = verification.data!.userId || verification.data!.id;
        const dbUser = await userLookupFn(userId);

        console.log('🔍 AUTH MIDDLEWARE: Database user lookup result:', {
          userId,
          hasDbUser: !!dbUser,
          dbUserEmail: dbUser?.email,
          dbUserHasProfile: !!dbUser?.profile,
          dbUserProfileKeys: dbUser?.profile ? Object.keys(dbUser.profile) : 'no profile',
          dbUserProfileFirstName: dbUser?.profile?.firstName,
        });

        if (!dbUser) {
          const response = ResponseHelper.unauthorized('User not found');
          res.status(response.statusCode!).json(response);
          return;
        }

        if (dbUser.isActive === false) {
          const response = ResponseHelper.unauthorized('User account is inactive');
          res.status(response.statusCode!).json(response);
          return;
        }

        // Validate token version if present (for logout from all devices)
        const tokenData = verification.data!;
        if (tokenData.tokenVersion !== undefined && dbUser.tokenVersion !== tokenData.tokenVersion) {
          const response = ResponseHelper.unauthorized('Token has been invalidated');
          res.status(response.statusCode!).json(response);
          return;
        }

        // Validate role consistency between token and database
        if (tokenData.role !== dbUser.role) {
          const response = ResponseHelper.forbidden('User role has changed, please login again');
          res.status(response.statusCode!).json(response);
          return;
        }

        // Create standardized user object
        req.user = {
          id: userId,
          userId: userId,
          email: dbUser.email,
          role: dbUser.role,
          isActive: dbUser.isActive,
          tokenVersion: dbUser.tokenVersion,
          firstName: dbUser.profile?.firstName || dbUser.firstName,
          lastName: dbUser.profile?.lastName || dbUser.lastName,
          profile: dbUser.profile,
          _id: dbUser._id,  // Raw MongoDB ID for services that need it
        };
        req.userId = userId;

        console.log('🔍 AUTH MIDDLEWARE: Created req.user object:', {
          email: req.user.email,
          role: req.user.role,
          hasProfile: !!req.user.profile,
          profileFirstName: req.user.profile?.firstName,
          profileKeys: req.user.profile ? Object.keys(req.user.profile) : 'no profile',
        });

        next();
      } catch (error) {
        // Log error for debugging but don't spam console in production
        if (process.env['NODE_ENV'] !== 'production') {
          logger.error('Auth middleware error:', error);
        }
        const response = ResponseHelper.unauthorized('Authentication failed');
        res.status(response.statusCode!).json(response);
      }
    };
  }

  /**
   * Role-based access control
   * Use for endpoints that require specific roles
   */
  static requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        const response = ResponseHelper.unauthorized('Authentication required');
        res.status(response.statusCode!).json(response);
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        const response = ResponseHelper.forbidden('Insufficient permissions');
        res.status(response.statusCode!).json(response);
        return;
      }

      next();
    };
  }

  /**
   * Resource ownership validation
   * Use for endpoints where users can only access their own resources
   */
  static requireOwnership(options: {
    userIdParam?: string;          // Which route param contains the user ID (default: 'id')
    allowedRoles?: string[];       // Roles that can access any resource (default: ['admin'])
    bypassOwnership?: boolean;     // Allow admin/staff to bypass ownership (default: true)
  } = {}) {
    const {
      userIdParam = 'id',
      allowedRoles = ['admin'],
      bypassOwnership = true,
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        const response = ResponseHelper.unauthorized('Authentication required');
        res.status(response.statusCode!).json(response);
        return;
      }

      const requestedUserId = req.params[userIdParam];
      const currentUserId = req.user.id;
      const hasAllowedRole = allowedRoles.includes(req.user.role);

      // Normalize IDs for comparison
      const normalizedRequestedId = String(requestedUserId || '').trim();
      const normalizedCurrentId = String(currentUserId || '').trim();

      // Check ownership
      const isOwner = normalizedRequestedId === normalizedCurrentId;
      const canBypass = bypassOwnership && hasAllowedRole;

      if (!isOwner && !canBypass) {
        const response = ResponseHelper.forbidden('Access denied: can only access your own resources');
        res.status(response.statusCode!).json(response);
        return;
      }

      next();
    };
  }

  /**
   * Optional authentication - attach user if token is valid but don't require it
   * Use for public endpoints that can be enhanced with user context
   */
  static optionalAuth(req: Request, _res: Response, next: NextFunction): void {
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

      if (verification.success && verification.data) {
        const tokenData = verification.data;
        req.user = {
          id: tokenData.userId || tokenData.id,
          userId: tokenData.userId || tokenData.id,
          email: tokenData.email,
          role: tokenData.role,
          isActive: true,
          tokenVersion: tokenData.tokenVersion,
        };
        req.userId = req.user.id;
      }

      next();
    } catch (error) {
      // Ignore errors in optional auth - just continue without user
      next();
    }
  }

  // Convenience middleware for common role combinations
  static adminOnly = EnhancedAuthMiddleware.requireRole('admin');
  static staffOnly = EnhancedAuthMiddleware.requireRole('admin', 'staff');
  static teacherAndAbove = EnhancedAuthMiddleware.requireRole('admin', 'staff', 'teacher');
  static authenticated = EnhancedAuthMiddleware.verifyToken;
}

/**
 * Factory for creating service-specific auth middleware
 * Makes it easy for services to set up their auth patterns
 */
export class AuthFactory {
  /**
   * Create a complete auth setup for a service
   */
  static createServiceAuth(userLookupFn: UserLookupFunction) {
    const authenticateToken = EnhancedAuthMiddleware.verifyTokenWithUserLookup(userLookupFn);

    return {
      // Core authentication
      authenticateToken,
      verifyToken: EnhancedAuthMiddleware.verifyToken,
      optionalAuth: EnhancedAuthMiddleware.optionalAuth,

      // Role-based access
      requireRole: EnhancedAuthMiddleware.requireRole,
      adminOnly: EnhancedAuthMiddleware.adminOnly,
      staffOnly: EnhancedAuthMiddleware.staffOnly,
      teacherAndAbove: EnhancedAuthMiddleware.teacherAndAbove,
      authenticated: EnhancedAuthMiddleware.authenticated,

      // Ownership validation
      requireOwnership: EnhancedAuthMiddleware.requireOwnership,

      // Custom combinations for common patterns
      requireOwnershipOrAdmin: EnhancedAuthMiddleware.requireOwnership({
        userIdParam: 'id',
        allowedRoles: ['admin'],
        bypassOwnership: true,
      }),

      requireOwnershipOrStaff: EnhancedAuthMiddleware.requireOwnership({
        userIdParam: 'id',
        allowedRoles: ['admin', 'staff'],
        bypassOwnership: true,
      }),

      requireOwnershipOrTeacher: EnhancedAuthMiddleware.requireOwnership({
        userIdParam: 'id',
        allowedRoles: ['admin', 'staff', 'teacher'],
        bypassOwnership: true,
      }),
    };
  }
}

// Re-export types and main classes
export type { AuthenticatedUser as User };
export default EnhancedAuthMiddleware;
