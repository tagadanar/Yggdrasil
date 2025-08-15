/**
 * Validation schemas for Statistics Service
 * Uses Zod for runtime type validation and input sanitization
 */

import { z } from 'zod';

// Base schemas for common types
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const progressTypeSchema = z.enum(['section', 'exercise', 'course', 'chapter'], {
  errorMap: () => ({ message: 'Progress type must be one of: section, exercise, course, chapter' }),
});

// Progress update schema for PUT /progress/student/:userId/course/:courseId
export const progressUpdateSchema = z
  .object({
    type: progressTypeSchema.optional(),
    completedSections: z.array(z.string()).optional(),
    completedExercises: z.array(z.string()).optional(),
    timeSpent: z.number().min(0).max(600).optional(), // Max 10 hours per update
    progressPercentage: z.number().min(0).max(100).optional(),
    metadata: z.record(z.any()).optional(), // Additional metadata
  })
  .refine(
    data => {
      // At least one field must be provided
      return (
        data.completedSections ||
        data.completedExercises ||
        data.timeSpent !== undefined ||
        data.progressPercentage !== undefined
      );
    },
    {
      message: 'At least one progress field must be provided',
    },
  );

// Section completion schema for POST /progress/section-complete
export const sectionCompleteSchema = z.object({
  userId: objectIdSchema,
  courseId: objectIdSchema,
  sectionId: z.string().min(1, 'Section ID is required'),
  timeSpent: z.number().min(0).max(300).optional(), // Max 5 hours per section
  metadata: z.record(z.any()).optional(),
});

// Exercise completion schema for POST /progress/exercise-complete
export const exerciseCompleteSchema = z.object({
  userId: objectIdSchema,
  courseId: objectIdSchema,
  exerciseId: z.string().min(1, 'Exercise ID is required'),
  score: z.number().min(0).max(100).optional(),
  timeSpent: z.number().min(0).max(180).optional(), // Max 3 hours per exercise
  attempts: z.number().min(1).optional(),
  metadata: z.record(z.any()).optional(),
});

// Dashboard query parameters
export const dashboardQuerySchema = z
  .object({
    period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
    includeInactive: z.boolean().optional(),
    limit: z.number().min(1).max(100).optional(),
  })
  .optional();

// Analytics query parameters
export const analyticsQuerySchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    granularity: z.enum(['day', 'week', 'month']).optional(),
    includeInactive: z.boolean().optional(),
  })
  .refine(
    data => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'Start date must be before or equal to end date',
    },
  );

// User ID parameter validation
export const userIdParamSchema = z.object({
  userId: objectIdSchema,
});

// Course ID parameter validation
export const courseIdParamSchema = z.object({
  courseId: objectIdSchema,
});

// Combined user and course ID parameters
export const userCourseParamsSchema = z.object({
  userId: objectIdSchema,
  courseId: objectIdSchema,
});

// Achievement filters
export const achievementQuerySchema = z
  .object({
    category: z.enum(['course', 'time', 'performance', 'social']).optional(),
    earned: z.boolean().optional(),
    limit: z.number().min(1).max(50).optional(),
  })
  .optional();

// Batch progress update schema for multiple students/courses
export const batchProgressUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        userId: objectIdSchema,
        courseId: objectIdSchema,
        progressData: progressUpdateSchema,
      }),
    )
    .min(1)
    .max(100), // Max 100 batch updates
});

// Statistics aggregation request schema
export const aggregationRequestSchema = z.object({
  metrics: z
    .array(
      z.enum(['enrollment', 'completion', 'progress', 'time_spent', 'engagement', 'performance']),
    )
    .min(1),
  groupBy: z.enum(['course', 'user', 'promotion', 'date']).optional(),
  filters: z
    .object({
      courseIds: z.array(objectIdSchema).optional(),
      userIds: z.array(objectIdSchema).optional(),
      promotionIds: z.array(objectIdSchema).optional(),
      roles: z.array(z.enum(['student', 'teacher', 'staff', 'admin'])).optional(),
      dateRange: z
        .object({
          start: z.string().datetime(),
          end: z.string().datetime(),
        })
        .optional(),
    })
    .optional(),
});

// Export types for TypeScript
export type ProgressUpdateType = z.infer<typeof progressUpdateSchema>;
export type SectionCompleteType = z.infer<typeof sectionCompleteSchema>;
export type ExerciseCompleteType = z.infer<typeof exerciseCompleteSchema>;
export type DashboardQueryType = z.infer<typeof dashboardQuerySchema>;
export type AnalyticsQueryType = z.infer<typeof analyticsQuerySchema>;
export type UserIdParamType = z.infer<typeof userIdParamSchema>;
export type CourseIdParamType = z.infer<typeof courseIdParamSchema>;
export type UserCourseParamsType = z.infer<typeof userCourseParamsSchema>;
export type AchievementQueryType = z.infer<typeof achievementQuerySchema>;
export type BatchProgressUpdateType = z.infer<typeof batchProgressUpdateSchema>;
export type AggregationRequestType = z.infer<typeof aggregationRequestSchema>;

// Validation middleware factory
export const validateSchema = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      // Simple heuristic: if schema has userId or courseId, validate params, otherwise body
      const isParamSchema =
        schema instanceof z.ZodObject &&
        ('userId' in (schema.shape || {}) || 'courseId' in (schema.shape || {}));

      const validationTarget = isParamSchema ? req.params : req.body;

      const result = schema.safeParse(validationTarget);

      if (!result.success) {
        const errorMessage = result.error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');

        return res.status(400).json({
          success: false,
          error: `Validation error: ${errorMessage}`,
          details: result.error.errors,
        });
      }

      // Add validated data to request
      if (validationTarget === req.params) {
        req.validatedParams = result.data;
      } else {
        req.validatedBody = result.data;
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Validation processing error',
      });
    }
  };
};
