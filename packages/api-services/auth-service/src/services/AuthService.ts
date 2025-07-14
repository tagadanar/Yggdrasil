// packages/api-services/auth-service/src/services/AuthService.ts
// Authentication service with business logic

import { UserModel, UserDocument, UserModelType } from '@yggdrasil/database-schemas';
import { 
  AuthResult, 
  LoginRequestType, 
  RegisterRequestType,
  AuthTokens,
  User,
  ERROR_MESSAGES 
} from '@yggdrasil/shared-utilities';
import { JWTHelper } from '../utils/JWTHelper';

export class AuthService {
  /**
   * Convert UserDocument to User (removes password and converts _id to string)
   */
  private static userDocumentToUser(userDoc: UserDocument): User {
    return userDoc.toJSON() as User;
  }
  /**
   * Register a new user
   */
  static async register(userData: RegisterRequestType): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
        };
      }

      // Create new user
      const newUser = new UserModel({
        email: userData.email.toLowerCase(),
        password: userData.password, // Will be hashed by pre-save middleware
        role: userData.role,
        profile: userData.profile,
        isActive: true,
      });

      // Save user to database
      const savedUser = await newUser.save();

      // Generate tokens
      const tokens = JWTHelper.generateTokens({
        _id: savedUser._id.toString(),
        email: savedUser.email,
        role: savedUser.role,
        tokenVersion: savedUser.tokenVersion,
      });

      // Remove sensitive information and return
      const userResponse = this.userDocumentToUser(savedUser);

      return {
        success: true,
        user: userResponse,
        tokens,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Authenticate user login
   */
  static async login(loginData: LoginRequestType): Promise<AuthResult> {
    try {
      // Find user by email
      const user = await UserModel.findByEmail(loginData.email);
      if (!user) {
        return {
          success: false,
          error: ERROR_MESSAGES.INVALID_CREDENTIALS,
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account has been deactivated',
        };
      }

      // Verify password
      const isValidPassword = await user.comparePassword(loginData.password);
      if (!isValidPassword) {
        return {
          success: false,
          error: ERROR_MESSAGES.INVALID_CREDENTIALS,
        };
      }

      // Update last login timestamp using findByIdAndUpdate to avoid document issues
      await UserModel.findByIdAndUpdate(user._id, { lastLogin: new Date() });

      // Generate tokens
      const tokens = JWTHelper.generateTokens({
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion,
      });

      // Return user data without sensitive information
      const userResponse = this.userDocumentToUser(user);

      return {
        success: true,
        user: userResponse,
        tokens,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Refresh access tokens using refresh token
   */
  static async refreshTokens(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const tokenResult = JWTHelper.verifyRefreshToken(refreshToken);
      if (!tokenResult.success || !tokenResult.data) {
        return {
          success: false,
          error: ERROR_MESSAGES.TOKEN_INVALID,
        };
      }

      // Find user by ID from token
      const user = await UserModel.findById(tokenResult.data.id);
      if (!user) {
        return {
          success: false,
          error: ERROR_MESSAGES.USER_NOT_FOUND,
        };
      }

      // Check if user is still active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account has been deactivated',
        };
      }

      // Check token version to prevent replay attacks
      if (tokenResult.data.tokenVersion !== user.tokenVersion) {
        return {
          success: false,
          error: 'Invalid token version',
        };
      }

      // Generate new tokens
      const tokens = JWTHelper.generateTokens({
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion,
      });

      // Return user data with new tokens
      const userResponse = this.userDocumentToUser(user);

      return {
        success: true,
        user: userResponse,
        tokens,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.TOKEN_INVALID,
      };
    }
  }

  /**
   * Logout user by invalidating tokens
   */
  static async logout(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return {
          success: false,
          error: ERROR_MESSAGES.USER_NOT_FOUND,
        };
      }

      // Increment token version to invalidate all existing tokens
      await user.incrementTokenVersion();

      return {
        success: true,
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR,
      };
    }
  }

  /**
   * Verify user's access token and return user data
   */
  static async verifyUser(accessToken: string): Promise<AuthResult> {
    try {
      // Verify access token
      const tokenResult = JWTHelper.verifyAccessToken(accessToken);
      if (!tokenResult.success || !tokenResult.data) {
        return {
          success: false,
          error: ERROR_MESSAGES.TOKEN_INVALID,
        };
      }

      // Find user by ID from token
      const user = await UserModel.findById(tokenResult.data.id);
      if (!user) {
        return {
          success: false,
          error: ERROR_MESSAGES.USER_NOT_FOUND,
        };
      }

      // Check if user is still active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account has been deactivated',
        };
      }

      // Check token version to ensure token wasn't invalidated by logout
      if (tokenResult.data.tokenVersion !== user.tokenVersion) {
        return {
          success: false,
          error: ERROR_MESSAGES.TOKEN_INVALID,
        };
      }

      // Return user data
      const userResponse = this.userDocumentToUser(user);

      return {
        success: true,
        user: userResponse,
      };
    } catch (error) {
      console.error('User verification error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.TOKEN_INVALID,
      };
    }
  }
}