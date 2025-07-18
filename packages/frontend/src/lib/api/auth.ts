// packages/frontend/src/lib/api/auth.ts
// Authentication API utilities

import { AuthResult, LoginRequestType, RegisterRequestType } from '@yggdrasil/shared-utilities';
import { apiClient } from './client';

export const authApi = {
  async login(data: LoginRequestType): Promise<AuthResult> {
    try {
      console.log('🌐 FRONTEND API: Making login request to auth service');
      console.log('🌐 FRONTEND API: Request data:', data);
      console.log('🌐 FRONTEND API: API client base URL:', (apiClient as any).defaults.baseURL);
      
      const response = await apiClient.post('/auth/login', data);
      
      console.log('🌐 FRONTEND API: Received response from auth service');
      console.log('🌐 FRONTEND API: Response status:', response.status);
      console.log('🌐 FRONTEND API: Response data:', response.data);
      
      return {
        success: response.data.success,
        user: response.data.data.user,
        tokens: response.data.data.tokens,
      };
    } catch (error: any) {
      console.error('🌐 FRONTEND API: Login request failed');
      console.error('🌐 FRONTEND API: Error message:', error.message);
      console.error('🌐 FRONTEND API: Error code:', error.code);
      console.error('🌐 FRONTEND API: Response status:', error.response?.status);
      console.error('🌐 FRONTEND API: Response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('🌐 FRONTEND API: Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        data: error.config?.data
      });
      
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
        user: response.data.data.user,
        tokens: response.data.data.tokens,
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
        user: response.data.data.user,
        tokens: response.data.data.tokens,
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
        user: response.data.data.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get user info',
      };
    }
  },
};