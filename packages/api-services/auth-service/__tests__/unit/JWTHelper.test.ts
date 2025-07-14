// __tests__/unit/JWTHelper.test.ts
// Unit tests for JWT token operations

import jwt from 'jsonwebtoken';
import { JWTHelper } from '../../src/utils/JWTHelper';

describe('JWTHelper', () => {
  // Test data
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    role: 'student',
  };

  const validPayload = {
    id: mockUser._id,
    email: mockUser.email,
    role: mockUser.role as any,
    tokenVersion: 0,
  };

  beforeEach(() => {
    // Reset environment variables
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = JWTHelper.generateTokens(mockUser);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('should generate tokens with correct payload structure', () => {
      const tokens = JWTHelper.generateTokens(mockUser);

      // Decode without verification to check payload
      const accessDecoded = jwt.decode(tokens.accessToken) as any;
      const refreshDecoded = jwt.decode(tokens.refreshToken) as any;

      expect(accessDecoded.id).toBe(mockUser._id);
      expect(accessDecoded.email).toBe(mockUser.email);
      expect(accessDecoded.role).toBe(mockUser.role);

      expect(refreshDecoded.id).toBe(mockUser._id);
      expect(refreshDecoded.tokenVersion).toBe(0);
    });

    it('should generate tokens with correct issuer and audience', () => {
      const tokens = JWTHelper.generateTokens(mockUser);

      const accessDecoded = jwt.decode(tokens.accessToken) as any;
      const refreshDecoded = jwt.decode(tokens.refreshToken) as any;

      expect(accessDecoded.iss).toBe('yggdrasil-auth-service');
      expect(accessDecoded.aud).toBe('yggdrasil-platform');
      expect(refreshDecoded.iss).toBe('yggdrasil-auth-service');
      expect(refreshDecoded.aud).toBe('yggdrasil-platform');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token successfully', () => {
      const token = JWTHelper.generateAccessToken(validPayload);
      const result = JWTHelper.verifyAccessToken(token);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(validPayload.id);
      expect(result.data!.email).toBe(validPayload.email);
      expect(result.data!.role).toBe(validPayload.role);
    });

    it('should reject token with wrong secret', () => {
      // Generate token with different secret
      const wrongToken = jwt.sign(validPayload, 'wrong-secret');
      const result = JWTHelper.verifyAccessToken(wrongToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired token', () => {
      // Use isolated mock within this test
      const jwtSpy = jest.spyOn(jwt, 'verify');
      jwtSpy.mockImplementation(() => {
        const error = new jwt.JsonWebTokenError('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = JWTHelper.verifyAccessToken('expired-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token: jwt expired');

      jwtSpy.mockRestore();
    });

    it('should reject malformed token', () => {
      const result = JWTHelper.verifyAccessToken('not.a.valid.jwt');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty token', () => {
      const result = JWTHelper.verifyAccessToken('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject token with wrong audience', () => {
      const wrongAudienceToken = jwt.sign(
        validPayload,
        process.env.JWT_SECRET!,
        { audience: 'wrong-audience', issuer: 'yggdrasil-auth-service' }
      );
      const result = JWTHelper.verifyAccessToken(wrongAudienceToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyRefreshToken', () => {
    const refreshPayload = { id: mockUser._id, tokenVersion: 0 };

    it('should verify valid refresh token successfully', () => {
      const token = JWTHelper.generateRefreshToken(refreshPayload);
      const result = JWTHelper.verifyRefreshToken(token);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(refreshPayload.id);
      expect(result.data!.tokenVersion).toBe(refreshPayload.tokenVersion);
    });

    it('should reject refresh token with wrong secret', () => {
      const wrongToken = jwt.sign(refreshPayload, 'wrong-refresh-secret');
      const result = JWTHelper.verifyRefreshToken(wrongToken);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired refresh token', () => {
      // Use isolated mock within this test
      const jwtSpy = jest.spyOn(jwt, 'verify');
      jwtSpy.mockImplementation(() => {
        const error = new jwt.JsonWebTokenError('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = JWTHelper.verifyRefreshToken('expired-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token: jwt expired');

      jwtSpy.mockRestore();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const header = `Bearer ${token}`;
      const result = JWTHelper.extractTokenFromHeader(header);

      expect(result).toBe(token);
    });

    it('should return null for missing header', () => {
      const result = JWTHelper.extractTokenFromHeader(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty header', () => {
      const result = JWTHelper.extractTokenFromHeader('');
      expect(result).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      const result = JWTHelper.extractTokenFromHeader('Basic dGVzdA==');
      expect(result).toBeNull();
    });

    it('should return null for Bearer header without token', () => {
      const result = JWTHelper.extractTokenFromHeader('Bearer');
      expect(result).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const result = JWTHelper.extractTokenFromHeader('Bearer ');
      expect(result).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid unexpired token', () => {
      const token = jwt.sign(
        { exp: Math.floor(Date.now() / 1000) + 3600 }, // 1 hour from now
        'any-secret'
      );
      const result = JWTHelper.isTokenExpired(token);

      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const token = jwt.sign(
        { exp: Math.floor(Date.now() / 1000) - 3600 }, // 1 hour ago
        'any-secret'
      );
      const result = JWTHelper.isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should return true for token without expiration', () => {
      const token = jwt.sign({ sub: 'test' }, 'any-secret');
      const result = JWTHelper.isTokenExpired(token);

      expect(result).toBe(true);
    });

    it('should return true for malformed token', () => {
      const result = JWTHelper.isTokenExpired('not.a.token');
      expect(result).toBe(true);
    });

    it('should return true for empty token', () => {
      const result = JWTHelper.isTokenExpired('');
      expect(result).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return correct expiration date for valid token', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = jwt.sign({ exp: futureTime }, 'any-secret');
      const result = JWTHelper.getTokenExpiration(token);

      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBe(futureTime * 1000);
    });

    it('should return null for token without expiration', () => {
      const token = jwt.sign({ sub: 'test' }, 'any-secret');
      const result = JWTHelper.getTokenExpiration(token);

      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      const result = JWTHelper.getTokenExpiration('not.a.token');
      expect(result).toBeNull();
    });

    it('should return null for empty token', () => {
      const result = JWTHelper.getTokenExpiration('');
      expect(result).toBeNull();
    });
  });
});