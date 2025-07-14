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
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validation = ValidationHelper.validate(RegisterRequestSchema, req.body);
      if (!validation.success) {
        res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(
          ResponseHelper.validationError(validation.errors!)
        );
        return;
      }

      // Register user
      const result = await AuthService.register(validation.data!);

      if (result.success) {
        res.status(HTTP_STATUS.CREATED).json(
          ResponseHelper.success({ user: result.user, tokens: result.tokens }, 'User registered successfully')
        );
      } else {
        const statusCode = result.error?.includes('already exists') 
          ? HTTP_STATUS.CONFLICT 
          : HTTP_STATUS.BAD_REQUEST;
        
        res.status(statusCode).json(
          ResponseHelper.error(result.error!, statusCode)
        );
      }
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.error('Registration failed')
      );
    }
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
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.unauthorized(result.error!)
        );
      }
    } catch (error) {
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
}