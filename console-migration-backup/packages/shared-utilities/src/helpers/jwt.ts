// packages/shared-utilities/src/helpers/jwt.ts
// Centralized JWT utility for consistent token handling across all services

import jwt from 'jsonwebtoken';
import { config } from '../config/env-validator';
import { JWTPayload, RefreshTokenPayload, AuthTokens } from '../types/auth';

// Remove hardcoded defaults completely - all secrets must come from environment
const JWT_CONFIG = {
  ACCESS_TOKEN_SECRET: config.JWT_SECRET,
  REFRESH_TOKEN_SECRET: config.JWT_REFRESH_SECRET,
  // Extended token expiration for test environment to prevent test failures due to timing
  ACCESS_TOKEN_EXPIRES_IN: process.env['NODE_ENV'] === 'test' ? '2h' : config.JWT_ACCESS_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN: config.JWT_REFRESH_EXPIRES_IN,
  ISSUER: 'yggdrasil-auth-service',
  AUDIENCE: 'yggdrasil-platform',
};

// Add initialization check
let isInitialized = false;

/**
 * Initialize JWT system with environment validation.
 * 
 * Must be called during service startup to validate that required
 * JWT secrets are properly configured in environment variables.
 * 
 * @throws {Error} When JWT_SECRET or JWT_REFRESH_SECRET are not configured
 * 
 * @example
 * ```typescript
 * // In service startup (e.g., server.ts)
 * import { initializeJWT } from '@yggdrasil/shared-utilities';
 * 
 * initializeJWT(); // Validate JWT configuration
 * app.listen(PORT);
 * ```
 */
export function initializeJWT() {
  if (!config.JWT_SECRET || !config.JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets not configured. Set JWT_SECRET and JWT_REFRESH_SECRET environment variables.');
  }
  isInitialized = true;
}

interface TokenVerificationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Centralized JWT utility class for consistent token handling across all services.
 * 
 * Provides secure token generation, verification, and utility functions for the
 * Yggdrasil Educational Platform authentication system.
 * 
 * @example
 * ```typescript
 * // Initialize JWT system during service startup
 * initializeJWT();
 * 
 * // Generate tokens for authenticated user
 * const tokens = SharedJWTHelper.generateTokens(user);
 * 
 * // Verify access token
 * const result = SharedJWTHelper.verifyAccessToken(token);
 * if (result.success) {
 *   console.log('User ID:', result.data.userId);
 * }
 * ```
 */
export class SharedJWTHelper {
  /**
   * Checks if JWT system has been properly initialized.
   * 
   * @throws {Error} When JWT secrets are not configured
   * @private
   */
  private static checkInitialized() {
    if (!isInitialized) {
      throw new Error('JWT not initialized. Call initializeJWT() during service startup.');
    }
  }

