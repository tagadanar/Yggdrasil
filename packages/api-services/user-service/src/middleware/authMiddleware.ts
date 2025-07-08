import { Request, Response, NextFunction } from 'express';
import { ResponseHelper, HTTP_STATUS } from '../../../../shared-utilities/src';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.authError('No token provided')
      );
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Authentication configuration error')
      );
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    req.user = {
      id: decoded.id || decoded.userId || decoded._id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.authError('Token expired')
      );
    } else if (error.name === 'JsonWebTokenError') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.authError('Invalid token')
      );
    } else {
      console.error('Auth middleware error:', error);
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.authError('Authentication failed')
      );
    }
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json(
        ResponseHelper.authError('Authentication required')
      );
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json(
        ResponseHelper.authorizationError('Insufficient permissions')
      );
      return;
    }

    next();
  };
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      next();
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    req.user = {
      id: decoded.id || decoded.userId || decoded._id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error: any) {
    // Authentication failed, but continue without user info
    next();
  }
};