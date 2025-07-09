// Path: packages/api-gateway/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SecurityConfig } from '../types/gateway';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions?: string[];
  };
  requestId?: string;
  startTime?: Date;
}

export function createAuthMiddleware(securityConfig: SecurityConfig) {
  return function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    try {
      // Get token from header, cookie, or query parameter
      let token = extractToken(req, securityConfig.authentication.tokenHeader);

      if (!token && securityConfig.authentication.cookieName) {
        token = req.cookies?.[securityConfig.authentication.cookieName];
      }

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Access token required',
          code: 'MISSING_TOKEN'
        });
        return;
      }

      // Verify token
      const decoded = jwt.verify(token, securityConfig.authentication.jwtSecret) as any;
      
      if (!decoded || !decoded.id) {
        res.status(401).json({
          success: false,
          error: 'Invalid access token',
          code: 'INVALID_TOKEN'
        });
        return;
      }

      // Attach user to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || []
      };

      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: 'Access token expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
          success: false,
          error: 'Invalid access token',
          code: 'INVALID_TOKEN'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    }
  };
}

export function createOptionalAuthMiddleware(securityConfig: SecurityConfig) {
  return function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    try {
      let token = extractToken(req, securityConfig.authentication.tokenHeader);

      if (!token && securityConfig.authentication.cookieName) {
        token = req.cookies?.[securityConfig.authentication.cookieName];
      }

      if (!token) {
        // No token provided, continue without user
        next();
        return;
      }

      // Verify token if provided
      const decoded = jwt.verify(token, securityConfig.authentication.jwtSecret) as any;
      
      if (decoded && decoded.id) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          permissions: decoded.permissions || []
        };
      }

      next();
    } catch (error) {
      // If token is invalid, continue without user (optional auth)
      next();
    }
  };
}

export function createRoleMiddleware(allowedRoles: string[]) {
  return function roleMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
}

export function createPermissionMiddleware(requiredPermissions: string[]) {
  return function permissionMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions,
        current: userPermissions
      });
      return;
    }

    next();
  };
}

function extractToken(req: Request, tokenHeader: string): string | null {
  const authHeader = req.get(tokenHeader);
  
  if (!authHeader) {
    return null;
  }

  // Support Bearer token format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Return token as-is
  return authHeader;
}

export function isPathBypassed(path: string, bypassPaths: string[]): boolean {
  return bypassPaths.some(bypassPath => {
    // Support wildcard matching
    if (bypassPath.includes('*')) {
      // Convert wildcard pattern to regex
      const regexPattern = bypassPath
        .replace(/\*/g, '.*'); // * matches any characters
      
      const regex = new RegExp(`^${regexPattern}`);
      return regex.test(path);
    }
    
    // Exact match
    return path === bypassPath || path.startsWith(bypassPath + '/');
  });
}