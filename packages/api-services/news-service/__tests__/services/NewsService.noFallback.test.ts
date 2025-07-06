/**
 * Test suite to ensure NewsService no longer uses in-memory fallback
 * All operations should require MongoDB connection
 */

import { NewsService } from '../../src/services/NewsService';
import { NewsModel } from '@101-school/database-schemas/src/models/News';

// Mock the NewsModel to simulate database failures
jest.mock('@101-school/database-schemas/src/models/News');

describe('NewsService - MongoDB-Only Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createArticle', () => {
    it('should fail when MongoDB is unavailable (no fallback)', async () => {
      // Mock MongoDB to throw an error
      const mockNewsModel = jest.mocked(NewsModel);
      mockNewsModel.prototype.save = jest.fn().mockRejectedValue(new Error('MongoDB connection failed'));

      const articleData = {
        title: 'Test Article',
        content: 'Test content',
        category: 'announcement' as const,
        tags: ['test'],
        status: 'draft' as const,
        visibility: 'public' as const,
        priority: 'normal' as const
      };

      const result = await NewsService.createArticle(articleData, 'author-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create article');
      // Should NOT have fallback to in-memory storage
      expect(result.error).not.toContain('using in-memory storage');
    });

    it('should succeed when MongoDB is available', async () => {
      // Mock successful MongoDB operation
      const mockArticle = {
        _id: 'article-123',
        title: 'Test Article',
        content: 'Test content',
        summary: '',
        author: 'author-id',
        category: 'announcement',
        tags: ['test'],
        status: 'draft',
        featuredImage: undefined,
        priority: 'normal',
        targetAudience: ['all'],
        notificationSent: false,
        readBy: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockNewsModel = jest.mocked(NewsModel);
      mockNewsModel.prototype.save = jest.fn().mockResolvedValue(mockArticle);

      const articleData = {
        title: 'Test Article',
        content: 'Test content',
        category: 'announcement' as const,
        tags: ['test'],
        status: 'draft' as const,
        visibility: 'public' as const,
        priority: 'normal' as const
      };

      const result = await NewsService.createArticle(articleData, 'author-id');

      expect(result.success).toBe(true);
      expect(result.article).toEqual(mockArticle);
      expect(mockNewsModel.prototype.save).toHaveBeenCalled();
    });
  });

  describe('getArticle', () => {
    it('should fail when MongoDB is unavailable (no fallback)', async () => {
      // Mock MongoDB to throw an error
      const mockNewsModel = jest.mocked(NewsModel);
      mockNewsModel.findOne = jest.fn().mockRejectedValue(new Error('MongoDB connection failed'));

      const result = await NewsService.getArticle('article-id', 'user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get article');
      // Should NOT have fallback to in-memory storage
      expect(result.error).not.toContain('using in-memory storage');
    });
  });

  describe('searchArticles', () => {
    it('should fail when MongoDB is unavailable (no fallback)', async () => {
      // Mock MongoDB to throw an error
      const mockNewsModel = jest.mocked(NewsModel);
      mockNewsModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockRejectedValue(new Error('MongoDB connection failed'))
            })
          })
        })
      });
      mockNewsModel.countDocuments = jest.fn().mockRejectedValue(new Error('MongoDB connection failed'));

      const result = await NewsService.searchArticles({}, 'user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to search articles');
      // Should NOT have fallback to in-memory storage
      expect(result.error).not.toContain('using in-memory storage');
    });
  });

  describe('updateArticle', () => {
    it('should fail when MongoDB is unavailable (no fallback)', async () => {
      // Mock MongoDB to throw an error
      const mockNewsModel = jest.mocked(NewsModel);
      mockNewsModel.findOneAndUpdate = jest.fn().mockRejectedValue(new Error('MongoDB connection failed'));

      const updateData = {
        title: 'Updated Title',
        content: 'Updated content'
      };

      const result = await NewsService.updateArticle('article-id', updateData, 'user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update article');
      // Should NOT have fallback to in-memory storage
      expect(result.error).not.toContain('using in-memory storage');
    });
  });

  describe('deleteArticle', () => {
    it('should fail when MongoDB is unavailable (no fallback)', async () => {
      // Mock MongoDB to throw an error
      const mockNewsModel = jest.mocked(NewsModel);
      mockNewsModel.findOneAndUpdate = jest.fn().mockRejectedValue(new Error('MongoDB connection failed'));

      const result = await NewsService.deleteArticle('article-id', 'user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to delete article');
      // Should NOT have fallback to in-memory storage
      expect(result.error).not.toContain('using in-memory storage');
    });
  });

  describe('No In-Memory Storage Variables', () => {
    it('should not expose in-memory storage variables', () => {
      // Ensure the service doesn't export or use in-memory storage
      const serviceKeys = Object.keys(NewsService);
      
      expect(serviceKeys).not.toContain('articleStorage');
      expect(serviceKeys).not.toContain('commentStorage');
      expect(serviceKeys).not.toContain('articleIdCounter');
      expect(serviceKeys).not.toContain('commentIdCounter');
    });
  });
});