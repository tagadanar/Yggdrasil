// packages/api-services/user-service/src/services/UserService.ts
// TDD: REFACTOR phase - Clean implementation while keeping tests green

import { UserModel, UserDocument } from '@yggdrasil/database-schemas';
import { ValidationHelper } from '@yggdrasil/shared-utilities';

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
    preferences?: any;
  };
  error?: string;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
}

// REFACTOR: Extract error messages as constants
const ERROR_MESSAGES = {
  INVALID_USER_ID: 'Invalid user ID format',
  USER_NOT_FOUND: 'User not found',
  INTERNAL_ERROR: 'Internal server error',
  INVALID_PROFILE_FIRSTNAME: 'Invalid profile data: firstName cannot be empty',
  INVALID_PROFILE_LASTNAME: 'Invalid profile data: lastName cannot be empty',
  UPDATE_FAILED: 'Update failed'
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
}