// packages/frontend/src/lib/auth/tokenStorage.ts
// Token storage utilities for browser

import { AuthTokens } from '@yggdrasil/shared-utilities';
import Cookies from 'js-cookie';

const ACCESS_TOKEN_KEY = 'yggdrasil_access_token';
const REFRESH_TOKEN_KEY = 'yggdrasil_refresh_token';

export const tokenStorage = {
  setTokens(tokens: AuthTokens): void {
    // Store access token in memory/short-lived cookie (2 hours)
    Cookies.set(ACCESS_TOKEN_KEY, tokens.accessToken, { 
      expires: 1/12, // 2 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    // Store refresh token in longer-lived cookie (24 hours)
    Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, {
      expires: 1, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      httpOnly: false, // We need to access this from JS
    });
  },

  getTokens(): AuthTokens | null {
    const accessToken = Cookies.get(ACCESS_TOKEN_KEY);
    const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
    };
  },

  getAccessToken(): string | null {
    return Cookies.get(ACCESS_TOKEN_KEY) || null;
  },

  getRefreshToken(): string | null {
    return Cookies.get(REFRESH_TOKEN_KEY) || null;
  },

  clearTokens(): void {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
  },

  setAccessToken(token: string): void {
    Cookies.set(ACCESS_TOKEN_KEY, token, {
      expires: 1/12, // 2 hours
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  },
};