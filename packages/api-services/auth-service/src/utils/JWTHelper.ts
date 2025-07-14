// packages/api-services/auth-service/src/utils/JWTHelper.ts
// JWT token generation and validation utilities

import jwt from 'jsonwebtoken';
import { JWTPayload, RefreshTokenPayload, AuthTokens, JWT_CONFIG } from '@yggdrasil/shared-utilities';

interface TokenVerificationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class JWTHelper {
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'your-access-token-secret';
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret';

  /**
   * Generate both access and refresh tokens for a user
   */
  static generateTokens(user: { _id: string; email: string; role: string; tokenVersion?: number }): AuthTokens {
    const accessTokenPayload: JWTPayload = {
      id: user._id,
      email: user.email,
      role: user.role as any,
      tokenVersion: user.tokenVersion || 0,
    };

    const refreshTokenPayload: RefreshTokenPayload = {
      id: user._id,
      tokenVersion: user.tokenVersion || 0, // Use actual token version from user
    };

    return {
      accessToken: this.generateAccessToken(accessTokenPayload),
      refreshToken: this.generateRefreshToken(refreshTokenPayload),
    };
  }

  /**
   * Generate access token with custom payload
   */
  static generateAccessToken(payload: JWTPayload, customExpiresIn?: string | number): string {
    const options: jwt.SignOptions = {
      expiresIn: (customExpiresIn || JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN) as any,
      issuer: 'yggdrasil-auth-service',
      audience: 'yggdrasil-platform',
    };
    
    return jwt.sign(
      { ...payload, type: 'access' },
      this.ACCESS_TOKEN_SECRET,
      options
    );
  }

  /**
   * Generate refresh token with custom payload
   */
  static generateRefreshToken(payload: RefreshTokenPayload, customExpiresIn?: string | number): string {
    const options: jwt.SignOptions = {
      expiresIn: (customExpiresIn || JWT_CONFIG.REFRESH_TOKEN_EXPIRES_IN) as any,
      issuer: 'yggdrasil-auth-service',
      audience: 'yggdrasil-platform',
    };
    
    return jwt.sign(
      { ...payload, type: 'refresh' },
      this.REFRESH_TOKEN_SECRET,
      options
    );
  }

  /**
   * Verify and decode access token
   */
  static verifyAccessToken(token: string): TokenVerificationResult<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: 'yggdrasil-auth-service',
        audience: 'yggdrasil-platform',
      }) as JWTPayload;

      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      const errorMessage = error instanceof jwt.JsonWebTokenError 
        ? `Invalid token: ${error.message}`
        : 'Token verification failed';

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verify and decode refresh token
   */
  static verifyRefreshToken(token: string): TokenVerificationResult<RefreshTokenPayload> {
    try {
      const decoded = jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
        issuer: 'yggdrasil-auth-service',
        audience: 'yggdrasil-platform',
      }) as RefreshTokenPayload;

      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      const errorMessage = error instanceof jwt.JsonWebTokenError 
        ? `Invalid refresh token: ${error.message}`
        : 'Refresh token verification failed';

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
}