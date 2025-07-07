/**
 * Integration test for Article API endpoints in development environment
 * This test ensures that the article CRUD operations work end-to-end
 * and that proper database authentication is configured
 */

import request from 'supertest';
import app from '../../src/index';

describe('Article API Integration', () => {
  let createdArticleId: string;

  it('should create a new article', async () => {
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

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.title).toBe('Integration Test Article');
    expect(response.body.data.status).toBe('published');
    
    createdArticleId = response.body.data._id;
    expect(createdArticleId).toBeDefined();
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

  it('should delete an article', async () => {
    const response = await request(app)
      .delete(`/api/news/${createdArticleId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Article deleted successfully');
  });

  it('should return 404 for deleted article', async () => {
    const response = await request(app)
      .get(`/api/news/${createdArticleId}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Article not found');
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

  it('should check database connectivity', async () => {
    // This test ensures that the database is properly connected
    // by attempting to create and immediately delete an article
    const testArticle = {
      title: 'Database Connectivity Test',
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

    // Verify it was saved to database by retrieving it
    const getResponse = await request(app)
      .get(`/api/news/${testArticleId}`)
      .expect(200);

    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.title).toBe('Database Connectivity Test');

    // Clean up
    await request(app)
      .delete(`/api/news/${testArticleId}`)
      .expect(200);
  });
});