"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSchema = exports.paginationSchema = exports.updateNewsSchema = exports.createNewsSchema = exports.updateEventSchema = exports.createEventSchema = exports.recurringPatternSchema = exports.updateCourseSchema = exports.createCourseSchema = exports.courseScheduleSchema = exports.courseDurationSchema = exports.courseVisibilitySchema = exports.courseStatusSchema = exports.courseCategorySchema = exports.courseLevelSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.updateUserSchema = exports.createUserSchema = exports.userPreferencesSchema = exports.accessibilityPreferencesSchema = exports.notificationPreferencesSchema = exports.userProfileSchema = exports.contactInfoSchema = exports.userRoleSchema = void 0;
// Path: packages/shared-utilities/src/validation/schemas.ts
const zod_1 = require("zod");
// User validation schemas
exports.userRoleSchema = zod_1.z.enum(['admin', 'staff', 'teacher', 'student']);
exports.contactInfoSchema = zod_1.z.object({
    phone: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    emergencyContact: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Emergency contact name is required'),
        phone: zod_1.z.string().min(1, 'Emergency contact phone is required'),
        relation: zod_1.z.string().min(1, 'Emergency contact relation is required'),
    }).optional(),
});
exports.userProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, 'First name is required'),
    lastName: zod_1.z.string().min(1, 'Last name is required'),
    photo: zod_1.z.string().url().optional(),
    studentId: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    specialties: zod_1.z.array(zod_1.z.string()).optional(),
    bio: zod_1.z.string().optional(),
    officeHours: zod_1.z.string().optional(),
    promotion: zod_1.z.string().optional(),
    contactInfo: exports.contactInfoSchema.optional(),
});
exports.notificationPreferencesSchema = zod_1.z.object({
    scheduleChanges: zod_1.z.boolean().default(true),
    newAnnouncements: zod_1.z.boolean().default(true),
    assignmentReminders: zod_1.z.boolean().default(true),
});
exports.accessibilityPreferencesSchema = zod_1.z.object({
    colorblindMode: zod_1.z.boolean().default(false),
    fontSize: zod_1.z.enum(['small', 'medium', 'large']).default('medium'),
    highContrast: zod_1.z.boolean().default(false),
});
exports.userPreferencesSchema = zod_1.z.object({
    language: zod_1.z.string().default('fr'),
    notifications: exports.notificationPreferencesSchema,
    accessibility: exports.accessibilityPreferencesSchema,
});
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    role: exports.userRoleSchema,
    profile: exports.userProfileSchema,
    preferences: exports.userPreferencesSchema.optional(),
});
exports.updateUserSchema = zod_1.z.object({
    profile: exports.userProfileSchema.partial().optional(),
    preferences: exports.userPreferencesSchema.partial().optional(),
    isActive: zod_1.z.boolean().optional(),
});
// Authentication validation schemas
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Reset token is required'),
    newPassword: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
});
// Course validation schemas
exports.courseLevelSchema = zod_1.z.enum(['beginner', 'intermediate', 'advanced', 'expert']);
exports.courseCategorySchema = zod_1.z.enum([
    'programming', 'web-development', 'mobile-development',
    'data-science', 'artificial-intelligence', 'cybersecurity',
    'cloud-computing', 'devops', 'database', 'design',
    'project-management', 'soft-skills', 'other'
]);
exports.courseStatusSchema = zod_1.z.enum(['draft', 'published', 'archived', 'cancelled']);
exports.courseVisibilitySchema = zod_1.z.enum(['public', 'private', 'restricted']);
exports.courseDurationSchema = zod_1.z.object({
    weeks: zod_1.z.number().min(1, 'Duration must be at least 1 week'),
    hoursPerWeek: zod_1.z.number().min(1, 'Hours per week must be at least 1'),
    totalHours: zod_1.z.number().min(1, 'Total hours must be at least 1')
});
exports.courseScheduleSchema = zod_1.z.object({
    dayOfWeek: zod_1.z.number().min(0).max(6, 'Day of week must be between 0-6'),
    startTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: zod_1.z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    location: zod_1.z.string().optional(),
    type: zod_1.z.enum(['lecture', 'practical', 'exam', 'project']).default('lecture')
});
const baseCourseSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Course title is required').max(200, 'Title too long'),
    description: zod_1.z.string().min(1, 'Course description is required').max(2000, 'Description too long'),
    code: zod_1.z.string().min(3, 'Course code must be at least 3 characters').max(10, 'Course code too long'),
    credits: zod_1.z.number().min(1, 'Credits must be at least 1').max(20, 'Credits cannot exceed 20'),
    level: exports.courseLevelSchema,
    category: exports.courseCategorySchema,
    duration: exports.courseDurationSchema,
    schedule: zod_1.z.array(exports.courseScheduleSchema).default([]),
    capacity: zod_1.z.number().min(1, 'Capacity must be at least 1').max(500, 'Capacity too high'),
    prerequisites: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    visibility: exports.courseVisibilitySchema.default('public'),
    startDate: zod_1.z.date(),
    endDate: zod_1.z.date()
});
exports.createCourseSchema = baseCourseSchema.refine(data => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate']
});
exports.updateCourseSchema = baseCourseSchema.partial();
// Calendar event validation schemas
exports.recurringPatternSchema = zod_1.z.object({
    type: zod_1.z.enum(['daily', 'weekly', 'monthly']),
    interval: zod_1.z.number().min(1),
    endDate: zod_1.z.date().optional(),
    daysOfWeek: zod_1.z.array(zod_1.z.number().min(0).max(6)).optional(),
});
const baseEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Event title is required'),
    description: zod_1.z.string().optional(),
    startDate: zod_1.z.date(),
    endDate: zod_1.z.date(),
    type: zod_1.z.enum(['class', 'exam', 'meeting', 'event']),
    attendees: zod_1.z.array(zod_1.z.string()).default([]),
    location: zod_1.z.string().optional(),
    isRecurring: zod_1.z.boolean().default(false),
    recurringPattern: exports.recurringPatternSchema.optional(),
});
exports.createEventSchema = baseEventSchema.refine(data => data.endDate > data.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
});
exports.updateEventSchema = baseEventSchema.partial();
// News article validation schemas
exports.createNewsSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Article title is required'),
    content: zod_1.z.string().min(1, 'Article content is required'),
    category: zod_1.z.string().min(1, 'Category is required'),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    isPublished: zod_1.z.boolean().default(false),
});
exports.updateNewsSchema = exports.createNewsSchema.partial();
// Common validation schemas
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().min(1).default(1),
    limit: zod_1.z.number().min(1).max(100).default(10),
});
exports.searchSchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
}).merge(exports.paginationSchema);
//# sourceMappingURL=schemas.js.map