// Path: packages/api-services/user-service/src/services/UserService.ts
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs/promises';
import { UserModel as User } from '../../../../database-schemas/src';
import { 
  UserProfile, 
  UserPreferences, 
  UserActivity, 
  ValidationHelper,
  ErrorHelper,
  createUserSchema
} from '../../../../shared-utilities/src';

export interface UserResult {
  success: boolean;
  user?: any;
  error?: string;
}

export interface SearchResult {
  success: boolean;
  users?: any[];
  total?: number;
  error?: string;
}

export interface ActivityResult {
  success: boolean;
  activities?: UserActivity[];
  total?: number;
  error?: string;
}

export interface PhotoUploadResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
}

export interface ActivityLogResult {
  success: boolean;
  error?: string;
}

export interface AdminActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface UpdateUserData {
  profile?: Partial<UserProfile>;
}

export interface SearchFilters {
  role?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ActivityFilters {
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface FileUpload {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export class UserService {
  private static readonly PROFILE_PHOTOS_DIR = 'uploads/profile-photos';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<UserResult> {
    try {
      // Validate user ID format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { success: false, error: 'Invalid user ID format' };
      }

      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, user };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get user profile', error);
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, updateData: UpdateUserData): Promise<UserResult> {
    try {
      // Validate user ID format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { success: false, error: 'Invalid user ID format' };
      }

      // For profile updates, we allow partial updates so we skip strict validation
      // The database schema will handle basic validation

      // Build the update object properly for nested fields
      const updateFields: any = { updatedAt: new Date() };
      
      if (updateData.profile) {
        // Merge profile fields instead of replacing the entire profile
        Object.keys(updateData.profile).forEach(key => {
          let value = updateData.profile![key as keyof UserProfile];
          
          // Handle empty studentId - convert empty strings to undefined to avoid duplicate key errors
          if (key === 'studentId' && typeof value === 'string' && value.trim() === '') {
            value = undefined;
          }
          
          updateFields[`profile.${key}`] = value;
        });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, user };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to update user profile', error);
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserResult> {
    try {
      // Validate user ID format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { success: false, error: 'Invalid user ID format' };
      }

      // Validate preferences
      const validLanguages = ['en', 'fr', 'es', 'de'];
      const validThemes = ['light', 'dark', 'auto'];

      if (preferences.language && !validLanguages.includes(preferences.language)) {
        return { success: false, error: 'Invalid language preference' };
      }

      if (preferences.theme && !validThemes.includes(preferences.theme)) {
        return { success: false, error: 'Invalid theme preference' };
      }

      if (preferences.timezone) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: preferences.timezone });
        } catch {
          return { success: false, error: 'Invalid timezone preference' };
        }
      }

      const updateFields: any = { updatedAt: new Date() };
      
      // Only update provided fields
      if (preferences.language !== undefined) {
        updateFields['preferences.language'] = preferences.language;
      }
      if (preferences.timezone !== undefined) {
        updateFields['preferences.timezone'] = preferences.timezone;
      }
      if (preferences.theme !== undefined) {
        updateFields['preferences.theme'] = preferences.theme;
      }
      if (preferences.notifications !== undefined) {
        updateFields['preferences.notifications'] = preferences.notifications;
      }
      if (preferences.accessibility !== undefined) {
        updateFields['preferences.accessibility'] = preferences.accessibility;
      }
      
