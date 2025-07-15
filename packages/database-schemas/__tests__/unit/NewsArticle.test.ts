// packages/database-schemas/__tests__/unit/NewsArticle.test.ts
// Unit tests for NewsArticle model

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NewsArticleModel, NewsArticleDocument } from '../../src/models/NewsArticle';
import { UserModel } from '../../src/models/User';
import { UserRole } from '@yggdrasil/shared-utilities';

describe('NewsArticle Model', () => {
  let mongoServer: MongoMemoryServer;
  let authorUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create a test author user
    const userData = {
      email: 'staff@example.com',
      password: 'Password123!',
      role: 'staff' as UserRole,
      profile: {
        firstName: 'Staff',
        lastName: 'Member',
      },
    };
    authorUser = await UserModel.create(userData);
  });

  afterEach(async () => {
    await NewsArticleModel.deleteMany({});
    await UserModel.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid news article with all required fields', async () => {
      const articleData = {
        title: 'Test News Article',
        content: '# Test Article\n\nThis is a test article with **markdown** content.',
        summary: 'A brief summary of the test article',
        category: 'general',
        tags: ['test', 'announcement'],
        author: {
          userId: authorUser._id,
          name: `${authorUser.profile.firstName} ${authorUser.profile.lastName}`,
          role: authorUser.role,
        },
        isPublished: true,
        isPinned: false,
      };

      const article = new NewsArticleModel(articleData);
      const savedArticle = await article.save();

      expect(savedArticle.title).toBe('Test News Article');
      expect(savedArticle.content).toContain('markdown');
      expect(savedArticle.category).toBe('general');
      expect(savedArticle.tags).toEqual(['test', 'announcement']);
      expect(savedArticle.author.userId.toString()).toBe(authorUser._id.toString());
      expect(savedArticle.isPublished).toBe(true);
      expect(savedArticle.isPinned).toBe(false);
      expect(savedArticle.viewCount).toBe(0);
      expect(savedArticle.publishedAt).toBeDefined();
    });

    it('should fail validation without required fields', async () => {
      const article = new NewsArticleModel({});
      
      await expect(article.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should fail validation with invalid category', async () => {
      const articleData = {
        title: 'Test Article',
        content: 'Test content',
        category: 'invalid-category',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
      };

      const article = new NewsArticleModel(articleData);
      
      await expect(article.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should fail validation with title too long', async () => {
      const longTitle = 'A'.repeat(301); // Over 300 character limit
      const articleData = {
        title: longTitle,
        content: 'Test content',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
      };

      const article = new NewsArticleModel(articleData);
      
      await expect(article.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('should trim whitespace from title and content', async () => {
      const articleData = {
        title: '  Test Article  ',
        content: '  Test content with whitespace  ',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
      };

      const article = new NewsArticleModel(articleData);
      const savedArticle = await article.save();

      expect(savedArticle.title).toBe('Test Article');
      expect(savedArticle.content).toBe('Test content with whitespace');
    });
  });

  describe('Auto-generated Fields', () => {
    it('should auto-generate slug from title', async () => {
      const articleData = {
        title: 'This is a Test Article Title!',
        content: 'Test content',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
      };

      const article = new NewsArticleModel(articleData);
      const savedArticle = await article.save();

      expect(savedArticle.slug).toBe('this-is-a-test-article-title');
    });

    it('should auto-generate unique slug for duplicate titles', async () => {
      const articleData1 = {
        title: 'Duplicate Title',
        content: 'First article',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
      };

      const articleData2 = {
        title: 'Duplicate Title',
        content: 'Second article',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
      };

      const article1 = await NewsArticleModel.create(articleData1);
      const article2 = await NewsArticleModel.create(articleData2);

      expect(article1.slug).toBe('duplicate-title');
      expect(article2.slug).toMatch(/^duplicate-title-\w+$/);
    });

    it('should set publishedAt when isPublished is true', async () => {
      const articleData = {
        title: 'Published Article',
        content: 'Test content',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
        isPublished: true,
      };

      const article = new NewsArticleModel(articleData);
      const savedArticle = await article.save();

      expect(savedArticle.publishedAt).toBeDefined();
      expect(savedArticle.publishedAt).toBeInstanceOf(Date);
    });

    it('should not set publishedAt when isPublished is false', async () => {
      const articleData = {
        title: 'Draft Article',
        content: 'Test content',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
        isPublished: false,
      };

      const article = new NewsArticleModel(articleData);
      const savedArticle = await article.save();

      expect(savedArticle.publishedAt).toBeUndefined();
    });
  });

  describe('Instance Methods', () => {
    it('should increment view count', async () => {
      const articleData = {
        title: 'View Count Test',
        content: 'Test content',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
        isPublished: true,
      };

      const article = await NewsArticleModel.create(articleData);
      expect(article.viewCount).toBe(0);

      await article.incrementViewCount();
      expect(article.viewCount).toBe(1);

      await article.incrementViewCount();
      expect(article.viewCount).toBe(2);
    });

    it('should publish article', async () => {
      const articleData = {
        title: 'Draft Article',
        content: 'Test content',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
        isPublished: false,
      };

      const article = await NewsArticleModel.create(articleData);
      expect(article.isPublished).toBe(false);
      expect(article.publishedAt).toBeUndefined();

      await article.publish();
      expect(article.isPublished).toBe(true);
      expect(article.publishedAt).toBeDefined();
    });

    it('should unpublish article', async () => {
      const articleData = {
        title: 'Published Article',
        content: 'Test content',
        author: {
          userId: authorUser._id,
          name: 'Staff Member',
          role: 'staff',
        },
        isPublished: true,
      };

      const article = await NewsArticleModel.create(articleData);
      expect(article.isPublished).toBe(true);
      expect(article.publishedAt).toBeDefined();

      await article.unpublish();
      expect(article.isPublished).toBe(false);
      expect(article.publishedAt).toBeUndefined();
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      const articles = [
        {
          title: 'Published General Article',
          content: 'General content',
          category: 'general',
          tags: ['general', 'test'],
          author: {
            userId: authorUser._id,
            name: 'Staff Member',
            role: 'staff',
          },
          isPublished: true,
          isPinned: false,
        },
        {
          title: 'Pinned Academic Article',
          content: 'Academic content',
          category: 'academic',
          tags: ['academic', 'important'],
          author: {
            userId: authorUser._id,
            name: 'Staff Member',
            role: 'staff',
          },
          isPublished: true,
          isPinned: true,
        },
        {
          title: 'Draft Article',
          content: 'Draft content',
          category: 'general',
          author: {
            userId: authorUser._id,
            name: 'Staff Member',
            role: 'staff',
          },
          isPublished: false,
          isPinned: false,
        },
      ];

      // Use create instead of insertMany to trigger pre-save middleware
      for (const articleData of articles) {
        await NewsArticleModel.create(articleData);
      }
    });

    it('should find published articles only', async () => {
      const published = await NewsArticleModel.findPublished();
      expect(published).toHaveLength(2);
      expect(published.every(a => a.isPublished)).toBe(true);
    });

    it('should find pinned articles only', async () => {
      const pinned = await NewsArticleModel.findPinned();
      expect(pinned).toHaveLength(1);
      expect(pinned[0].isPinned).toBe(true);
      expect(pinned[0].title).toBe('Pinned Academic Article');
    });

    it('should find articles by category', async () => {
      const general = await NewsArticleModel.findByCategory('general');
      expect(general).toHaveLength(1); // Only published general article
      expect(general[0].category).toBe('general');
      expect(general[0].isPublished).toBe(true);
    });

    it('should search articles by title and content', async () => {
      const results = await NewsArticleModel.searchArticles('academic');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Pinned Academic Article');
    });

    it('should find articles by tag', async () => {
      const results = await NewsArticleModel.findByTag('important');
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('important');
    });

    it('should get recent articles with limit', async () => {
      const recent = await NewsArticleModel.getRecent(1);
      expect(recent).toHaveLength(1);
      expect(recent[0].isPublished).toBe(true);
    });
  });

  describe('Indexes and Performance', () => {
    it('should have proper indexes for performance', async () => {
      const indexes = await NewsArticleModel.collection.getIndexes();
      
      // Check for key performance indexes
      expect(indexes).toHaveProperty('publishedAt_-1');
      expect(indexes).toHaveProperty('category_1');
      expect(indexes).toHaveProperty('tags_1');
      expect(indexes).toHaveProperty('isPublished_1');
      expect(indexes).toHaveProperty('slug_1');
    });
  });
});