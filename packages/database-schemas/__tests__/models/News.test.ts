import { NewsModel, NewsArticle } from '../../src/models/News';
import { Database } from '../../src/connection/database';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('News Model', () => {
  let mongoServer: MongoMemoryServer;
  let mongoUri: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await Database.connect(mongoUri);
  });

  afterAll(async () => {
    await Database.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await NewsModel.deleteMany({});
  });

  describe('Schema Validation', () => {
    const validNewsData = {
      title: 'Important School Update',
      content: 'This is an important update about school activities and upcoming events.',
      summary: 'Important school update summary',
      author: 'admin-user-123',
      category: 'announcements',
      tags: ['important', 'school', 'update'],
      priority: 'high',
      targetAudience: ['students', 'teachers'],
      status: 'published'
    };

    it('should create news article with valid data', async () => {
      const news = new NewsModel(validNewsData);
      const savedNews = await news.save();
      
      expect(savedNews._id).toBeDefined();
      expect(savedNews.title).toBe('Important School Update');
      expect(savedNews.category).toBe('announcements');
      expect(savedNews.priority).toBe('high');
      expect(savedNews.status).toBe('published');
      expect(savedNews.isActive).toBe(true); // Default value
      expect(savedNews.notificationSent).toBe(false); // Default value
      expect(savedNews.publishedAt).toBeDefined();
    });

    it('should set default values correctly', async () => {
      const minimalNews = new NewsModel({
        title: 'Test Article',
        content: 'Test content',
        author: 'test-author'
      });
      
      const savedNews = await minimalNews.save();
      expect(savedNews.category).toBe('general'); // Default
      expect(savedNews.priority).toBe('medium'); // Default
      expect(savedNews.status).toBe('draft'); // Default
      expect(savedNews.targetAudience).toEqual(['all']); // Default
      expect(savedNews.isActive).toBe(true); // Default
      expect(savedNews.notificationSent).toBe(false); // Default
    });

    it('should fail validation for missing required fields', async () => {
      const invalidNews = new NewsModel({
        title: 'Test Title'
        // Missing content and author
      });
      
      await expect(invalidNews.save()).rejects.toThrow();
    });

    it('should fail validation for invalid title length', async () => {
      const invalidNews = new NewsModel({
        title: 'A'.repeat(201), // Too long
        content: 'Test content',
        author: 'test-author'
      });
      
      await expect(invalidNews.save()).rejects.toThrow();
    });

    it('should fail validation for invalid summary length', async () => {
      const invalidNews = new NewsModel({
        title: 'Test Title',
        content: 'Test content',
        summary: 'A'.repeat(501), // Too long
        author: 'test-author'
      });
      
      await expect(invalidNews.save()).rejects.toThrow();
    });

    it('should fail validation for invalid category', async () => {
      const invalidNews = new NewsModel({
        title: 'Test Title',
        content: 'Test content',
        author: 'test-author',
        category: 'invalid-category'
      });
      
      await expect(invalidNews.save()).rejects.toThrow();
    });

    it('should fail validation for invalid status', async () => {
      const invalidNews = new NewsModel({
        title: 'Test Title',
        content: 'Test content',
        author: 'test-author',
        status: 'invalid-status' as any
      });
      
      await expect(invalidNews.save()).rejects.toThrow();
    });

    it('should fail validation for invalid priority', async () => {
      const invalidNews = new NewsModel({
        title: 'Test Title',
        content: 'Test content',
        author: 'test-author',
        priority: 'invalid-priority' as any
      });
      
      await expect(invalidNews.save()).rejects.toThrow();
    });

    it('should fail validation for invalid target audience', async () => {
      const invalidNews = new NewsModel({
        title: 'Test Title',
        content: 'Test content',
        author: 'test-author',
        targetAudience: ['invalid-audience'] as any
      });
      
      await expect(invalidNews.save()).rejects.toThrow();
    });
  });

  describe('Pre-save Middleware', () => {
    it('should set publishedAt when status changes to published', async () => {
      const news = new NewsModel({
        title: 'Test Article',
        content: 'Test content',
        author: 'test-author',
        status: 'draft'
      });
      
      const savedNews = await news.save();
      expect(savedNews.publishedAt).toBeUndefined();
      
      savedNews.status = 'published';
      await savedNews.save();
      expect(savedNews.publishedAt).toBeDefined();
      expect(savedNews.publishedAt).toBeInstanceOf(Date);
    });

    it('should not override existing publishedAt', async () => {
      const publishedDate = new Date('2024-01-01');
      const news = new NewsModel({
        title: 'Test Article',
        content: 'Test content',
        author: 'test-author',
        status: 'published',
        publishedAt: publishedDate
      });
      
      const savedNews = await news.save();
      expect(savedNews.publishedAt).toEqual(publishedDate);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test news articles
      const articles = [
        {
          title: 'Published General News',
          content: 'General news content',
          author: 'author1',
          category: 'general',
          status: 'published',
          priority: 'medium',
          targetAudience: ['all'],
          publishedAt: new Date('2024-01-15'),
          isActive: true
        },
        {
          title: 'Published Academic News',
          content: 'Academic news content',
          author: 'author2',
          category: 'academic',
          status: 'published',
          priority: 'high',
          targetAudience: ['students', 'teachers'],
          publishedAt: new Date('2024-01-20'),
          isActive: true
        },
        {
          title: 'Draft News',
          content: 'Draft news content',
          author: 'author1',
          category: 'general',
          status: 'draft',
          priority: 'low',
          targetAudience: ['all'],
          isActive: true
        },
        {
          title: 'Archived News',
          content: 'Archived news content',
          author: 'author2',
          category: 'announcements',
          status: 'archived',
          priority: 'medium',
          targetAudience: ['staff'],
          publishedAt: new Date('2024-01-10'),
          isActive: true
        },
        {
          title: 'Inactive News',
          content: 'Inactive news content',
          author: 'author1',
          category: 'general',
          status: 'published',
          priority: 'medium',
          targetAudience: ['all'],
          publishedAt: new Date('2024-01-12'),
          isActive: false
        }
      ];

      await NewsModel.insertMany(articles);
    });

    describe('findPublished', () => {
      it('should find only published and active articles', async () => {
        const articles = await NewsModel.findPublished();
        expect(articles).toHaveLength(2);
        expect(articles.every(a => a.status === 'published' && a.isActive)).toBe(true);
      });

      it('should sort by published date descending', async () => {
        const articles = await NewsModel.findPublished();
        expect(articles[0].publishedAt!.getTime()).toBeGreaterThan(articles[1].publishedAt!.getTime());
      });
    });

    describe('findByCategory', () => {
      it('should find articles by category', async () => {
        const articles = await NewsModel.findByCategory('academic');
        expect(articles).toHaveLength(1);
        expect(articles[0].category).toBe('academic');
        expect(articles[0].status).toBe('published');
        expect(articles[0].isActive).toBe(true);
      });

      it('should return empty array for non-existent category', async () => {
        const articles = await NewsModel.findByCategory('non-existent');
        expect(articles).toHaveLength(0);
      });
    });

    describe('findByAuthor', () => {
      it('should find articles by author', async () => {
        const articles = await NewsModel.findByAuthor('author1');
        expect(articles).toHaveLength(3);
        expect(articles.every(a => a.author === 'author1')).toBe(true);
      });

      it('should sort by creation date descending', async () => {
        const articles = await NewsModel.findByAuthor('author1');
        for (let i = 1; i < articles.length; i++) {
          expect(articles[i-1].createdAt.getTime()).toBeGreaterThanOrEqual(articles[i].createdAt.getTime());
        }
      });
    });

    describe('findForAudience', () => {
      it('should find articles for specific audience', async () => {
        const articles = await NewsModel.findForAudience(['students']);
        expect(articles).toHaveLength(2); // One with 'all', one with 'students'
        expect(articles.every(a => a.status === 'published' && a.isActive)).toBe(true);
      });

      it('should include articles for "all" audience', async () => {
        const articles = await NewsModel.findForAudience(['teachers']);
        expect(articles).toHaveLength(2); // One with 'all', one with 'teachers'
      });

      it('should sort by priority and published date', async () => {
        const articles = await NewsModel.findForAudience(['students']);
        // High priority should come first
        expect(articles[0].priority).toBe('high');
      });
    });

    describe('markAsRead', () => {
      it('should mark article as read by user', async () => {
        const article = await NewsModel.findOne({ status: 'published' });
        const userId = 'user123';
        
        const result = await NewsModel.markAsRead((article!._id as any).toString(), userId);
        expect(result).toBe(true);
        
        const updatedArticle = await NewsModel.findById(article!._id);
        expect(updatedArticle!.readBy).toContain(userId);
      });

      it('should not duplicate user in readBy array', async () => {
        const article = await NewsModel.findOne({ status: 'published' });
        const userId = 'user123';
        
        // Mark as read twice
        await NewsModel.markAsRead((article!._id as any).toString(), userId);
        await NewsModel.markAsRead((article!._id as any).toString(), userId);
        
        const updatedArticle = await NewsModel.findById(article!._id);
        const userCount = updatedArticle!.readBy.filter(id => id === userId).length;
        expect(userCount).toBe(1);
      });

      it('should return false for non-existent article', async () => {
        const result = await NewsModel.markAsRead('507f1f77bcf86cd799439011', 'user123');
        expect(result).toBe(false);
      });
    });

    describe('searchArticles', () => {
      it('should search articles by text', async () => {
        const articles = await NewsModel.searchArticles('Academic');
        expect(articles).toHaveLength(1);
        expect(articles[0].title).toContain('Academic');
      });

      it('should only return published and active articles', async () => {
        const articles = await NewsModel.searchArticles('news');
        expect(articles.every(a => a.status === 'published' && a.isActive)).toBe(true);
      });

      it('should return empty array for no matches', async () => {
        const articles = await NewsModel.searchArticles('nonexistent');
        expect(articles).toHaveLength(0);
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle article with full feature set', async () => {
      const complexArticle = new NewsModel({
        title: 'Complex News Article',
        content: 'This is a complex news article with all features enabled.',
        summary: 'A complex article summary',
        author: 'complex-author',
        category: 'events',
        tags: ['event', 'important', 'deadline'],
        status: 'published',
        featuredImage: 'https://example.com/image.jpg',
        priority: 'urgent',
        targetAudience: ['students', 'teachers', 'staff'],
        notificationSent: true,
        readBy: ['user1', 'user2', 'user3']
      });
      
      const savedArticle = await complexArticle.save();
      expect(savedArticle.title).toBe('Complex News Article');
      expect(savedArticle.tags).toEqual(['event', 'important', 'deadline']);
      expect(savedArticle.featuredImage).toBe('https://example.com/image.jpg');
      expect(savedArticle.targetAudience).toEqual(['students', 'teachers', 'staff']);
      expect(savedArticle.readBy).toEqual(['user1', 'user2', 'user3']);
      expect(savedArticle.publishedAt).toBeDefined();
    });

    it('should handle article lifecycle', async () => {
      // Create draft
      const article = new NewsModel({
        title: 'Lifecycle Article',
        content: 'Article content',
        author: 'test-author',
        status: 'draft'
      });
      
      let savedArticle = await article.save();
      expect(savedArticle.status).toBe('draft');
      expect(savedArticle.publishedAt).toBeUndefined();
      
      // Publish
      savedArticle.status = 'published';
      savedArticle = await savedArticle.save();
      expect(savedArticle.status).toBe('published');
      expect(savedArticle.publishedAt).toBeDefined();
      
      // Archive
      savedArticle.status = 'archived';
      savedArticle = await savedArticle.save();
      expect(savedArticle.status).toBe('archived');
      
      // Deactivate
      savedArticle.isActive = false;
      savedArticle = await savedArticle.save();
      expect(savedArticle.isActive).toBe(false);
    });

    it('should handle multiple readers', async () => {
      const article = new NewsModel({
        title: 'Multi-Reader Article',
        content: 'Article content',
        author: 'test-author',
        status: 'published'
      });
      
      const savedArticle = await article.save();
      
      // Multiple users read the article
      const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
      for (const userId of users) {
        await NewsModel.markAsRead((savedArticle._id as any).toString(), userId);
      }
      
      const updatedArticle = await NewsModel.findById(savedArticle._id);
      expect(updatedArticle!.readBy).toHaveLength(5);
      expect(updatedArticle!.readBy).toEqual(expect.arrayContaining(users));
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tags array', async () => {
      const article = new NewsModel({
        title: 'No Tags Article',
        content: 'Article content',
        author: 'test-author',
        tags: []
      });
      
      const savedArticle = await article.save();
      expect(savedArticle.tags).toEqual([]);
    });

    it('should handle null featured image', async () => {
      const article = new NewsModel({
        title: 'No Image Article',
        content: 'Article content',
        author: 'test-author',
        featuredImage: null
      });
      
      const savedArticle = await article.save();
      expect(savedArticle.featuredImage).toBeNull();
    });

    it('should handle undefined summary', async () => {
      const article = new NewsModel({
        title: 'No Summary Article',
        content: 'Article content',
        author: 'test-author'
      });
      
      const savedArticle = await article.save();
      expect(savedArticle.summary).toBeUndefined();
    });
  });
});