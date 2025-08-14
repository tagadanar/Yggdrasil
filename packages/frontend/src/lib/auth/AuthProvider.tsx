// packages/frontend/src/lib/auth/AuthProvider.tsx
// Authentication context provider

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthTokens } from '@yggdrasil/shared-utilities/client';
import { authApi } from '@/lib/api/auth';
import { tokenStorage } from '@/lib/auth/tokenStorage';
import { tokenSync } from '@/lib/auth/tokenSync';
import { authFlowManager } from '@/lib/auth/AuthFlowManager';
import { authStateValidator } from '@/lib/auth/AuthStateValidator';
import { createComponentLogger } from '@/lib/errors/logger';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (email: string, password: string, router?: any) => Promise<{ success: boolean; error?: string; navigationResult?: any }>;
  register: (userData: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const logger = createComponentLogger('AuthProvider');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // REQUEST DEDUPLICATION: Prevent concurrent login requests
  const loginPromiseRef = React.useRef<Promise<{ success: boolean; error?: string; navigationResult?: any }> | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    // Initialize token sync
    tokenSync.initialize();
    
    // Subscribe to token changes
    const unsubscribe = tokenSync.subscribe((tokens) => {
      if (!tokens) {
        setUser(null);
        setTokens(null);
      }
    });
    
    // Initialize auth
    initializeAuth();
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  // Cookie change detection - Fix for state caching bug
  useEffect(() => {
    const checkCookieChanges = () => {
      const currentTokens = tokenStorage.getTokens();
      if (!currentTokens && (user || tokens)) {
        // Cookies cleared but state still exists - clear state
        setUser(null);
        setTokens(null);
        // Also notify tokenSync for immediate propagation
        tokenSync.notifyTokenChange(null);
      }
    };
    
    // Check immediately on mount
    checkCookieChanges();
    
    // Poll for cookie changes (much more frequently for immediate detection)
    const interval = setInterval(checkCookieChanges, 50);
    return () => clearInterval(interval);
  }, [user, tokens]);

  // Additional immediate cookie check for navigation events
  useEffect(() => {
    const handleNavigationCheck = () => {
      const currentTokens = tokenStorage.getTokens();
      if (!currentTokens && (user || tokens)) {
        setUser(null);
        setTokens(null);
        tokenSync.notifyTokenChange(null);
      }
    };

    // Listen for navigation events to trigger immediate checks
    window.addEventListener('beforeunload', handleNavigationCheck);
    window.addEventListener('focus', handleNavigationCheck);
    
    return () => {
      window.removeEventListener('beforeunload', handleNavigationCheck);
      window.removeEventListener('focus', handleNavigationCheck);
    };
  }, [user, tokens]);

  // Expose current user globally for testing purposes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__CURRENT_USER__ = user;
    }
  }, [user]);

  const initializeAuth = async () => {
    try {
      const storedTokens = tokenStorage.getTokens();
      
      if (!storedTokens?.refreshToken) {
        setIsLoading(false);
        return;
      }

      // If we have a valid access token, try to use it first
      if (storedTokens.accessToken) {
        const result = await authApi.me(storedTokens.accessToken);
        
        if (result.success && result.user) {
          setUser(result.user);
          setTokens(storedTokens);
          setIsLoading(false);
          return;
        }
      }

      // If access token is missing or invalid, try to refresh tokens
      if (storedTokens.refreshToken) {
        const refreshSuccess = await refreshTokens();
        if (!refreshSuccess) {
          tokenStorage.clearTokens();
        }
      } else {
        tokenStorage.clearTokens();
      }
    } catch (error) {
      logger.error('Auth initialization failed', { error });
      tokenStorage.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, router?: any) => {
    // 🔐 REQUEST DEDUPLICATION: Prevent concurrent login requests
    if (loginPromiseRef.current) {
      return loginPromiseRef.current;
    }
    
    
    // Create and store the login promise
    const loginPromise = performLogin(email, password, router);
    loginPromiseRef.current = loginPromise;
    
    // Clear the promise when done (success or failure)
    loginPromise.finally(() => {
      loginPromiseRef.current = null;
    });
    
    return loginPromise;
  };
  
  // Separate function to perform the actual login logic
  const performLogin = async (email: string, password: string, router?: any) => {
    try {
      
      // Clear any existing tokens before login attempt
      tokenStorage.clearTokens();
      
      const result = await authApi.login({ email, password });
      
      if (result.success && result.user && result.tokens) {
        
        // Set tokens in storage first
        tokenStorage.setTokens(result.tokens);
        
        // Update state in a single batch to avoid multiple re-renders
        setUser(result.user);
        setTokens(result.tokens);
        
        // Notify other tabs/components
        tokenSync.notifyTokenChange(result.tokens);
        
        // Handle navigation if router is provided
        let navigationResult;
        if (router) {
          
          try {
            navigationResult = await authFlowManager.handleLoginSuccess(result.user, router);
          } catch (navError) {
            logger.error('Post-login navigation failed', { error: navError });
            navigationResult = {
              success: false,
              error: 'Navigation exception: ' + (navError instanceof Error ? navError.message : String(navError))
            };
          }
        } else {
        }
        
        return { 
          success: true,
          navigationResult 
        };
      } else {
        return { success: false, error: result.error || 'Invalid email or password' };
      }
    } catch (error) {
      logger.error('Login failed with network error', { error });
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      const result = await authApi.register(userData);
      
      if (result.success && result.user && result.tokens) {
        tokenStorage.setTokens(result.tokens);
        setUser(result.user);
        setTokens(result.tokens);
        tokenSync.notifyTokenChange(result.tokens);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Registration failed' };
      }
    } catch (error) {
      logger.error('Registration failed with network error', { error });
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
      logger.error('Logout failed', { error });
    } finally {
      setUser(null);
      setTokens(null);
      tokenStorage.clearTokens();
      tokenSync.notifyTokenChange(null);
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
        tokenStorage.setTokens(result.tokens);
        setUser(result.user);
        setTokens(result.tokens);
        tokenSync.notifyTokenChange(result.tokens);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      logger.error('Token refresh failed', { error });
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