      // For partial updates, ensure we're not overriding existing data
      // Only update the provided fields

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, user };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to update user preferences', error);
    }
  }

  /**
   * Upload and process profile photo
   */
  static async uploadProfilePhoto(userId: string, file: FileUpload): Promise<PhotoUploadResult> {
    try {
      // Validate user ID format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { success: false, error: 'Invalid user ID format' };
      }

      // Validate file type
      if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' };
      }

      // Validate file size
      if (file.size > this.MAX_FILE_SIZE) {
        return { success: false, error: 'File too large. Maximum size is 5MB.' };
      }

      // Ensure upload directory exists
      await fs.mkdir(this.PROFILE_PHOTOS_DIR, { recursive: true });

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const filename = `${userId}-${Date.now()}${fileExtension}`;
      const filepath = path.join(this.PROFILE_PHOTOS_DIR, filename);

      // For now, just save the file without processing
      // In production, you would use sharp or similar for image processing
      await fs.writeFile(filepath, file.buffer);

      // Update user profile with photo URL
      const photoUrl = `/uploads/profile-photos/${filename}`;
      const updatedUser = await User.findByIdAndUpdate(userId, {
        $set: {
          'profile.profilePhoto': photoUrl,
          updatedAt: new Date()
        }
      });

      if (!updatedUser) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, photoUrl };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to upload profile photo', error);
    }
  }

  /**
   * Search users with filters and pagination
   */
  static async searchUsers(query: string, filters: SearchFilters): Promise<SearchResult> {
    try {
      const searchConditions: any = {};

      // Text search
      if (query.trim()) {
        searchConditions.$or = [
          { 'profile.firstName': { $regex: query, $options: 'i' } },
          { 'profile.lastName': { $regex: query, $options: 'i' } },
          { 'profile.department': { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ];
      }

      // Role filter
      if (filters.role) {
        searchConditions.role = filters.role;
      }

      // Active status filter
      if (filters.isActive !== undefined) {
        searchConditions.isActive = filters.isActive;
      }

      // Pagination
      const limit = Math.min(filters.limit || 20, 100); // Max 100 results
      const offset = filters.offset || 0;

      // Execute search
      const [users, total] = await Promise.all([
        User.find(searchConditions)
          .select('-password')
          .sort({ 'profile.lastName': 1, 'profile.firstName': 1 })
          .limit(limit)
          .skip(offset),
        User.countDocuments(searchConditions)
      ]);

      return { success: true, users, total };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to search users', error);
    }
  }

  /**
   * Log user activity
   */
  static async logUserActivity(userId: string, activity: UserActivity): Promise<ActivityLogResult> {
    try {
      // Validate user ID format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { success: false, error: 'Invalid user ID format' };
      }

      // Validate activity action
      const validActions = [
        'login', 'logout', 'profile_update', 'password_change',
        'course_enrolled', 'assignment_submitted', 'grade_viewed'
      ];

      if (!validActions.includes(activity.action)) {
        return { success: false, error: 'Invalid activity action' };
      }

      // For now, we'll store activities in a separate collection
      // In a real implementation, you might want to create an Activity model
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Update last activity timestamp
      await User.findByIdAndUpdate(userId, {
        $set: { lastLogin: new Date() }
      });

      return { success: true };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to log user activity', error);
    }
  }

  /**
   * Get user activity log
   */
  static async getUserActivity(userId: string, filters: ActivityFilters): Promise<ActivityResult> {
    try {
      // Validate user ID format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { success: false, error: 'Invalid user ID format' };
      }

      // For now, return mock data since we don't have a separate Activity model
      // In a real implementation, you would query the Activity collection
      const mockActivities: UserActivity[] = [
        {
          action: 'login',
          details: { ip: '192.168.1.1' },
          timestamp: new Date()
        },
        {
          action: 'profile_update',
          details: { field: 'firstName' },
          timestamp: new Date()
        }
      ];

      let filteredActivities = mockActivities;

      // Apply action filter
      if (filters.action) {
        filteredActivities = filteredActivities.filter(
          activity => activity.action === filters.action
        );
      }

      // Apply pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      const paginatedActivities = filteredActivities.slice(offset, offset + limit);

      return { 
        success: true, 
        activities: paginatedActivities,
        total: filteredActivities.length
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to get user activity', error);
    }
  }

  /**
   * Deactivate user (admin only)
   */
  static async deactivateUser(targetUserId: string, adminUserId: string): Promise<AdminActionResult> {
    try {
      // Validate user IDs
      if (!mongoose.Types.ObjectId.isValid(targetUserId) || !mongoose.Types.ObjectId.isValid(adminUserId)) {
        return { success: false, error: 'Invalid user ID format' };
      }

      // Prevent self-deactivation
      if (targetUserId === adminUserId) {
        return { success: false, error: 'You cannot deactivate yourself' };
      }

      // Verify admin permissions
      const adminUser = await User.findById(adminUserId);
      if (!adminUser || adminUser.role !== 'admin') {
        return { success: false, error: 'Insufficient permissions. Admin role required.' };
      }

      // Deactivate target user
      const targetUser = await User.findByIdAndUpdate(
        targetUserId,
        { 
          $set: { 
            isActive: false,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (!targetUser) {
        return { success: false, error: 'Target user not found' };
      }

      return { 
        success: true, 
        message: `User ${targetUser.profile.firstName} ${targetUser.profile.lastName} has been deactivated`
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to deactivate user', error);
    }
  }

  /**
   * Reactivate user (admin only)
   */
  static async reactivateUser(targetUserId: string, adminUserId: string): Promise<AdminActionResult> {
    try {
      // Validate user IDs
      if (!mongoose.Types.ObjectId.isValid(targetUserId) || !mongoose.Types.ObjectId.isValid(adminUserId)) {
        return { success: false, error: 'Invalid user ID format' };
      }

      // Verify admin permissions
      const adminUser = await User.findById(adminUserId);
      if (!adminUser || adminUser.role !== 'admin') {
        return { success: false, error: 'Insufficient permissions. Admin role required.' };
      }

      // Reactivate target user
      const targetUser = await User.findByIdAndUpdate(
        targetUserId,
        { 
          $set: { 
            isActive: true,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (!targetUser) {
        return { success: false, error: 'Target user not found' };
      }

      return { 
        success: true, 
        message: `User ${targetUser.profile.firstName} ${targetUser.profile.lastName} has been reactivated`
      };
    } catch (error: any) {
      return ErrorHelper.handleServiceError('Failed to reactivate user', error);
    }
  }
}