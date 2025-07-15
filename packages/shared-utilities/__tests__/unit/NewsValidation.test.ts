// packages/shared-utilities/__tests__/unit/NewsValidation.test.ts
// Unit tests for news validation schemas

import {
  CreateNewsArticleSchema,
  UpdateNewsArticleSchema,
  GetNewsArticlesQuerySchema,
  NewsArticleParamsSchema,
  BulkNewsOperationSchema,
  NewsCategorySchema,
} from '../../src/validation/news';

describe('News Validation Schemas', () => {
  describe('NewsCategorySchema', () => {
    it('should accept valid categories', () => {
      expect(NewsCategorySchema.parse('general')).toBe('general');
      expect(NewsCategorySchema.parse('academic')).toBe('academic');
      expect(NewsCategorySchema.parse('events')).toBe('events');
      expect(NewsCategorySchema.parse('announcements')).toBe('announcements');
    });

    it('should reject invalid categories', () => {
      expect(() => NewsCategorySchema.parse('invalid')).toThrow();
      expect(() => NewsCategorySchema.parse('')).toThrow();
    });
  });

  describe('CreateNewsArticleSchema', () => {
    const validArticleData = {
      title: 'Test Article',
      content: 'This is a test article content.',
      summary: 'Test summary',
      category: 'general' as const,
      tags: ['test', 'article'],
      isPublished: true,
      isPinned: false,
    };

    it('should accept valid article data', () => {
      const result = CreateNewsArticleSchema.parse(validArticleData);
      expect(result.title).toBe('Test Article');
      expect(result.content).toBe('This is a test article content.');
      expect(result.category).toBe('general');
      expect(result.tags).toEqual(['test', 'article']);
    });

    it('should apply default values', () => {
      const minimalData = {
        title: 'Test Article',
        content: 'Test content',
      };
      const result = CreateNewsArticleSchema.parse(minimalData);
      expect(result.category).toBe('general');
      expect(result.tags).toEqual([]);
      expect(result.isPublished).toBe(false);
      expect(result.isPinned).toBe(false);
    });

    it('should fail validation without required fields', () => {
      expect(() => CreateNewsArticleSchema.parse({})).toThrow();
      expect(() => CreateNewsArticleSchema.parse({ title: 'Test' })).toThrow();
      expect(() => CreateNewsArticleSchema.parse({ content: 'Test' })).toThrow();
    });

    it('should fail validation with title too long', () => {
      const data = {
        ...validArticleData,
        title: 'A'.repeat(301),
      };
      expect(() => CreateNewsArticleSchema.parse(data)).toThrow();
    });

    it('should fail validation with summary too long', () => {
      const data = {
        ...validArticleData,
        summary: 'A'.repeat(501),
      };
      expect(() => CreateNewsArticleSchema.parse(data)).toThrow();
    });

    it('should fail validation with too many tags', () => {
      const data = {
        ...validArticleData,
        tags: Array(11).fill('tag'), // More than 10 tags
      };
      expect(() => CreateNewsArticleSchema.parse(data)).toThrow();
    });

    it('should fail validation with tag too long', () => {
      const data = {
        ...validArticleData,
        tags: ['A'.repeat(51)], // Tag longer than 50 characters
      };
      expect(() => CreateNewsArticleSchema.parse(data)).toThrow();
    });

    it('should trim whitespace from fields', () => {
      const data = {
        title: '  Test Article  ',
        content: '  Test content  ',
        summary: '  Test summary  ',
        tags: ['  tag1  ', '  tag2  '],
      };
      const result = CreateNewsArticleSchema.parse(data);
      expect(result.title).toBe('Test Article');
      expect(result.content).toBe('Test content');
      expect(result.summary).toBe('Test summary');
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('UpdateNewsArticleSchema', () => {
    it('should accept partial data', () => {
      const updateData = {
        title: 'Updated Title',
        isPublished: true,
      };
      const result = UpdateNewsArticleSchema.parse(updateData);
      expect(result.title).toBe('Updated Title');
      expect(result.isPublished).toBe(true);
      expect(result.content).toBeUndefined();
    });

    it('should accept empty object', () => {
      const result = UpdateNewsArticleSchema.parse({});
      expect(result).toEqual({});
    });

    it('should apply same validation rules as create schema', () => {
      const invalidData = {
        title: 'A'.repeat(301), // Too long
      };
      expect(() => UpdateNewsArticleSchema.parse(invalidData)).toThrow();
    });
  });

  describe('GetNewsArticlesQuerySchema', () => {
    it('should apply default values', () => {
      const result = GetNewsArticlesQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.sortBy).toBe('publishedAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should coerce string numbers to numbers', () => {
      const query = {
        page: '2',
        limit: '20',
      };
      const result = GetNewsArticlesQuerySchema.parse(query);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should validate page and limit ranges', () => {
      expect(() => GetNewsArticlesQuerySchema.parse({ page: 0 })).toThrow();
      expect(() => GetNewsArticlesQuerySchema.parse({ limit: 0 })).toThrow();
      expect(() => GetNewsArticlesQuerySchema.parse({ limit: 101 })).toThrow();
    });

    it('should validate sort parameters', () => {
      const validQuery = {
        sortBy: 'title',
        sortOrder: 'asc',
      };
      const result = GetNewsArticlesQuerySchema.parse(validQuery);
      expect(result.sortBy).toBe('title');
      expect(result.sortOrder).toBe('asc');

      expect(() => GetNewsArticlesQuerySchema.parse({ sortBy: 'invalid' })).toThrow();
      expect(() => GetNewsArticlesQuerySchema.parse({ sortOrder: 'invalid' })).toThrow();
    });

    it('should handle boolean parameters', () => {
      // Test with actual boolean values
      const query1 = {
        published: true,
        pinned: false,
      };
      const result1 = GetNewsArticlesQuerySchema.parse(query1);
      expect(result1.published).toBe(true);
      expect(result1.pinned).toBe(false);

      // Test with string values
      const query2 = {
        published: 'true',
        pinned: 'false',
      };
      const result2 = GetNewsArticlesQuerySchema.parse(query2);
      expect(result2.published).toBe(true);
      expect(result2.pinned).toBe(false);
    });
  });

  describe('NewsArticleParamsSchema', () => {
    it('should accept valid MongoDB ObjectId', () => {
      const validId = '507f1f77bcf86cd799439011';
      const result = NewsArticleParamsSchema.parse({ id: validId });
      expect(result.id).toBe(validId);
    });

    it('should reject invalid ObjectId formats', () => {
      expect(() => NewsArticleParamsSchema.parse({ id: 'invalid-id' })).toThrow();
      expect(() => NewsArticleParamsSchema.parse({ id: '123' })).toThrow();
      expect(() => NewsArticleParamsSchema.parse({ id: '' })).toThrow();
    });
  });

  describe('BulkNewsOperationSchema', () => {
    const validBulkData = {
      articleIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
      operation: 'publish' as const,
    };

    it('should accept valid bulk operation data', () => {
      const result = BulkNewsOperationSchema.parse(validBulkData);
      expect(result.articleIds).toHaveLength(2);
      expect(result.operation).toBe('publish');
    });

    it('should validate operation types', () => {
      const operations = ['publish', 'unpublish', 'pin', 'unpin', 'delete'];
      operations.forEach(operation => {
        const data = { ...validBulkData, operation };
        expect(() => BulkNewsOperationSchema.parse(data)).not.toThrow();
      });

      expect(() => BulkNewsOperationSchema.parse({
        ...validBulkData,
        operation: 'invalid',
      })).toThrow();
    });

    it('should validate article ID array constraints', () => {
      // Empty array
      expect(() => BulkNewsOperationSchema.parse({
        articleIds: [],
        operation: 'publish',
      })).toThrow();

      // Too many IDs
      const tooManyIds = Array(51).fill('507f1f77bcf86cd799439011');
      expect(() => BulkNewsOperationSchema.parse({
        articleIds: tooManyIds,
        operation: 'publish',
      })).toThrow();

      // Invalid ID format
      expect(() => BulkNewsOperationSchema.parse({
        articleIds: ['invalid-id'],
        operation: 'publish',
      })).toThrow();
    });
  });
});