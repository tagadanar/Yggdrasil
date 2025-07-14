// __tests__/unit/ValidationHelper.test.ts
// Unit tests for validation helper functions

import { z } from 'zod';
import { ValidationHelper } from '../../src/helpers/validation';

describe('ValidationHelper', () => {
  describe('validate', () => {
    const testSchema = z.object({
      name: z.string().min(1, 'Name is required'),
      age: z.number().min(0, 'Age must be positive'),
      email: z.string().email('Invalid email'),
    });

    it('should return success for valid data', () => {
      const validData = {
        name: 'John Doe',
        age: 25,
        email: 'john@example.com',
      };

      const result = ValidationHelper.validate(testSchema, validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data', () => {
      const invalidData = {
        name: '',
        age: -5,
        email: 'not-an-email',
      };

      const result = ValidationHelper.validate(testSchema, invalidData);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBe(3);

      const errorFields = result.errors!.map(e => e.field);
      expect(errorFields).toContain('name');
      expect(errorFields).toContain('age');
      expect(errorFields).toContain('email');
    });

    it('should handle partial validation errors', () => {
      const partiallyInvalidData = {
        name: 'John',
        age: 25,
        email: 'invalid-email',
      };

      const result = ValidationHelper.validate(testSchema, partiallyInvalidData);

      expect(result.success).toBe(false);
      expect(result.errors!.length).toBe(1);
      expect(result.errors![0].field).toBe('email');
      expect(result.errors![0].message).toBe('Invalid email');
    });

    it('should handle nested object validation', () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            firstName: z.string().min(1),
          }),
        }),
      });

      const invalidNested = {
        user: {
          profile: {
            firstName: '',
          },
        },
      };

      const result = ValidationHelper.validate(nestedSchema, invalidNested);

      expect(result.success).toBe(false);
      expect(result.errors![0].field).toBe('user.profile.firstName');
    });

    it('should handle unknown validation errors gracefully', () => {
      // Create a schema that throws a non-ZodError
      const mockSchema = {
        parse: () => {
          throw new Error('Unknown error');
        },
      } as any;

      const result = ValidationHelper.validate(mockSchema, {});

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].field).toBe('unknown');
      expect(result.errors![0].message).toBe('Validation failed');
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
        'a@b.co',
      ];

      validEmails.forEach(email => {
        expect(ValidationHelper.isValidEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'missing@domain',
        'spaces @domain.com',
        'user@',
        '',
        'user@domain.',
      ];

      invalidEmails.forEach(email => {
        expect(ValidationHelper.isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('isValidPassword', () => {
    it('should return valid true for strong passwords', () => {
      const strongPasswords = [
        'Password123',
        'MyStr0ngP@ss',
        'ComplexPass1',
        'Abc123def',
      ];

      strongPasswords.forEach(password => {
        const result = ValidationHelper.isValidPassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject passwords that are too short', () => {
      const shortPasswords = ['Pass1', 'Abc1', ''];

      shortPasswords.forEach(password => {
        const result = ValidationHelper.isValidPassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters long');
      });
    });

    it('should reject passwords without lowercase letters', () => {
      const noLowercase = ['PASSWORD123', 'MYPASSWORD1', 'ALLCAPS123'];

      noLowercase.forEach(password => {
        const result = ValidationHelper.isValidPassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });
    });

    it('should reject passwords without uppercase letters', () => {
      const noUppercase = ['password123', 'mypassword1', 'alllower123'];

      noUppercase.forEach(password => {
        const result = ValidationHelper.isValidPassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });
    });

    it('should reject passwords without numbers', () => {
      const noNumbers = ['Password', 'MyPassword', 'NoNumbers'];

      noNumbers.forEach(password => {
        const result = ValidationHelper.isValidPassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });
    });

    it('should return multiple errors for weak passwords', () => {
      const weakPassword = 'WEAK'; // No lowercase, no numbers, too short
      const result = ValidationHelper.isValidPassword(weakPassword);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(ValidationHelper.sanitizeString('  hello  ')).toBe('hello');
      expect(ValidationHelper.sanitizeString('\ttest\n')).toBe('test');
    });

    it('should remove angle brackets and escape dangerous characters', () => {
      expect(ValidationHelper.sanitizeString('<script>alert()</script>')).toBe('scriptalert()&#x2F;script');
      expect(ValidationHelper.sanitizeString('Hello <world>')).toBe('Hello world');
    });

    it('should handle combined cleaning', () => {
      expect(ValidationHelper.sanitizeString('  <tag>content</tag>  ')).toBe('tagcontent&#x2F;tag');
    });

    it('should handle empty strings', () => {
      expect(ValidationHelper.sanitizeString('')).toBe('');
      expect(ValidationHelper.sanitizeString('   ')).toBe('');
    });

    it('should remove XSS attack vectors', () => {
      // Test javascript: protocol removal
      expect(ValidationHelper.sanitizeString('javascript:alert("xss")')).toBe('alert(&quot;xss&quot;)');
      
      // Test event handler removal
      expect(ValidationHelper.sanitizeString('onclick="alert(1)"')).toBe('&quot;alert(1)&quot;');
      
      // Test data: protocol removal
      expect(ValidationHelper.sanitizeString('data:text/html,<script>alert(1)</script>')).toBe('text&#x2F;html,scriptalert(1)&#x2F;script');
      
      // Test quote escaping
      expect(ValidationHelper.sanitizeString('Hello "world" and \'test\'')).toBe('Hello &quot;world&quot; and &#x27;test&#x27;');
      
      // Test ampersand escaping
      expect(ValidationHelper.sanitizeString('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should handle non-string input', () => {
      expect(ValidationHelper.sanitizeString(null as any)).toBe('');
      expect(ValidationHelper.sanitizeString(undefined as any)).toBe('');
      expect(ValidationHelper.sanitizeString(123 as any)).toBe('');
      expect(ValidationHelper.sanitizeString({} as any)).toBe('');
    });
  });

  describe('isValidObjectId', () => {
    it('should return true for valid MongoDB ObjectIds', () => {
      const validIds = [
        '507f1f77bcf86cd799439011',
        '123456789012345678901234',
        'aabbccddeeff001122334455',
      ];

      validIds.forEach(id => {
        expect(ValidationHelper.isValidObjectId(id)).toBe(true);
      });
    });

    it('should return false for invalid ObjectIds', () => {
      const invalidIds = [
        '507f1f77bcf86cd79943901',   // Too short
        '507f1f77bcf86cd7994390111', // Too long
        'invalid-id',                // Invalid characters
        '507f1f77bcf86cd79943901g',  // Invalid character 'g'
        '',                          // Empty
        '123',                       // Too short
      ];

      invalidIds.forEach(id => {
        expect(ValidationHelper.isValidObjectId(id)).toBe(false);
      });
    });
  });

  describe('validateFileUpload', () => {
    const defaultOptions = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    };

    it('should validate correct file uploads', () => {
      const validFile = {
        size: 1024 * 1024, // 1MB
        mimetype: 'image/jpeg',
      };

      const result = ValidationHelper.validateFileUpload(validFile, defaultOptions);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files that are too large', () => {
      const largeFile = {
        size: 10 * 1024 * 1024, // 10MB
        mimetype: 'image/jpeg',
      };

      const result = ValidationHelper.validateFileUpload(largeFile, defaultOptions);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size must be less than 5MB');
    });

    it('should reject files with disallowed types', () => {
      const invalidTypeFile = {
        size: 1024 * 1024,
        mimetype: 'application/exe',
      };

      const result = ValidationHelper.validateFileUpload(invalidTypeFile, defaultOptions);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File type application/exe is not allowed');
    });

    it('should return multiple errors for invalid files', () => {
      const invalidFile = {
        size: 10 * 1024 * 1024,
        mimetype: 'application/exe',
      };

      const result = ValidationHelper.validateFileUpload(invalidFile, defaultOptions);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('validatePagination', () => {
    it('should return default values for undefined inputs', () => {
      const result = ValidationHelper.validatePagination();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should validate and normalize valid inputs', () => {
      const result = ValidationHelper.validatePagination(3, 25);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
    });

    it('should enforce minimum page number', () => {
      const result = ValidationHelper.validatePagination(-5, 10);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should enforce minimum limit', () => {
      const result = ValidationHelper.validatePagination(1, -5);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });

    it('should enforce maximum limit', () => {
      const result = ValidationHelper.validatePagination(1, 500);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });

    it('should handle decimal numbers by flooring them', () => {
      const result = ValidationHelper.validatePagination(2.7, 15.9);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(15);
    });

    it('should handle invalid number types', () => {
      const result = ValidationHelper.validatePagination(NaN, Infinity);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100); // Math.min(100, Math.max(1, Math.floor(Infinity || 10))) = 100
    });
  });
});