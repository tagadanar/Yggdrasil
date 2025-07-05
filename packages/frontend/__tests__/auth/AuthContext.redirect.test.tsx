import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { authAPI } from '@/utils/api';
import { tokenStorage } from '@/utils/storage';

// Unmock AuthContext for this test since we want to test the real implementation
jest.unmock('@/context/AuthContext');

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/utils/api', () => ({
  authAPI: {
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

jest.mock('@/utils/storage', () => ({
  tokenStorage: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockAuthAPI = authAPI as jest.Mocked<typeof authAPI>;
const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

// Test component to access auth context
const TestComponent = ({ onAuthChange }: { onAuthChange: (auth: any) => void }) => {
  const auth = useAuth();
  onAuthChange(auth);
  return <div>Test Component</div>;
};

describe('AuthContext Redirect Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any);
  });

  describe('Initial Authentication Check', () => {
    it('should set isLoading to false when no token exists', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue(null);
      
      let authState: any = null;
      
      render(
        <AuthProvider>
          <TestComponent onAuthChange={(auth) => { authState = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState.isLoading).toBe(false);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.user).toBe(null);
      });
    });

    it('should validate token and authenticate user when valid token exists', async () => {
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        role: 'student',
        profile: { firstName: 'Test', lastName: 'User' },
      };

      // Create a valid JWT token with an expiry in the future
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ 
        sub: 'user-id', 
        exp: Math.floor(Date.now() / 1000) + 3600 // expires in 1 hour
      }));
      const signature = 'mock-signature';
      const validJWT = `${header}.${payload}.${signature}`;
      
      mockTokenStorage.getAccessToken.mockReturnValue(validJWT);
      mockAuthAPI.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      
      let authState: any = null;
      
      render(
        <AuthProvider>
          <TestComponent onAuthChange={(auth) => { authState = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState.isLoading).toBe(false);
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.user).toEqual(mockUser);
      });
    });

    it('should try refresh token when getCurrentUser fails', async () => {
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        role: 'student',
        profile: { firstName: 'Test', lastName: 'User' },
      };

      mockTokenStorage.getAccessToken.mockReturnValue('expired-token');
      mockTokenStorage.getRefreshToken.mockReturnValue('refresh-token');
      mockAuthAPI.getCurrentUser.mockRejectedValue(new Error('Token expired'));
      mockAuthAPI.refreshToken.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          tokens: { accessToken: 'new-token', refreshToken: 'new-refresh' },
        },
      });
      
      let authState: any = null;
      
      render(
        <AuthProvider>
          <TestComponent onAuthChange={(auth) => { authState = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState.isLoading).toBe(false);
        expect(authState.isAuthenticated).toBe(true);
        expect(authState.user).toEqual(mockUser);
      });

      expect(mockTokenStorage.setTokens).toHaveBeenCalledWith({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      });
    });

    it('should logout when token refresh fails', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('expired-token');
      mockTokenStorage.getRefreshToken.mockReturnValue('invalid-refresh');
      mockAuthAPI.getCurrentUser.mockRejectedValue(new Error('Token expired'));
      mockAuthAPI.refreshToken.mockResolvedValue({
        success: false,
        error: 'Invalid refresh token',
      });
      
      let authState: any = null;
      
      render(
        <AuthProvider>
          <TestComponent onAuthChange={(auth) => { authState = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState.isLoading).toBe(false);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.user).toBe(null);
      });

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
    });
  });

  describe('Token Refresh Behavior', () => {
    it('should automatically refresh token when close to expiry', async () => {
      // Enable fake timers for this test
      jest.useFakeTimers();
      
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        role: 'student',
        profile: { firstName: 'Test', lastName: 'User' },
      };

      // Mock a token that expires in 2 minutes (less than 5 minute threshold)
      const expTime = Math.floor(Date.now() / 1000) + 120; // 2 minutes from now
      const mockToken = `header.${btoa(JSON.stringify({ exp: expTime }))}.signature`;

      mockTokenStorage.getAccessToken
        .mockReturnValueOnce('valid-token') // Initial load
        .mockReturnValue(mockToken); // Subsequent checks
      
      mockAuthAPI.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockAuthAPI.refreshToken.mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          tokens: { accessToken: 'new-token', refreshToken: 'new-refresh' },
        },
      });
      
      let authState: any = null;
      
      render(
        <AuthProvider>
          <TestComponent onAuthChange={(auth) => { authState = auth; }} />
        </AuthProvider>
      );

      // Wait for initial auth check
      await waitFor(() => {
        expect(authState.isAuthenticated).toBe(true);
      });

      // Fast-forward time to trigger refresh check
      jest.advanceTimersByTime(60000); // 1 minute

      await waitFor(() => {
        expect(mockAuthAPI.refreshToken).toHaveBeenCalled();
      });
      
      // Restore real timers
      jest.useRealTimers();
    });
  });

  describe('Logout Behavior', () => {
    it('should clear tokens and update auth state on logout', async () => {
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        role: 'student',
        profile: { firstName: 'Test', lastName: 'User' },
      };

      mockTokenStorage.getAccessToken.mockReturnValue('valid-token');
      mockAuthAPI.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      
      let authState: any = null;
      
      render(
        <AuthProvider>
          <TestComponent onAuthChange={(auth) => { authState = auth; }} />
        </AuthProvider>
      );

      // Wait for authentication
      await waitFor(() => {
        expect(authState.isAuthenticated).toBe(true);
      });

      // Trigger logout
      act(() => {
        authState.logout();
      });

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed token gracefully', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('malformed.token');
      mockAuthAPI.getCurrentUser.mockRejectedValue(new Error('Invalid token'));
      mockTokenStorage.getRefreshToken.mockReturnValue(null);
      
      let authState: any = null;
      
      render(
        <AuthProvider>
          <TestComponent onAuthChange={(auth) => { authState = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState.isLoading).toBe(false);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.user).toBe(null);
      });
    });

    it('should handle network errors during token validation', async () => {
      mockTokenStorage.getAccessToken.mockReturnValue('valid-token');
      mockAuthAPI.getCurrentUser.mockRejectedValue(new Error('Network error'));
      mockTokenStorage.getRefreshToken.mockReturnValue(null);
      
      let authState: any = null;
      
      render(
        <AuthProvider>
          <TestComponent onAuthChange={(auth) => { authState = auth; }} />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authState.isLoading).toBe(false);
        expect(authState.isAuthenticated).toBe(false);
        expect(authState.user).toBe(null);
      });
    });
  });
});