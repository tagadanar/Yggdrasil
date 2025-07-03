// Path: packages/api-services/auth-service/src/services/AuthService.ts
import { UserModel, User } from '../../../../database-schemas/src';
import { 
  AuthHelper, 
  ValidationHelper, 
  UserRole,
  AuthTokens,
  createUserSchema,
  loginSchema
} from '../../../../shared-utilities/src';

export interface RegisterData {
  email: string;
  password: string;
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string;
  };
}

export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
  message?: string;
}

export interface TokenResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

export interface ResetTokenResult {
  success: boolean;
  resetToken?: string;
  error?: string;
  message?: string;
}

export interface ValidationResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: RegisterData): Promise<AuthResult> {
    try {
      // Validate input data
      const validation = ValidationHelper.validateSchema(createUserSchema, userData);
      if (!validation.success) {
        return {
          success: false,
          error: validation.errors!.join('; ')
        };
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Hash password
      const hashedPassword = await AuthHelper.hashPassword(userData.password);

      // Create user
      const user = new UserModel({
        ...userData,
        password: hashedPassword,
        email: ValidationHelper.normalizeEmail(userData.email)
      });

      const savedUser = await user.save();

      // Generate tokens
      const tokenPayload = {
        id: (savedUser._id as any).toString(),
        email: savedUser.email,
        role: savedUser.role
      };

      const accessToken = AuthHelper.generateAccessToken(tokenPayload);
      const refreshToken = AuthHelper.generateRefreshToken(tokenPayload);

      return {
        success: true,
        user: savedUser,
        tokens: { accessToken, refreshToken }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  }

  /**
   * Login user with email and password
   */
  static async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Validate input
      const validation = ValidationHelper.validateSchema(loginSchema, { email, password });
      if (!validation.success) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Find user by email
      const normalizedEmail = ValidationHelper.normalizeEmail(email);
      const user = await UserModel.findByEmail(normalizedEmail);
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is inactive'
        };
      }

      // Verify password
      const isPasswordValid = await AuthHelper.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      const tokenPayload = {
        id: (user._id as any).toString(),
        email: user.email,
        role: user.role
      };

      const accessToken = AuthHelper.generateAccessToken(tokenPayload);
      const refreshToken = AuthHelper.generateRefreshToken(tokenPayload);

      return {
        success: true,
        user,
        tokens: { accessToken, refreshToken }
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Login failed'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<TokenResult> {
    try {
      // Verify refresh token
      const decoded = AuthHelper.verifyRefreshToken(refreshToken);

      // Find user to ensure they still exist and are active
      const user = await UserModel.findById(decoded.id);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }

      // Generate new access token
      const tokenPayload = {
        id: (user._id as any).toString(),
        email: user.email,
        role: user.role
      };

      const newAccessToken = AuthHelper.generateAccessToken(tokenPayload);

      return {
        success: true,
        accessToken: newAccessToken
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Invalid refresh token'
      };
    }
  }

  /**
   * Validate access token and return user
   */
  static async validateAccessToken(accessToken: string): Promise<ValidationResult> {
    try {
      // Verify access token
      const decoded = AuthHelper.verifyAccessToken(accessToken);

      // Find user to ensure they still exist and are active
      const user = await UserModel.findById(decoded.id);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is inactive'
        };
      }

      return {
        success: true,
        user
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Invalid access token'
      };
    }
  }

  /**
   * Generate password reset token
   */
  static async forgotPassword(email: string): Promise<ResetTokenResult> {
    try {
      const normalizedEmail = ValidationHelper.normalizeEmail(email);
      const user = await UserModel.findByEmail(normalizedEmail);

      // For security, don't reveal if email exists or not
      if (!user) {
        return {
          success: true, // Return success to prevent email enumeration
          message: 'If the email exists, a reset token has been generated'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is inactive'
        };
      }

      // Generate password reset token (short-lived)
      const resetToken = AuthHelper.generatePasswordResetToken({
        id: (user._id as any).toString(),
        email: user.email
      });

      return {
        success: true,
        resetToken,
        message: 'Password reset token generated'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to generate reset token'
      };
    }
  }

  /**
   * Reset password using reset token
   */
  static async resetPassword(resetToken: string, newPassword: string): Promise<AuthResult> {
    try {
      // Validate new password
      const passwordValidation = ValidationHelper.isValidPassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password must meet requirements: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Verify reset token
      const decoded = AuthHelper.verifyPasswordResetToken(resetToken);

      // Find user
      const user = await UserModel.findById(decoded.id);
      if (!user) {
        return {
          success: false,
          error: 'Invalid reset token'
        };
      }

      // Hash new password
      const hashedPassword = await AuthHelper.hashPassword(newPassword);

      // Update user password
      user.password = hashedPassword;
      await user.save();

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Invalid reset token'
      };
    }
  }

  /**
   * Logout user (stateless - handled by client)
   */
  static async logout(): Promise<AuthResult> {
    // With JWT, logout is primarily handled on the client side
    // by removing the tokens from storage
    return {
      success: true,
      message: 'Logged out successfully'
    };
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<AuthResult> {
    try {
      // Find user
      const user = await UserModel.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Verify current password
      const isCurrentPasswordValid = await AuthHelper.comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Validate new password
      const passwordValidation = ValidationHelper.isValidPassword(newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          error: `Password must meet requirements: ${passwordValidation.errors.join(', ')}`
        };
      }

      // Hash new password
      const hashedPassword = await AuthHelper.hashPassword(newPassword);

      // Update user password
      user.password = hashedPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to change password'
      };
    }
  }
}