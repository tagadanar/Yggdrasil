// packages/api-services/user-service/src/validation/user-schemas.ts
// Comprehensive Zod validation schemas for User Service

import { z } from 'zod';
import { UserRoleSchema } from '@yggdrasil/shared-utilities';

// Base user profile schema with admin-specific fields
const AdminUserProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'First name contains invalid characters'),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Last name contains invalid characters'),

  department: z.string().max(100, 'Department name too long').optional(),

  title: z.string().max(100, 'Title too long').optional(),

  grade: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']).optional(),

  studentId: z
    .string()
    .regex(/^[A-Z]{2,4}\d{4,6}$/, 'Invalid student ID format (e.g., CS12345)')
    .optional(),

  bio: z.string().max(1000, 'Bio must be 1000 characters or less').optional(),

  officeHours: z.string().max(200, 'Office hours description too long').optional(),

  specialties: z
    .array(z.string().min(1, 'Specialty cannot be empty').max(50, 'Specialty name too long'))
    .max(10, 'Maximum 10 specialties allowed')
    .optional(),

  contactInfo: z
    .object({
      phone: z
        .string()
        .regex(/^\+?[\d\s\-\(\)]{7,20}$/, 'Invalid phone number format')
        .optional(),

      address: z.string().max(200, 'Address too long').optional(),

      emergencyContact: z
        .object({
          name: z
            .string()
            .min(1, 'Emergency contact name required')
            .max(100, 'Emergency contact name too long'),

          phone: z.string().regex(/^\+?[\d\s\-\(\)]{7,20}$/, 'Invalid emergency contact phone'),

          relation: z
            .string()
            .min(1, 'Relationship required')
            .max(50, 'Relationship description too long'),
        })
        .optional(),
    })
    .optional(),
});

// Create user schema (admin only)
export const CreateUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(5, 'Email too short')
    .max(254, 'Email too long')
    .refine(
      email => email.endsWith('@yggdrasil.edu') || email.endsWith('@student.yggdrasil.edu'),
      'Email must be from yggdrasil.edu domain',
    ),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character',
    ),

  role: UserRoleSchema,

  profile: AdminUserProfileSchema,

  isActive: z.boolean().default(true).optional(),
});

// Update user schema (admin only) - all fields optional except validation rules
export const UpdateUserSchema = z
  .object({
    email: z
      .string()
      .email('Invalid email format')
      .min(5, 'Email too short')
      .max(254, 'Email too long')
      .refine(
        email => email.endsWith('@yggdrasil.edu') || email.endsWith('@student.yggdrasil.edu'),
        'Email must be from yggdrasil.edu domain',
      )
      .optional(),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Password must contain uppercase, lowercase, number, and special character',
      )
      .optional(),

    role: UserRoleSchema.optional(),

    profile: AdminUserProfileSchema.partial().optional(),

    isActive: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, 'At least one field must be provided for update');

// Profile update schema (for regular users and admin profile updates)
export const UpdateUserProfileSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must be 50 characters or less')
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'First name contains invalid characters')
      .optional(),

    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be 50 characters or less')
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Last name contains invalid characters')
      .optional(),

    department: z.string().max(100, 'Department name too long').optional(),

    studentId: z
      .string()
      .regex(/^[A-Z]{2,4}\d{4,6}$/, 'Invalid student ID format (e.g., CS12345)')
      .optional(),

    bio: z.string().max(1000, 'Bio must be 1000 characters or less').optional(),

    officeHours: z.string().max(200, 'Office hours description too long').optional(),

    specialties: z
      .array(z.string().min(1, 'Specialty cannot be empty').max(50, 'Specialty name too long'))
      .max(10, 'Maximum 10 specialties allowed')
      .optional(),

    contactInfo: z
      .object({
        phone: z
          .string()
          .regex(/^\+?[\d\s\-\(\)]{7,20}$/, 'Invalid phone number format')
          .optional(),

        address: z.string().max(200, 'Address too long').optional(),
      })
      .optional(),
  })
  .refine(
    data => Object.keys(data).length > 0,
    'At least one field must be provided for profile update',
  );

// Query parameters for listing users
export const ListUsersQuerySchema = z.object({
  role: UserRoleSchema.optional(),

  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(50),

  offset: z.coerce
    .number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .default(0),

  search: z.string().max(100, 'Search term too long').optional(),

  department: z.string().max(100, 'Department name too long').optional(),

  isActive: z.coerce.boolean().optional(),

  sortBy: z.enum(['email', 'role', 'createdAt', 'firstName', 'lastName']).default('createdAt'),

  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// URL parameters for user operations
export const UserParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format')
    .length(24, 'User ID must be exactly 24 characters'),
});

// Health check parameters
export const HealthCheckQuerySchema = z.object({
  detailed: z.coerce.boolean().default(false).optional(),
});

// Common response validation (for internal use)
export const PaginationMetaSchema = z.object({
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  total: z.number().int().min(0),
});

// Export inferred types for TypeScript
export type CreateUserType = z.infer<typeof CreateUserSchema>;
export type UpdateUserType = z.infer<typeof UpdateUserSchema>;
export type UpdateUserProfileType = z.infer<typeof UpdateUserProfileSchema>;
export type ListUsersQueryType = z.infer<typeof ListUsersQuerySchema>;
export type UserParamsType = z.infer<typeof UserParamsSchema>;
export type HealthCheckQueryType = z.infer<typeof HealthCheckQuerySchema>;
export type PaginationMetaType = z.infer<typeof PaginationMetaSchema>;

// Validation middleware helper
export const validateRequest = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: ['Validation failed'] };
    }
  };
};

// Sanitization helpers
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

export const sanitizeProfile = (profile: any): any => {
  if (!profile || typeof profile !== 'object') return profile;

  const sanitized = { ...profile };

  if (sanitized.firstName) sanitized.firstName = sanitizeString(sanitized.firstName);
  if (sanitized.lastName) sanitized.lastName = sanitizeString(sanitized.lastName);
  if (sanitized.bio) sanitized.bio = sanitizeString(sanitized.bio);
  if (sanitized.department) sanitized.department = sanitizeString(sanitized.department);
  if (sanitized.officeHours) sanitized.officeHours = sanitizeString(sanitized.officeHours);

  if (sanitized.specialties && Array.isArray(sanitized.specialties)) {
    sanitized.specialties = sanitized.specialties.map((s: string) => sanitizeString(s));
  }

  return sanitized;
};
