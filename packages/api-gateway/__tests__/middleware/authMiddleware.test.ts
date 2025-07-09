// Path: packages/api-gateway/__tests__/middleware/authMiddleware.test.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  createRoleMiddleware,
  createPermissionMiddleware,
  isPathBypassed,
  AuthenticatedRequest
} from '../../src/middleware/authMiddleware';
import { SecurityConfig } from '../../src/types/gateway';

describe('Auth Middleware', () => {
  let req: AuthenticatedRequest;
  let res: Response;
  let next: NextFunction;
  let securityConfig: SecurityConfig;

  beforeEach(() => {
    req = {
      headers: {},
      get: jest.fn(),
      cookies: {}
    } as any;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    } as any;

    next = jest.fn();

    securityConfig = {
      cors: {
        origins: ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST'],
        headers: ['Content-Type', 'Authorization']
      },
      rateLimiting: {
        global: {
          windowMs: 15 * 60 * 1000,
          maxRequests: 100,
          message: 'Too many requests',
          skipSuccessfulRequests: false,
          skipFailedRequests: false
        }
      },
      helmet: {
        enabled: true,
        options: {}
      },
      authentication: {
        jwtSecret: 'test-secret',
        tokenHeader: 'Authorization',
        cookieName: 'auth-token'
      }
    };
  });

  describe('createAuthMiddleware', () => {
    let authMiddleware: ReturnType<typeof createAuthMiddleware>;

    beforeEach(() => {
      authMiddleware = createAuthMiddleware(securityConfig);
    });

    it('should authenticate user with valid Bearer token', () => {
      const token = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'user' },
        securityConfig.authentication.jwtSecret
      );

      req.get = jest.fn().mockReturnValue(`Bearer ${token}`);

      authMiddleware(req, res, next);

      expect(req.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        role: 'user',
        permissions: []
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should authenticate user with token from cookies', () => {
      const token = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'user', permissions: ['read'] },
        securityConfig.authentication.jwtSecret
      );

      req.get = jest.fn().mockReturnValue(null);
      req.cookies = { 'auth-token': token };

      authMiddleware(req, res, next);

      expect(req.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read']
      });
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when no token is provided', () => {
      req.get = jest.fn().mockReturnValue(null);

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', () => {
      req.get = jest.fn().mockReturnValue('Bearer invalid-token');

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid access token',
        code: 'INVALID_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      const expiredToken = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'user' },
        securityConfig.authentication.jwtSecret,
        { expiresIn: '-1h' }
      );

      req.get = jest.fn().mockReturnValue(`Bearer ${expiredToken}`);

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token payload is missing required fields', () => {
      const incompleteToken = jwt.sign(
        { email: 'test@example.com' }, // missing id
        securityConfig.authentication.jwtSecret
      );

      req.get = jest.fn().mockReturnValue(`Bearer ${incompleteToken}`);

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid access token',
        code: 'INVALID_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle token without Bearer prefix', () => {
      const token = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'user' },
        securityConfig.authentication.jwtSecret
      );

      req.get = jest.fn().mockReturnValue(token);

      authMiddleware(req, res, next);

      expect(req.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        role: 'user',
        permissions: []
      });
      expect(next).toHaveBeenCalled();
    });

    it('should handle unexpected errors gracefully', () => {
      req.get = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication error',
        code: 'AUTH_ERROR'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('createOptionalAuthMiddleware', () => {
    let optionalAuthMiddleware: ReturnType<typeof createOptionalAuthMiddleware>;

    beforeEach(() => {
      optionalAuthMiddleware = createOptionalAuthMiddleware(securityConfig);
    });

    it('should authenticate user with valid token', () => {
      const token = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'user' },
        securityConfig.authentication.jwtSecret
      );

      req.get = jest.fn().mockReturnValue(`Bearer ${token}`);

      optionalAuthMiddleware(req, res, next);

      expect(req.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        role: 'user',
        permissions: []
      });
      expect(next).toHaveBeenCalled();
    });

    it('should continue without user when no token is provided', () => {
      req.get = jest.fn().mockReturnValue(null);

      optionalAuthMiddleware(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user when token is invalid', () => {
      req.get = jest.fn().mockReturnValue('Bearer invalid-token');

      optionalAuthMiddleware(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user when token is expired', () => {
      const expiredToken = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'user' },
        securityConfig.authentication.jwtSecret,
        { expiresIn: '-1h' }
      );

      req.get = jest.fn().mockReturnValue(`Bearer ${expiredToken}`);

      optionalAuthMiddleware(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should authenticate user from cookies when available', () => {
      const token = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'admin', permissions: ['read', 'write'] },
        securityConfig.authentication.jwtSecret
      );

      req.get = jest.fn().mockReturnValue(null);
      req.cookies = { 'auth-token': token };

      optionalAuthMiddleware(req, res, next);

      expect(req.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write']
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('createRoleMiddleware', () => {
    let roleMiddleware: ReturnType<typeof createRoleMiddleware>;

    beforeEach(() => {
      roleMiddleware = createRoleMiddleware(['admin', 'moderator']);
    });

    it('should allow access for user with authorized role', () => {
      req.user = {
        id: 'user123',
        email: 'test@example.com',
        role: 'admin',
        permissions: []
      };

      roleMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for user with unauthorized role', () => {
      req.user = {
        id: 'user123',
        email: 'test@example.com',
        role: 'user',
        permissions: []
      };

      roleMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: ['admin', 'moderator'],
        current: 'user'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated user', () => {
      req.user = undefined;

      roleMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access for user with one of multiple allowed roles', () => {
      req.user = {
        id: 'user123',
        email: 'test@example.com',
        role: 'moderator',
        permissions: []
      };

      roleMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('createPermissionMiddleware', () => {
    let permissionMiddleware: ReturnType<typeof createPermissionMiddleware>;

    beforeEach(() => {
      permissionMiddleware = createPermissionMiddleware(['read', 'write']);
    });

    it('should allow access for user with all required permissions', () => {
      req.user = {
        id: 'user123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read', 'write', 'delete']
      };

      permissionMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for user with insufficient permissions', () => {
      req.user = {
        id: 'user123',
        email: 'test@example.com',
        role: 'user',
        permissions: ['read']
      };

      permissionMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: ['read', 'write'],
        current: ['read']
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated user', () => {
      req.user = undefined;

      permissionMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle user with no permissions', () => {
      req.user = {
        id: 'user123',
        email: 'test@example.com',
        role: 'user',
        permissions: []
      };

      permissionMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: ['read', 'write'],
        current: []
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle user with undefined permissions', () => {
      req.user = {
        id: 'user123',
        email: 'test@example.com',
        role: 'user'
      };

      permissionMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: ['read', 'write'],
        current: []
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('isPathBypassed', () => {
    it('should return true for exact path match', () => {
      const bypassPaths = ['/api/public', '/api/health'];
      
      expect(isPathBypassed('/api/public', bypassPaths)).toBe(true);
      expect(isPathBypassed('/api/health', bypassPaths)).toBe(true);
    });

    it('should return true for path with sub-routes', () => {
      const bypassPaths = ['/api/public'];
      
      expect(isPathBypassed('/api/public/test', bypassPaths)).toBe(true);
      expect(isPathBypassed('/api/public/auth/login', bypassPaths)).toBe(true);
    });

    it('should return true for wildcard paths', () => {
      const bypassPaths = ['/api/public/*', '/api/auth/register*'];
      
      expect(isPathBypassed('/api/public/anything', bypassPaths)).toBe(true);
      expect(isPathBypassed('/api/public/nested/route', bypassPaths)).toBe(true);
      expect(isPathBypassed('/api/auth/register', bypassPaths)).toBe(true);
      expect(isPathBypassed('/api/auth/register/confirm', bypassPaths)).toBe(true);
    });

    it('should return false for non-matching paths', () => {
      const bypassPaths = ['/api/public', '/api/health'];
      
      expect(isPathBypassed('/api/private', bypassPaths)).toBe(false);
      expect(isPathBypassed('/api/auth', bypassPaths)).toBe(false);
      expect(isPathBypassed('/different/route', bypassPaths)).toBe(false);
    });

    it('should return false for similar but not matching paths', () => {
      const bypassPaths = ['/api/public'];
      
      expect(isPathBypassed('/api/public-test', bypassPaths)).toBe(false);
      expect(isPathBypassed('/api/publictest', bypassPaths)).toBe(false);
    });

    it('should handle empty bypass paths', () => {
      expect(isPathBypassed('/api/test', [])).toBe(false);
    });

    it('should handle complex wildcard patterns', () => {
      const bypassPaths = ['/api/*/public', '/health*', '/docs/*'];
      
      expect(isPathBypassed('/api/v1/public', bypassPaths)).toBe(true);
      expect(isPathBypassed('/api/v2/public/test', bypassPaths)).toBe(true);
      expect(isPathBypassed('/health', bypassPaths)).toBe(true);
      expect(isPathBypassed('/health/check', bypassPaths)).toBe(true);
      expect(isPathBypassed('/docs/swagger', bypassPaths)).toBe(true);
    });
  });
});