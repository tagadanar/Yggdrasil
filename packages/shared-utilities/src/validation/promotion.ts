// packages/shared-utilities/src/validation/promotion.ts
// Promotion validation schemas using Zod

import { z } from 'zod';

// Semester validation (1-10)
const semesterSchema = z.number().min(1).max(10);

// Academic year format validation (e.g., "2024-2025")
const academicYearSchema = z.string().regex(
  /^\d{4}-\d{4}$/,
  'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)'
).refine(
  (year) => {
    const parts = year.split('-').map(Number);
    if (parts.length !== 2) return false;
    const [start, end] = parts;
    return start && end && end === start + 1;
  },
  'Academic year must span consecutive years'
);

// Promotion status enum
const promotionStatusSchema = z.enum(['draft', 'active', 'completed', 'archived']);

// Membership status enum
const membershipStatusSchema = z.enum(['active', 'inactive', 'graduated', 'dropped']);

// Promotion metadata schema
const promotionMetadataSchema = z.object({
  level: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  maxStudents: z.number().min(1).max(500).optional(),
  description: z.string().max(500).optional(),
});

// Create promotion request validation
export const createPromotionSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  semester: semesterSchema,
  intake: z.enum(['september', 'march']),
  academicYear: academicYearSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  metadata: promotionMetadataSchema.optional(),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
).refine(
  (data) => {
    // Validate semester intake alignment
    // September intake: odd semesters (1,3,5,7,9)
    // March intake: even semesters (2,4,6,8,10)
    const isOddSemester = data.semester % 2 === 1;
    return (data.intake === 'september' && isOddSemester) || 
           (data.intake === 'march' && !isOddSemester);
  },
  {
    message: 'Semester number does not match intake period',
    path: ['semester'],
  }
);

// Update promotion request validation
export const updatePromotionSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: promotionStatusSchema.optional(),
  metadata: promotionMetadataSchema.partial().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end > start;
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

// Add students to promotion validation
export const addStudentsToPromotionSchema = z.object({
  studentIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId')).min(1),
});

// Remove student from promotion validation
export const removeStudentFromPromotionSchema = z.object({
  studentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId'),
});

// Link events to promotion validation
export const linkEventsToPromotionSchema = z.object({
  eventIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId')).min(1),
});

// Promotion filters validation
export const promotionFiltersSchema = z.object({
  semester: semesterSchema.optional(),
  intake: z.enum(['september', 'march']).optional(),
  academicYear: academicYearSchema.optional(),
  status: promotionStatusSchema.optional(),
  department: z.string().max(100).optional(),
  page: z.number().min(1).default(1).optional(),
  pageSize: z.number().min(1).max(100).default(20).optional(),
});

// Membership progress validation
export const membershipProgressSchema = z.object({
  eventsAttended: z.array(z.string()),
  coursesCompleted: z.array(z.string()),
  overallProgress: z.number().min(0).max(100),
});

// Update membership status validation
export const updateMembershipStatusSchema = z.object({
  status: membershipStatusSchema,
  leftAt: z.string().datetime().optional(),
});

// Validation helper for semester progression
export function validateSemesterProgression(currentSemester: number, nextSemester: number): boolean {
  // Students can only progress to the next semester
  return nextSemester === currentSemester + 1 && nextSemester <= 10;
}

// Validation helper for intake period
export function validateIntakePeriod(intake: 'september' | 'march', date: Date): boolean {
  const month = date.getMonth();
  if (intake === 'september') {
    // September intake: August to October
    return month >= 7 && month <= 9;
  } else {
    // March intake: February to April
    return month >= 1 && month <= 3;
  }
}

// Export all schemas as a namespace
export const promotionValidationSchemas = {
  createPromotion: createPromotionSchema,
  updatePromotion: updatePromotionSchema,
  addStudents: addStudentsToPromotionSchema,
  removeStudent: removeStudentFromPromotionSchema,
  linkEvents: linkEventsToPromotionSchema,
  filters: promotionFiltersSchema,
  membershipProgress: membershipProgressSchema,
  updateMembershipStatus: updateMembershipStatusSchema,
};