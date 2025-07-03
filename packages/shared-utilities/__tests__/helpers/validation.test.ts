// Path: packages/shared-utilities/__tests__/helpers/validation.test.ts
import { ValidationHelper } from '../../src/helpers/validation';
import { z } from 'zod';

describe('ValidationHelper', () => {
  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(ValidationHelper.isValidEmail('test@example.com')).toBe(true);
      expect(ValidationHelper.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(ValidationHelper.isValidEmail('user+tag@domain.org')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(ValidationHelper.isValidEmail('invalid-email')).toBe(false);
      expect(ValidationHelper.isValidEmail('test@')).toBe(false);
      expect(ValidationHelper.isValidEmail('@domain.com')).toBe(false);
      expect(ValidationHelper.isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should return valid for strong passwords', () => {
      const result = ValidationHelper.isValidPassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid for weak passwords', () => {
      const result = ValidationHelper.isValidPassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should identify missing lowercase letters', () => {
      const result = ValidationHelper.isValidPassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should identify missing uppercase letters', () => {
      const result = ValidationHelper.isValidPassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should identify missing numbers', () => {
      const result = ValidationHelper.isValidPassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should identify missing special characters', () => {
      const result = ValidationHelper.isValidPassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should identify too short passwords', () => {
      const result = ValidationHelper.isValidPassword('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should return true for valid phone numbers', () => {
      expect(ValidationHelper.isValidPhoneNumber('+33612345678')).toBe(true);
      expect(ValidationHelper.isValidPhoneNumber('0612345678')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(ValidationHelper.isValidPhoneNumber('123')).toBe(false);
      expect(ValidationHelper.isValidPhoneNumber('abc123')).toBe(false);
      expect(ValidationHelper.isValidPhoneNumber('')).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML characters', () => {
      const result = ValidationHelper.sanitizeHtml('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should handle empty string', () => {
      expect(ValidationHelper.sanitizeHtml('')).toBe('');
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(ValidationHelper.isValidUrl('https://example.com')).toBe(true);
      expect(ValidationHelper.isValidUrl('http://subdomain.example.com/path')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(ValidationHelper.isValidUrl('not-a-url')).toBe(false);
      expect(ValidationHelper.isValidUrl('ftp://example.com')).toBe(false);
      expect(ValidationHelper.isValidUrl('example.com')).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    it('should return true when size is within limit', () => {
      expect(ValidationHelper.isValidFileSize(1024, 2048)).toBe(true);
      expect(ValidationHelper.isValidFileSize(2048, 2048)).toBe(true);
    });

    it('should return false when size exceeds limit', () => {
      expect(ValidationHelper.isValidFileSize(3072, 2048)).toBe(false);
    });
  });

  describe('isValidFileType', () => {
    it('should return true for allowed file types', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      expect(ValidationHelper.isValidFileType('image/jpeg', allowedTypes)).toBe(true);
      expect(ValidationHelper.isValidFileType('image/png', allowedTypes)).toBe(true);
    });

    it('should return false for disallowed file types', () => {
      const allowedTypes = ['image/jpeg', 'image/png'];
      expect(ValidationHelper.isValidFileType('image/gif', allowedTypes)).toBe(false);
      expect(ValidationHelper.isValidFileType('application/pdf', allowedTypes)).toBe(false);
    });
  });

  describe('isValidDateRange', () => {
    it('should return true when end date is after start date', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-02');
      expect(ValidationHelper.isValidDateRange(startDate, endDate)).toBe(true);
    });

    it('should return false when end date is before start date', () => {
      const startDate = new Date('2023-01-02');
      const endDate = new Date('2023-01-01');
      expect(ValidationHelper.isValidDateRange(startDate, endDate)).toBe(false);
    });

    it('should return false when dates are equal', () => {
      const date = new Date('2023-01-01');
      expect(ValidationHelper.isValidDateRange(date, date)).toBe(false);
    });
  });

  describe('validateSchema', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().min(0),
    });

    it('should return success for valid data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      };

      const result = ValidationHelper.validateSchema(testSchema, validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data', () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        age: -1,
      };

      const result = ValidationHelper.validateSchema(testSchema, invalidData);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('normalizeEmail', () => {
    it('should convert email to lowercase', () => {
      expect(ValidationHelper.normalizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should handle already normalized emails', () => {
      expect(ValidationHelper.normalizeEmail('test@example.com')).toBe('test@example.com');
    });
  });

  describe('isValidObjectId', () => {
    it('should return true for valid MongoDB ObjectIds', () => {
      expect(ValidationHelper.isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(ValidationHelper.isValidObjectId('5f8a7c2b4f2c3a1d6e8b9c0d')).toBe(true);
    });

    it('should return false for invalid ObjectIds', () => {
      expect(ValidationHelper.isValidObjectId('invalid-id')).toBe(false);
      expect(ValidationHelper.isValidObjectId('123')).toBe(false);
      expect(ValidationHelper.isValidObjectId('')).toBe(false);
    });
  });

  describe('validatePagination', () => {
    it('should return valid pagination with defaults', () => {
      const result = ValidationHelper.validatePagination();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
    });

    it('should handle custom pagination values', () => {
      const result = ValidationHelper.validatePagination(2, 20);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(20);
    });

    it('should enforce minimum values', () => {
      const result = ValidationHelper.validatePagination(0, 0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1); // Minimum limit is 1
    });

    it('should enforce maximum limit', () => {
      const result = ValidationHelper.validatePagination(1, 200);
      expect(result.limit).toBe(100);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should escape regex special characters', () => {
      const result = ValidationHelper.sanitizeSearchQuery('test.*query');
      expect(result).toBe('test\\.\\*query');
    });

    it('should trim whitespace', () => {
      const result = ValidationHelper.sanitizeSearchQuery('  test query  ');
      expect(result).toBe('test query');
    });

    it('should handle empty or undefined input', () => {
      expect(ValidationHelper.sanitizeSearchQuery('')).toBe('');
      expect(ValidationHelper.sanitizeSearchQuery(undefined)).toBe('');
    });
  });

  describe('validateIdArray', () => {
    it('should return valid ObjectIds from array', () => {
      const ids = ['507f1f77bcf86cd799439011', 'invalid-id', '5f8a7c2b4f2c3a1d6e8b9c0d'];
      const result = ValidationHelper.validateIdArray(ids);
      expect(result).toEqual(['507f1f77bcf86cd799439011', '5f8a7c2b4f2c3a1d6e8b9c0d']);
    });

    it('should return empty array for non-array input', () => {
      expect(ValidationHelper.validateIdArray('not-an-array' as any)).toEqual([]);
      expect(ValidationHelper.validateIdArray(null as any)).toEqual([]);
    });

    it('should filter out non-string values', () => {
      const ids = ['507f1f77bcf86cd799439011', 123, null, undefined];
      const result = ValidationHelper.validateIdArray(ids as any);
      expect(result).toEqual(['507f1f77bcf86cd799439011']);
    });
  });
});