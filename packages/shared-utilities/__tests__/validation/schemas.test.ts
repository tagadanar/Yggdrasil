// Path: packages/shared-utilities/__tests__/validation/schemas.test.ts
import {
  userRoleSchema,
  createUserSchema,
  loginSchema,
  createCourseSchema,
  createEventSchema,
  createNewsSchema,
  paginationSchema,
} from '../../src/validation/schemas';

describe('Validation Schemas', () => {
  describe('userRoleSchema', () => {
    it('should accept valid user roles', () => {
      expect(userRoleSchema.parse('admin')).toBe('admin');
      expect(userRoleSchema.parse('staff')).toBe('staff');
      expect(userRoleSchema.parse('teacher')).toBe('teacher');
      expect(userRoleSchema.parse('student')).toBe('student');
    });

    it('should reject invalid user roles', () => {
      expect(() => userRoleSchema.parse('invalid')).toThrow();
      expect(() => userRoleSchema.parse('')).toThrow();
      expect(() => userRoleSchema.parse(123)).toThrow();
    });
  });

  describe('createUserSchema', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      role: 'student',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should accept valid user data', () => {
      const result = createUserSchema.parse(validUserData);
      expect(result.email).toBe(validUserData.email);
      expect(result.role).toBe(validUserData.role);
    });

    it('should reject invalid email', () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };
      expect(() => createUserSchema.parse(invalidData)).toThrow();
    });

    it('should reject weak password', () => {
      const invalidData = { ...validUserData, password: 'weak' };
      expect(() => createUserSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid role', () => {
      const invalidData = { ...validUserData, role: 'invalid' };
      expect(() => createUserSchema.parse(invalidData)).toThrow();
    });

    it('should reject missing profile fields', () => {
      const invalidData = { ...validUserData, profile: { firstName: 'John' } };
      expect(() => createUserSchema.parse(invalidData)).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      const result = loginSchema.parse(validLogin);
      expect(result.email).toBe(validLogin.email);
      expect(result.password).toBe(validLogin.password);
    });

    it('should reject invalid email format', () => {
      const invalidLogin = {
        email: 'invalid-email',
        password: 'password123',
      };
      
      expect(() => loginSchema.parse(invalidLogin)).toThrow();
    });

    it('should reject empty password', () => {
      const invalidLogin = {
        email: 'test@example.com',
        password: '',
      };
      
      expect(() => loginSchema.parse(invalidLogin)).toThrow();
    });
  });

  describe('createCourseSchema', () => {
    const validCourseData = {
      title: 'Introduction to Programming',
      description: 'Learn the basics of programming',
      code: 'CS101',
      credits: 3,
      level: 'beginner' as const,
      category: 'programming' as const,
      duration: {
        weeks: 12,
        hoursPerWeek: 3,
        totalHours: 36
      },
      capacity: 30,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-09-01'),
    };

    it('should accept valid course data', () => {
      const result = createCourseSchema.parse(validCourseData);
      expect(result.title).toBe(validCourseData.title);
      expect(result.description).toBe(validCourseData.description);
      expect(result.code).toBe(validCourseData.code);
      expect(result.credits).toBe(validCourseData.credits);
      expect(result.level).toBe(validCourseData.level);
      expect(result.category).toBe(validCourseData.category);
    });

    it('should reject empty title', () => {
      const invalidData = { ...validCourseData, title: '' };
      expect(() => createCourseSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty description', () => {
      const invalidData = { ...validCourseData, description: '' };
      expect(() => createCourseSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid credits', () => {
      const invalidData = { ...validCourseData, credits: 0 };
      expect(() => createCourseSchema.parse(invalidData)).toThrow();
    });
  });

  describe('createEventSchema', () => {
    const validEventData = {
      title: 'Math Class',
      startDate: new Date('2023-06-15T10:00:00Z'),
      endDate: new Date('2023-06-15T11:00:00Z'),
      type: 'class',
    };

    it('should accept valid event data', () => {
      const result = createEventSchema.parse(validEventData);
      expect(result.title).toBe(validEventData.title);
      expect(result.type).toBe(validEventData.type);
      expect(result.attendees).toEqual([]);
      expect(result.isRecurring).toBe(false);
    });

    it('should reject empty title', () => {
      const invalidData = { ...validEventData, title: '' };
      expect(() => createEventSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid event type', () => {
      const invalidData = { ...validEventData, type: 'invalid' };
      expect(() => createEventSchema.parse(invalidData)).toThrow();
    });

    it('should reject end date before start date', () => {
      const invalidData = {
        ...validEventData,
        startDate: new Date('2023-06-15T11:00:00Z'),
        endDate: new Date('2023-06-15T10:00:00Z'),
      };
      expect(() => createEventSchema.parse(invalidData)).toThrow();
    });
  });

  describe('createNewsSchema', () => {
    const validNewsData = {
      title: 'School Announcement',
      content: 'This is an important announcement for all students.',
      category: 'general',
    };

    it('should accept valid news data', () => {
      const result = createNewsSchema.parse(validNewsData);
      expect(result.title).toBe(validNewsData.title);
      expect(result.content).toBe(validNewsData.content);
      expect(result.category).toBe(validNewsData.category);
      expect(result.tags).toEqual([]);
      expect(result.isPublished).toBe(false);
    });

    it('should reject empty title', () => {
      const invalidData = { ...validNewsData, title: '' };
      expect(() => createNewsSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty content', () => {
      const invalidData = { ...validNewsData, content: '' };
      expect(() => createNewsSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty category', () => {
      const invalidData = { ...validNewsData, category: '' };
      expect(() => createNewsSchema.parse(invalidData)).toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('should accept valid pagination parameters', () => {
      const result = paginationSchema.parse({ page: 2, limit: 20 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should use defaults for missing parameters', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should reject invalid page numbers', () => {
      expect(() => paginationSchema.parse({ page: 0 })).toThrow();
      expect(() => paginationSchema.parse({ page: -1 })).toThrow();
    });

    it('should reject invalid limit values', () => {
      expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
      expect(() => paginationSchema.parse({ limit: -1 })).toThrow();
      expect(() => paginationSchema.parse({ limit: 200 })).toThrow();
    });
  });
});