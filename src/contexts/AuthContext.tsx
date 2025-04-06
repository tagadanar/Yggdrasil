'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '@/types';
import { useRouter } from 'next/navigation';

interface AuthContextType extends AuthState {
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real app, we would call an API to verify the session
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      // In development, bypass actual authentication
      const isDev = process.env.NODE_ENV === 'development';
      
      // For production, we would make an API call here
      // In dev mode, we'll simulate a successful login
      const user: User = {
        id: '1',
        name: isDev ? 'Dev User' : 'Test User',
        email: credentials.email,
        role: 'admin',
      };

      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(user));

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    // Remove user from localStorage
    localStorage.removeItem('user');
    
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};