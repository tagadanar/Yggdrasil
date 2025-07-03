// Path: packages/api-services/user-service/__tests__/services/UserService.test.ts
import { UserService } from '../../src/services/UserService';
import { AuthService } from '../../../auth-service/src/services/AuthService';
import { UserModel } from '../../../../database-schemas/src';

describe('UserService', () => {
  let testUserId: string;
  let adminUserId: string;

  beforeEach(async () => {
    // Clean up before each test
    await UserModel.deleteMany({});
    
    // Create test users
    const studentResult = await AuthService.register({
      email: `student-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'student',
      profile: { firstName: 'Test', lastName: 'Student' }
    });

    const adminResult = await AuthService.register({
      email: `admin-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      profile: { firstName: 'Test', lastName: 'Admin' }
    });

    testUserId = (studentResult.user!._id as any).toString();
    adminUserId = (adminResult.user!._id as any).toString();
  });

  describe('getUserProfile', () => {
    it('should return user profile by ID', async () => {
      const result = await UserService.getUserProfile(testUserId);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!._id.toString()).toBe(testUserId);
      expect(result.user!.profile.firstName).toBe('Test');
      expect(result.user!.profile.lastName).toBe('Student');
    });

    it('should return error for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await UserService.getUserProfile(fakeId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    it('should return error for invalid user ID format', async () => {
      const result = await UserService.getUserProfile('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user ID');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        profile: {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+1234567890',
          bio: 'Updated bio'
        }
      };

      const result = await UserService.updateUserProfile(testUserId, updateData);

      expect(result.success).toBe(true);
      expect(result.user!.profile.firstName).toBe('Updated');
      expect(result.user!.profile.lastName).toBe('Name');
      expect(result.user!.profile.phone).toBe('+1234567890');
      expect(result.user!.profile.bio).toBe('Updated bio');
    });

    it('should validate profile data before update', async () => {
      const invalidData = {
        profile: {
          firstName: '', // Empty first name should fail
          lastName: 'Valid'
        }
      };

      const result = await UserService.updateUserProfile(testUserId, invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation');
    });

    it('should return error for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        profile: { firstName: 'Test', lastName: 'User' }
      };

      const result = await UserService.updateUserProfile(fakeId, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      const preferences = {
        language: 'fr' as const,
        timezone: 'Europe/Paris',
        notifications: {
          email: false,
          push: true,
          sms: false,
          scheduleChanges: true,
          newAnnouncements: true,
          assignmentReminders: false
        },
        theme: 'dark' as const
      };

      const result = await UserService.updateUserPreferences(testUserId, preferences);

      expect(result.success).toBe(true);
      expect(result.user!.preferences.language).toBe('fr');
      expect(result.user!.preferences.timezone).toBe('Europe/Paris');
      expect(result.user!.preferences.notifications.email).toBe(false);
      expect(result.user!.preferences.theme).toBe('dark');
    });

    it('should validate preferences data', async () => {
      const invalidPreferences = {
        language: 'invalid-lang' as any,
        timezone: 'invalid-timezone'
      };

      const result = await UserService.updateUserPreferences(testUserId, invalidPreferences);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid language preference');
    });
  });

  describe('uploadProfilePhoto', () => {
    it('should handle profile photo upload', async () => {
      const mockFile = {
        buffer: Buffer.from('fake image data'),
        mimetype: 'image/jpeg',
        originalname: 'profile.jpg',
        size: 1024
      };

      const result = await UserService.uploadProfilePhoto(testUserId, mockFile);

      expect(result.success).toBe(true);
      expect(result.photoUrl).toBeDefined();
      expect(result.photoUrl).toContain('profile-photos');
    });

    it('should validate file type', async () => {
      const invalidFile = {
        buffer: Buffer.from('fake data'),
        mimetype: 'text/plain',
        originalname: 'file.txt',
        size: 1024
      };

      const result = await UserService.uploadProfilePhoto(testUserId, invalidFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should validate file size', async () => {
      const largeFile = {
        buffer: Buffer.alloc(6 * 1024 * 1024), // 6MB
        mimetype: 'image/jpeg',
        originalname: 'large.jpg',
        size: 6 * 1024 * 1024
      };

      const result = await UserService.uploadProfilePhoto(testUserId, largeFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File too large');
    });
  });

  describe('searchUsers', () => {
    beforeEach(async () => {
      // Create additional test users for search
      await AuthService.register({
        email: 'john.doe@example.com',
        password: 'Password123!',
        role: 'teacher',
        profile: { firstName: 'John', lastName: 'Doe' }
      });

      await AuthService.register({
        email: 'jane.smith@example.com',
        password: 'Password123!',
        role: 'staff',
        profile: { firstName: 'Jane', lastName: 'Smith' }
      });
    });

    it('should search users by name', async () => {
      const result = await UserService.searchUsers('John', {});

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users![0].profile.firstName).toBe('John');
    });

    it('should search users by email', async () => {
      const result = await UserService.searchUsers('jane.smith', {});

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users![0].email).toBe('jane.smith@example.com');
    });

    it('should filter users by role', async () => {
      const result = await UserService.searchUsers('', { role: 'teacher' });

      expect(result.success).toBe(true);
      expect(result.users!.length).toBeGreaterThan(0);
      result.users!.forEach(user => {
        expect(user.role).toBe('teacher');
      });
    });

    it('should paginate results', async () => {
      const result = await UserService.searchUsers('', { limit: 2, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.users!.length).toBeLessThanOrEqual(2);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should return empty results for no matches', async () => {
      const result = await UserService.searchUsers('nonexistent', {});

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('logUserActivity', () => {
    it('should log user activity successfully', async () => {
      const activity = {
        action: 'login' as const,
        details: { ip: '192.168.1.1', userAgent: 'Test Browser' },
        timestamp: new Date()
      };

      const result = await UserService.logUserActivity(testUserId, activity);

      expect(result.success).toBe(true);
    });

    it('should validate activity data', async () => {
      const invalidActivity = {
        action: 'invalid-action' as any,
        details: {},
        timestamp: new Date()
      };

      const result = await UserService.logUserActivity(testUserId, invalidActivity);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid activity action');
    });
  });

  describe('getUserActivity', () => {
    beforeEach(async () => {
      // Log some test activities
      await UserService.logUserActivity(testUserId, {
        action: 'login',
        details: { ip: '192.168.1.1' },
        timestamp: new Date()
      });

      await UserService.logUserActivity(testUserId, {
        action: 'profile_update',
        details: { field: 'firstName' },
        timestamp: new Date()
      });
    });

    it('should retrieve user activity log', async () => {
      const result = await UserService.getUserActivity(testUserId, {});

      expect(result.success).toBe(true);
      expect(result.activities).toHaveLength(2);
      expect(result.activities![0].action).toBeDefined();
    });

    it('should filter activities by action type', async () => {
      const result = await UserService.getUserActivity(testUserId, { 
        action: 'login' 
      });

      expect(result.success).toBe(true);
      expect(result.activities).toHaveLength(1);
      expect(result.activities![0].action).toBe('login');
    });

    it('should paginate activity results', async () => {
      const result = await UserService.getUserActivity(testUserId, {
        limit: 1,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.activities).toHaveLength(1);
      expect(result.total).toBe(2);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully (admin only)', async () => {
      const result = await UserService.deactivateUser(testUserId, adminUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deactivated');

      // Verify user is deactivated
      const userProfile = await UserService.getUserProfile(testUserId);
      expect(userProfile.user!.isActive).toBe(false);
    });

    it('should prevent non-admin from deactivating users', async () => {
      const result = await UserService.deactivateUser(adminUserId, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('should prevent self-deactivation', async () => {
      const result = await UserService.deactivateUser(adminUserId, adminUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot deactivate yourself');
    });
  });

  describe('reactivateUser', () => {
    beforeEach(async () => {
      // Deactivate user first
      await UserService.deactivateUser(testUserId, adminUserId);
    });

    it('should reactivate user successfully (admin only)', async () => {
      const result = await UserService.reactivateUser(testUserId, adminUserId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('reactivated');

      // Verify user is reactivated
      const userProfile = await UserService.getUserProfile(testUserId);
      expect(userProfile.user!.isActive).toBe(true);
    });

    it('should prevent non-admin from reactivating users', async () => {
      const result = await UserService.reactivateUser(testUserId, testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });
});