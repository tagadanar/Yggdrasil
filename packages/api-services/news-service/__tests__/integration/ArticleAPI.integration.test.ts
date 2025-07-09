/**
 * Integration test for Article API endpoints in development environment
 * This test ensures that the article CRUD operations work end-to-end
 * and that proper database authentication is configured
 */

import request from 'supertest';
import { NewsModel } from '@101-school/database-schemas/src/models/News';

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
    req.user = {
      id: 'test-user-id',
      role: 'admin',
      email: 'test@example.com'
    };
    next();
  })
}));

import app from '../../src/index';

describe('Article API Integration', () => {
  let createdArticleId: string;

  beforeEach(async () => {
    // Clean up any existing test data before each test
    await NewsModel.deleteMany({
      title: { $in: ['Integration Test Article', 'Another Integration Test Article', 'Updated Integration Test Article', 'Database Connectivity Test'] }
    });

    // Create a test article for each test to ensure isolation
    const articleData = {
      title: 'Integration Test Article',
      content: 'This is a test article content for integration testing',
      excerpt: 'Integration test excerpt',
      category: 'general',
      tags: ['integration', 'test'],
      isPublished: true
    };

    const response = await request(app)
      .post('/api/news')
      .send(articleData)
      .expect(201);

    createdArticleId = response.body.data._id;
  });

  afterEach(async () => {
    // Clean up test data after each test
    await NewsModel.deleteMany({
      title: { $in: ['Integration Test Article', 'Another Integration Test Article', 'Updated Integration Test Article', 'Database Connectivity Test'] }
    });
  });

  it('should create a new article with unique title', async () => {
    const articleData = {
      title: 'Another Integration Test Article',
      content: 'This is another test article content for integration testing',
      excerpt: 'Another integration test excerpt',
      category: 'general',
      tags: ['integration', 'test'],
      isPublished: true
    };

    const response = await request(app)
      .post('/api/news')
      .send(articleData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.title).toBe('Another Integration Test Article');
    expect(response.body.data.status).toBe('published');
    expect(response.body.data._id).toBeDefined();
  });

  it('should retrieve all articles', async () => {
    const response = await request(app)
      .get('/api/news')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toBeDefined();
  });

  it('should retrieve a specific article by ID', async () => {
    // Use the article ID that was definitely created in beforeEach
    expect(createdArticleId).toBeDefined();
    
    const response = await request(app)
      .get(`/api/news/${createdArticleId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBe(createdArticleId);
    expect(response.body.data.title).toBe('Integration Test Article');
  });

  it('should update an existing article', async () => {
    const updateData = {
      title: 'Updated Integration Test Article',
      content: 'Updated content for integration testing'
    };

    const response = await request(app)
      .put(`/api/news/${createdArticleId}`)
      .send(updateData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.title).toBe('Updated Integration Test Article');
    expect(response.body.data.content).toBe('Updated content for integration testing');
  });

  it('should delete an article and return 404 when trying to retrieve it', async () => {
    // First, delete the article
    const deleteResponse = await request(app)
      .delete(`/api/news/${createdArticleId}`)
      .expect(200);

    expect(deleteResponse.body.success).toBe(true);
    expect(deleteResponse.body.message).toBe('Article deleted successfully');

    // Then verify it's gone by trying to retrieve it
    const getResponse = await request(app)
      .get(`/api/news/${createdArticleId}`)
      .expect(404);

    expect(getResponse.body.success).toBe(false);
    expect(getResponse.body.error).toBe('Article not found');
  });

  it('should handle validation errors properly', async () => {
    const invalidArticleData = {
      title: '', // Empty title should trigger validation error
      content: '', // Empty content should trigger validation error
      category: 'general'
    };

    const response = await request(app)
      .post('/api/news')
      .send(invalidArticleData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error).toContain('Title and content are required');
  });

  it('should check database connectivity with create-read-delete cycle', async () => {
    // This test ensures that the database is properly connected
    // by creating a unique article, reading it back, and deleting it
    const uniqueTitle = `Database Connectivity Test ${Date.now()}`;
    const testArticle = {
      title: uniqueTitle,
      content: 'Testing database connection',
      excerpt: 'DB test',
      category: 'general',
      tags: ['test']
    };

    // Create article
    const createResponse = await request(app)
      .post('/api/news')
      .send(testArticle)
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    const testArticleId = createResponse.body.data._id;
    expect(testArticleId).toBeDefined();

    // Verify it was saved to database by retrieving it with the specific ID
    const getResponse = await request(app)
      .get(`/api/news/${testArticleId}`)
      .expect(200);

    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data._id).toBe(testArticleId);
    expect(getResponse.body.data.title).toBe(uniqueTitle);

    // Clean up - delete the test article
    const deleteResponse = await request(app)
      .delete(`/api/news/${testArticleId}`)
      .expect(200);
      
    expect(deleteResponse.body.success).toBe(true);
  });
});