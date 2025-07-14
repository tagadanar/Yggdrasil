// __tests__/unit/AuthService.test.ts
// Unit tests for AuthService business logic

import { AuthService } from '../../src/services/AuthService';
import { UserModel } from '@yggdrasil/database-schemas';
import { JWTHelper } from '../../src/utils/JWTHelper';
import { ERROR_MESSAGES, UserRole } from '@yggdrasil/shared-utilities';

// Mock dependencies
jest.mock('@yggdrasil/database-schemas');
jest.mock('../../src/utils/JWTHelper');

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockJWTHelper = JWTHelper as jest.Mocked<typeof JWTHelper>;

describe('AuthService', () => {
  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    role: 'student',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
    },
    isActive: true,
    lastLogin: new Date(),
    tokenVersion: 0,
    save: jest.fn(),
    comparePassword: jest.fn(),
    incrementTokenVersion: jest.fn(),
    toJSON: jest.fn().mockReturnValue({
      _id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      role: 'student',
      profile: { firstName: 'John', lastName: 'Doe' },
      isActive: true,
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJWTHelper.generateTokens.mockReturnValue(mockTokens);
  });

  describe('register', () => {
    const validRegisterData = {
      email: 'newuser@example.com',
      password: 'Password123!',
      role: 'student' as const,
      profile: {
        firstName: 'New',
        lastName: 'User',
      },
    };

    it('should successfully register a new user', async () => {
      // Mock no existing user
      mockUserModel.findByEmail.mockResolvedValue(null);
      
      // Mock successful user creation
      const savedUser = { ...mockUser, save: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.prototype.save = jest.fn().mockResolvedValue(mockUser);
      
      // Mock constructor
      (mockUserModel as any).mockImplementation(() => savedUser);

      const result = await AuthService.register(validRegisterData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.tokens).toBe(mockTokens);
      expect(result.error).toBeUndefined();

      // Verify user creation
      expect(mockUserModel).toHaveBeenCalledWith({
        email: validRegisterData.email.toLowerCase(),
        password: validRegisterData.password,
        role: validRegisterData.role,
        profile: validRegisterData.profile,
        isActive: true,
      });

      // Verify token generation
      expect(mockJWTHelper.generateTokens).toHaveBeenCalledWith({
        _id: mockUser._id.toString(),
        email: mockUser.email,
        role: mockUser.role,
        tokenVersion: mockUser.tokenVersion,
      });
    });

    it('should reject registration when email already exists', async () => {
      mockUserModel.findByEmail.mockResolvedValue(mockUser as any);

      const result = await AuthService.register(validRegisterData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      expect(result.user).toBeUndefined();
      expect(result.tokens).toBeUndefined();
    });

    it('should handle database errors during registration', async () => {
      mockUserModel.findByEmail.mockResolvedValue(null);
      mockUserModel.prototype.save = jest.fn().mockRejectedValue(new Error('Database error'));
      (mockUserModel as any).mockImplementation(() => ({ save: mockUserModel.prototype.save }));

      const result = await AuthService.register(validRegisterData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
    });

    it('should convert email to lowercase during registration', async () => {
      mockUserModel.findByEmail.mockResolvedValue(null);
      const savedUser = { ...mockUser, save: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.prototype.save = jest.fn().mockResolvedValue(mockUser);
      (mockUserModel as any).mockImplementation(() => savedUser);

      const dataWithUppercaseEmail = {
        ...validRegisterData,
        email: 'NEWUSER@EXAMPLE.COM',
      };

      await AuthService.register(dataWithUppercaseEmail);

      expect(mockUserModel.findByEmail).toHaveBeenCalledWith('NEWUSER@EXAMPLE.COM');
      expect(mockUserModel).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
        })
      );
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should successfully login with valid credentials', async () => {
      mockUserModel.findByEmail.mockResolvedValue(mockUser as any);
      mockUser.comparePassword.mockResolvedValue(true);
      mockUserModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUser);

      const result = await AuthService.login(validLoginData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.tokens).toBe(mockTokens);
      expect(result.error).toBeUndefined();

      // Verify lastLogin was updated using findByIdAndUpdate
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        { lastLogin: expect.any(Date) }
      );
    });

    it('should reject login for non-existent user', async () => {
      mockUserModel.findByEmail.mockResolvedValue(null);

      const result = await AuthService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
      expect(result.user).toBeUndefined();
      expect(result.tokens).toBeUndefined();
    });

    it('should reject login for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserModel.findByEmail.mockResolvedValue(inactiveUser as any);

      const result = await AuthService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.ACCOUNT_LOCKED);
      expect(result.user).toBeUndefined();
      expect(result.tokens).toBeUndefined();
    });

    it('should reject login with incorrect password', async () => {
      mockUserModel.findByEmail.mockResolvedValue(mockUser as any);
      mockUser.comparePassword.mockResolvedValue(false);

      const result = await AuthService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.INVALID_CREDENTIALS);
      expect(result.user).toBeUndefined();
      expect(result.tokens).toBeUndefined();
    });

    it('should handle database errors during login', async () => {
      mockUserModel.findByEmail.mockRejectedValue(new Error('Database error'));

      const result = await AuthService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
    });
  });

  describe('refreshTokens', () => {
    const validRefreshToken = 'valid-refresh-token';

    it('should successfully refresh tokens with valid refresh token', async () => {
      const tokenPayload = {
        id: mockUser._id,
        tokenVersion: 0,
      };

      mockJWTHelper.verifyRefreshToken.mockReturnValue({
        success: true,
        data: tokenPayload,
      });

      mockUserModel.findById.mockResolvedValue(mockUser as any);

      const result = await AuthService.refreshTokens(validRefreshToken);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.tokens).toBe(mockTokens);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid refresh token', async () => {
      mockJWTHelper.verifyRefreshToken.mockReturnValue({
        success: false,
        error: 'Invalid token',
      });

      const result = await AuthService.refreshTokens('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.TOKEN_INVALID);
      expect(result.user).toBeUndefined();
      expect(result.tokens).toBeUndefined();
    });

    it('should reject refresh token for non-existent user', async () => {
      const tokenPayload = {
        id: 'non-existent-id',
        tokenVersion: 0,
      };

      mockJWTHelper.verifyRefreshToken.mockReturnValue({
        success: true,
        data: tokenPayload,
      });

      mockUserModel.findById.mockResolvedValue(null);

      const result = await AuthService.refreshTokens(validRefreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.USER_NOT_FOUND);
    });

    it('should reject refresh token for inactive user', async () => {
      const tokenPayload = {
        id: mockUser._id,
        tokenVersion: 0,
      };

      mockJWTHelper.verifyRefreshToken.mockReturnValue({
        success: true,
        data: tokenPayload,
      });

      const inactiveUser = { ...mockUser, isActive: false };
      mockUserModel.findById.mockResolvedValue(inactiveUser as any);

      const result = await AuthService.refreshTokens(validRefreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.ACCOUNT_LOCKED);
    });

    it('should reject refresh token with mismatched token version', async () => {
      const tokenPayload = {
        id: mockUser._id,
        tokenVersion: 0,
      };

      mockJWTHelper.verifyRefreshToken.mockReturnValue({
        success: true,
        data: tokenPayload,
      });

      const userWithDifferentVersion = { ...mockUser, tokenVersion: 1 };
      mockUserModel.findById.mockResolvedValue(userWithDifferentVersion as any);

      const result = await AuthService.refreshTokens(validRefreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.TOKEN_INVALID);
    });

    it('should handle errors during token refresh', async () => {
      mockJWTHelper.verifyRefreshToken.mockImplementation(() => {
        throw new Error('JWT error');
      });

      const result = await AuthService.refreshTokens(validRefreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.TOKEN_INVALID);
    });
  });

  describe('logout', () => {
    const userId = '507f1f77bcf86cd799439011';

    it('should successfully logout user', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser as any);

      const result = await AuthService.logout(userId);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockUser.incrementTokenVersion).toHaveBeenCalled();
    });

    it('should handle logout for non-existent user', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const result = await AuthService.logout(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.USER_NOT_FOUND);
    });

    it('should handle database errors during logout', async () => {
      mockUserModel.findById.mockRejectedValue(new Error('Database error'));

      const result = await AuthService.logout(userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
    });
  });

  describe('verifyUser', () => {
    const validAccessToken = 'valid-access-token';

    it('should successfully verify user with valid token', async () => {
      const tokenPayload = {
        id: mockUser._id,
        email: mockUser.email,
        role: mockUser.role as UserRole,
        tokenVersion: 0,
      };

      mockJWTHelper.verifyAccessToken.mockReturnValue({
        success: true,
        data: tokenPayload,
      });

      mockUserModel.findById.mockResolvedValue(mockUser as any);

      const result = await AuthService.verifyUser(validAccessToken);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid access token', async () => {
      mockJWTHelper.verifyAccessToken.mockReturnValue({
        success: false,
        error: 'Invalid token',
      });

      const result = await AuthService.verifyUser('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.TOKEN_INVALID);
      expect(result.user).toBeUndefined();
    });

    it('should reject token for non-existent user', async () => {
      const tokenPayload = {
        id: 'non-existent-id',
        email: 'test@example.com',
        role: 'student' as UserRole,
        tokenVersion: 0,
      };

      mockJWTHelper.verifyAccessToken.mockReturnValue({
        success: true,
        data: tokenPayload,
      });

      mockUserModel.findById.mockResolvedValue(null);

      const result = await AuthService.verifyUser(validAccessToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.USER_NOT_FOUND);
    });

    it('should reject token for inactive user', async () => {
      const tokenPayload = {
        id: mockUser._id,
        email: mockUser.email,
        role: mockUser.role as UserRole,
        tokenVersion: 0,
      };

      mockJWTHelper.verifyAccessToken.mockReturnValue({
        success: true,
        data: tokenPayload,
      });

      const inactiveUser = { ...mockUser, isActive: false };
      mockUserModel.findById.mockResolvedValue(inactiveUser as any);

      const result = await AuthService.verifyUser(validAccessToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.ACCOUNT_LOCKED);
    });

    it('should handle errors during user verification', async () => {
      mockJWTHelper.verifyAccessToken.mockImplementation(() => {
        throw new Error('JWT error');
      });

      const result = await AuthService.verifyUser(validAccessToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe(ERROR_MESSAGES.TOKEN_INVALID);
    });
  });

  describe('userDocumentToUser', () => {
    it('should convert UserDocument to User object', () => {
      const mockUserDoc = {
        toJSON: jest.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'test@example.com',
          role: 'student',
          profile: { firstName: 'John', lastName: 'Doe' },
        }),
      };

      // Access private method through type assertion
      const result = (AuthService as any).userDocumentToUser(mockUserDoc);

      expect(mockUserDoc.toJSON).toHaveBeenCalled();
      expect(result).toEqual({
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'student',
        profile: { firstName: 'John', lastName: 'Doe' },
      });
    });
  });
});