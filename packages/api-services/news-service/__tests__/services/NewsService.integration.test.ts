import { NewsService } from '../../src/services/NewsService';
import { NewsModel } from '@101-school/database-schemas';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { NewsCategory, ArticlePriority } from '../../src/types/news';

describe('NewsService Integration Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Disconnect any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    // Clear database before each test
    await NewsModel.deleteMany({});
  });

  afterAll(async () => {
    // Clean up and close connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoServer.stop();
  });

  describe('Article Creation', () => {
    it('should create an article successfully', async () => {
      const articleData = {
        title: 'Test Article',
        content: 'This is a test article content.',
        excerpt: 'Test excerpt',
        category: 'general' as NewsCategory,
        tags: ['test', 'article'],
        status: 'draft' as any,
        priority: 'normal' as ArticlePriority
      };

      const result = await NewsService.createArticle(articleData, 'test-author-id');

      expect(result.success).toBe(true);
      expect(result.article).toBeDefined();
      expect(result.article.title).toBe('Test Article');
      expect(result.article.content).toBe('This is a test article content.');
      expect(result.article.status).toBe('draft');
      expect(result.article.author).toBe('test-author-id');
    });

    it('should create a published article', async () => {
      const articleData = {
        title: 'Published Article',
        content: 'This is a published article.',
        excerpt: 'Published excerpt',
        category: 'academic' as NewsCategory,
        tags: ['published'],
        status: 'published' as any,
        priority: 'high' as ArticlePriority
      };

      const result = await NewsService.createArticle(articleData, 'test-author-id');

      expect(result.success).toBe(true);
      expect(result.article.status).toBe('published');
      expect(result.article.publishedAt).toBeDefined();
    });

    it('should fail to create article without required fields', async () => {
      const incompleteData = {
        title: '',
        content: '',
        category: 'general' as NewsCategory
      };

      const result = await NewsService.createArticle(incompleteData, 'test-author-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Title and content are required');
    });
  });

  describe('Article Retrieval', () => {
    it('should retrieve article by ID', async () => {
      // First create an article
      const articleData = {
        title: 'Retrieve Test Article',
        content: 'Content for retrieval test.',
        excerpt: 'Retrieval excerpt',
        category: 'general' as NewsCategory,
        tags: ['retrieve'],
        status: 'published' as any,
        priority: 'normal' as ArticlePriority
      };

      const createResult = await NewsService.createArticle(articleData, 'test-author-id');
      expect(createResult.success).toBe(true);

      // Then retrieve it
      const articleId = createResult.article._id.toString();
      const retrieveResult = await NewsService.getArticle(articleId);

      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.article).toBeDefined();
      expect(retrieveResult.article.title).toBe('Retrieve Test Article');
    });

    it('should return error for non-existent article', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await NewsService.getArticle(fakeId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Article not found');
    });
  });

  describe('Article Search', () => {
    beforeEach(async () => {
      // Create test articles
      const testArticles = [
        {
          title: 'Academic Update',
          content: 'Important academic information',
          excerpt: 'Academic excerpt',
          category: 'academic' as NewsCategory,
          tags: ['academic', 'update'],
          status: 'published' as any,
          priority: 'high' as ArticlePriority
        },
        {
          title: 'Event News',
          content: 'Latest event updates',
          excerpt: 'Event excerpt',
          category: 'events' as NewsCategory,
          tags: ['events', 'news'],
          status: 'published' as any,
          priority: 'normal' as ArticlePriority
        },
        {
          title: 'Draft Article',
          content: 'This is a draft',
          excerpt: 'Draft excerpt',
          category: 'general' as NewsCategory,
          tags: ['draft'],
          status: 'draft' as any,
          priority: 'low' as ArticlePriority
        }
      ];

      for (const articleData of testArticles) {
        await NewsService.createArticle(articleData, 'test-author-id');
      }
    });

    it('should search published articles', async () => {
      const filters = {
        limit: 10,
        offset: 0
      };

      const result = await NewsService.searchArticles(filters);

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(2); // Only published articles
      expect(result.pagination?.total).toBe(2);
    });

    it('should filter articles by category', async () => {
      const filters = {
        category: 'academic' as NewsCategory,
        limit: 10,
        offset: 0
      };

      const result = await NewsService.searchArticles(filters);

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(1);
      expect(result.articles?.[0].category).toBe('academic');
    });

    it('should filter articles by priority', async () => {
      const filters = {
        priority: 'high' as ArticlePriority,
        limit: 10,
        offset: 0
      };

      const result = await NewsService.searchArticles(filters);

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(1);
      expect(result.articles?.[0].priority).toBe('high');
    });

    it('should handle pagination correctly', async () => {
      const filters = {
        limit: 1,
        offset: 0
      };

      const result = await NewsService.searchArticles(filters);

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(1);
      expect(result.pagination?.hasMore).toBe(true);
      expect(result.pagination?.total).toBe(2);
    });
  });

  describe('Article Updates', () => {
    it('should update article successfully', async () => {
      // Create article
      const articleData = {
        title: 'Original Title',
        content: 'Original content',
        excerpt: 'Original excerpt',
        category: 'general' as NewsCategory,
        tags: ['original'],
        isPublished: false
      };

      const createResult = await NewsService.createArticle(articleData, 'test-author-id');
      expect(createResult.success).toBe(true);

      // Update article
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        excerpt: 'Updated excerpt',
        status: 'published' as any
      };

      const updateResult = await NewsService.updateArticle(
        createResult.article._id.toString(),
        updateData,
        'test-author-id'
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.article.title).toBe('Updated Title');
      expect(updateResult.article.content).toBe('Updated content');
      expect(updateResult.article.status).toBe('published');
    });

    it('should fail to update non-existent article', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updateData = { title: 'New Title' };

      const result = await NewsService.updateArticle(fakeId, updateData, 'test-author-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Article not found');
    });

    it('should fail to update article without permission', async () => {
      // Create article with one author
      const articleData = {
        title: 'Protected Article',
        content: 'Content that should be protected',
        excerpt: 'Protected excerpt',
        category: 'general' as NewsCategory,
        tags: ['protected'],
        isPublished: false
      };

      const createResult = await NewsService.createArticle(articleData, 'original-author');
      expect(createResult.success).toBe(true);

      // Try to update with different author
      const updateData = { title: 'Hacked Title' };
      const updateResult = await NewsService.updateArticle(
        createResult.article._id.toString(),
        updateData,
        'different-author'
      );

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Insufficient permissions to edit this article');
    });
  });

  describe('Article Deletion', () => {
    it('should soft delete article successfully', async () => {
      // Create article
      const articleData = {
        title: 'Article to Delete',
        content: 'This article will be deleted',
        excerpt: 'Delete excerpt',
        category: 'general' as NewsCategory,
        tags: ['delete'],
        status: 'published' as any
      };

      const createResult = await NewsService.createArticle(articleData, 'test-author-id');
      expect(createResult.success).toBe(true);

      // Delete article
      const deleteResult = await NewsService.deleteArticle(
        createResult.article._id.toString(),
        'test-author-id'
      );

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.message).toBe('Article deleted successfully');

      // Verify article is not returned in searches
      const searchResult = await NewsService.searchArticles({ limit: 10, offset: 0 });
      expect(searchResult.articles?.find(a => a._id.toString() === createResult.article._id.toString())).toBeUndefined();
    });
  });

  describe('Featured Articles', () => {
    it('should retrieve featured articles', async () => {
      // Create high priority articles
      const featuredArticle = {
        title: 'Important Announcement',
        content: 'This is very important',
        excerpt: 'Important excerpt',
        category: 'general' as NewsCategory,
        tags: ['important'],
        status: 'published' as any,
        priority: 'high' as ArticlePriority
      };

      await NewsService.createArticle(featuredArticle, 'test-author-id');

      const result = await NewsService.getFeaturedArticles(5);

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(1);
      expect(result.articles?.[0].priority).toBe('high');
    });
  });

  describe('Read Tracking', () => {
    it('should mark article as read by user', async () => {
      // Create article
      const articleData = {
        title: 'Article to Read',
        content: 'This article will be marked as read',
        excerpt: 'Read excerpt',
        category: 'general' as NewsCategory,
        tags: ['read'],
        status: 'published' as any,
        priority: 'normal' as ArticlePriority
      };

      const createResult = await NewsService.createArticle(articleData, 'test-author-id');
      expect(createResult.success).toBe(true);

      // Mark as read
      const readResult = await NewsService.markAsRead(
        createResult.article._id.toString(),
        'reader-user-id'
      );

      expect(readResult.success).toBe(true);

      // Verify read status
      const article = await NewsModel.findById(createResult.article._id);
      expect(article?.readBy).toContain('reader-user-id');
    });
  });
});