// packages/api-services/news-service/__tests__/unit/NewsService.test.ts
// Unit tests for NewsService

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NewsService } from '../../src/services/NewsService';
import { NewsArticleModel, UserModel } from '@yggdrasil/database-schemas';
import type { 
  CreateNewsArticleType, 
  UpdateNewsArticleType,
  GetNewsArticlesQueryType,
  UserRole 
} from '@yggdrasil/shared-utilities';

describe('NewsService', () => {
  let mongoServer: MongoMemoryServer;
  let staffUser: any;
  let teacherUser: any;
  let studentUser: any;

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
    // Create test users
    const users = [
      {
        email: 'staff@test.com',
        password: 'Password123!',
        role: 'staff' as UserRole,
        profile: { firstName: 'Staff', lastName: 'User' },
      },
      {
        email: 'teacher@test.com',
        password: 'Password123!',
        role: 'teacher' as UserRole,
        profile: { firstName: 'Teacher', lastName: 'User' },
      },
      {
        email: 'student@test.com',
        password: 'Password123!',
        role: 'student' as UserRole,
        profile: { firstName: 'Student', lastName: 'User' },
      },
    ];

    const createdUsers = await UserModel.create(users);
    [staffUser, teacherUser, studentUser] = createdUsers;
  });

  afterEach(async () => {
    await NewsArticleModel.deleteMany({});
    await UserModel.deleteMany({});
  });

  describe('createArticle', () => {
    const validArticleData: CreateNewsArticleType = {
      title: 'Test Article',
      content: '# Test Article\n\nThis is a test article.',
      summary: 'Test summary',
      category: 'general',
      tags: ['test', 'article'],
      isPublished: true,
      isPinned: false,
    };

    it('should create article successfully with staff user', async () => {
      const result = await NewsService.createArticle(validArticleData, staffUser._id.toString());

      expect(result.success).toBe(true);
      expect(result.article).toBeDefined();
      expect(result.article!.title).toBe('Test Article');
      expect(result.article!.author.userId).toBe(staffUser._id.toString());
      expect(result.article!.author.name).toBe('Staff User');
      expect(result.article!.author.role).toBe('staff');
      expect(result.article!.slug).toBe('test-article');
    });

    it('should create article successfully with admin user', async () => {
      const adminUser = await UserModel.create({
        email: 'admin@test.com',
        password: 'Password123!',
        role: 'admin' as UserRole,
        profile: { firstName: 'Admin', lastName: 'User' },
      });

      const result = await NewsService.createArticle(validArticleData, adminUser._id.toString());

      expect(result.success).toBe(true);
      expect(result.article).toBeDefined();
    });

    it('should fail with insufficient permissions for teacher', async () => {
      const result = await NewsService.createArticle(validArticleData, teacherUser._id.toString());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to create news articles');
    });

    it('should fail with insufficient permissions for student', async () => {
      const result = await NewsService.createArticle(validArticleData, studentUser._id.toString());

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to create news articles');
    });

    it('should fail with invalid user ID', async () => {
      const result = await NewsService.createArticle(validArticleData, 'invalid-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should fail with non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await NewsService.createArticle(validArticleData, fakeId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should set default values correctly', async () => {
      const minimalData = {
        title: 'Minimal Article',
        content: 'Minimal content',
        category: 'general' as const,
        tags: [],
        isPublished: false,
        isPinned: false
      };

      const result = await NewsService.createArticle(minimalData, staffUser._id.toString());

      expect(result.success).toBe(true);
      expect(result.article!.category).toBe('general');
      expect(result.article!.tags).toEqual([]);
      expect(result.article!.isPublished).toBe(false);
      expect(result.article!.isPinned).toBe(false);
    });
  });

  describe('updateArticle', () => {
    let existingArticle: any;

    beforeEach(async () => {
      existingArticle = await NewsArticleModel.create({
        title: 'Original Title',
        content: 'Original content',
        author: {
          userId: staffUser._id,
          name: 'Staff User',
          role: 'staff',
        },
        isPublished: true,
      });
    });

    it('should update article successfully by author', async () => {
      const updateData: UpdateNewsArticleType = {
        title: 'Updated Title',
        content: 'Updated content',
        category: 'academic',
      };

      const result = await NewsService.updateArticle(
        existingArticle._id.toString(),
        updateData,
        staffUser._id.toString()
      );

      expect(result.success).toBe(true);
      expect(result.article!.title).toBe('Updated Title');
      expect(result.article!.content).toBe('Updated content');
      expect(result.article!.category).toBe('academic');
    });

    it('should update article successfully by admin', async () => {
      const adminUser = await UserModel.create({
        email: 'admin@test.com',
        password: 'Password123!',
        role: 'admin' as UserRole,
        profile: { firstName: 'Admin', lastName: 'User' },
      });

      const updateData: UpdateNewsArticleType = {
        title: 'Admin Updated Title',
      };

      const result = await NewsService.updateArticle(
        existingArticle._id.toString(),
        updateData,
        adminUser._id.toString()
      );

      expect(result.success).toBe(true);
      expect(result.article!.title).toBe('Admin Updated Title');
    });

    it('should fail with insufficient permissions for teacher', async () => {
      const updateData: UpdateNewsArticleType = {
        title: 'Unauthorized Update',
      };

      const result = await NewsService.updateArticle(
        existingArticle._id.toString(),
        updateData,
        teacherUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to update this article');
    });

    it('should fail with article not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const updateData: UpdateNewsArticleType = {
        title: 'Update Non-existent',
      };

      const result = await NewsService.updateArticle(
        fakeId,
        updateData,
        staffUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Article not found');
    });
  });

  describe('deleteArticle', () => {
    let existingArticle: any;

    beforeEach(async () => {
      existingArticle = await NewsArticleModel.create({
        title: 'Article to Delete',
        content: 'Content to delete',
        author: {
          userId: staffUser._id,
          name: 'Staff User',
          role: 'staff',
        },
        isPublished: true,
      });
    });

    it('should delete article successfully by author', async () => {
      const result = await NewsService.deleteArticle(
        existingArticle._id.toString(),
        staffUser._id.toString()
      );

      expect(result.success).toBe(true);

      // Verify article is deleted
      const deletedArticle = await NewsArticleModel.findById(existingArticle._id);
      expect(deletedArticle).toBeNull();
    });

    it('should delete article successfully by admin', async () => {
      const adminUser = await UserModel.create({
        email: 'admin@test.com',
        password: 'Password123!',
        role: 'admin' as UserRole,
        profile: { firstName: 'Admin', lastName: 'User' },
      });

      const result = await NewsService.deleteArticle(
        existingArticle._id.toString(),
        adminUser._id.toString()
      );

      expect(result.success).toBe(true);
    });

    it('should fail with insufficient permissions for teacher', async () => {
      const result = await NewsService.deleteArticle(
        existingArticle._id.toString(),
        teacherUser._id.toString()
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions to delete this article');
    });
  });

  describe('getArticleById', () => {
    let existingArticle: any;

    beforeEach(async () => {
      existingArticle = await NewsArticleModel.create({
        title: 'Test Article',
        content: 'Test content',
        author: {
          userId: staffUser._id,
          name: 'Staff User',
          role: 'staff',
        },
        isPublished: true,
      });
    });

    it('should get article by ID successfully', async () => {
      const result = await NewsService.getArticleById(existingArticle._id.toString());

      expect(result.success).toBe(true);
      expect(result.article).toBeDefined();
      expect(result.article!.title).toBe('Test Article');
    });

    it('should increment view count when getting article', async () => {
      const initialViewCount = existingArticle.viewCount;

      await NewsService.getArticleById(existingArticle._id.toString());

      const updatedArticle = await NewsArticleModel.findById(existingArticle._id);
      expect(updatedArticle!.viewCount).toBe(initialViewCount + 1);
    });

    it('should fail with article not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await NewsService.getArticleById(fakeId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Article not found');
    });
  });

  describe('getArticleBySlug', () => {
    let existingArticle: any;

    beforeEach(async () => {
      existingArticle = await NewsArticleModel.create({
        title: 'Test Article',
        content: 'Test content',
        author: {
          userId: staffUser._id,
          name: 'Staff User',
          role: 'staff',
        },
        isPublished: true,
      });
    });

    it('should get article by slug successfully', async () => {
      const result = await NewsService.getArticleBySlug(existingArticle.slug);

      expect(result.success).toBe(true);
      expect(result.article).toBeDefined();
      expect(result.article!.title).toBe('Test Article');
    });

    it('should fail with article not found', async () => {
      const result = await NewsService.getArticleBySlug('non-existent-slug');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Article not found');
    });
  });

  describe('getArticles', () => {
    beforeEach(async () => {
      const articles = [
        {
          title: 'Published General Article',
          content: 'Content 1',
          category: 'general',
          tags: ['tag1'],
          author: {
            userId: staffUser._id,
            name: 'Staff User',
            role: 'staff',
          },
          isPublished: true,
          isPinned: false,
        },
        {
          title: 'Published Academic Article',
          content: 'Content 2',
          category: 'academic',
          tags: ['tag2'],
          author: {
            userId: staffUser._id,
            name: 'Staff User',
            role: 'staff',
          },
          isPublished: true,
          isPinned: true,
        },
        {
          title: 'Draft Article',
          content: 'Content 3',
          category: 'general',
          author: {
            userId: staffUser._id,
            name: 'Staff User',
            role: 'staff',
          },
          isPublished: false,
          isPinned: false,
        },
      ];

      await NewsArticleModel.create(articles);
    });

    it('should get published articles by default', async () => {
      const query = {
        page: 1,
        limit: 10,
        sortBy: 'publishedAt' as const,
        sortOrder: 'desc' as const
      };
      const result = await NewsService.getArticles(query);

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(2);
      expect(result.articles.every(a => a.isPublished)).toBe(true);
    });

    it('should filter by category', async () => {
      const query = {
        page: 1,
        limit: 10,
        sortBy: 'publishedAt' as const,
        sortOrder: 'desc' as const,
        category: 'academic' as const,
      };
      const result = await NewsService.getArticles(query);

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].category).toBe('academic');
    });

    it('should include drafts when published=false', async () => {
      const query = {
        page: 1,
        limit: 10,
        sortBy: 'publishedAt' as const,
        sortOrder: 'desc' as const,
        published: false,
      };
      const result = await NewsService.getArticles(query);

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].isPublished).toBe(false);
    });

    it('should search by title/content', async () => {
      const query = {
        page: 1,
        limit: 10,
        sortBy: 'publishedAt' as const,
        sortOrder: 'desc' as const,
        search: 'Academic',
      };
      const result = await NewsService.getArticles(query);

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].title).toContain('Academic');
    });

    it('should handle pagination', async () => {
      const query = {
        page: 1,
        limit: 1,
        sortBy: 'publishedAt' as const,
        sortOrder: 'desc' as const,
      };
      const result = await NewsService.getArticles(query);

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(1);
      expect(result.pagination).toBeDefined();
      expect(result.pagination!.page).toBe(1);
      expect(result.pagination!.limit).toBe(1);
      expect(result.pagination!.total).toBe(2);
    });
  });
});