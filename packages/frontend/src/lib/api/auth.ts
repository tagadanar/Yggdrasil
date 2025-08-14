// packages/frontend/src/lib/api/auth.ts
// Authentication API utilities

import { AuthResult, LoginRequestType, RegisterRequestType } from '@yggdrasil/shared-utilities/client';
import { createComponentApiClient } from './enhancedClient';
import { createComponentLogger } from '@/lib/errors/logger';

const apiClient = createComponentApiClient('Auth');
const logger = createComponentLogger('Auth');

export const authApi = {
  async login(data: LoginRequestType): Promise<AuthResult> {
    try {
      logger.info('Attempting user login', { email: data.email });
      
      const response = await apiClient.post('/auth/login', data, {
        action: 'login',
        maxRetries: 1,
        retryDelay: 1000,
      });

      const responseData = response.data as any;
      logger.info('Login successful', { userId: responseData.data.user?.id });

      return {
        success: responseData.success,
        user: responseData.data.user,    // CORRECT: Backend sends { data: { user, tokens } }
        tokens: responseData.data.tokens, // CORRECT: Backend sends { data: { user, tokens } }
      };
    } catch (error: any) {
      logger.error('Login request failed', { 
        email: data.email,
        error: error.message,
        status: error.response?.status 
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  },

  async register(data: RegisterRequestType): Promise<AuthResult> {
    try {
      logger.info('Attempting user registration', { email: data.email });
      
      const response = await apiClient.post('/auth/register', data, {
        action: 'register',
        maxRetries: 1,
        retryDelay: 1000,
      });
      
      const responseData = response.data as any;
      logger.info('Registration successful', { userId: responseData.data?.user?.id });
      
      return {
        success: responseData.success,
        user: responseData.data?.user,
        tokens: responseData.data?.tokens,
      };
    } catch (error: any) {
      logger.error('Registration failed', { 
        email: data.email,
        error: error.message,
        status: error.response?.status 
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  },

  async refresh(refreshToken: string): Promise<AuthResult> {
    try {
      logger.info('Attempting token refresh');
      
      const response = await apiClient.post('/auth/refresh', { refreshToken }, {
        action: 'refresh',
        maxRetries: 1,
        retryDelay: 1000,
        silent: true, // Don't log refresh requests to avoid noise
      });
      
      logger.debug('Token refresh successful');
      
      const responseData = response.data as any;
      
      return {
        success: responseData.success,
        user: responseData.data?.user,
        tokens: responseData.data?.tokens,
      };
    } catch (error: any) {
      logger.error('Token refresh failed', { 
        error: error.message,
        status: error.response?.status 
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Token refresh failed',
      };
    }
  },

  async logout(accessToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Attempting user logout');
      
      await apiClient.post('/auth/logout', {}, {
        action: 'logout',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      logger.info('Logout successful');
      return { success: true };
    } catch (error: any) {
      logger.error('Logout failed', { 
        error: error.message,
        status: error.response?.status 
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Logout failed',
      };
    }
  },

  async me(accessToken: string): Promise<AuthResult> {
    try {
      logger.debug('Fetching current user info');
      
      const response = await apiClient.get('/auth/me', {
        action: 'getCurrentUser',
        silent: true, // Don't log frequent "me" requests
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      logger.debug('User info fetched successfully');
      
      return {
        success: true,
        user: response.data.data?.user,
      };
    } catch (error: any) {
      logger.error('Failed to get user info', { 
        error: error.message,
        status: error.response?.status 
      });
      
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get user info',
      };
    }
  },
};