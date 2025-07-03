// Mock dependencies before imports
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
} as any;

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  post: jest.fn()
}));

jest.mock('@/utils/storage', () => ({
  tokenStorage: {
    getAccessToken: jest.fn(() => 'mock-token'),
    getRefreshToken: jest.fn(() => 'mock-refresh-token'),
    setTokens: jest.fn(),
    clearTokens: jest.fn()
  }
}));

import { userAPI } from '@/utils/api';

describe('User API Service', () => {
  const mockUser = {
    _id: '123',
    email: 'test@example.com',
    role: 'student',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
    },
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should get current user profile', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockUser,
        },
      });

      const result = await userAPI.getProfile();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/profile');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should get specific user profile by ID', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockUser,
        },
      });

      const result = await userAPI.getProfile('123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should handle API error response', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: {
          status: 404,
          data: {
            success: false,
            error: 'User not found',
          },
        },
      });

      try {
        await userAPI.getProfile('invalid-id');
      } catch (error: any) {
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toBe('User not found');
      }
    });

    it('should handle network error', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      try {
        await userAPI.getProfile();
      } catch (error: any) {
        expect(error.message).toBe('Network error');
      }
    });
  });

  describe('updateProfile', () => {
    const updateData = {
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
      },
    };

    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      mockAxiosInstance.put.mockResolvedValueOnce({
        data: {
          success: true,
          data: updatedUser,
        },
      });

      const result = await userAPI.updateProfile('123', updateData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/users/123', updateData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
    });

    it('should handle validation errors', async () => {
      mockAxiosInstance.put.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            success: false,
            error: 'Validation failed',
          },
        },
      });

      try {
        await userAPI.updateProfile('123', updateData);
      } catch (error: any) {
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toBe('Validation failed');
      }
    });
  });

  describe('updatePreferences', () => {
    const preferences = {
      theme: 'dark',
      language: 'en',
      notifications: {
        email: false,
        push: true,
      },
    };

    it('should update user preferences successfully', async () => {
      const updatedUser = { ...mockUser, preferences };
      mockAxiosInstance.put.mockResolvedValueOnce({
        data: {
          success: true,
          data: updatedUser,
        },
      });

      const result = await userAPI.updatePreferences(preferences);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/users/preferences', preferences);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
    });
  });

  describe('uploadPhoto', () => {
    it('should upload profile photo successfully', async () => {
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
      const photoUrl = 'http://example.com/photo.jpg';

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { photoUrl },
        },
      });

      const result = await userAPI.uploadPhoto(file);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/users/upload-photo', 
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ photoUrl });
    });

    it('should handle file upload error', async () => {
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 413,
          data: {
            success: false,
            error: 'File too large',
          },
        },
      });

      try {
        await userAPI.uploadPhoto(file);
      } catch (error: any) {
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toBe('File too large');
      }
    });
  });

  describe('searchUsers', () => {
    const searchParams = {
      q: 'john',
      role: 'student',
      isActive: true,
      limit: 10,
      offset: 0,
    };

    it('should search users successfully', async () => {
      const searchResults = {
        users: [mockUser],
        total: 1,
        pagination: {
          limit: 10,
          offset: 0,
          hasMore: false,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: searchResults,
        },
      });

      const result = await userAPI.searchUsers(searchParams);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/search', { params: searchParams });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(searchResults);
    });

    it('should handle empty search results', async () => {
      const emptyResults = {
        users: [],
        total: 0,
        pagination: {
          limit: 10,
          offset: 0,
          hasMore: false,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: emptyResults,
        },
      });

      const result = await userAPI.searchUsers({ q: 'nonexistent' });

      expect(result.success).toBe(true);
      expect(result.data?.users).toHaveLength(0);
    });

    it('should handle search without parameters', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            users: [mockUser],
            total: 1,
            pagination: { limit: 20, offset: 0, hasMore: false },
          },
        },
      });

      const result = await userAPI.searchUsers({});

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/search', { params: {} });
      expect(result.success).toBe(true);
    });
  });

  describe('getActivity', () => {
    const activityParams = {
      action: 'login',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      limit: 20,
      offset: 0,
    };

    it('should get user activity successfully', async () => {
      const activityData = {
        activities: [
          {
            action: 'login',
            timestamp: '2023-12-15T10:30:00Z',
            details: 'User logged in',
          },
        ],
        total: 1,
        pagination: {
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: activityData,
        },
      });

      const result = await userAPI.getActivity('123', activityParams);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/123/activity', { params: activityParams });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(activityData);
    });

    it('should get activity without parameters', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            activities: [],
            total: 0,
            pagination: { limit: 20, offset: 0, hasMore: false },
          },
        },
      });

      const result = await userAPI.getActivity('123', {});

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users/123/activity', { params: {} });
      expect(result.success).toBe(true);
    });
  });

  describe('user management actions', () => {
    it('should deactivate user successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { message: 'User deactivated successfully' },
        },
      });

      const result = await userAPI.deactivateUser('123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/users/123/deactivate');
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('User deactivated successfully');
    });

    it('should reactivate user successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: { message: 'User reactivated successfully' },
        },
      });

      const result = await userAPI.reactivateUser('123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/users/123/reactivate');
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('User reactivated successfully');
    });

    it('should handle permission errors for user management', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            success: false,
            error: 'Insufficient permissions',
          },
        },
      });

      try {
        await userAPI.deactivateUser('123');
      } catch (error: any) {
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toBe('Insufficient permissions');
      }
    });
  });
});