// packages/frontend/src/lib/api/auth.ts
// Authentication API utilities

import { AuthResult, LoginRequestType, RegisterRequestType } from '@yggdrasil/shared-utilities/client';
import { apiClient } from './client';

export const authApi = {
  async login(data: LoginRequestType): Promise<AuthResult> {
    try {
      const response = await apiClient.post('/auth/login', data);

      return {
        success: response.data.success,
        user: response.data.data.user,    // CORRECT: Backend sends { data: { user, tokens } }
        tokens: response.data.data.tokens, // CORRECT: Backend sends { data: { user, tokens } }
      };
    } catch (error: any) {
      console.error('Login request failed:', error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  },

  async register(data: RegisterRequestType): Promise<AuthResult> {
    try {
      const response = await apiClient.post('/auth/register', data);
      return {
        success: response.data.success,
        user: response.data.data?.user,
        tokens: response.data.data?.tokens,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  },

  async refresh(refreshToken: string): Promise<AuthResult> {
    try {
      const response = await apiClient.post('/auth/refresh', { refreshToken });
      return {
        success: response.data.success,
        user: response.data.data?.user,
        tokens: response.data.data?.tokens,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Token refresh failed',
      };
    }
  },

  async logout(accessToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Logout failed',
      };
    }
  },

  async me(accessToken: string): Promise<AuthResult> {
    try {
      const response = await apiClient.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return {
        success: true,
        user: response.data.data?.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get user info',
      };
    }
  },
};