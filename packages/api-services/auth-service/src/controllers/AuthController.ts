// packages/api-services/auth-service/src/controllers/AuthController.ts
// Authentication controller handling HTTP requests

import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { 
  ValidationHelper, 
  ResponseHelper,
  LoginRequestSchema,
  RegisterRequestSchema,
  RefreshTokenSchema,
  HTTP_STATUS 
} from '@yggdrasil/shared-utilities';

export class AuthController {
  /**
   * POST /api/auth/register
   * Public registration is disabled - only admin can create users
   */
  static async register(req: Request, res: Response): Promise<void> {
    // Public registration is disabled
    res.status(HTTP_STATUS.FORBIDDEN).json(
      ResponseHelper.error('Public registration is disabled. User creation is restricted to administrators.', HTTP_STATUS.FORBIDDEN)
    );
  }

  /**
   * POST /api/auth/login
   * Authenticate user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validation = ValidationHelper.validate(LoginRequestSchema, req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(
          ResponseHelper.validationError(validation.errors!)
        );
        return;
      }

      // Authenticate user
      const result = await AuthService.login(validation.data!);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(
          ResponseHelper.success({ user: result.user, tokens: result.tokens }, 'Login successful')
        );
      } else {
        // Add debug information to the response in test environment
        const debugInfo = process.env.NODE_ENV === 'test' ? {
          debug: {
            email: validation.data?.email,
            error: result.error,
            timestamp: new Date().toISOString()
          }
        } : undefined;
        
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.error(result.error!, HTTP_STATUS.UNAUTHORIZED, debugInfo)
        );
      }
    } catch (error) {
      console.error('AUTH CONTROLLER: Exception during login:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Login failed')
      );
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access tokens
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validation = ValidationHelper.validate(RefreshTokenSchema, req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(
          ResponseHelper.validationError(validation.errors!)
        );
        return;
      }

      // Refresh tokens
      const result = await AuthService.refreshTokens(validation.data!.refreshToken);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(
          ResponseHelper.success({ user: result.user, tokens: result.tokens }, 'Tokens refreshed successfully')
        );
      } else {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized(result.error!)
        );
      }
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Token refresh failed')
      );
    }
  }

  /**
   * POST /api/auth/logout
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?._id;
      
      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('User not authenticated')
        );
        return;
      }

      // Logout user
      const result = await AuthService.logout(userId);

      if (result.success) {
        res.status(HTTP_STATUS.OK).json(
          ResponseHelper.success(null, 'Logout successful')
        );
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
      }
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Logout failed')
      );
    }
  }

  /**
   * GET /api/auth/me
   * Get current user information
   */
  static async me(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      console.log('🔍 AUTH CONTROLLER /me: User from middleware:', {
        email: user?.email,
        role: user?.role,
        hasProfile: !!user?.profile,
        profileData: user?.profile ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          department: user.profile.department,
          keys: Object.keys(user.profile)
        } : 'no profile'
      });
      
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized('User not authenticated')
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({ user }, 'User information retrieved')
      );
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve user information')
      );
    }
  }

  /**
   * GET /api/auth/registration-status
   * Get registration status information
   */
  static async registrationStatus(req: Request, res: Response): Promise<void> {
    try {
      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({
          registrationEnabled: false,
          message: 'User creation is restricted to administrators. Please contact your system administrator to create new accounts.'
        }, 'Registration status retrieved')
      );
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Failed to retrieve registration status')
      );
    }
  }
}