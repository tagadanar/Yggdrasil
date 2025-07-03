// Path: packages/shared-utilities/src/validation/schemas.ts
import { z } from 'zod';

// User validation schemas
export const userRoleSchema = z.enum(['admin', 'staff', 'teacher', 'student']);

export const contactInfoSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    phone: z.string().min(1, 'Emergency contact phone is required'),
    relation: z.string().min(1, 'Emergency contact relation is required'),
  }).optional(),
});

export const userProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  photo: z.string().url().optional(),
  studentId: z.string().optional(),
  department: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  bio: z.string().optional(),
  officeHours: z.string().optional(),
  promotion: z.string().optional(),
  contactInfo: contactInfoSchema.optional(),
});

export const notificationPreferencesSchema = z.object({
  scheduleChanges: z.boolean().default(true),
  newAnnouncements: z.boolean().default(true),
  assignmentReminders: z.boolean().default(true),
});

export const accessibilityPreferencesSchema = z.object({
  colorblindMode: z.boolean().default(false),
  fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  highContrast: z.boolean().default(false),
});

export const userPreferencesSchema = z.object({
  language: z.string().default('fr'),
  notifications: notificationPreferencesSchema,
  accessibility: accessibilityPreferencesSchema,
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: userRoleSchema,
  profile: userProfileSchema,
  preferences: userPreferencesSchema.optional(),
});

export const updateUserSchema = z.object({
  profile: userProfileSchema.partial().optional(),
  preferences: userPreferencesSchema.partial().optional(),
  isActive: z.boolean().optional(),
});

// Authentication validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Course validation schemas
export const courseLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);
export const courseCategorySchema = z.enum([
  'programming', 'web-development', 'mobile-development',
  'data-science', 'artificial-intelligence', 'cybersecurity',
  'cloud-computing', 'devops', 'database', 'design',
  'project-management', 'soft-skills', 'other'
]);
export const courseStatusSchema = z.enum(['draft', 'published', 'archived', 'cancelled']);
export const courseVisibilitySchema = z.enum(['public', 'private', 'restricted']);

export const courseDurationSchema = z.object({
  weeks: z.number().min(1, 'Duration must be at least 1 week'),
  hoursPerWeek: z.number().min(1, 'Hours per week must be at least 1'),
  totalHours: z.number().min(1, 'Total hours must be at least 1')
});

export const courseScheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6, 'Day of week must be between 0-6'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  location: z.string().optional(),
  type: z.enum(['lecture', 'practical', 'exam', 'project']).default('lecture')
});

const baseCourseSchema = z.object({
  title: z.string().min(1, 'Course title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Course description is required').max(2000, 'Description too long'),
  code: z.string().min(3, 'Course code must be at least 3 characters').max(10, 'Course code too long'),
  credits: z.number().min(1, 'Credits must be at least 1').max(20, 'Credits cannot exceed 20'),
  level: courseLevelSchema,
  category: courseCategorySchema,
  duration: courseDurationSchema,
  schedule: z.array(courseScheduleSchema).default([]),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(500, 'Capacity too high'),
  prerequisites: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  visibility: courseVisibilitySchema.default('public'),
  startDate: z.date(),
  endDate: z.date()
});

export const createCourseSchema = baseCourseSchema.refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
});

export const updateCourseSchema = baseCourseSchema.partial();

// Calendar event validation schemas
export const recurringPatternSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().min(1),
  endDate: z.date().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
});

const baseEventSchema = z.object({
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  type: z.enum(['class', 'exam', 'meeting', 'event']),
  attendees: z.array(z.string()).default([]),
  location: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: recurringPatternSchema.optional(),
});

export const createEventSchema = baseEventSchema.refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const updateEventSchema = baseEventSchema.partial();

// News article validation schemas
export const createNewsSchema = z.object({
  title: z.string().min(1, 'Article title is required'),
  content: z.string().min(1, 'Article content is required'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
});

export const updateNewsSchema = createNewsSchema.partial();

// Common validation schemas
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

export const searchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).merge(paginationSchema);