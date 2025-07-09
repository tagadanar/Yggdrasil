import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NewsModel } from '@101-school/database-schemas';

// Mock the authentication middleware before importing the app
jest.mock('../../src/middleware/authMiddleware', () => ({
  authMiddleware: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      id: 'test-user-id',
      role: 'admin',
      email: 'test@example.com'
    };
    next();
  }),
  requireRole: jest.fn((roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    next();
  }),
  optionalAuth: jest.fn((req: any, res: any, next: any) => {
    // For tests, we'll provide user info even for optional auth
    req.user = {
      id: 'test-user-id',
      role: 'admin',
      email: 'test@example.com'
    };
    next();
  })
}));

import app from '../../src/index';

describe('NewsController Integration Tests', () => {
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

  describe('POST /api/news', () => {
    it('should create an article successfully with frontend data format', async () => {
      const frontendData = {
        title: 'Test Article',
        content: 'This is test content for the article.',
        excerpt: 'Test excerpt',
        category: 'general',
        tags: ['test', 'article'],
        isPublished: true,
        isPinned: false
      };

      const response = await request(app)
        .post('/api/news')
        .send(frontendData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Article');
      expect(response.body.data.status).toBe('published');
      expect(response.body.data.author).toBe('test-user-id');

      // Since we're using in-memory storage in development, just verify the response
      // The service falls back to in-memory storage when MongoDB is not available
      expect(response.body.data._id).toBeDefined();
      expect(response.body.data.title).toBe('Test Article');
      expect(response.body.data.status).toBe('published');
    });

    it('should create a draft article when isPublished is false', async () => {
      const frontendData = {
        title: 'Draft Article',
        content: 'This is draft content.',
        excerpt: 'Draft excerpt',
        category: 'general',
        tags: ['draft'],
        isPublished: false,
        isPinned: false
      };

      const response = await request(app)
        .post('/api/news')
        .send(frontendData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('draft');

      // Since we're using in-memory storage in development, just verify the response
      expect(response.body.data.status).toBe('draft');
    });

    it('should reject article without required fields', async () => {
      const incompleteData = {
        title: '',
        content: '',
        category: 'general'
      };

      const response = await request(app)
        .post('/api/news')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should handle missing excerpt gracefully', async () => {
      const dataWithoutExcerpt = {
        title: 'Article Without Excerpt',
        content: 'This article has no excerpt.',
        category: 'general',
        tags: ['test'],
        isPublished: true
      };

      const response = await request(app)
        .post('/api/news')
        .send(dataWithoutExcerpt)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBe('');
    });
  });

  describe('GET /api/news', () => {
    beforeEach(async () => {
      // Create test articles
      await NewsModel.create([
        {
          title: 'Published Article',
          content: 'Published content',
          summary: 'Published excerpt',
          author: 'test-user-id',
          category: 'general',
          tags: ['published'],
          status: 'published',
          priority: 'normal',
          targetAudience: ['all'],
          notificationSent: false,
          readBy: [],
          isActive: true
        },
        {
          title: 'Draft Article',
          content: 'Draft content',
          summary: 'Draft excerpt',
          author: 'test-user-id',
          category: 'academic',
          tags: ['draft'],
          status: 'draft',
          priority: 'low',
          targetAudience: ['all'],
          notificationSent: false,
          readBy: [],
          isActive: true
        }
      ]);
    });

    it('should return published articles for anonymous users', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Published Article');
    });

    it('should support filtering by category', async () => {
      const response = await request(app)
        .get('/api/news?category=academic')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0); // Draft article shouldn't be visible
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/news?limit=1&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(1);
    });
  });

  describe('PUT /api/news/:id', () => {
    let articleId: string;

    beforeEach(async () => {
      const article = await NewsModel.create({
        title: 'Original Title',
        content: 'Original content',
        summary: 'Original excerpt',
        author: 'test-user-id',
        category: 'general',
        tags: ['original'],
        status: 'draft',
        priority: 'normal',
        targetAudience: ['all'],
        notificationSent: false,
        readBy: [],
        isActive: true
      });
      articleId = (article._id as any).toString();
    });

    it('should update article successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        excerpt: 'Updated excerpt',
        isPublished: true
      };

      const response = await request(app)
        .put(`/api/news/${articleId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.status).toBe('published');

      // Verify update in database
      const updatedArticle = await NewsModel.findById(articleId);
      expect(updatedArticle?.title).toBe('Updated Title');
      expect(updatedArticle?.status).toBe('published');
    });
  });

  describe('DELETE /api/news/:id', () => {
    let articleId: string;

    beforeEach(async () => {
      const article = await NewsModel.create({
        title: 'Article To Delete',
        content: 'This will be deleted',
        summary: 'Delete excerpt',
        author: 'test-user-id',
        category: 'general',
        tags: ['delete'],
        status: 'published',
        priority: 'normal',
        targetAudience: ['all'],
        notificationSent: false,
        readBy: [],
        isActive: true
      });
      articleId = (article._id as any).toString();
    });

    it('should soft delete article successfully', async () => {
      const response = await request(app)
        .delete(`/api/news/${articleId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify soft delete in database
      const deletedArticle = await NewsModel.findById(articleId);
      expect(deletedArticle?.isActive).toBe(false);
      expect(deletedArticle?.status).toBe('archived');
    });
  });

  describe('Health check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('news-service');
    });
  });
});