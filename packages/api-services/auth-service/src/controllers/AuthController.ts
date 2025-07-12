// Path: packages/api-services/auth-service/src/controllers/AuthController.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { ResponseHelper, HTTP_STATUS } from '@101-school/shared-utilities';
import { UserModel } from '@101-school/database-schemas';

/**
 * Map MongoDB user object to API response format
 */
function mapUserResponse(user: any) {
  const userObj = user.toObject();
  return {
    ...userObj,
    id: userObj._id.toString(), // Map MongoDB _id to id
    password: undefined // Remove password for security
  };
}

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

      // Map user response with proper ID mapping
      const userResponse = mapUserResponse(result.user!);

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

      // Map user response with proper ID mapping
      const userResponse = mapUserResponse(result.user!);

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
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
          }
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
      const user = (req as any).user;
      
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.authError('User not authenticated')
        );
        return;
      }

      const result = await AuthService.logout();

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(
          {},
          'Logged out successfully'
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
      const userId = (req as any).user?._id?.toString(); // From auth middleware (MongoDB _id)

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

  /**
   * Get user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.authError('User not authenticated')
        );
        return;
      }

      // User object is already properly formatted from auth middleware
      const userResponse = {
        ...user,
        password: undefined // Ensure password is not included
      };

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({ user: userResponse }, 'Profile retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to get profile')
      );
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { profile } = req.body;
      
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.authError('User not authenticated')
        );
        return;
      }

      // CRITICAL SECURITY: Prevent users from modifying forbidden fields
      const forbiddenFields = ['role', 'email', 'isActive', 'password'];
      const requestFields = Object.keys(req.body);
      const attemptedForbiddenFields = requestFields.filter(field => forbiddenFields.includes(field));
      
      if (attemptedForbiddenFields.length > 0) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError(`Cannot modify restricted fields: ${attemptedForbiddenFields.join(', ')}. Insufficient permissions.`)
        );
        return;
      }

      const result = await AuthService.updateProfile(user.id, profile);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({ user: result.user }, 'Profile updated successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to update profile')
      );
    }
  }

  /**
   * Get users list (admin/staff only)
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.authError('User not authenticated')
        );
        return;
      }

      if (!['admin', 'staff'].includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Insufficient permissions')
        );
        return;
      }

      const result = await AuthService.getUsers();

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(result.users, 'Users retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to get users')
      );
    }
  }

  /**
   * Get specific user by ID (with proper authorization)
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { userId } = req.params;
      
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.authError('User not authenticated')
        );
        return;
      }

      // Only admin/staff can view other user profiles, users can view their own
      if (user._id.toString() !== userId && !['admin', 'staff'].includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Cannot access other user profiles')
        );
        return;
      }

      // Get the target user
      const targetUser = await UserModel.findById(userId);
      if (!targetUser) {
        res.status(HTTP_STATUS.NOT_FOUND).json(
          ResponseHelper.error('User not found')
        );
        return;
      }

      // Map user response with proper ID mapping
      const userResponse = mapUserResponse(targetUser);

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({ user: userResponse }, 'User retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to get user')
      );
    }
  }

  /**
   * Get students list (teacher role can access)
   */
  static async getStudents(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json(
          ResponseHelper.authError('User not authenticated')
        );
        return;
      }

      if (!['admin', 'staff', 'teacher'].includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Insufficient permissions')
        );
        return;
      }

      const result = await AuthService.getStudents();

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(result.students, 'Students retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to get students')
      );
    }
  }

  /**
   * Admin - Create user
   */
  static async adminCreateUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { email, password, role, profile } = req.body;
      
      if (!user || user.role !== 'admin') {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Admin access required')
        );
        return;
      }

      if (!email || !password || !role || !profile) {
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

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success({ user: result.user }, 'User created successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to create user')
      );
    }
  }

  /**
   * Admin - Update user
   */
  static async adminUpdateUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { userId } = req.params;
      const updateData = req.body;
      
      if (!user || user.role !== 'admin') {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Admin access required')
        );
        return;
      }

      const result = await AuthService.updateUser(userId, updateData);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      // Map user response with proper ID mapping
      const userResponse = mapUserResponse(result.user!);

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({ user: userResponse }, 'User updated successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to update user')
      );
    }
  }

  /**
   * Admin - Get system statistics
   */
  static async getAdminStats(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user || user.role !== 'admin') {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Admin access required')
        );
        return;
      }

      const result = await AuthService.getSystemStats();

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(result.stats, 'Statistics retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to get statistics')
      );
    }
  }

  /**
   * Admin - Get audit logs
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user || user.role !== 'admin') {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Admin access required')
        );
        return;
      }

      const result = await AuthService.getAuditLogs();

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(result.logs, 'Audit logs retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to get audit logs')
      );
    }
  }

  /**
   * Admin - Get all users (admin-specific endpoint)
   */
  static async getAdminUsers(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user || user.role !== 'admin') {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Admin access required')
        );
        return;
      }

      const result = await AuthService.getUsers();

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success(result.users, 'Admin users retrieved successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to get admin users')
      );
    }
  }

  /**
   * Admin - Reset user password
   */
  static async adminResetPassword(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { userId, newPassword } = req.body;
      
      if (!user || user.role !== 'admin') {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Admin access required')
        );
        return;
      }

      if (!userId || !newPassword) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('User ID and new password are required')
        );
        return;
      }

      const result = await AuthService.adminResetPassword(userId, newPassword);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({}, 'Password reset successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to reset password')
      );
    }
  }

  /**
   * Staff - Create student
   */
  static async staffCreateStudent(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { email, password, profile } = req.body;
      
      if (!user || !['admin', 'staff'].includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Staff access required')
        );
        return;
      }

      if (!email || !password || !profile) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Missing required fields')
        );
        return;
      }

      const result = await AuthService.register({ email, password, role: 'student', profile });

      if (!result.success) {
        const statusCode = result.error?.includes('already exists') 
          ? HTTP_STATUS.CONFLICT 
          : HTTP_STATUS.BAD_REQUEST;

        res.status(statusCode).json(ResponseHelper.error(result.error!));
        return;
      }

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success({ user: result.user }, 'Student created successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to create student')
      );
    }
  }

  /**
   * Staff - Create user (with role restrictions)
   */
  static async staffCreateUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { email, password, role, profile } = req.body;
      
      if (!user || !['admin', 'staff'].includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Staff access required')
        );
        return;
      }

      // CRITICAL SECURITY: Staff cannot create admin users
      if (role === 'admin') {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Staff cannot create admin users')
        );
        return;
      }

      if (!email || !password || !role || !profile) {
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

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success({ user: result.user }, 'User created successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to create user')
      );
    }
  }

  /**
   * Staff - Reset password
   */
  static async staffResetPassword(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { userId, newPassword } = req.body;
      
      if (!user || !['admin', 'staff'].includes(user.role)) {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Staff access required')
        );
        return;
      }

      if (!userId || !newPassword) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('User ID and new password are required')
        );
        return;
      }

      const result = await AuthService.adminResetPassword(userId, newPassword);

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({}, 'Password reset successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to reset password')
      );
    }
  }

  /**
   * Admin - Deactivate user
   */
  static async adminDeactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { userId } = req.params;
      
      if (!user || user.role !== 'admin') {
        res.status(HTTP_STATUS.FORBIDDEN).json(
          ResponseHelper.authorizationError('Admin access required')
        );
        return;
      }

      const result = await AuthService.updateUser(userId, { isActive: false });

      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.OK).json(
        ResponseHelper.success({}, 'User deactivated successfully')
      );
    } catch (error: any) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Failed to deactivate user')
      );
    }
  }
}