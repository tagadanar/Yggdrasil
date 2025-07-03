// Path: packages/api-services/auth-service/__tests__/services/AuthService.test.ts
import { AuthService } from '../../src/services/AuthService';
import { UserModel } from '../../../../database-schemas/src';
import { AuthHelper } from '../../../../shared-utilities/src';

describe('AuthService', () => {
  const validUserData = {
    email: 'test@example.com',
    password: 'Password123!',
    role: 'student' as const,
    profile: {
      firstName: 'Test',
      lastName: 'User',
    },
  };

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await AuthService.register(validUserData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.email).toBe(validUserData.email);
      expect(result.user!.role).toBe(validUserData.role);
      expect(result.tokens).toBeDefined();
      expect(result.tokens!.accessToken).toBeDefined();
      expect(result.tokens!.refreshToken).toBeDefined();

      // Verify user was saved to database
      const savedUser = await UserModel.findByEmail(validUserData.email);
      expect(savedUser).toBeTruthy();
      expect(savedUser!.email).toBe(validUserData.email);
    });

    it('should hash the password before saving', async () => {
      await AuthService.register(validUserData);

      const savedUser = await UserModel.findByEmail(validUserData.email);
      expect(savedUser!.password).not.toBe(validUserData.password);
      expect(savedUser!.password.length).toBeGreaterThan(50); // bcrypt hash length
    });

    it('should fail when email already exists', async () => {
      await AuthService.register(validUserData);

      const result = await AuthService.register(validUserData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should fail with invalid email format', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const result = await AuthService.register(invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    it('should fail with weak password', async () => {
      const invalidData = { ...validUserData, password: 'weak' };

      const result = await AuthService.register(invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must');
    });

    it('should fail with invalid role', async () => {
      const invalidData = { ...validUserData, role: 'invalid' as any };

      const result = await AuthService.register(invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('role');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user
      await AuthService.register(validUserData);
    });

    it('should login with valid credentials', async () => {
      const result = await AuthService.login(validUserData.email, validUserData.password);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.email).toBe(validUserData.email);
      expect(result.tokens).toBeDefined();
      expect(result.tokens!.accessToken).toBeDefined();
      expect(result.tokens!.refreshToken).toBeDefined();

      // Check that lastLogin was updated
      const user = await UserModel.findByEmail(validUserData.email);
      expect(user!.lastLogin).toBeDefined();
    });

    it('should fail with incorrect email', async () => {
      const result = await AuthService.login('wrong@example.com', validUserData.password);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    it('should fail with incorrect password', async () => {
      const result = await AuthService.login(validUserData.email, 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    it('should fail with inactive user', async () => {
      const user = await UserModel.findByEmail(validUserData.email);
      await user!.deactivate();

      const result = await AuthService.login(validUserData.email, validUserData.password);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account is inactive');
    });

    it('should normalize email before login', async () => {
      const result = await AuthService.login('TEST@EXAMPLE.COM', validUserData.password);

      expect(result.success).toBe(true);
      expect(result.user!.email).toBe(validUserData.email);
    });
  });

  describe('refreshToken', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const registerResult = await AuthService.register(validUserData);
      refreshToken = registerResult.tokens!.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const result = await AuthService.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.accessToken).not.toBe(refreshToken);
    });

    it('should fail with invalid refresh token', async () => {
      const result = await AuthService.refreshToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
    });

    it('should fail with expired refresh token', async () => {
      // Create an expired token
      const expiredToken = AuthHelper.generateRefreshToken({
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'student'
      });

      // Mock jwt.verify to throw expired error
      jest.spyOn(AuthHelper, 'verifyRefreshToken').mockImplementationOnce(() => {
        throw new Error('jwt expired');
      });

      const result = await AuthService.refreshToken(expiredToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');

      // Restore mock
      jest.restoreAllMocks();
    });
  });

  describe('validateAccessToken', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      const registerResult = await AuthService.register(validUserData);
      accessToken = registerResult.tokens!.accessToken;
      userId = (registerResult.user!._id as any).toString();
    });

    it('should validate correct access token', async () => {
      const result = await AuthService.validateAccessToken(accessToken);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect((result.user!._id as any).toString()).toBe(userId);
      expect(result.user!.email).toBe(validUserData.email);
    });

    it('should fail with invalid access token', async () => {
      const result = await AuthService.validateAccessToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid access token');
    });

    it('should fail when user no longer exists', async () => {
      await UserModel.findByIdAndDelete(userId);

      const result = await AuthService.validateAccessToken(accessToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    it('should fail when user is inactive', async () => {
      const user = await UserModel.findById(userId);
      await user!.deactivate();

      const result = await AuthService.validateAccessToken(accessToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account is inactive');
    });
  });

  describe('forgotPassword', () => {
    beforeEach(async () => {
      await AuthService.register(validUserData);
    });

    it('should generate password reset token for valid email', async () => {
      const result = await AuthService.forgotPassword(validUserData.email);

      expect(result.success).toBe(true);
      expect(result.resetToken).toBeDefined();
      expect(typeof result.resetToken).toBe('string');
    });

    it('should fail silently for non-existent email (security)', async () => {
      const result = await AuthService.forgotPassword('nonexistent@example.com');

      // Should still return success to prevent email enumeration
      expect(result.success).toBe(true);
      expect(result.resetToken).toBeUndefined();
    });

    it('should fail for inactive user', async () => {
      const user = await UserModel.findByEmail(validUserData.email);
      await user!.deactivate();

      const result = await AuthService.forgotPassword(validUserData.email);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account is inactive');
    });
  });

  describe('resetPassword', () => {
    let resetToken: string;

    beforeEach(async () => {
      await AuthService.register(validUserData);
      const forgotResult = await AuthService.forgotPassword(validUserData.email);
      resetToken = forgotResult.resetToken!;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123!';
      const result = await AuthService.resetPassword(resetToken, newPassword);

      expect(result.success).toBe(true);

      // Verify can login with new password
      const loginResult = await AuthService.login(validUserData.email, newPassword);
      expect(loginResult.success).toBe(true);

      // Verify cannot login with old password
      const oldLoginResult = await AuthService.login(validUserData.email, validUserData.password);
      expect(oldLoginResult.success).toBe(false);
    });

    it('should fail with invalid reset token', async () => {
      const result = await AuthService.resetPassword('invalid-token', 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid reset token');
    });

    it('should fail with weak new password', async () => {
      const result = await AuthService.resetPassword(resetToken, 'weak');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must');
    });
  });

  describe('logout', () => {
    it('should logout successfully (token invalidation handled by client)', async () => {
      // Since we're using stateless JWT, logout is primarily client-side
      // This test ensures the method exists and works
      const result = await AuthService.logout();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Logged out successfully');
    });
  });
});