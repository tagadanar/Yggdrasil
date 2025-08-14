// packages/api-services/user-service/__tests__/unit/validation.test.ts
// Unit tests for validation schemas and middleware

import {
  CreateUserSchema,
  UpdateUserSchema,
  UpdateUserProfileSchema,
  ListUsersQuerySchema,
  UserParamsSchema,
  validateRequest,
  sanitizeProfile,
} from '../../src/validation/user-schemas';

describe('User Validation Schemas', () => {
  describe('CreateUserSchema', () => {
    const validUserData = {
      email: 'newuser@yggdrasil.edu',
      password: 'SecurePass123!',
      role: 'student',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        department: 'Computer Science',
        studentId: 'CS12345',
      },
    };

    it('should validate correct user creation data', () => {
      const result = CreateUserSchema.parse(validUserData);
      expect(result.email).toBe(validUserData.email);
      expect(result.role).toBe(validUserData.role);
      expect(result.profile.firstName).toBe(validUserData.profile.firstName);
    });

    it('should require valid email domain', () => {
      const invalidData = { ...validUserData, email: 'user@gmail.com' };
      expect(() => CreateUserSchema.parse(invalidData)).toThrow();
    });

    it('should require strong password', () => {
      const weakPasswords = [
        'weak',
        'weakpassword',
        'WeakPassword',
        'WeakPassword123',
        'weak@pass',
      ];

      weakPasswords.forEach(password => {
        const invalidData = { ...validUserData, password };
        expect(() => CreateUserSchema.parse(invalidData)).toThrow();
      });
    });

    it('should validate student ID format', () => {
      const invalidStudentIds = ['123', 'TOOLONG123456', 'cs123', ''];

      invalidStudentIds.forEach(studentId => {
        const invalidData = {
          ...validUserData,
          profile: { ...validUserData.profile, studentId },
        };
        expect(() => CreateUserSchema.parse(invalidData)).toThrow();
      });
    });

    it('should validate name format', () => {
      const invalidNames = ['John123', 'John@Doe', ''];

      invalidNames.forEach(firstName => {
        const invalidData = {
          ...validUserData,
          profile: { ...validUserData.profile, firstName },
        };
        expect(() => CreateUserSchema.parse(invalidData)).toThrow();
      });
    });

    it('should limit specialties array', () => {
      const tooManySpecialties = Array(11).fill('Specialty');
      const invalidData = {
        ...validUserData,
        profile: { ...validUserData.profile, specialties: tooManySpecialties },
      };
      expect(() => CreateUserSchema.parse(invalidData)).toThrow();
    });
  });

  describe('UpdateUserSchema', () => {
    it('should allow partial updates', () => {
      const partialData = { email: 'updated@yggdrasil.edu' };
      const result = UpdateUserSchema.parse(partialData);
      expect(result.email).toBe(partialData.email);
    });

    it('should require at least one field', () => {
      expect(() => UpdateUserSchema.parse({})).toThrow();
    });

    it('should validate email domain when provided', () => {
      const invalidData = { email: 'user@gmail.com' };
      expect(() => UpdateUserSchema.parse(invalidData)).toThrow();
    });
  });

  describe('UpdateUserProfileSchema', () => {
    it('should allow partial profile updates', () => {
      const profileData = { firstName: 'Updated' };
      const result = UpdateUserProfileSchema.parse(profileData);
      expect(result.firstName).toBe('Updated');
    });

    it('should require at least one field', () => {
      expect(() => UpdateUserProfileSchema.parse({})).toThrow();
    });

    it('should validate contact info format', () => {
      const validPhone = '+1-555-123-4567';
      const invalidPhone = 'invalid-phone';

      const validData = { contactInfo: { phone: validPhone } };
      const invalidData = { contactInfo: { phone: invalidPhone } };

      expect(() => UpdateUserProfileSchema.parse(validData)).not.toThrow();
      expect(() => UpdateUserProfileSchema.parse(invalidData)).toThrow();
    });
  });

  describe('ListUsersQuerySchema', () => {
    it('should apply default values', () => {
      const result = ListUsersQuerySchema.parse({});
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should validate numeric constraints', () => {
      const invalidQueries = [{ limit: 0 }, { limit: 101 }, { offset: -1 }];

      invalidQueries.forEach(query => {
        expect(() => ListUsersQuerySchema.parse(query)).toThrow();
      });
    });

    it('should coerce string numbers to integers', () => {
      const query = { limit: '25', offset: '10' };
      const result = ListUsersQuerySchema.parse(query);
      expect(result.limit).toBe(25);
      expect(result.offset).toBe(10);
    });

    it('should validate role values', () => {
      const validRoles = ['admin', 'staff', 'teacher', 'student'];
      const invalidRole = 'invalid-role';

      validRoles.forEach(role => {
        expect(() => ListUsersQuerySchema.parse({ role })).not.toThrow();
      });

      expect(() => ListUsersQuerySchema.parse({ role: invalidRole })).toThrow();
    });
  });

  describe('UserParamsSchema', () => {
    it('should validate MongoDB ObjectId format', () => {
      const validId = '507f1f77bcf86cd799439011';
      const result = UserParamsSchema.parse({ id: validId });
      expect(result.id).toBe(validId);
    });

    it('should reject invalid ID formats', () => {
      const invalidIds = [
        '123',
        'invalid-id',
        '507f1f77bcf86cd79943901', // too short
        '507f1f77bcf86cd7994390111', // too long
        '507f1f77bcf86cd79943901g', // invalid character
      ];

      invalidIds.forEach(id => {
        expect(() => UserParamsSchema.parse({ id })).toThrow();
      });
    });
  });

  describe('validateRequest helper', () => {
    it('should return success for valid data', () => {
      const validData = { firstName: 'John' };
      const result = validateRequest(UpdateUserProfileSchema)(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('John');
      }
    });

    it('should return formatted errors for invalid data', () => {
      const invalidData = { firstName: '' };
      const result = validateRequest(UpdateUserProfileSchema)(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('firstName');
      }
    });

    it('should handle non-Zod errors gracefully', () => {
      const mockSchema = {
        parse: () => {
          throw new Error('Non-Zod error');
        },
      };

      const result = validateRequest(mockSchema as any)({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toEqual(['Validation failed']);
      }
    });
  });

  describe('sanitizeProfile helper', () => {
    it('should trim and normalize whitespace', () => {
      const dirtyProfile = {
        firstName: '  John   ',
        lastName: ' Doe  ',
        bio: 'This  has   multiple    spaces',
      };

      const sanitized = sanitizeProfile(dirtyProfile);
      expect(sanitized.firstName).toBe('John');
      expect(sanitized.lastName).toBe('Doe');
      expect(sanitized.bio).toBe('This has multiple spaces');
    });

    it('should sanitize array fields', () => {
      const profile = {
        specialties: ['  Web Dev  ', '  AI   ', ' Machine Learning '],
      };

      const sanitized = sanitizeProfile(profile);
      expect(sanitized.specialties).toEqual(['Web Dev', 'AI', 'Machine Learning']);
    });

    it('should handle null/undefined input', () => {
      expect(sanitizeProfile(null)).toBe(null);
      expect(sanitizeProfile(undefined)).toBe(undefined);
      expect(sanitizeProfile({})).toEqual({});
    });

    it('should preserve non-string fields', () => {
      const profile = {
        firstName: 'John',
        age: 25,
        isActive: true,
        metadata: { key: 'value' },
      };

      const sanitized = sanitizeProfile(profile);
      expect(sanitized.firstName).toBe('John');
      expect(sanitized.age).toBe(25);
      expect(sanitized.isActive).toBe(true);
      expect(sanitized.metadata).toEqual({ key: 'value' });
    });
  });

  describe('Edge cases and security tests', () => {
    it('should reject XSS attempts in text fields', () => {
      const xssData = {
        firstName: '<script>alert("xss")</script>',
        bio: 'javascript:alert("xss")',
        specialties: ['<img src=x onerror=alert(1)>'],
      };

      // The sanitization should handle this, but validation should also catch format issues
      expect(() => UpdateUserProfileSchema.parse(xssData)).toThrow();
    });

    it('should handle maximum length constraints', () => {
      const longData = {
        firstName: 'A'.repeat(51), // exceeds 50 char limit
        bio: 'A'.repeat(1001), // exceeds 1000 char limit
      };

      expect(() => UpdateUserProfileSchema.parse(longData)).toThrow();
    });

    it('should validate nested object constraints', () => {
      const invalidContactInfo = {
        contactInfo: {
          phone: '123', // too short
          address: 'A'.repeat(201), // too long
        },
      };

      expect(() => UpdateUserProfileSchema.parse(invalidContactInfo)).toThrow();
    });

    it('should handle SQL injection patterns', () => {
      const sqlInjectionData = {
        firstName: "'; DROP TABLE users; --",
        lastName: "1' OR '1'='1",
      };

      // Should fail name format validation
      expect(() => UpdateUserProfileSchema.parse(sqlInjectionData)).toThrow();
    });
  });
});
