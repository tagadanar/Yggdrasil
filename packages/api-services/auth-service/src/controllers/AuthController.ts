// Path: packages/api-services/auth-service/src/controllers/AuthController.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { ResponseHelper, HTTP_STATUS } from '../../../../shared-utilities/src';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, role, profile } = req.body;

      // Validate required fields
      if (!email || !password || !role || !profile?.firstName || !profile?.lastName) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Missing required fields')
        );
        return;
      }

      const result = await AuthService.register({ email, password, role, profile });

      if (!result.success) {
        const statusCode = result.error?.includes('already exists') 
          ? HTTP_STATUS.CONFLICT 
          : HTTP_STATUS.BAD_REQUEST;

        res.status(statusCode).json(ResponseHelper.error(result.error!));
        return;
      }

      // Remove password from response
      const userResponse = {
        ...result.user!.toObject(),
        password: undefined
      };

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success({
          user: userResponse,
          tokens: result.tokens
        }, 'User registered successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Registration failed')
      );
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Email and password are required')
        );
        return;
      }

      const result = await AuthService.login(email, password);

      if (!result.success) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      // Remove password from response
      const userResponse = {
        ...result.user!.toObject(),
        password: undefined
      };

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({
          user: userResponse,
          tokens: result.tokens
        }, 'Login successful')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Login failed')
      );
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // Validate required fields
      if (!refreshToken) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Refresh token is required')
        );
        return;
      }

      const result = await AuthService.refreshToken(refreshToken);

      if (!result.success) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({
          accessToken: result.accessToken
        }, 'Token refreshed successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Token refresh failed')
      );
    }
  }

  /**
   * Forgot password - generate reset token
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Validate required fields
      if (!email) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Email is required')
        );
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Invalid email format')
        );
        return;
      }

      const result = await AuthService.forgotPassword(email);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      // Return reset token if it exists (for testing), otherwise just success message
      const responseData = result.resetToken ? { resetToken: result.resetToken } : {};

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(
          responseData,
          result.message || 'Password reset instructions sent'
        )
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Forgot password failed')
      );
    }
  }

  /**
   * Reset password using reset token
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      // Validate required fields
      if (!token || !newPassword) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Reset token and new password are required')
        );
        return;
      }

      const result = await AuthService.resetPassword(token, newPassword);

      if (!result.success) {
        const statusCode = result.error?.includes('Invalid reset token')
          ? HTTP_STATUS.UNAUTHORIZED
          : HTTP_STATUS.BAD_REQUEST;

        res.status(statusCode).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(
          {},
          result.message || 'Password reset successfully'
        )
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Password reset failed')
      );
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const result = await AuthService.logout();

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(
          {},
          result.message || 'Logged out successfully'
        )
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Logout failed')
      );
    }
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).user?.id; // From auth middleware

      // Validate required fields
      if (!currentPassword || !newPassword) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Current password and new password are required')
        );
        return;
      }

      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.authError('User not authenticated')
        );
        return;
      }

      const result = await AuthService.changePassword(userId, currentPassword, newPassword);

      if (!result.success) {
        const statusCode = result.error?.includes('Current password')
          ? HTTP_STATUS.UNAUTHORIZED
          : HTTP_STATUS.BAD_REQUEST;

        res.status(statusCode).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(
          {},
          result.message || 'Password changed successfully'
        )
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Change password failed')
      );
    }
  }
}