import { UserService } from '../../src/services/UserService';
import { UserModel as User } from '../../../../database-schemas/src';
import { User as UserType } from '@101-school/shared-utilities';
import mongoose from 'mongoose';

describe('UserService Profile Integration Tests', () => {
  // Helper function to create a test user directly with mongoose
  const createTestUser = async (userData: Partial<UserType>) => {
    const defaultUser = {
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'student',
      isActive: true,
      profile: {
        firstName: 'Test',
        lastName: 'User'
      },
      ...userData
    };

    const user = new User(defaultUser);
    return await user.save();
  };

  // Clean up users after each test
  afterEach(async () => {
    try {
      await User.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Profile Management', () => {
    it('should retrieve user profile by ID', async () => {
      const testUser = await createTestUser({
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          bio: 'Test bio',
          department: 'Computer Science'
        }
      });

      const getResult = await UserService.getUserProfile((testUser._id as mongoose.Types.ObjectId).toString());

      expect(getResult.success).toBe(true);
      expect(getResult.user).toBeDefined();
      expect(getResult.user!.profile).toEqual(expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        bio: 'Test bio',
        department: 'Computer Science'
      }));
    });

    it('should update user profile information', async () => {
      const testUser = await createTestUser({
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890'
        }
      });

      const userId = (testUser._id as mongoose.Types.ObjectId).toString();

      const updateData = {
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+0987654321',
          bio: 'Updated bio',
          department: 'Mathematics'
        }
      };

      const updateResult = await UserService.updateUserProfile(userId, updateData);

      expect(updateResult.success).toBe(true);
      expect(updateResult.user!.profile).toEqual(expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+0987654321',
        bio: 'Updated bio',
        department: 'Mathematics'
      }));
    });

    it('should partially update profile (only specified fields)', async () => {
      const testUser = await createTestUser({
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          bio: 'Original bio'
        }
      });

      const userId = (testUser._id as mongoose.Types.ObjectId).toString();

      const partialUpdate = {
        profile: {
          firstName: 'Jane',
          bio: 'Updated bio'
        }
      };

      const updateResult = await UserService.updateUserProfile(userId, partialUpdate);

      expect(updateResult.success).toBe(true);
      expect(updateResult.user!.profile).toEqual(expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe', // Should remain unchanged
        phone: '+1234567890', // Should remain unchanged
        bio: 'Updated bio'
      }));
    });

    it('should handle profile update for non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011';
      const updateData = {
        profile: {
          firstName: 'Jane'
        }
      };

      const result = await UserService.updateUserProfile(fakeUserId, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle database validation errors', async () => {
      const testUser = await createTestUser({});
      const userId = (testUser._id as mongoose.Types.ObjectId).toString();

      const invalidUpdate = {
        profile: {
          firstName: '', // Empty string should fail database validation
          lastName: ''  // Empty string should fail database validation
        }
      };

      const result = await UserService.updateUserProfile(userId, invalidUpdate);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Profile Photo Management', () => {
    it('should upload and update profile photo', async () => {
      const testUser = await createTestUser({});
      const userId = (testUser._id as mongoose.Types.ObjectId).toString();

      const mockFile = {
        buffer: Buffer.from('fake-image-data'),
        mimetype: 'image/jpeg',
        originalname: 'profile.jpg',
        size: 1024
      };

      const uploadResult = await UserService.uploadProfilePhoto(userId, mockFile);

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.photoUrl).toBeDefined();
      expect(uploadResult.photoUrl).toContain('.jpg');

      // Verify the photo URL is saved to user profile
      const getResult = await UserService.getUserProfile(userId);
      expect(getResult.user!.profile?.profilePhoto).toBe(uploadResult.photoUrl);
    });

    it('should reject invalid file types for profile photo', async () => {
      const testUser = await createTestUser({});
      const userId = (testUser._id as mongoose.Types.ObjectId).toString();

      const invalidFile = {
        buffer: Buffer.from('fake-text-data'),
        mimetype: 'text/plain',
        originalname: 'document.txt',
        size: 1024
      };

      const uploadResult = await UserService.uploadProfilePhoto(userId, invalidFile);

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error).toContain('Invalid file type');
    });

    it('should reject files that are too large', async () => {
      const testUser = await createTestUser({});
      const userId = (testUser._id as mongoose.Types.ObjectId).toString();

      const largeFile = {
        buffer: Buffer.alloc(6 * 1024 * 1024), // 6MB
        mimetype: 'image/jpeg',
        originalname: 'large-image.jpg',
        size: 6 * 1024 * 1024
      };

      const uploadResult = await UserService.uploadProfilePhoto(userId, largeFile);

      expect(uploadResult.success).toBe(false);
      expect(uploadResult.error).toContain('File too large');
    });

    it('should handle photo upload for non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011';
      const mockFile = {
        buffer: Buffer.from('fake-image-data'),
        mimetype: 'image/jpeg',
        originalname: 'profile.jpg',
        size: 1024
      };

      const result = await UserService.uploadProfilePhoto(fakeUserId, mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('User Preferences', () => {
    it('should update user preferences', async () => {
      const testUser = await createTestUser({});
      const userId = (testUser._id as mongoose.Types.ObjectId).toString();

      const preferences = {
        language: 'fr' as const,
        timezone: 'Europe/Paris',
        notifications: {
          email: true,
          push: false,
          sms: true,
          scheduleChanges: true,
          newAnnouncements: true,
          assignmentReminders: false
        },
        theme: 'dark' as const
      };

      const updateResult = await UserService.updateUserPreferences(userId, preferences);

      expect(updateResult.success).toBe(true);
      expect(updateResult.user!.preferences?.language).toBe('fr');
      expect(updateResult.user!.preferences?.timezone).toBe('Europe/Paris');
      expect(updateResult.user!.preferences?.theme).toBe('dark');
      expect(updateResult.user!.preferences?.notifications?.email).toBe(true);
      expect(updateResult.user!.preferences?.notifications?.push).toBe(false);
    });

    it('should partially update preferences', async () => {
      const testUser = await createTestUser({});

      const userId = (testUser._id as mongoose.Types.ObjectId).toString();

      const partialUpdate = {
        language: 'fr' as const,
        theme: 'dark' as const
      };

      const updateResult = await UserService.updateUserPreferences(userId, partialUpdate);

      expect(updateResult.success).toBe(true);
      expect(updateResult.user!.preferences).toEqual(expect.objectContaining({
        language: 'fr',
        timezone: 'Europe/Paris', // Should be the default value 
        theme: 'dark'
      }));
    });
  });

  describe('Role-specific Profile Fields', () => {
    it('should handle student-specific fields', async () => {
      const testUser = await createTestUser({
        role: 'student',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          studentId: 'ST001'
        }
      });

      expect(testUser.profile?.studentId).toBe('ST001');
    });

    it('should handle teacher-specific fields', async () => {
      const testUser = await createTestUser({
        role: 'teacher',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          department: 'Mathematics',
          specialties: ['Algebra']
        }
      });

      expect(testUser.profile?.department).toBe('Mathematics');
      expect(testUser.profile?.specialties).toContain('Algebra');
    });

    it('should handle staff-specific fields', async () => {
      const testUser = await createTestUser({
        role: 'staff',
        profile: {
          firstName: 'Bob',
          lastName: 'Johnson',
          department: 'Administration'
        }
      });

      expect(testUser.profile?.department).toBe('Administration');
    });
  });

  describe('Profile Data Integrity', () => {
    it('should maintain profile data consistency during updates', async () => {
      const testUser = await createTestUser({
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          bio: 'Original bio'
        }
      });

      const userId = (testUser._id as mongoose.Types.ObjectId).toString();

      // Perform multiple updates
      await UserService.updateUserProfile(userId, {
        profile: { firstName: 'Jane' }
      });

      await UserService.updateUserProfile(userId, {
        profile: { bio: 'Updated bio' }
      });

      await UserService.updateUserProfile(userId, {
        profile: { phone: '+0987654321' }
      });

      const finalResult = await UserService.getUserProfile(userId);

      expect(finalResult.user!.profile).toEqual(expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+0987654321',
        bio: 'Updated bio'
      }));
    });

    it('should handle concurrent profile updates safely', async () => {
      const testUser = await createTestUser({
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        }
      });

      const userId = (testUser._id as mongoose.Types.ObjectId).toString();

      // Simulate concurrent updates
      const updates = [
        UserService.updateUserProfile(userId, { profile: { firstName: 'Jane' } }),
        UserService.updateUserProfile(userId, { profile: { bio: 'Bio 1' } }),
        UserService.updateUserProfile(userId, { profile: { phone: '+1234567890' } })
      ];

      const results = await Promise.all(updates);

      // All updates should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Final state should be consistent
      const finalResult = await UserService.getUserProfile(userId);
      expect(finalResult.success).toBe(true);
      expect(finalResult.user!.profile?.firstName).toBeDefined();
      expect(finalResult.user!.profile?.lastName).toBe('Doe');
    });
  });

  describe('Profile Search and Filtering', () => {
    beforeEach(async () => {
      // Clean up before each test to ensure isolation
      await User.deleteMany({});
      
      // Create test users with different profiles
      await createTestUser({
        email: 'john@example.com',
        role: 'student',
        profile: { firstName: 'John', lastName: 'Doe', department: 'Computer Science' }
      });
      
      await createTestUser({
        email: 'jane@example.com',
        role: 'teacher',
        profile: { firstName: 'Jane', lastName: 'Smith', department: 'Mathematics' }
      });
      
      await createTestUser({
        email: 'bob@example.com',
        role: 'staff',
        profile: { firstName: 'Bob', lastName: 'Johnson', department: 'Administration' }
      });
    });

    it('should search users by profile information', async () => {
      const searchResult = await UserService.searchUsers('John', {
        limit: 10,
        offset: 0
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.users).toHaveLength(2); // Finds "John" and "Johnson"
      const firstNames = searchResult.users!.map(u => u.profile?.firstName);
      const lastNames = searchResult.users!.map(u => u.profile?.lastName);
      expect(firstNames).toContain('John');
      expect(lastNames).toContain('Johnson');
    });

    it('should filter users by role', async () => {
      const searchResult = await UserService.searchUsers('', {
        role: 'teacher',
        limit: 10,
        offset: 0
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.users).toHaveLength(1);
      expect(searchResult.users![0].role).toBe('teacher');
    });

    it('should search across multiple profile fields', async () => {
      const mathResult = await UserService.searchUsers('Mathematics', {
        limit: 10,
        offset: 0
      });

      expect(mathResult.success).toBe(true);
      expect(mathResult.users).toHaveLength(1);
      expect(mathResult.users![0].profile?.department).toBe('Mathematics');
    });
  });
});