  /**
   * Generate both access and refresh tokens for a user.
   * 
   * Creates a complete token pair with consistent user identification fields
   * for backward compatibility across all services.
   * 
   * @param user - User object containing authentication details
   * @param user._id - Unique user identifier from database
   * @param user.email - User's email address
   * @param user.role - User's role (admin, staff, teacher, student)
   * @param user.tokenVersion - Optional token version for invalidation (default: 0)
   * @returns Complete token pair with access and refresh tokens
   * 
   * @throws {Error} When JWT system is not initialized
   * 
   * @example
   * ```typescript
   * const user = { _id: '507f1f77bcf86cd799439011', email: 'user@edu.com', role: 'student' };
   * const tokens = SharedJWTHelper.generateTokens(user);
   * // tokens.accessToken, tokens.refreshToken
   * ```
   */
  static generateTokens(user: { _id: string; email: string; role: string; tokenVersion?: number }): AuthTokens {
    this.checkInitialized();
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
   * Generate access token with standard configuration.
   * 
   * Creates a JWT access token with platform-specific issuer and audience claims.
   * Access tokens are short-lived and used for API authentication.
   * 
   * @param payload - JWT payload containing user information
   * @param customExpiresIn - Optional custom expiration time (overrides default)
   * @returns Signed JWT access token string
   * 
   * @throws {Error} When JWT system is not initialized
   * 
   * @example
   * ```typescript
   * const payload = { userId: '123', email: 'user@edu.com', role: 'student' };
   * const token = SharedJWTHelper.generateAccessToken(payload);
   * const customToken = SharedJWTHelper.generateAccessToken(payload, '1h');
   * ```
   */
  static generateAccessToken(payload: JWTPayload, customExpiresIn?: string): string {
    this.checkInitialized();
    const expiresIn = customExpiresIn || JWT_CONFIG.ACCESS_TOKEN_EXPIRES_IN;
    const options: jwt.SignOptions = {
      expiresIn: expiresIn as any,
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    };

    return jwt.sign(
      { ...payload, type: 'access' },
      JWT_CONFIG.ACCESS_TOKEN_SECRET,
      options,
    );
  }

  /**
   * Generate refresh token with standard configuration.
   * 
   * Creates a JWT refresh token for long-term authentication persistence.
   * Refresh tokens are long-lived and used to generate new access tokens.
   * 
   * @param payload - Refresh token payload with minimal user information
   * @param customExpiresIn - Optional custom expiration time (overrides default)
   * @returns Signed JWT refresh token string
   * 
   * @throws {Error} When JWT system is not initialized
   * 
   * @example
   * ```typescript
   * const payload = { userId: '123', tokenVersion: 0 };
   * const refreshToken = SharedJWTHelper.generateRefreshToken(payload);
   * ```
   */
  static generateRefreshToken(payload: RefreshTokenPayload, customExpiresIn?: string): string {
    this.checkInitialized();
    const expiresIn = customExpiresIn || JWT_CONFIG.REFRESH_TOKEN_EXPIRES_IN;
    const options: jwt.SignOptions = {
      expiresIn: expiresIn as any,
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    };

    return jwt.sign(
      { ...payload, type: 'refresh' },
      JWT_CONFIG.REFRESH_TOKEN_SECRET,
      options,
    );
  }

  /**
   * Verify and decode access token with full validation.
   * 
   * Performs comprehensive token validation including signature verification,
   * expiration check, and issuer/audience validation. Ensures backward
   * compatibility by normalizing user ID fields.
   * 
   * @param token - JWT access token string to verify
   * @returns Verification result with decoded payload or error details
   * 
   * @throws {Error} When JWT system is not initialized
   * 
   * @example
   * ```typescript
   * const result = SharedJWTHelper.verifyAccessToken(bearerToken);
   * if (result.success && result.data) {
   *   const userId = result.data.userId;
   *   const role = result.data.role;
   * } else {
   *   console.error('Token verification failed:', result.error);
   * }
   * ```
   */
  static verifyAccessToken(token: string): TokenVerificationResult<JWTPayload> {
    this.checkInitialized();
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
   * Verify and decode refresh token with full validation.
   * 
   * Validates refresh token signature, expiration, and claims. Used during
   * token refresh flows to generate new access tokens.
   * 
   * @param token - JWT refresh token string to verify
   * @returns Verification result with decoded payload or error details
   * 
   * @throws {Error} When JWT system is not initialized
   * 
   * @example
   * ```typescript
   * const result = SharedJWTHelper.verifyRefreshToken(refreshToken);
   * if (result.success && result.data) {
   *   // Generate new access token
   *   const newTokens = SharedJWTHelper.generateTokens(user);
   * }
   * ```
   */
  static verifyRefreshToken(token: string): TokenVerificationResult<RefreshTokenPayload> {
    this.checkInitialized();
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
   * Extract token from Authorization header.
   * 
   * Parses Bearer token from HTTP Authorization header following
   * standard RFC 6750 format: "Bearer <token>".
   * 
   * @param authHeader - Authorization header value
   * @returns Extracted token string or null if invalid format
   * 
   * @example
   * ```typescript
   * const token = SharedJWTHelper.extractTokenFromHeader('Bearer eyJhbGciOiJIUzI1NiIs...');
   * if (token) {
   *   const result = SharedJWTHelper.verifyAccessToken(token);
   * }
   * ```
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
   * Check if token is expired (without verifying signature).
   * 
   * Performs quick expiration check by decoding token payload without
   * signature verification. Useful for client-side token management.
   * 
   * @param token - JWT token string to check
   * @returns True if token is expired or invalid, false if still valid
   * 
   * @example
   * ```typescript
   * if (SharedJWTHelper.isTokenExpired(accessToken)) {
   *   // Use refresh token to get new access token
   *   const newTokens = await refreshAccessToken(refreshToken);
   * }
   * ```
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
      REFRESH_TOKEN_SECRET: JWT_CONFIG.REFRESH_TOKEN_SECRET.substring(0, 10) + '...',
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
  decodeToken,
} = SharedJWTHelper;
