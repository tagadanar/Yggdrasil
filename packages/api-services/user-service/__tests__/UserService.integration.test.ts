import request from 'supertest';
import express from 'express';
import userRoutes from '../src/routes/userRoutes';
import { UserService } from '../src/services/UserService';

// Mock the UserService
jest.mock('../src/services/UserService');

const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('User Service Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up Express app with routes
    app = express();
    app.use(express.json());
    
    // Mock auth middleware to set user
    app.use((req: any, res, next) => {
      req.user = {
        _id: 'test-user-id',
        role: 'admin',
        email: 'admin@test.com'
      };
      next();
    });
    
    app.use('/api/users', userRoutes);
  });

  describe('GET /api/users/profile', () => {
    it('should get current user profile', async () => {
      const mockUser = {
        _id: 'test-user-id',
        email: 'test@example.com',
        role: 'student',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
        isActive: true,
      };

      mockUserService.getUserProfile = jest.fn().mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const response = await request(app)
        .get('/api/users/profile')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
      expect(mockUserService.getUserProfile).toHaveBeenCalledWith('test-user-id');
    });

    it('should handle user not found', async () => {
      mockUserService.getUserProfile = jest.fn().mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const response = await request(app)
        .get('/api/users/profile')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should handle service errors', async () => {
      mockUserService.getUserProfile = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/users/profile')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID', async () => {
      const mockUser = {
        _id: '123',
        email: 'user@example.com',
        role: 'teacher',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
        isActive: true,
      };

      mockUserService.getUserProfile = jest.fn().mockResolvedValue({
        success: true,
        user: mockUser,
      });

      const response = await request(app)
        .get('/api/users/123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
      expect(mockUserService.getUserProfile).toHaveBeenCalledWith('123');
    });

    it('should handle invalid user ID', async () => {
      mockUserService.getUserProfile = jest.fn().mockResolvedValue({
        success: false,
        error: 'Invalid user ID',
      });

      const response = await request(app)
        .get('/api/users/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid user ID');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user profile', async () => {
      const updateData = {
        profile: {
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+1234567890',
        },
      };

      const updatedUser = {
        _id: '123',
        email: 'user@example.com',
        role: 'student',
        profile: updateData.profile,
        isActive: true,
      };

      mockUserService.updateUserProfile = jest.fn().mockResolvedValue({
        success: true,
        user: updatedUser,
      });

      const response = await request(app)
        .put('/api/users/123')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedUser);
      expect(mockUserService.updateUserProfile).toHaveBeenCalledWith('123', updateData);
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        profile: {
          firstName: '', // Empty first name should be invalid
        },
      };

      mockUserService.updateUserProfile = jest.fn().mockResolvedValue({
        success: false,
        error: 'First name is required',
      });

      const response = await request(app)
        .put('/api/users/123')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('First name is required');
    });

    it('should handle missing user ID', async () => {
      const response = await request(app)
        .put('/api/users/')
        .send({})
        .expect(404); // Route not found

      // Express default 404 may not have our JSON structure
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/users/preferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        theme: 'dark',
        language: 'fr',
        notifications: {
          email: false,
          push: true,
        },
      };

      const updatedUser = {
        _id: 'test-user-id',
        email: 'test@example.com',
        role: 'student',
        preferences,
        isActive: true,
      };

      mockUserService.updateUserPreferences = jest.fn().mockResolvedValue({
        success: true,
        user: updatedUser,
      });

      const response = await request(app)
        .put('/api/users/preferences')
        .send(preferences)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedUser);
      expect(mockUserService.updateUserPreferences).toHaveBeenCalledWith('test-user-id', preferences);
    });

    it('should handle preferences update failure', async () => {
      mockUserService.updateUserPreferences = jest.fn().mockResolvedValue({
        success: false,
        error: 'Invalid preferences format',
      });

      const response = await request(app)
        .put('/api/users/preferences')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid preferences format');
    });
  });

  describe('POST /api/users/upload-photo', () => {
    it('should upload profile photo', async () => {
      const photoUrl = 'http://example.com/photo.jpg';

      mockUserService.uploadProfilePhoto = jest.fn().mockResolvedValue({
        success: true,
        photoUrl,
      });

      // Note: In a real test, you'd use supertest with file upload
      // For this mock test, we'll simulate the file being processed
      const mockFile = {
        buffer: Buffer.from('fake image data'),
        mimetype: 'image/jpeg',
        originalname: 'photo.jpg',
        size: 1024,
      };

      // Mock multer middleware behavior
      const response = await request(app)
        .post('/api/users/upload-photo')
        .attach('photo', Buffer.from('fake image data'), 'photo.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({ photoUrl });
    });

    it('should handle missing file', async () => {
      const response = await request(app)
        .post('/api/users/upload-photo')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    it('should handle upload service error', async () => {
      mockUserService.uploadProfilePhoto = jest.fn().mockResolvedValue({
        success: false,
        error: 'File too large',
      });

      const response = await request(app)
        .post('/api/users/upload-photo')
        .attach('photo', Buffer.from('fake image data'), 'photo.jpg')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File too large');
    });
  });

  describe('GET /api/users/search', () => {
    it('should search users with filters', async () => {
      const searchResults = {
        users: [
          {
            _id: '1',
            email: 'user1@example.com',
            role: 'student',
            profile: { firstName: 'John', lastName: 'Doe' },
            isActive: true,
          },
          {
            _id: '2',
            email: 'user2@example.com',
            role: 'teacher',
            profile: { firstName: 'Jane', lastName: 'Smith' },
            isActive: true,
          },
        ],
        total: 2,
      };

      mockUserService.searchUsers = jest.fn().mockResolvedValue({
        success: true,
        ...searchResults,
      });

      const response = await request(app)
        .get('/api/users/search')
        .query({
          q: 'john',
          role: 'student',
          isActive: 'true',
          limit: '10',
          offset: '0',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toEqual(searchResults.users);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.pagination).toEqual({
        limit: 10,
        offset: 0,
        hasMore: false,
      });

      expect(mockUserService.searchUsers).toHaveBeenCalledWith('john', {
        role: 'student',
        isActive: true,
        limit: 10,
        offset: 0,
      });
    });

    it('should handle search with no results', async () => {
      mockUserService.searchUsers = jest.fn().mockResolvedValue({
        success: true,
        users: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'nonexistent' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should handle search service error', async () => {
      mockUserService.searchUsers = jest.fn().mockResolvedValue({
        success: false,
        error: 'Search service unavailable',
      });

      const response = await request(app)
        .get('/api/users/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Search service unavailable');
    });

    it('should apply default pagination limits', async () => {
      mockUserService.searchUsers = jest.fn().mockResolvedValue({
        success: true,
        users: [],
        total: 0,
      });

      await request(app)
        .get('/api/users/search')
        .query({ limit: '200' }) // Over limit
        .expect(200);

      expect(mockUserService.searchUsers).toHaveBeenCalledWith('', {
        role: undefined,
        isActive: undefined,
        limit: 100, // Should be capped at 100
        offset: 0,
      });
    });
  });

  describe('GET /api/users/:id/activity', () => {
    it('should get user activity log', async () => {
      const activityData = {
        activities: [
          {
            action: 'login',
            timestamp: '2023-12-15T10:30:00Z',
            details: 'User logged in',
          },
        ],
        total: 1,
      };

      mockUserService.getUserActivity = jest.fn().mockResolvedValue({
        success: true,
        ...activityData,
      });

      const response = await request(app)
        .get('/api/users/123/activity')
        .query({
          action: 'login',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          limit: '20',
          offset: '0',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.activities).toEqual(activityData.activities);
      expect(response.body.data.total).toBe(1);

      expect(mockUserService.getUserActivity).toHaveBeenCalledWith('123', {
        action: 'login',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        limit: 20,
        offset: 0,
      });
    });

    it('should handle invalid date formats', async () => {
      const response = await request(app)
        .get('/api/users/123/activity')
        .query({
          startDate: 'invalid-date',
        })
        .expect(200); // Should still proceed with undefined date

      expect(mockUserService.getUserActivity).toHaveBeenCalledWith('123', {
        action: undefined,
        startDate: undefined, // Invalid date should become undefined
        endDate: undefined,
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('POST /api/users/:id/deactivate', () => {
    it('should deactivate user successfully', async () => {
      mockUserService.deactivateUser = jest.fn().mockResolvedValue({
        success: true,
        message: 'User deactivated successfully',
      });

      const response = await request(app)
        .post('/api/users/123/deactivate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('User deactivated successfully');
      expect(mockUserService.deactivateUser).toHaveBeenCalledWith('123', 'test-user-id');
    });

    it('should handle permission errors', async () => {
      mockUserService.deactivateUser = jest.fn().mockResolvedValue({
        success: false,
        error: 'Insufficient permission to deactivate user',
      });

      const response = await request(app)
        .post('/api/users/123/deactivate')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permission to deactivate user');
    });
  });

  describe('POST /api/users/:id/reactivate', () => {
    it('should reactivate user successfully', async () => {
      mockUserService.reactivateUser = jest.fn().mockResolvedValue({
        success: true,
        message: 'User reactivated successfully',
      });

      const response = await request(app)
        .post('/api/users/123/reactivate')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('User reactivated successfully');
      expect(mockUserService.reactivateUser).toHaveBeenCalledWith('123', 'test-user-id');
    });

    it('should handle user not found', async () => {
      mockUserService.reactivateUser = jest.fn().mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const response = await request(app)
        .post('/api/users/123/reactivate')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('Authentication middleware simulation', () => {
    it('should handle missing user ID in request', async () => {
      // Create app without auth middleware
      const noAuthApp = express();
      noAuthApp.use(express.json());
      noAuthApp.use('/api/users', userRoutes);

      const response = await request(noAuthApp)
        .get('/api/users/profile')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User ID is required');
    });

    it('should handle unauthenticated requests for protected endpoints', async () => {
      const noAuthApp = express();
      noAuthApp.use(express.json());
      noAuthApp.use('/api/users', userRoutes);

      const response = await request(noAuthApp)
        .put('/api/users/preferences')
        .send({ theme: 'dark' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .put('/api/users/123')
        .type('json')
        .send('{"malformed": json}')
        .expect(400);

      // Express should handle malformed JSON automatically
      expect(response.body).toBeDefined();
    });

    it('should handle very large request bodies', async () => {
      const largeData = {
        profile: {
          bio: 'x'.repeat(10000), // Very long bio
        },
      };

      mockUserService.updateUserProfile = jest.fn().mockResolvedValue({
        success: false,
        error: 'Bio too long',
      });

      const response = await request(app)
        .put('/api/users/123')
        .send(largeData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent requests correctly', async () => {
      mockUserService.getUserProfile = jest.fn().mockResolvedValue({
        success: true,
        user: { _id: 'test', email: 'test@example.com' },
      });

      // Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() =>
        request(app).get('/api/users/profile')
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Service should be called 5 times
      expect(mockUserService.getUserProfile).toHaveBeenCalledTimes(5);
    });
  });
});