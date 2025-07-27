// packages/frontend/src/lib/auth/tokenStorage.ts
// Token storage utilities for browser

import { AuthTokens } from '@yggdrasil/shared-utilities/client';
import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'yggdrasil_access_token';
const REFRESH_TOKEN_KEY = 'yggdrasil_refresh_token';

export const tokenStorage = {
  setTokens(tokens: AuthTokens): void {

    // Configure cookie settings optimized for test environment
    const cookieConfig = {
      expires: process.env.NODE_ENV === 'test' ? 7 : 1/12, // 7 days in tests, 2 hours in prod
      secure: false, // FIXED: Never use secure in test environment (http://localhost)
      sameSite: 'lax' as const, // FIXED: Proper TypeScript typing
      path: '/',
      // Never set domain for localhost testing
    } as const;


    // Store access token
    Cookies.set(ACCESS_TOKEN_KEY, tokens.accessToken, cookieConfig);
    

    // Store refresh token
    Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, {
      ...cookieConfig,
      expires: process.env.NODE_ENV === 'test' ? 7 : 1, // 7 days in test, 1 day in prod
      httpOnly: false, // We need to access this from JS
    });
    

  },

  getTokens(): AuthTokens | null {
    const accessToken = Cookies.get(ACCESS_TOKEN_KEY);
    const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);

    // If we have no refresh token or it's empty, we're truly logged out
    if (!refreshToken || refreshToken.trim() === '') {
      return null;
    }

    // If we have a refresh token but no access token, return the refresh token
    // The AuthProvider will handle refreshing the access token
    return {
      accessToken: accessToken || '',
      refreshToken,
    };
  },

  getAccessToken(): string | null {
    const token = Cookies.get(ACCESS_TOKEN_KEY);
    return (token && token.trim() !== '') ? token : null;
  },

  getRefreshToken(): string | null {
    const token = Cookies.get(REFRESH_TOKEN_KEY);
    return (token && token.trim() !== '') ? token : null;
  },

  clearTokens(): void {
    // Use consistent options for all environments to ensure proper cleanup
    const removeOptions = { path: '/' };
    
    Cookies.remove(ACCESS_TOKEN_KEY, removeOptions);
    Cookies.remove(REFRESH_TOKEN_KEY, removeOptions);
  },

  setAccessToken(token: string): void {
    const cookieConfig = {
      expires: process.env.NODE_ENV === 'test' ? 1 : 1/12, // Longer expiration in tests
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const, // Use lax for better test compatibility
      path: '/',
      // Remove explicit domain in test mode for better Playwright compatibility
      domain: process.env.NODE_ENV === 'production' ? undefined : undefined,
    };
    
    Cookies.set(ACCESS_TOKEN_KEY, token, cookieConfig);
  },
};