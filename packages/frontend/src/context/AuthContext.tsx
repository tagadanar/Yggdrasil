'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@101-school/shared-utilities';
import { authAPI } from '@/utils/api';
import { tokenStorage } from '@/utils/storage';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

interface RegisterData {
  email: string;
  password: string;
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string;
  };
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response = await authAPI.login({ email, password });
      
      if (response.success) {
        tokenStorage.setTokens(response.data.tokens);
        dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
        toast.success('Connexion réussie !');
        return true;
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: response.error || 'Erreur de connexion' });
        toast.error(response.error || 'Erreur de connexion');
        return false;
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erreur de connexion';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response = await authAPI.register(userData);
      
      if (response.success) {
        tokenStorage.setTokens(response.data.tokens);
        dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
        toast.success('Inscription réussie !');
        return true;
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: response.error || 'Erreur d\'inscription' });
        toast.error(response.error || 'Erreur d\'inscription');
        return false;
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erreur d\'inscription';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    tokenStorage.clearTokens();
    dispatch({ type: 'AUTH_LOGOUT' });
    toast.success('Déconnexion réussie');
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await authAPI.refreshToken(refreshToken);
      
      if (response.success) {
        tokenStorage.setTokens(response.data.tokens);
        dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
        return true;
      } else {
        tokenStorage.clearTokens();
        dispatch({ type: 'AUTH_LOGOUT' });
        return false;
      }
    } catch (error) {
      tokenStorage.clearTokens();
      dispatch({ type: 'AUTH_LOGOUT' });
      return false;
    }
  };

  const checkAuth = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const accessToken = tokenStorage.getAccessToken();
      if (!accessToken) {
        dispatch({ type: 'AUTH_LOGOUT' });
        return;
      }

      // Check if token is expired before making API call
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const exp = payload.exp * 1000;
        const now = Date.now();
        
        if (exp <= now) {
          // Token is expired, try to refresh
          const refreshed = await refreshToken();
          if (!refreshed) {
            dispatch({ type: 'AUTH_LOGOUT' });
          }
          return;
        }
      } catch (tokenError) {
        // Invalid token format, try to refresh
        const refreshed = await refreshToken();
        if (!refreshed) {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
        return;
      }

      // Try to get current user profile to verify token validity
      const response = await authAPI.getCurrentUser();
      
      if (response.success) {
        dispatch({ type: 'AUTH_SUCCESS', payload: response.data });
      } else {
        // Token might be expired, try to refresh
        const refreshed = await refreshToken();
        if (!refreshed) {
          dispatch({ type: 'AUTH_LOGOUT' });
        }
      }
    } catch (error) {
      // Try to refresh token on error
      const refreshed = await refreshToken();
      if (!refreshed) {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'AUTH_SUCCESS', payload: user });
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (state.isAuthenticated) {
      const interval = setInterval(async () => {
        const accessToken = tokenStorage.getAccessToken();
        if (accessToken) {
          // Check if token is close to expiry and refresh if needed
          try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]));
            const exp = payload.exp * 1000;
            const now = Date.now();
            const timeUntilExpiry = exp - now;
            
            // Refresh if token expires in less than 5 minutes
            if (timeUntilExpiry < 5 * 60 * 1000) {
              await refreshToken();
            }
          } catch (error) {
            console.error('Error checking token expiry:', error);
          }
        }
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [state.isAuthenticated]);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    checkAuth,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}