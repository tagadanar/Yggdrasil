// packages/shared-utilities/src/validation/auth.ts
// Zod validation schemas for authentication

import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'staff', 'teacher', 'student']);

export const LoginRequestSchema = z.object({
  email: z.string({ required_error: 'Email and password are required' }).min(1, 'Email and password are required').email('Invalid email format'),
  password: z.string({ required_error: 'Email and password are required' }).min(1, 'Email and password are required'),
});

export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  role: UserRoleSchema,
  profile: z.object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
    studentId: z.string().optional(),
    department: z.string().max(100).optional(),
    specialties: z.array(z.string().max(50)).optional(),
    bio: z.string().max(500).optional(),
    officeHours: z.string().max(200).optional(),
  }),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Validation failed' }).min(1, 'Refresh token is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
});

export const UpdateProfileSchema = z.object({
  profile: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    bio: z.string().max(500).optional(),
    officeHours: z.string().max(200).optional(),
    department: z.string().max(100).optional(),
    specialties: z.array(z.string().max(50)).optional(),
    contactInfo: z.object({
      phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format').optional(),
      address: z.string().max(200).optional(),
      emergencyContact: z.object({
        name: z.string().min(1).max(100),
        phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format'),
        relation: z.string().min(1).max(50),
      }).optional(),
    }).optional(),
  }).partial(),
});

export const UpdatePreferencesSchema = z.object({
  preferences: z.object({
    language: z.enum(['fr', 'en']).optional(),
    notifications: z.object({
      scheduleChanges: z.boolean().optional(),
      newAnnouncements: z.boolean().optional(),
      assignmentReminders: z.boolean().optional(),
    }).partial().optional(),
    accessibility: z.object({
      colorblindMode: z.boolean().optional(),
      fontSize: z.enum(['small', 'medium', 'large']).optional(),
      highContrast: z.boolean().optional(),
    }).partial().optional(),
  }).partial(),
});

// Type inference from schemas
export type LoginRequestType = z.infer<typeof LoginRequestSchema>;
export type RegisterRequestType = z.infer<typeof RegisterRequestSchema>;
export type RefreshTokenType = z.infer<typeof RefreshTokenSchema>;
export type ForgotPasswordType = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordType = z.infer<typeof ResetPasswordSchema>;
export type UpdateProfileType = z.infer<typeof UpdateProfileSchema>;
export type UpdatePreferencesType = z.infer<typeof UpdatePreferencesSchema>;
