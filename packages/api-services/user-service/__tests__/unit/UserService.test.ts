// packages/api-services/user-service/__tests__/unit/UserService.test.ts
// TDD Unit Tests for UserService

import { UserService } from '../../src/services/UserService';
import { UserModel } from '@yggdrasil/database-schemas';

// Mock the UserModel for unit testing
jest.mock('@yggdrasil/database-schemas', () => ({
  UserModel: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return success true when user exists', async () => {
      // TDD: Arrange - Mock successful database response
      const validUserId = '507f1f77bcf86cd799439011';
      const mockUser = {
        _id: validUserId,
        email: 'test@example.com',
        role: 'student',
        profile: { firstName: 'Test', lastName: 'User' },
        isActive: true
      };
      
      mockUserModel.findById.mockResolvedValue(mockUser);
      
      // TDD: Act
      const result = await UserService.getUserById(validUserId);
      
      // TDD: Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.user).toBeDefined();
      expect(result.data?.user?.id).toBe(validUserId);
      expect(mockUserModel.findById).toHaveBeenCalledWith(validUserId);
    });

    it('should return success false when user does not exist', async () => {
      // TDD: Arrange - Mock database returning null
      const nonExistentUserId = '507f1f77bcf86cd799439012';
      mockUserModel.findById.mockResolvedValue(null);
      
      // TDD: Act
      const result = await UserService.getUserById(nonExistentUserId);
      
      // TDD: Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(mockUserModel.findById).toHaveBeenCalledWith(nonExistentUserId);
    });

    it('should return validation error for invalid user ID format', async () => {
      // TDD: Testing edge case - no database call should be made
      const invalidUserId = 'invalid-id';
      
      // TDD: Act
      const result = await UserService.getUserById(invalidUserId);
      
      // TDD: Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user ID');
      expect(mockUserModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('updateUserProfile', () => {
    it('should successfully update user profile', async () => {
      // TDD RED: This will fail because updateUserProfile doesn't exist yet
      const userId = '507f1f77bcf86cd799439011';
      const profileUpdate = {
        firstName: 'Updated',
        lastName: 'Name'
      };
      
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        role: 'student',
        profile: { firstName: 'Old', lastName: 'Name' },
        isActive: true
      };
      
      const updatedUser = {
        ...mockUser,
        profile: { ...mockUser.profile, ...profileUpdate }
      };
      
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(updatedUser);
      
      const result = await UserService.updateUserProfile(userId, profileUpdate);
      
      expect(result.success).toBe(true);
      expect(result.data?.user?.profile?.firstName).toBe('Updated');
      expect(result.data?.user?.profile?.lastName).toBe('Name');
    });

    it('should return error when user not found for profile update', async () => {
      // TDD RED: Testing error case
      const userId = '507f1f77bcf86cd799439012';
      const profileUpdate = { firstName: 'Test' };
      
      mockUserModel.findById.mockResolvedValue(null);
      
      const result = await UserService.updateUserProfile(userId, profileUpdate);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return validation error for invalid profile data', async () => {
      // TDD RED: Testing validation
      const userId = '507f1f77bcf86cd799439011';
      const invalidProfileUpdate = { firstName: '' }; // Empty string should be invalid
      
      const result = await UserService.updateUserProfile(userId, invalidProfileUpdate);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid profile data');
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences when user exists', async () => {
      // TDD RED: This will fail because getUserPreferences doesn't exist yet
      const userId = '507f1f77bcf86cd799439011';
      const mockUser = {
        _id: userId,
        email: 'test@example.com',
        preferences: {
          language: 'en',
          notifications: {
            scheduleChanges: true,
            newAnnouncements: false,
            assignmentReminders: true
          },
          accessibility: {
            colorblindMode: false,
            fontSize: 'medium',
            highContrast: false
          }
        }
      };
      
      mockUserModel.findById.mockResolvedValue(mockUser);
      
      const result = await UserService.getUserPreferences(userId);
      
      expect(result.success).toBe(true);
      expect(result.data?.preferences).toBeDefined();
      expect(result.data?.preferences?.language).toBe('en');
      expect(result.data?.preferences?.notifications?.scheduleChanges).toBe(true);
    });

    it('should return error when user not found for preferences', async () => {
      // TDD RED: Testing error case
      const userId = '507f1f77bcf86cd799439012';
      
      mockUserModel.findById.mockResolvedValue(null);
      
      const result = await UserService.getUserPreferences(userId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return validation error for invalid user ID in preferences', async () => {
      // TDD RED: Testing validation
      const invalidUserId = 'invalid-id';
      
      const result = await UserService.getUserPreferences(invalidUserId);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user ID');
    });
  });
});