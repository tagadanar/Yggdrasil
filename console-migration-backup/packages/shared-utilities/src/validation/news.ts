// packages/shared-utilities/src/validation/news.ts
// Zod validation schemas for news articles

import { z } from 'zod';

// News category enum
export const NewsCategorySchema = z.enum(['general', 'academic', 'events', 'announcements']);

// Create news article schema
export const CreateNewsArticleSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(300, 'Title must be less than 300 characters')
    .trim(),
  content: z.string()
    .min(1, 'Content is required')
    .trim(),
  summary: z.string()
    .max(500, 'Summary must be less than 500 characters')
    .trim()
    .optional(),
  category: NewsCategorySchema.default('general'),
  tags: z.array(z.string().trim().max(50, 'Tag must be less than 50 characters'))
    .default([])
    .refine(tags => tags.length <= 10, 'Maximum 10 tags allowed'),
  isPublished: z.boolean().default(false),
  isPinned: z.boolean().default(false),
});

// Update news article schema
export const UpdateNewsArticleSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(300, 'Title must be less than 300 characters')
    .trim()
    .optional(),
  content: z.string()
    .min(1, 'Content is required')
    .trim()
    .optional(),
  summary: z.string()
    .max(500, 'Summary must be less than 500 characters')
    .trim()
    .optional(),
  category: NewsCategorySchema.optional(),
  tags: z.array(z.string().trim().max(50, 'Tag must be less than 50 characters'))
    .refine(tags => tags.length <= 10, 'Maximum 10 tags allowed')
    .optional(),
  isPublished: z.boolean().optional(),
  isPinned: z.boolean().optional(),
});

// Get news articles query parameters schema
export const GetNewsArticlesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  category: NewsCategorySchema.optional(),
  search: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  published: z.union([
    z.boolean(),
    z.string().transform((val) => val.toLowerCase() === 'true'),
  ]).optional(),
  pinned: z.union([
    z.boolean(),
    z.string().transform((val) => val.toLowerCase() === 'true'),
  ]).optional(),
  author: z.string().optional(), // User ID
  sortBy: z.enum(['publishedAt', 'createdAt', 'updatedAt', 'viewCount', 'title']).default('publishedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// News article ID parameter schema
export const NewsArticleParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid article ID format'),
});

// News article slug parameter schema
export const NewsArticleSlugParamsSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
});

// Bulk operations schema
export const BulkNewsOperationSchema = z.object({
  articleIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid article ID format'))
    .min(1, 'At least one article ID is required')
    .max(50, 'Maximum 50 articles can be processed at once'),
  operation: z.enum(['publish', 'unpublish', 'pin', 'unpin', 'delete']),
});

// News statistics query schema
export const NewsStatsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  category: NewsCategorySchema.optional(),
  author: z.string().optional(),
});

// Type inference from schemas
export type CreateNewsArticleType = z.infer<typeof CreateNewsArticleSchema>;
export type UpdateNewsArticleType = z.infer<typeof UpdateNewsArticleSchema>;
export type GetNewsArticlesQueryType = z.infer<typeof GetNewsArticlesQuerySchema>;
export type NewsArticleParamsType = z.infer<typeof NewsArticleParamsSchema>;
export type NewsArticleSlugParamsType = z.infer<typeof NewsArticleSlugParamsSchema>;
export type BulkNewsOperationType = z.infer<typeof BulkNewsOperationSchema>;
export type NewsStatsQueryType = z.infer<typeof NewsStatsQuerySchema>;
export type NewsCategoryType = z.infer<typeof NewsCategorySchema>;

// Collective export for validation schemas
export const newsValidationSchemas = {
  createArticle: CreateNewsArticleSchema,
  updateArticle: UpdateNewsArticleSchema,
  listArticles: GetNewsArticlesQuerySchema,
  articleParams: NewsArticleParamsSchema,
  articleSlugParams: NewsArticleSlugParamsSchema,
  bulkOperation: BulkNewsOperationSchema,
  statsQuery: NewsStatsQuerySchema,
};
