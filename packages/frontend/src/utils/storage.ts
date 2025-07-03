import Cookies from 'js-cookie';
import { AuthTokens } from '@101-school/shared-utilities';

const ACCESS_TOKEN_KEY = '101_school_access_token';
const REFRESH_TOKEN_KEY = '101_school_refresh_token';

export const tokenStorage = {
  setTokens: (tokens: AuthTokens) => {
    // Store access token in memory/sessionStorage for security
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    }
    
    // Store refresh token in httpOnly cookie (more secure)
    // For development, we'll use regular cookies
    Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, {
      expires: 7, // 7 days
      httpOnly: false, // Set to true in production with proper backend setup
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  },

  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    return Cookies.get(REFRESH_TOKEN_KEY) || null;
  },

  clearTokens: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    Cookies.remove(REFRESH_TOKEN_KEY);
  },

  hasTokens: (): boolean => {
    return !!(tokenStorage.getAccessToken() || tokenStorage.getRefreshToken());
  },
};

export const userPreferencesStorage = {
  setPreferences: (preferences: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('101_school_preferences', JSON.stringify(preferences));
    }
  },

  getPreferences: () => {
    if (typeof window === 'undefined') {
      return null;
    }
    const stored = localStorage.getItem('101_school_preferences');
    return stored ? JSON.parse(stored) : null;
  },

  clearPreferences: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('101_school_preferences');
    }
  },
};

export const themeStorage = {
  setTheme: (theme: 'light' | 'dark' | 'auto') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('101_school_theme', theme);
      
      // Apply theme immediately
      const root = document.documentElement;
      if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
      } else if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
      } else {
        // Auto theme - detect system preference
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.setAttribute('data-theme', systemTheme);
      }
    }
  },

  getTheme: (): 'light' | 'dark' | 'auto' => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    return (localStorage.getItem('101_school_theme') as 'light' | 'dark' | 'auto') || 'light';
  },

  initializeTheme: () => {
    if (typeof window === 'undefined') {
      return;
    }
    
    const savedTheme = themeStorage.getTheme();
    themeStorage.setTheme(savedTheme);

    // Listen for system theme changes when in auto mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (themeStorage.getTheme() === 'auto') {
        themeStorage.setTheme('auto'); // Re-apply auto theme
      }
    });
  },
};