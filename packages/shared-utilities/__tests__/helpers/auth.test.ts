// Path: packages/shared-utilities/__tests__/helpers/auth.test.ts
import { AuthHelper } from '../../src/helpers/auth';

describe('AuthHelper', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await AuthHelper.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123!';
      const hash1 = await AuthHelper.hashPassword(password);
      const hash2 = await AuthHelper.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123!';
      const hashedPassword = await AuthHelper.hashPassword(password);
      
      const isValid = await AuthHelper.comparePassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123!';
      const wrongPassword = 'wrongPassword123!';
      const hashedPassword = await AuthHelper.hashPassword(password);
      
      const isValid = await AuthHelper.comparePassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'student',
      };
      
      const token = AuthHelper.generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'student',
      };
      
      const token = AuthHelper.generateRefreshToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const payload = {
        id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'student',
      };
      
      const token = AuthHelper.generateAccessToken(payload);
      const decoded = AuthHelper.verifyAccessToken(token);
      
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        AuthHelper.verifyAccessToken(invalidToken);
      }).toThrow('Invalid or expired access token');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const authHeader = `Bearer ${token}`;
      
      const extracted = AuthHelper.extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(AuthHelper.extractTokenFromHeader('Token abc123')).toBeNull();
      expect(AuthHelper.extractTokenFromHeader('Bearer')).toBeNull();
      expect(AuthHelper.extractTokenFromHeader('')).toBeNull();
      expect(AuthHelper.extractTokenFromHeader(undefined)).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true when user has exact role', () => {
      expect(AuthHelper.hasRole('admin', 'admin')).toBe(true);
      expect(AuthHelper.hasRole('student', 'student')).toBe(true);
    });

    it('should return false when user does not have role', () => {
      expect(AuthHelper.hasRole('student', 'admin')).toBe(false);
      expect(AuthHelper.hasRole('teacher', 'student')).toBe(false);
    });

    it('should work with array of roles', () => {
      expect(AuthHelper.hasRole('admin', ['admin', 'staff'])).toBe(true);
      expect(AuthHelper.hasRole('staff', ['admin', 'staff'])).toBe(true);
      expect(AuthHelper.hasRole('student', ['admin', 'staff'])).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      expect(AuthHelper.isAdmin('admin')).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(AuthHelper.isAdmin('staff')).toBe(false);
      expect(AuthHelper.isAdmin('teacher')).toBe(false);
      expect(AuthHelper.isAdmin('student')).toBe(false);
    });
  });

  describe('isStaff', () => {
    it('should return true for admin and staff roles', () => {
      expect(AuthHelper.isStaff('admin')).toBe(true);
      expect(AuthHelper.isStaff('staff')).toBe(true);
    });

    it('should return false for non-staff roles', () => {
      expect(AuthHelper.isStaff('teacher')).toBe(false);
      expect(AuthHelper.isStaff('student')).toBe(false);
    });
  });

  describe('isTeacher', () => {
    it('should return true for admin, staff, and teacher roles', () => {
      expect(AuthHelper.isTeacher('admin')).toBe(true);
      expect(AuthHelper.isTeacher('staff')).toBe(true);
      expect(AuthHelper.isTeacher('teacher')).toBe(true);
    });

    it('should return false for student role', () => {
      expect(AuthHelper.isTeacher('student')).toBe(false);
    });
  });

  describe('generateSecureRandom', () => {
    it('should generate random string of default length', () => {
      const random = AuthHelper.generateSecureRandom();
      expect(random).toHaveLength(32);
      expect(typeof random).toBe('string');
    });

    it('should generate random string of specified length', () => {
      const random = AuthHelper.generateSecureRandom(16);
      expect(random).toHaveLength(16);
    });

    it('should generate different strings on multiple calls', () => {
      const random1 = AuthHelper.generateSecureRandom();
      const random2 = AuthHelper.generateSecureRandom();
      expect(random1).not.toBe(random2);
    });
  });
});