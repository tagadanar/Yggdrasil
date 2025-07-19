// packages/api-services/auth-service/src/services/AuthService.ts
// Authentication service with business logic

import { UserModel, UserDocument, UserModelType } from '@yggdrasil/database-schemas';

console.log('🔧 AUTH SERVICE: UserModel imported successfully');
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
    console.log(`🚨 AUTH SERVICE: LOGIN METHOD CALLED for email: ${loginData.email}`);
    console.log(`🚨 AUTH SERVICE: NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🚨 AUTH SERVICE: DB_NAME: ${process.env.DB_NAME}`);
    console.log(`🚨 AUTH SERVICE: DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
    
    try {
      console.log(`🔐 AUTH SERVICE: Starting login for email: ${loginData.email}`);
      console.log(`🔐 AUTH SERVICE: NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`🔐 AUTH SERVICE: DB_NAME: ${process.env.DB_NAME}`);
      console.log(`🔐 AUTH SERVICE: DB_COLLECTION_PREFIX: ${process.env.DB_COLLECTION_PREFIX}`);
      
      // Check database connection info
      try {
        console.log(`🔐 AUTH SERVICE: Database name: ${UserModel.db.name}`);
        console.log(`🔐 AUTH SERVICE: Connection string: ${UserModel.db.host}:${UserModel.db.port}`);
        
        // List all collections in the database
        const collections = await UserModel.db.listCollections();
        console.log(`🔐 AUTH SERVICE: Available collections: ${collections.map((c: any) => c.name).join(', ')}`);
      } catch (dbError) {
        console.error(`❌ AUTH SERVICE: Database inspection failed:`, dbError);
      }
      
      // Find user by email
      console.log(`🔐 AUTH SERVICE: Looking up user by email: ${loginData.email}`);
      console.log(`🔐 AUTH SERVICE: About to call UserModel.findByEmail...`);
      console.log(`🔐 AUTH SERVICE: UserModel:`, typeof UserModel, !!UserModel.findByEmail);
      const user = await UserModel.findByEmail(loginData.email);
      console.log(`🔐 AUTH SERVICE: UserModel.findByEmail returned:`, user ? 'User found' : 'User not found');
      
      if (!user) {
        console.log(`❌ AUTH SERVICE: User not found for email: ${loginData.email}`);
        
        // Try to find any user with similar email pattern for debugging
        console.log(`🔍 AUTH SERVICE: Searching for similar users...`);
        const allUsers = await UserModel.find({}).limit(10);
        console.log(`🔍 AUTH SERVICE: Found ${allUsers.length} total users in database`);
        
        if (allUsers.length > 0) {
          console.log(`🔍 AUTH SERVICE: First few users:`, allUsers.slice(0, 5).map(u => ({
            email: u.email,
            role: u.role,
            isActive: u.isActive
          })));
        }
        
        // Try regex search for similar emails
        const emailPrefix = loginData.email.split('@')[0];
        console.log(`🔍 AUTH SERVICE: Searching for users with email prefix: ${emailPrefix}`);
        const similarUsers = await UserModel.find({ email: { $regex: emailPrefix } });
        console.log(`🔍 AUTH SERVICE: Found ${similarUsers.length} users with similar email patterns`);
        
        if (similarUsers.length > 0) {
          console.log(`🔍 AUTH SERVICE: Similar users:`, similarUsers.map(u => ({
            email: u.email,
            role: u.role,
            isActive: u.isActive
          })));
        }
        
        return {
          success: false,
          error: ERROR_MESSAGES.INVALID_CREDENTIALS,
        };
      }
      
      console.log(`✅ AUTH SERVICE: User found for email: ${loginData.email}`);
      console.log(`✅ AUTH SERVICE: User details:`, {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        hasPassword: !!user.password,
        passwordLength: user.password?.length || 0
      });

      // Check if user is active
      if (!user.isActive) {
        console.log(`❌ AUTH SERVICE: User account is not active for email: ${loginData.email}`);
        return {
          success: false,
          error: ERROR_MESSAGES.ACCOUNT_LOCKED,
        };
      }

      console.log(`✅ AUTH SERVICE: User account is active for email: ${loginData.email}`);

      // Verify password
      console.log(`🔑 AUTH SERVICE: Verifying password for user: ${user.email}`);
      console.log(`🔑 AUTH SERVICE: Input password: '${loginData.password}'`);
      console.log(`🔑 AUTH SERVICE: Stored password hash: ${user.password.substring(0, 20)}...`);
      
      const isValidPassword = await user.comparePassword(loginData.password);
      console.log(`🔑 AUTH SERVICE: Password verification result: ${isValidPassword}`);
      
      if (!isValidPassword) {
        console.log(`❌ AUTH SERVICE: Password verification failed for user: ${user.email}`);
        
        // Debug: Try to manually verify the password
        console.log(`🔧 AUTH SERVICE: Debugging password verification...`);
        const bcrypt = require('bcrypt');
        const manualCheck = await bcrypt.compare(loginData.password, user.password);
        console.log(`🔧 AUTH SERVICE: Manual bcrypt comparison result: ${manualCheck}`);
        
        return {
          success: false,
          error: ERROR_MESSAGES.INVALID_CREDENTIALS,
        };
      }
      
      console.log(`✅ AUTH SERVICE: Password verification successful for user: ${user.email}`);

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
      console.error(`💥 AUTH SERVICE: Exception during login:`, error);
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
          error: ERROR_MESSAGES.ACCOUNT_LOCKED,
        };
      }

      // Check token version to prevent replay attacks
      if (tokenResult.data.tokenVersion !== user.tokenVersion) {
        return {
          success: false,
          error: ERROR_MESSAGES.TOKEN_INVALID,
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
          error: ERROR_MESSAGES.ACCOUNT_LOCKED,
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
      return {
        success: false,
        error: ERROR_MESSAGES.TOKEN_INVALID,
      };
    }
  }
}