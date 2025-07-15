// packages/api-services/user-service/src/services/UserService.ts
// TDD: REFACTOR phase - Clean implementation while keeping tests green

import { UserModel, UserDocument } from '@yggdrasil/database-schemas';
import { ValidationHelper } from '@yggdrasil/shared-utilities';
import bcrypt from 'bcrypt';

// REFACTOR: Better type definitions
export interface UserData {
  id: string;
  email: string;
  role: string;
  profile: any;
  isActive: boolean;
}

export interface UserServiceResult {
  success: boolean;
  data?: {
    user?: UserData;
    users?: UserData[];
    preferences?: any;
    pagination?: {
      limit: number;
      offset: number;
      total?: number;
    };
  };
  error?: string;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
    department?: string;
    title?: string;
    grade?: string;
    studentId?: string;
  };
}

export interface ListUsersOptions {
  role?: string;
  limit?: number;
  offset?: number;
}

// REFACTOR: Extract error messages as constants
const ERROR_MESSAGES = {
  INVALID_USER_ID: 'Invalid user ID format',
  USER_NOT_FOUND: 'User not found',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_PROFILE_FIRSTNAME: 'Invalid profile data: firstName cannot be empty',
  INVALID_PROFILE_LASTNAME: 'Invalid profile data: lastName cannot be empty',
  UPDATE_FAILED: 'Update failed',
  USER_ALREADY_EXISTS: 'User with this email already exists',
  VALIDATION_ERROR: 'Validation error'
} as const;

export class UserService {
  // REFACTOR: Extract user transformation to private method
  private static transformUserDocument(user: UserDocument): UserData {
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      profile: user.profile,
      isActive: user.isActive
    };
  }

  static async getUserById(userId: string): Promise<UserServiceResult> {
    // REFACTOR: Use extracted error message
    if (!ValidationHelper.isValidObjectId(userId)) {
      return {
        success: false,
        error: ERROR_MESSAGES.INVALID_USER_ID
      };
    }

    try {
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return {
          success: false,
          error: ERROR_MESSAGES.USER_NOT_FOUND
        };
      }

      // REFACTOR: Use extracted transformation method
      return {
        success: true,
        data: {
          user: this.transformUserDocument(user)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR
      };
    }
  }

  // REFACTOR: Extract profile validation to private method
  private static validateProfileData(profileData: ProfileUpdateData): string | null {
    if (profileData.firstName !== undefined && profileData.firstName.trim() === '') {
      return ERROR_MESSAGES.INVALID_PROFILE_FIRSTNAME;
    }
    if (profileData.lastName !== undefined && profileData.lastName.trim() === '') {
      return ERROR_MESSAGES.INVALID_PROFILE_LASTNAME;
    }
    return null;
  }

  static async updateUserProfile(userId: string, profileData: ProfileUpdateData): Promise<UserServiceResult> {
    // REFACTOR: Use extracted error message
    if (!ValidationHelper.isValidObjectId(userId)) {
      return {
        success: false,
        error: ERROR_MESSAGES.INVALID_USER_ID
      };
    }

    // REFACTOR: Use extracted validation method
    const validationError = this.validateProfileData(profileData);
    if (validationError) {
      return {
        success: false,
        error: validationError
      };
    }

    try {
      const existingUser = await UserModel.findById(userId);
      
      if (!existingUser) {
        return {
          success: false,
          error: ERROR_MESSAGES.USER_NOT_FOUND
        };
      }

      // REFACTOR: Cleaner update data building
      const updateData: Record<string, string> = {};
      if (profileData.firstName) updateData['profile.firstName'] = profileData.firstName;
      if (profileData.lastName) updateData['profile.lastName'] = profileData.lastName;

      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return {
          success: false,
          error: ERROR_MESSAGES.UPDATE_FAILED
        };
      }

      // REFACTOR: Use extracted transformation method
      return {
        success: true,
        data: {
          user: this.transformUserDocument(updatedUser)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR
      };
    }
  }

  static async getUserPreferences(userId: string): Promise<UserServiceResult> {
    // REFACTOR: Use extracted error message
    if (!ValidationHelper.isValidObjectId(userId)) {
      return {
        success: false,
        error: ERROR_MESSAGES.INVALID_USER_ID
      };
    }

    try {
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return {
          success: false,
          error: ERROR_MESSAGES.USER_NOT_FOUND
        };
      }

      return {
        success: true,
        data: {
          preferences: user.preferences
        }
      };

    } catch (error) {
      return {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR
      };
    }
  }

  // Admin Only: Create new user
  static async createUser(userData: CreateUserData): Promise<UserServiceResult> {
    try {
      // Validate required fields
      if (!userData.email || !userData.password || !userData.role) {
        return {
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR + ': Email, password, and role are required'
        };
      }

      if (!userData.profile?.firstName || !userData.profile?.lastName) {
        return {
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR + ': First name and last name are required'
        };
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return {
          success: false,
          error: ERROR_MESSAGES.USER_ALREADY_EXISTS
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const newUser = await UserModel.create({
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        profile: userData.profile,
        isActive: true
      });

      return {
        success: true,
        data: {
          user: this.transformUserDocument(newUser)
        }
      };

    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return {
          success: false,
          error: ERROR_MESSAGES.VALIDATION_ERROR + ': ' + error.message
        };
      }
      return {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR
      };
    }
  }

  // Admin Only: List users with filtering and pagination
  static async listUsers(options: ListUsersOptions = {}): Promise<UserServiceResult> {
    try {
      const { role, limit = 50, offset = 0 } = options;
      
      // Build query
      const query: any = {};
      if (role) {
        query.role = role;
      }

      // Execute query with pagination
      const users = await UserModel.find(query)
        .skip(offset)
        .limit(limit)
        .sort({ createdAt: -1 });

      // Get total count for pagination
      const total = await UserModel.countDocuments(query);

      return {
        success: true,
        data: {
          users: users.map(user => this.transformUserDocument(user)),
          pagination: {
            limit,
            offset,
            total
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR
      };
    }
  }

  // Admin Only: Delete user
  static async deleteUser(userId: string): Promise<UserServiceResult> {
    if (!ValidationHelper.isValidObjectId(userId)) {
      return {
        success: false,
        error: ERROR_MESSAGES.INVALID_USER_ID
      };
    }

    try {
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return {
          success: false,
          error: ERROR_MESSAGES.USER_NOT_FOUND
        };
      }

      await UserModel.findByIdAndDelete(userId);

      return {
        success: true,
        data: {}
      };

    } catch (error) {
      return {
        success: false,
        error: ERROR_MESSAGES.INTERNAL_ERROR
      };
    }
  }
}