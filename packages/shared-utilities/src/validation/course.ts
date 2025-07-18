// packages/shared-utilities/src/validation/course.ts
// Validation schemas for course-related operations

import { z } from 'zod';

// Course validation schemas
export const CreateCourseSchema = z.object({
  title: z.string()
    .min(3, 'Course title must be at least 3 characters')
    .max(100, 'Course title must not exceed 100 characters')
    .trim(),
  description: z.string()
    .min(10, 'Course description must be at least 10 characters')
    .max(1000, 'Course description must not exceed 1000 characters')
    .trim(),
  category: z.string()
    .min(2, 'Category must be at least 2 characters')
    .max(50, 'Category must not exceed 50 characters')
    .trim(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  tags: z.array(z.string().min(1).max(30)).optional(),
  prerequisites: z.array(z.string().min(1).max(100)).optional(),
  estimatedDuration: z.number().min(1).max(50000).optional(), // in minutes
  settings: z.object({
    isPublic: z.boolean().optional(),
    allowEnrollment: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    maxStudents: z.number().min(1).max(10000).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    allowLateSubmissions: z.boolean().optional(),
    enableDiscussions: z.boolean().optional(),
    enableCollaboration: z.boolean().optional()
  }).optional()
});

export const UpdateCourseSchema = z.object({
  title: z.string()
    .min(3, 'Course title must be at least 3 characters')
    .max(100, 'Course title must not exceed 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .min(10, 'Course description must be at least 10 characters')
    .max(1000, 'Course description must not exceed 1000 characters')
    .trim()
    .optional(),
  category: z.string()
    .min(2, 'Category must be at least 2 characters')
    .max(50, 'Category must not exceed 50 characters')
    .trim()
    .optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.array(z.string().min(1).max(30)).optional(),
  prerequisites: z.array(z.string().min(1).max(100)).optional(),
  estimatedDuration: z.number().min(1).max(50000).optional(),
  settings: z.object({
    isPublic: z.boolean().optional(),
    allowEnrollment: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    maxStudents: z.number().min(1).max(10000).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    allowLateSubmissions: z.boolean().optional(),
    enableDiscussions: z.boolean().optional(),
    enableCollaboration: z.boolean().optional()
  }).optional()
});

// Chapter validation schemas
export const CreateChapterSchema = z.object({
  title: z.string()
    .min(3, 'Chapter title must be at least 3 characters')
    .max(100, 'Chapter title must not exceed 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Chapter description must not exceed 500 characters')
    .trim()
    .optional(),
  order: z.number().min(1, 'Chapter order must be at least 1')
});

export const UpdateChapterSchema = z.object({
  title: z.string()
    .min(3, 'Chapter title must be at least 3 characters')
    .max(100, 'Chapter title must not exceed 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Chapter description must not exceed 500 characters')
    .trim()
    .optional(),
  order: z.number().min(1, 'Chapter order must be at least 1').optional(),
  isPublished: z.boolean().optional()
});

// Section validation schemas
export const CreateSectionSchema = z.object({
  title: z.string()
    .min(3, 'Section title must be at least 3 characters')
    .max(100, 'Section title must not exceed 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Section description must not exceed 500 characters')
    .trim()
    .optional(),
  order: z.number().min(1, 'Section order must be at least 1')
});

export const UpdateSectionSchema = z.object({
  title: z.string()
    .min(3, 'Section title must be at least 3 characters')
    .max(100, 'Section title must not exceed 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Section description must not exceed 500 characters')
    .trim()
    .optional(),
  order: z.number().min(1, 'Section order must be at least 1').optional(),
  isPublished: z.boolean().optional()
});

// Content validation schemas
export const CreateContentSchema = z.object({
  type: z.enum(['text', 'video', 'exercise', 'quiz', 'file']),
  title: z.string()
    .min(1, 'Content title must not be empty')
    .max(100, 'Content title must not exceed 100 characters')
    .trim()
    .optional(),
  order: z.number().min(1, 'Content order must be at least 1'),
  data: z.object({
    markdown: z.string().optional(),
    html: z.string().optional(),
    videoUrl: z.string().url().optional(),
    videoDuration: z.number().min(1).optional(),
    transcript: z.string().optional(),
    fileUrl: z.string().url().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().min(1).optional(),
    mimeType: z.string().optional()
  })
});

export const UpdateContentSchema = z.object({
  title: z.string()
    .min(1, 'Content title must not be empty')
    .max(100, 'Content title must not exceed 100 characters')
    .trim()
    .optional(),
  order: z.number().min(1, 'Content order must be at least 1').optional(),
  data: z.object({
    markdown: z.string().optional(),
    html: z.string().optional(),
    videoUrl: z.string().url().optional(),
    videoDuration: z.number().min(1).optional(),
    transcript: z.string().optional(),
    fileUrl: z.string().url().optional(),
    fileName: z.string().optional(),
    fileSize: z.number().min(1).optional(),
    mimeType: z.string().optional()
  }).optional(),
  isPublished: z.boolean().optional()
});

// Exercise validation schemas
export const CreateExerciseSchema = z.object({
  title: z.string()
    .min(3, 'Exercise title must be at least 3 characters')
    .max(100, 'Exercise title must not exceed 100 characters')
    .trim(),
  description: z.string()
    .min(10, 'Exercise description must be at least 10 characters')
    .max(1000, 'Exercise description must not exceed 1000 characters')
    .trim(),
  type: z.enum(['code', 'quiz', 'assignment']),
  instructions: z.string()
    .min(10, 'Instructions must be at least 10 characters')
    .max(2000, 'Instructions must not exceed 2000 characters')
    .trim(),
  starterCode: z.string().optional(),
  solution: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  programmingLanguage: z.string().optional(),
  maxAttempts: z.number().min(1).max(100).optional(),
  timeLimit: z.number().min(1).max(480).optional() // max 8 hours
});

export const SubmitExerciseSchema = z.object({
  exerciseId: z.string().min(1, 'Exercise ID is required'),
  code: z.string().optional(),
  answer: z.string().optional(),
  files: z.array(z.any()).optional() // File validation handled separately
});

// Quiz validation schemas
export const CreateQuizSchema = z.object({
  title: z.string()
    .min(3, 'Quiz title must be at least 3 characters')
    .max(100, 'Quiz title must not exceed 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Quiz description must not exceed 500 characters')
    .trim()
    .optional(),
  timeLimit: z.number().min(1).max(480).optional(), // max 8 hours
  maxAttempts: z.number().min(1).max(10).optional(),
  passingScore: z.number().min(0).max(100) // percentage
});

export const CreateQuizQuestionSchema = z.object({
  type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay']),
  question: z.string()
    .min(10, 'Question must be at least 10 characters')
    .max(1000, 'Question must not exceed 1000 characters')
    .trim(),
  options: z.array(z.string().min(1).max(200)).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().max(500).optional(),
  points: z.number().min(1).max(100)
});

// Course search and filtering
export const CourseSearchSchema = z.object({
  search: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  instructor: z.string().optional(),
  tags: z.array(z.string().max(30)).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

// Course enrollment
export const EnrollCourseSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required')
});

// Common validation helpers
export const validateObjectId = (id: string) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

export const validateSlug = (slug: string) => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

// Type exports for TypeScript
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
export type CreateChapterInput = z.infer<typeof CreateChapterSchema>;
export type UpdateChapterInput = z.infer<typeof UpdateChapterSchema>;
export type CreateSectionInput = z.infer<typeof CreateSectionSchema>;
export type UpdateSectionInput = z.infer<typeof UpdateSectionSchema>;
export type CreateContentInput = z.infer<typeof CreateContentSchema>;
export type UpdateContentInput = z.infer<typeof UpdateContentSchema>;
export type CreateExerciseInput = z.infer<typeof CreateExerciseSchema>;
export type SubmitExerciseInput = z.infer<typeof SubmitExerciseSchema>;
export type CreateQuizInput = z.infer<typeof CreateQuizSchema>;
export type CreateQuizQuestionInput = z.infer<typeof CreateQuizQuestionSchema>;
export type CourseSearchInput = z.infer<typeof CourseSearchSchema>;
export type EnrollCourseInput = z.infer<typeof EnrollCourseSchema>;