// packages/api-services/news-service/__tests__/integration/news-endpoints.test.ts
// Integration tests for news service endpoints

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app';
import { NewsArticleModel, UserModel } from '@yggdrasil/database-schemas';
import jwt from 'jsonwebtoken';
import { SharedJWTHelper } from '@yggdrasil/shared-utilities';

describe('News Service Integration Tests', () => {
  let app: any;
  let mongoServer: MongoMemoryServer;
  let adminUser: any;
  let staffUser: any;
  let teacherUser: any;
  let studentUser: any;
  let adminToken: string;
  let staffToken: string;
  let teacherToken: string;
  let studentToken: string;

  // Helper to create JWT token
  const createToken = (user: any) => {
    const tokens = SharedJWTHelper.generateTokens(user);
    return tokens.accessToken;
  };

  const JWT_SECRET = process.env['JWT_SECRET'] || 'test-secret';

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the database
    await mongoose.connect(mongoUri);
    
    // Create the Express app (skip database connection since we manage it here)
    app = await createApp(true);

    // Create test users
    adminUser = await UserModel.create({
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User',
      },
      preferences: {
        language: 'en',
        notifications: {
          scheduleChanges: true,
          newAnnouncements: true,
          assignmentReminders: true,
        },
        accessibility: {
          colorblindMode: false,
          fontSize: 'medium',
          highContrast: false,
        },
      },
      isActive: true,
    });

    staffUser = await UserModel.create({
      email: 'staff@test.com',
      password: 'hashedpassword',
      role: 'staff',
      profile: {
        firstName: 'Staff',
        lastName: 'User',
      },
      preferences: {
        language: 'en',
        notifications: {
          scheduleChanges: true,
          newAnnouncements: true,
          assignmentReminders: true,
        },
        accessibility: {
          colorblindMode: false,
          fontSize: 'medium',
          highContrast: false,
        },
      },
      isActive: true,
    });

    teacherUser = await UserModel.create({
      email: 'teacher@test.com',
      password: 'hashedpassword',
      role: 'teacher',
      profile: {
        firstName: 'Teacher',
        lastName: 'User',
      },
      preferences: {
        language: 'en',
        notifications: {
          scheduleChanges: true,
          newAnnouncements: true,
          assignmentReminders: true,
        },
        accessibility: {
          colorblindMode: false,
          fontSize: 'medium',
          highContrast: false,
        },
      },
      isActive: true,
    });

    studentUser = await UserModel.create({
      email: 'student@test.com',
      password: 'hashedpassword',
      role: 'student',
      profile: {
        firstName: 'Student',
        lastName: 'User',
      },
      preferences: {
        language: 'en',
        notifications: {
          scheduleChanges: true,
          newAnnouncements: true,
          assignmentReminders: true,
        },
        accessibility: {
          colorblindMode: false,
          fontSize: 'medium',
          highContrast: false,
        },
      },
      isActive: true,
    });

    // Create JWT tokens
    adminToken = createToken(adminUser);
    staffToken = createToken(staffUser);
    teacherToken = createToken(teacherUser);
    studentToken = createToken(studentUser);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up articles before each test
    await NewsArticleModel.deleteMany({});
  });

  describe('Health Check', () => {
    it('should return service health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        service: 'news-service'
      });
    });
  });

  describe('POST /api/news/articles - Create Article', () => {
    const validArticleData = {
      title: 'Test Article',
      content: 'This is a test article content.',
      summary: 'Test summary',
      category: 'general',
      tags: ['test', 'article'],
      isPublished: false,
      isPinned: false
    };

    it('should create article with admin user', async () => {
      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validArticleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: 'Test Article',
        content: 'This is a test article content.',
        slug: 'test-article',
        category: 'general',
        isPublished: false,
        isPinned: false
      });
      expect(response.body.data.author.name).toBe('Admin User');
      expect(response.body.data.author.role).toBe('admin');
    });

    it('should create article with staff user', async () => {
      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(validArticleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.author.name).toBe('Staff User');
      expect(response.body.data.author.role).toBe('staff');
    });

    it('should reject creation by teacher', async () => {
      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(validArticleData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permissions');
    });

    it('should reject creation by student', async () => {
      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(validArticleData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permissions');
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/news/articles')
        .send(validArticleData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        title: '',
        content: '',
      };

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should validate title length', async () => {
      const invalidData = {
        ...validArticleData,
        title: 'a'.repeat(301), // Exceeds 300 char limit
      };

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate category enum', async () => {
      const invalidData = {
        ...validArticleData,
        category: 'invalid-category',
      };

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should limit tags to 10 maximum', async () => {
      const invalidData = {
        ...validArticleData,
        tags: Array(11).fill('tag'), // Exceeds 10 tag limit
      };

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/news/articles - List Articles', () => {
    beforeEach(async () => {
      // Create test articles - create as drafts first to avoid publishedAt auto-update
      const articles = await NewsArticleModel.create([
        {
          title: 'Published Article 1',
          content: 'Content 1',
          category: 'general',
          tags: ['tag1'],
          author: {
            userId: adminUser._id,
            name: 'Admin User',
            role: 'admin'
          },
          isPublished: false,
          isPinned: false
        },
        {
          title: 'Published Article 2',
          content: 'Content 2',
          category: 'academic',
          tags: ['tag2'],
          author: {
            userId: staffUser._id,
            name: 'Staff User',
            role: 'staff'
          },
          isPublished: false,
          isPinned: true
        },
        {
          title: 'Draft Article',
          content: 'Draft content',
          category: 'general',
          tags: ['draft'],
          author: {
            userId: adminUser._id,
            name: 'Admin User',
            role: 'admin'
          },
          isPublished: false,
          isPinned: false
        }
      ]);

      // Manually set publishedAt dates and publish status to avoid pre-save hook interference
      await NewsArticleModel.findByIdAndUpdate(articles[0]._id, {
        isPublished: true,
        publishedAt: new Date('2024-01-01')
      });
      
      await NewsArticleModel.findByIdAndUpdate(articles[1]._id, {
        isPublished: true,
        publishedAt: new Date('2024-01-02')
      });
    });

    it('should list published articles by default', async () => {
      const response = await request(app)
        .get('/api/news/articles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.articles[0].title).toBe('Published Article 2'); // Latest first
      expect(response.body.data.articles[1].title).toBe('Published Article 1');
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/news/articles?category=academic')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toHaveLength(1);
      expect(response.body.data.articles[0].title).toBe('Published Article 2');
    });

    it('should filter by published status', async () => {
      const response = await request(app)
        .get('/api/news/articles?published=false')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toHaveLength(1);
      expect(response.body.data.articles[0].title).toBe('Draft Article');
    });

    it('should search articles by title and content', async () => {
      const response = await request(app)
        .get('/api/news/articles?search=Draft')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toHaveLength(0); // Draft is not published
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/news/articles?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles).toHaveLength(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.totalPages).toBe(2);
      expect(response.body.data.hasNextPage).toBe(true);
    });

    it('should sort articles', async () => {
      const response = await request(app)
        .get('/api/news/articles?sortBy=title&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.articles[0].title).toBe('Published Article 1');
      expect(response.body.data.articles[1].title).toBe('Published Article 2');
    });
  });

  describe('GET /api/news/articles/id/:id - Get Article by ID', () => {
    let testArticle: any;

    beforeEach(async () => {
      testArticle = await NewsArticleModel.create({
        title: 'Test Article',
        content: 'Test content',
        category: 'general',
        tags: ['test'],
        author: {
          userId: adminUser._id,
          name: 'Admin User',
          role: 'admin'
        },
        isPublished: true,
        isPinned: false,
        viewCount: 0
      });
    });

    it('should get article by ID and increment view count', async () => {
      const response = await request(app)
        .get(`/api/news/articles/id/${testArticle._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Article');
      expect(response.body.data.viewCount).toBe(1);

      // Verify view count was incremented in database
      const updatedArticle = await NewsArticleModel.findById(testArticle._id);
      expect(updatedArticle?.viewCount).toBe(1);
    });

    it('should return 404 for non-existent article', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/news/articles/id/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/news/articles/id/invalid-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/news/articles/slug/:slug - Get Article by Slug', () => {
    let testArticle: any;

    beforeEach(async () => {
      testArticle = await NewsArticleModel.create({
        title: 'Test Article for Slug',
        content: 'Test content',
        category: 'general',
        tags: ['test'],
        author: {
          userId: adminUser._id,
          name: 'Admin User',
          role: 'admin'
        },
        isPublished: true,
        isPinned: false,
        viewCount: 0
      });
    });

    it('should get article by slug and increment view count', async () => {
      const response = await request(app)
        .get(`/api/news/articles/slug/${testArticle.slug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Article for Slug');
      expect(response.body.data.slug).toBe('test-article-for-slug');
      expect(response.body.data.viewCount).toBe(1);
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/api/news/articles/slug/non-existent-slug')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/news/articles/:id - Update Article', () => {
    let testArticle: any;

    beforeEach(async () => {
      testArticle = await NewsArticleModel.create({
        title: 'Original Title',
        content: 'Original content',
        category: 'general',
        tags: ['original'],
        author: {
          userId: staffUser._id,
          name: 'Staff User',
          role: 'staff'
        },
        isPublished: false,
        isPinned: false
      });
    });

    it('should allow author to update their own article', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['updated']
      };

      const response = await request(app)
        .put(`/api/news/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.content).toBe('Updated content');
      expect(response.body.data.tags).toEqual(['updated']);
    });

    it('should allow admin to update any article', async () => {
      const updateData = {
        title: 'Admin Updated Title'
      };

      const response = await request(app)
        .put(`/api/news/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Admin Updated Title');
    });

    it('should reject update by non-author non-admin', async () => {
      const updateData = {
        title: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/news/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permissions');
    });
  });

  describe('Article Publishing Operations', () => {
    let testArticle: any;

    beforeEach(async () => {
      testArticle = await NewsArticleModel.create({
        title: 'Test Article',
        content: 'Test content',
        category: 'general',
        tags: ['test'],
        author: {
          userId: staffUser._id,
          name: 'Staff User',
          role: 'staff'
        },
        isPublished: false,
        isPinned: false
      });
    });

    it('should publish article', async () => {
      const response = await request(app)
        .post(`/api/news/articles/${testArticle._id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isPublished).toBe(true);
      expect(response.body.data.publishedAt).toBeDefined();
    });

    it('should unpublish article', async () => {
      // First publish it
      await request(app)
        .post(`/api/news/articles/${testArticle._id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Then unpublish
      const response = await request(app)
        .post(`/api/news/articles/${testArticle._id}/unpublish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isPublished).toBe(false);
    });

    it('should pin article', async () => {
      const response = await request(app)
        .post(`/api/news/articles/${testArticle._id}/pin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isPinned).toBe(true);
    });

    it('should unpin article', async () => {
      const response = await request(app)
        .post(`/api/news/articles/${testArticle._id}/unpin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isPinned).toBe(false);
    });
  });

  describe('DELETE /api/news/articles/:id - Delete Article', () => {
    let testArticle: any;

    beforeEach(async () => {
      testArticle = await NewsArticleModel.create({
        title: 'Article to Delete',
        content: 'Content to delete',
        category: 'general',
        tags: ['delete'],
        author: {
          userId: staffUser._id,
          name: 'Staff User',
          role: 'staff'
        },
        isPublished: true,
        isPinned: false
      });
    });

    it('should allow author to delete their own article', async () => {
      const response = await request(app)
        .delete(`/api/news/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify article was deleted from database
      const deletedArticle = await NewsArticleModel.findById(testArticle._id);
      expect(deletedArticle).toBeNull();
    });

    it('should allow admin to delete any article', async () => {
      const response = await request(app)
        .delete(`/api/news/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject deletion by non-author non-admin', async () => {
      const response = await request(app)
        .delete(`/api/news/articles/${testArticle._id}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permissions');

      // Verify article still exists
      const stillExists = await NewsArticleModel.findById(testArticle._id);
      expect(stillExists).toBeTruthy();
    });

    it('should return 404 for non-existent article', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/news/articles/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should reject requests with invalid JWT token', async () => {
      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          title: 'Test',
          content: 'Test content'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject requests with expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { userId: adminUser._id },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expired token
      );

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          title: 'Test',
          content: 'Test content'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject requests with token for non-existent user', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      const fakeToken = jwt.sign({ userId: fakeUserId }, JWT_SECRET);

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({
          title: 'Test',
          content: 'Test content'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});