// packages/api-services/news-service/__tests__/functional/news-workflows.test.ts
// Real-world news permissions and workflows

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app';
import { NewsArticleModel, UserModel } from '@yggdrasil/database-schemas';
import jwt from 'jsonwebtoken';
import { SharedJWTHelper } from '@yggdrasil/shared-utilities';

describe('News Service - Real World Permissions', () => {
  let app: any;
  let mongoServer: MongoMemoryServer;
  
  // User roles
  let adminUser: any;
  let staffUser: any;
  let teacherUser: any;
  let studentUser: any;
  
  // Auth tokens
  let adminToken: string;
  let staffToken: string;
  let teacherToken: string;
  let studentToken: string;

  const createToken = (user: any) => {
    const tokens = SharedJWTHelper.generateTokens(user);
    return tokens.accessToken;
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    app = await createApp(true);

    // Create simple test users for permission testing
    adminUser = await UserModel.create({
      email: 'admin@test.edu',
      password: 'hashedpassword',
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      },
      isActive: true,
    });

    staffUser = await UserModel.create({
      email: 'staff@test.edu',
      password: 'hashedpassword',
      role: 'staff',
      profile: {
        firstName: 'Staff',
        lastName: 'User'
      },
      isActive: true,
    });

    teacherUser = await UserModel.create({
      email: 'teacher@test.edu',
      password: 'hashedpassword',
      role: 'teacher',
      profile: {
        firstName: 'Teacher',
        lastName: 'User'
      },
      isActive: true,
    });

    studentUser = await UserModel.create({
      email: 'student@test.edu',
      password: 'hashedpassword',
      role: 'student',
      profile: {
        firstName: 'Student',
        lastName: 'User'
      },
      isActive: true,
    });

    // Create auth tokens
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
    await NewsArticleModel.deleteMany({});
  });

  describe('Admin and Staff - Full CRUD Rights', () => {
    it('should allow admin to create news articles', async () => {
      const articleData = {
        title: 'Admin News Article',
        content: 'This is a news article created by admin.',
        summary: 'Admin created article',
        category: 'general',
        tags: ['admin', 'test']
      };

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(articleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(articleData.title);
      expect(response.body.data.content).toBe(articleData.content);
    });

    it('should allow staff to create news articles', async () => {
      const articleData = {
        title: 'Staff News Article',
        content: 'This is a news article created by staff.',
        summary: 'Staff created article',
        category: 'general',
        tags: ['staff', 'test']
      };

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(articleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(articleData.title);
      expect(response.body.data.content).toBe(articleData.content);
    });

    it('should allow admin to edit any news article', async () => {
      // Create article as staff
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Original Title',
          content: 'Original content',
          category: 'general'
        });

      const articleId = createResponse.body.data._id;

      // Edit as admin
      const editResponse = await request(app)
        .put(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated by Admin',
          content: 'Updated content by admin'
        })
        .expect(200);

      expect(editResponse.body.success).toBe(true);
      expect(editResponse.body.data.title).toBe('Updated by Admin');
    });

    it('should allow staff to edit their own news articles', async () => {
      // Create article as staff
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Staff Article',
          content: 'Staff content',
          category: 'general'
        });

      const articleId = createResponse.body.data._id;

      // Edit as same staff user
      const editResponse = await request(app)
        .put(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Updated by Staff',
          content: 'Updated content by staff'
        })
        .expect(200);

      expect(editResponse.body.success).toBe(true);
      expect(editResponse.body.data.title).toBe('Updated by Staff');
    });

    it('should allow admin to delete any news article', async () => {
      // Create article as staff
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Article to Delete',
          content: 'Content to delete',
          category: 'general'
        });

      const articleId = createResponse.body.data._id;

      // Delete as admin
      const deleteResponse = await request(app)
        .delete(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify article is deleted
      await request(app)
        .get(`/api/news/articles/${articleId}`)
        .expect(404);
    });

    it('should allow staff to delete their own news articles', async () => {
      // Create article as staff
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Staff Article to Delete',
          content: 'Staff content to delete',
          category: 'general'
        });

      const articleId = createResponse.body.data._id;

      // Delete as same staff user
      const deleteResponse = await request(app)
        .delete(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
    });
  });

  describe('Teacher and Student - Read Only Access', () => {
    it('should deny teacher from creating news articles', async () => {
      const articleData = {
        title: 'Teacher News Article',
        content: 'This should not be allowed.',
        category: 'general'
      };

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(articleData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });

    it('should deny student from creating news articles', async () => {
      const articleData = {
        title: 'Student News Article',
        content: 'This should not be allowed.',
        category: 'general'
      };

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(articleData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('permission');
    });

    it('should allow teacher to read news articles', async () => {
      // Create article as admin first
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Public News Article',
          content: 'This is readable by all.',
          category: 'general',
          isPublished: true
        });

      const articleId = createResponse.body.data._id;

      // Read as teacher
      const readResponse = await request(app)
        .get(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.data.title).toBe('Public News Article');
    });

    it('should allow student to read news articles', async () => {
      // Create article as admin first
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Student Readable Article',
          content: 'This is readable by students.',
          category: 'general',
          isPublished: true
        });

      const articleId = createResponse.body.data._id;

      // Read as student
      const readResponse = await request(app)
        .get(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.data.title).toBe('Student Readable Article');
    });

    it('should allow teacher to list news articles', async () => {
      const response = await request(app)
        .get('/api/news/articles')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.articles)).toBe(true);
    });

    it('should allow student to list news articles', async () => {
      const response = await request(app)
        .get('/api/news/articles')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.articles)).toBe(true);
    });

    it('should deny teacher from editing news articles', async () => {
      // Create article as admin first
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Original Title',
          content: 'Original content',
          category: 'general'
        });

      const articleId = createResponse.body.data._id;

      // Try to edit as teacher
      const editResponse = await request(app)
        .put(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Teacher Edit Attempt'
        })
        .expect(403);

      expect(editResponse.body.success).toBe(false);
      expect(editResponse.body.error).toContain('permission');
    });

    it('should deny student from editing news articles', async () => {
      // Create article as admin first
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Original Title',
          content: 'Original content',
          category: 'general'
        });

      const articleId = createResponse.body.data._id;

      // Try to edit as student
      const editResponse = await request(app)
        .put(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Student Edit Attempt'
        })
        .expect(403);

      expect(editResponse.body.success).toBe(false);
      expect(editResponse.body.error).toContain('permission');
    });

    it('should deny teacher from deleting news articles', async () => {
      // Create article as admin first
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Article to Delete',
          content: 'Content to delete',
          category: 'general'
        });

      const articleId = createResponse.body.data._id;

      // Try to delete as teacher
      const deleteResponse = await request(app)
        .delete(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);

      expect(deleteResponse.body.success).toBe(false);
      expect(deleteResponse.body.error).toContain('permission');
    });

    it('should deny student from deleting news articles', async () => {
      // Create article as admin first
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Article to Delete',
          content: 'Content to delete',
          category: 'general'
        });

      const articleId = createResponse.body.data._id;

      // Try to delete as student
      const deleteResponse = await request(app)
        .delete(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(deleteResponse.body.success).toBe(false);
      expect(deleteResponse.body.error).toContain('permission');
    });
  });

  describe('Authentication and Basic Access', () => {
    it('should require authentication for creating articles', async () => {
      const articleData = {
        title: 'Unauthenticated Article',
        content: 'This should fail.',
        category: 'general'
      };

      const response = await request(app)
        .post('/api/news/articles')
        .send(articleData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('authentication');
    });

    it('should allow unauthenticated users to read published articles', async () => {
      // Create article as admin first
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Public Article',
          content: 'This is publicly readable.',
          category: 'general',
          isPublished: true
        });

      const articleId = createResponse.body.data._id;

      // Read without authentication
      const readResponse = await request(app)
        .get(`/api/news/articles/${articleId}`)
        .expect(200);

      expect(readResponse.body.success).toBe(true);
      expect(readResponse.body.data.title).toBe('Public Article');
    });

    it('should allow unauthenticated users to list published articles', async () => {
      const response = await request(app)
        .get('/api/news/articles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.articles)).toBe(true);
    });
  });

  describe('Cross-Role Permission Validation', () => {
    it('should prevent staff from editing other staff articles', async () => {
      // Create second staff user
      const secondStaffUser = await UserModel.create({
        email: 'staff2@test.edu',
        password: 'hashedpassword',
        role: 'staff',
        profile: { firstName: 'Staff2', lastName: 'User' },
        isActive: true,
      });
      const secondStaffToken = createToken(secondStaffUser);

      // Create article as first staff user
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'First Staff Article',
          content: 'First staff content',
          category: 'general'
        });

      const articleId = createResponse.body.data._id;

      // Try to edit as second staff user (should fail)
      const editResponse = await request(app)
        .put(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${secondStaffToken}`)
        .send({
          title: 'Modified by Second Staff'
        })
        .expect(403);

      expect(editResponse.body.success).toBe(false);
      expect(editResponse.body.error).toContain('permission');

      // Cleanup
      await UserModel.findByIdAndDelete(secondStaffUser._id);
    });

    it('should prevent staff from deleting other staff articles', async () => {
      // Create second staff user
      const secondStaffUser = await UserModel.create({
        email: 'staff3@test.edu',
        password: 'hashedpassword',
        role: 'staff',
        profile: { firstName: 'Staff3', lastName: 'User' },
        isActive: true,
      });
      const secondStaffToken = createToken(secondStaffUser);

      // Create article as first staff user
      const createResponse = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Staff Article to Delete',
          content: 'Staff content to delete',
          category: 'general'
        });

      const articleId = createResponse.body.data._id;

      // Try to delete as second staff user (should fail)
      const deleteResponse = await request(app)
        .delete(`/api/news/articles/${articleId}`)
        .set('Authorization', `Bearer ${secondStaffToken}`)
        .expect(403);

      expect(deleteResponse.body.success).toBe(false);
      expect(deleteResponse.body.error).toContain('permission');

      // Cleanup
      await UserModel.findByIdAndDelete(secondStaffUser._id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid article ID gracefully', async () => {
      const response = await request(app)
        .get('/api/news/articles/invalid-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should validate required fields when creating article', async () => {
      const invalidArticle = {
        title: '', // Empty title
        content: 'Some content',
        category: 'invalid-category'
      };

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidArticle)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('should handle malformed JWT token', async () => {
      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          title: 'Test Article',
          content: 'Test content',
          category: 'general'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });
  });


});