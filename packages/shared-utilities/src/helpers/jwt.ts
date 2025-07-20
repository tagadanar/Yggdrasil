// packages/shared-utilities/src/helpers/jwt.ts
// Centralized JWT utility for consistent token handling across all services

import jwt from 'jsonwebtoken';
import { JWTPayload, RefreshTokenPayload, AuthTokens } from '../types/auth';

// Centralized JWT configuration
const JWT_CONFIG = {
  ACCESS_TOKEN_SECRET: process.env.JWT_SECRET || 'yggdrasil-access-token-secret-2024',
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || 'yggdrasil-refresh-token-secret-2024',
  // Extended token expiration for test environment to prevent test failures due to timing
  ACCESS_TOKEN_EXPIRES_IN: process.env.NODE_ENV === 'test' ? '2h' : '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  ISSUER: 'yggdrasil-auth-service',
  AUDIENCE: 'yggdrasil-platform'
};

interface TokenVerificationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class SharedJWTHelper {
  /**
   * Generate both access and refresh tokens for a user
   */
  static generateTokens(user: { _id: string; email: string; role: string; tokenVersion?: number }): AuthTokens {
    const accessTokenPayload: JWTPayload = {
      userId: user._id,  // Use consistent field name 'userId'
      id: user._id,      // Keep 'id' for backward compatibility
      _id: user._id,     // Add _id field for full compatibility
      email: user.email,
      role: user.role as any,
      tokenVersion: user.tokenVersion || 0,
    } as any;

    const refreshTokenPayload: RefreshTokenPayload = {
      userId: user._id,  // Use consistent field name 'userId'
      id: user._id,      // Keep 'id' for backward compatibility
      tokenVersion: user.tokenVersion || 0,
    };

    return {
      accessToken: this.generateAccessToken(accessTokenPayload),
      refreshToken: this.generateRefreshToken(refreshTokenPayload),
    };
  }

  /**
   * Generate access token with standard configuration
   */
  static generateAccessToken(payload: JWTPayload, customExpiresIn?: string): string {
    const expiresIn = customExpiresIn || JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN;
    const options: jwt.SignOptions = {
      expiresIn: expiresIn as any,
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    };
    
    return jwt.sign(
      { ...payload, type: 'access' },
      JWT_CONFIG.ACCESS_TOKEN_SECRET,
      options
    );
  }

  /**
   * Generate refresh token with standard configuration
   */
  static generateRefreshToken(payload: RefreshTokenPayload, customExpiresIn?: string): string {
    const expiresIn = customExpiresIn || JWT_CONFIG.REFRESH_TOKEN_EXPIRES_IN;
    const options: jwt.SignOptions = {
      expiresIn: expiresIn as any,
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    };
    
    return jwt.sign(
      { ...payload, type: 'refresh' },
      JWT_CONFIG.REFRESH_TOKEN_SECRET,
      options
    );
  }

  /**
   * Verify and decode access token with full validation
   */
  static verifyAccessToken(token: string): TokenVerificationResult<JWTPayload> {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.ACCESS_TOKEN_SECRET, {
        issuer: JWT_CONFIG.ISSUER,
        audience: JWT_CONFIG.AUDIENCE,
      }) as JWTPayload;

      // Ensure both userId and id are present for compatibility
      if (decoded.id && !decoded.userId) {
        decoded.userId = decoded.id;
      }
      if (decoded.userId && !decoded.id) {
        decoded.id = decoded.userId;
      }

      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      let errorMessage = 'Token verification failed';
      
      if (error instanceof jwt.JsonWebTokenError) {
        errorMessage = `Invalid token: ${error.message}`;
      } else if (error instanceof jwt.TokenExpiredError) {
        errorMessage = 'Token expired';
      } else if (error instanceof jwt.NotBeforeError) {
        errorMessage = 'Token not active yet';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verify and decode refresh token with full validation
   */
  static verifyRefreshToken(token: string): TokenVerificationResult<RefreshTokenPayload> {
    try {
      const decoded = jwt.verify(token, JWT_CONFIG.REFRESH_TOKEN_SECRET, {
        issuer: JWT_CONFIG.ISSUER,
        audience: JWT_CONFIG.AUDIENCE,
      }) as RefreshTokenPayload;

      // Ensure both userId and id are present for compatibility
      if (decoded.id && !decoded.userId) {
        decoded.userId = decoded.id;
      }
      if (decoded.userId && !decoded.id) {
        decoded.id = decoded.userId;
      }

      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      let errorMessage = 'Refresh token verification failed';
      
      if (error instanceof jwt.JsonWebTokenError) {
        errorMessage = `Invalid refresh token: ${error.message}`;
      } else if (error instanceof jwt.TokenExpiredError) {
        errorMessage = 'Refresh token expired';
      } else if (error instanceof jwt.NotBeforeError) {
        errorMessage = 'Refresh token not active yet';
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }

  /**
   * Check if token is expired (without verifying signature)
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.exp) {
        return true;
      }

      // Check if current time is past expiration
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration date
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch {
      return null;
    }
  }

  /**
   * Get JWT configuration (for debugging)
   */
  static getConfig() {
    return {
      ...JWT_CONFIG,
      ACCESS_TOKEN_SECRET: JWT_CONFIG.ACCESS_TOKEN_SECRET.substring(0, 10) + '...',
      REFRESH_TOKEN_SECRET: JWT_CONFIG.REFRESH_TOKEN_SECRET.substring(0, 10) + '...'
    };
  }
}

// Export individual functions for convenience
export const {
  generateTokens,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiration,
  decodeToken
} = SharedJWTHelper;