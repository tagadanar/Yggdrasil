// packages/frontend/src/lib/auth/AuthProvider.tsx
// Authentication context provider

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthTokens } from '@yggdrasil/shared-utilities';
import { authApi } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/auth/tokenStorage';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // If we're on a login page, skip auth initialization to avoid conflicts
      if (typeof window !== 'undefined' && window.location.pathname.includes('/auth/login')) {
        setIsLoading(false);
        return;
      }

      const storedTokens = tokenStorage.getTokens();
      if (!storedTokens?.accessToken) {
        setIsLoading(false);
        return;
      }

      // Try to get user info with stored token
      const result = await authApi.me(storedTokens.accessToken);
      
      if (result.success && result.user) {
        setUser(result.user);
        setTokens(storedTokens);
      } else {
        // Try to refresh tokens
        if (storedTokens.refreshToken) {
          const refreshSuccess = await refreshTokens();
          if (!refreshSuccess) {
            tokenStorage.clearTokens();
          }
        } else {
          // Clear invalid tokens
          tokenStorage.clearTokens();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      tokenStorage.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // Clear any existing tokens before login attempt
      tokenStorage.clearTokens();
      setUser(null);
      setTokens(null);
      
      const result = await authApi.login({ email, password });
      
      if (result.success && result.user && result.tokens) {
        setUser(result.user);
        setTokens(result.tokens);
        tokenStorage.setTokens(result.tokens);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Invalid email or password' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      const result = await authApi.register(userData);
      
      if (result.success && result.user && result.tokens) {
        setUser(result.user);
        setTokens(result.tokens);
        tokenStorage.setTokens(result.tokens);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (tokens?.accessToken) {
        await authApi.logout(tokens.accessToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTokens(null);
      tokenStorage.clearTokens();
    }
  };

  const refreshTokens = async (): Promise<boolean> => {
    try {
      const storedTokens = tokenStorage.getTokens();
      if (!storedTokens?.refreshToken) {
        return false;
      }

      const result = await authApi.refresh(storedTokens.refreshToken);
      
      if (result.success && result.tokens && result.user) {
        setUser(result.user);
        setTokens(result.tokens);
        tokenStorage.setTokens(result.tokens);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    tokens,
    isLoading,
    login,
    register,
    logout,
    refreshTokens,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}