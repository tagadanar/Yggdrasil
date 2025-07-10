/**
 * News Service Functional Tests
 * 
 * Tests the complete news and article management functionality including:
 * - Article creation and management (CRUD operations)
 * - Article categories and tagging system
 * - Article status management (draft, published, archived)
 * - Article visibility and permissions
 * - Article search and filtering
 * - Featured and pinned articles
 * - Article analytics and engagement tracking
 * - Comment system and moderation
 * - Content publishing workflow
 * - Role-based access control
 * - Input validation and security
 * - Performance and scalability
 */

import { ApiClient } from '../../../utils/ApiClient';
import { AuthHelper, TestUser } from '../../../utils/AuthHelper';
import { TestDataFactory } from '../../../utils/TestDataFactory';
import { databaseHelper } from '../../../utils/DatabaseHelper';
import { testEnvironment } from '../../../config/environment';

describe('News Service - Functional Tests', () => {
  let authHelper: AuthHelper;
  let newsClient: ApiClient;
  let adminClient: ApiClient;
  let teacherClient: ApiClient;
  let studentClient: ApiClient;
  let staffClient: ApiClient;
  let testUsers: {
    student: TestUser;
    teacher: TestUser;
    admin: TestUser;
    staff: TestUser;
  };

  beforeAll(async () => {
    authHelper = new AuthHelper();
    
    // Create test users for different scenarios
    testUsers = {
      student: await authHelper.createTestUser('student'),
      teacher: await authHelper.createTestUser('teacher'),
      admin: await authHelper.createTestUser('admin'),
      staff: await authHelper.createTestUser('staff'),
    };

    // Create authenticated clients
    newsClient = await authHelper.createAuthenticatedClient('news', testUsers.admin);
    adminClient = await authHelper.createAuthenticatedClient('news', testUsers.admin);
    teacherClient = await authHelper.createAuthenticatedClient('news', testUsers.teacher);
    studentClient = await authHelper.createAuthenticatedClient('news', testUsers.student);
    staffClient = await authHelper.createAuthenticatedClient('news', testUsers.staff);
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  beforeEach(async () => {
    // Clean up test data before each test for isolation
    await databaseHelper.cleanupTestData();
  });

  describe('Article Management - CRUD Operations', () => {
    describe('POST /api/news', () => {
      it('should create a new article with valid data', async () => {
        const articleData = TestDataFactory.createArticle(testUsers.admin.id!, {
          title: 'Breaking News: New Semester Begins',
          content: 'The new academic semester has officially started with exciting new courses.',
          category: 'academic',
          tags: ['semester', 'academic', 'announcement'],
          priority: 'high',
          visibility: 'public'
        });

        const response = await adminClient.post('/api/news', articleData);

        expect(response.status).toBe(201);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.title).toBe('Breaking News: New Semester Begins');
        expect(response.data.data.category).toBe('academic');
        expect(response.data.data.author).toBe(testUsers.admin.id);
        expect(response.data.data.status).toBe('draft');
      });

      it('should allow teachers to create articles', async () => {
        const articleData = TestDataFactory.createArticle(testUsers.teacher.id!, {
          title: 'Course Update from Teacher',
          category: 'academic',
          content: 'Important update about the upcoming course schedule.'
        });

        const response = await teacherClient.post('/api/news', articleData);

        expect(response.status).toBe(201);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.author).toBe(testUsers.teacher.id);
      });

      it('should allow staff to create articles', async () => {
        const articleData = TestDataFactory.createArticle(testUsers.staff.id!, {
          title: 'Administrative Notice',
          category: 'administrative',
          content: 'Important administrative update for all students.'
        });

        const response = await staffClient.post('/api/news', articleData);

        expect(response.status).toBe(201);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.category).toBe('administrative');
      });

      it('should prevent students from creating articles', async () => {
        const articleData = TestDataFactory.createArticle(testUsers.student.id!);

        try {
          const response = await studentClient.post('/api/news', articleData);

          expect(response.status).toBe(403);
          expect(response.data).toBeErrorResponse();
          expect(response.data.error).toContain('Insufficient permissions');
        } catch (error: any) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.data).toBeErrorResponse();
        }
      });

      it('should validate required article fields', async () => {
        const invalidArticleData = {
          content: 'Article without title'
          // Missing required fields like title, category
        };

        try {
          const response = await adminClient.post('/api/news', invalidArticleData);

          expect(response.status).toBe(400);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toBeErrorResponse();
        }
      });

      it('should generate slug from title', async () => {
        const articleData = TestDataFactory.createArticle(testUsers.admin.id!, {
          title: 'This is a Test Article Title!'
        });

        const response = await adminClient.post('/api/news', articleData);

        expect(response.status).toBe(201);
        expect(response.data.data.slug).toBeDefined();
        expect(response.data.data.slug).toMatch(/^this-is-a-test-article-title/);
      });

      it('should set default values for optional fields', async () => {
        const minimalArticleData = {
          title: 'Minimal Article',
          content: 'Basic content',
          category: 'general'
        };

        const response = await adminClient.post('/api/news', minimalArticleData);

        expect(response.status).toBe(201);
        expect(response.data.data.status).toBe('draft');
        expect(response.data.data.priority).toBe('normal');
        expect(response.data.data.visibility).toBe('public');
        expect(response.data.data.isFeatured).toBe(false);
        expect(response.data.data.isPinned).toBe(false);
      });

      it('should require authentication', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.news);
        const articleData = TestDataFactory.createArticle('fake-id');

        try {
          const response = await unauthenticatedClient.post('/api/news', articleData);

          expect(response.status).toBe(401);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.data).toBeErrorResponse();
        }
      });
    });

    describe('GET /api/news/:id', () => {
      let testArticle: any;

      beforeEach(async () => {
        // Create a test article
        const articleData = TestDataFactory.createArticle(testUsers.admin.id!, {
          status: 'published'
        });
        const createResponse = await adminClient.post('/api/news', articleData);
        testArticle = createResponse.data.data;
      });

      it('should get published article without authentication', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.news);
        const response = await unauthenticatedClient.get(`/api/news/${testArticle.id}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.id).toBe(testArticle.id);
        expect(response.data.data.title).toBe(testArticle.title);
      });

      it('should increment view count when accessing article', async () => {
        const initialViews = testArticle.analytics?.views || 0;
        
        await newsClient.get(`/api/news/${testArticle.id}`);
        
        // Get updated article to check view count
        const updatedResponse = await newsClient.get(`/api/news/${testArticle.id}`);
        expect(updatedResponse.status).toBe(200);
        expect(updatedResponse.data.data.analytics.views).toBeGreaterThan(initialViews);
      });

      it('should get article by slug', async () => {
        const response = await newsClient.get(`/api/news/${testArticle.slug}`);

        expect(response.status).toBe(200);
        expect(response.data.data.id).toBe(testArticle.id);
        expect(response.data.data.slug).toBe(testArticle.slug);
      });

      it('should return 404 for non-existent article', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const response = await newsClient.get(`/api/news/${fakeId}`);

        expect(response.status).toBe(404);
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toContain('not found');
      });

      it('should handle invalid article ID format', async () => {
        const response = await newsClient.get('/api/news/invalid-id');

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });

      it('should not show draft articles to unauthorized users', async () => {
        // Create draft article
        const draftData = TestDataFactory.createArticle(testUsers.admin.id!, {
          status: 'draft'
        });
        const draftResponse = await adminClient.post('/api/news', draftData);
        const draftId = draftResponse.data.data.id;

        const studentResponse = await studentClient.get(`/api/news/${draftId}`);
        expect(studentResponse.status).toBeOneOf([403, 404]);
      });
    });

    describe('PUT /api/news/:id', () => {
      let testArticle: any;

      beforeEach(async () => {
        const articleData = TestDataFactory.createArticle(testUsers.admin.id!);
        const createResponse = await adminClient.post('/api/news', articleData);
        testArticle = createResponse.data.data;
      });

      it('should allow author to update their article', async () => {
        const updateData = {
          title: 'Updated Article Title',
          content: 'Updated content with new information.',
          tags: ['updated', 'modified']
        };

        const response = await adminClient.put(`/api/news/${testArticle.id}`, updateData);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.title).toBe('Updated Article Title');
        expect(response.data.data.tags).toContain('updated');
      });

      it('should allow admin to update any article', async () => {
        // Create article by teacher
        const teacherArticleData = TestDataFactory.createArticle(testUsers.teacher.id!);
        const teacherResponse = await teacherClient.post('/api/news', teacherArticleData);
        const teacherArticleId = teacherResponse.data.data.id;

        const updateData = {
          title: 'Admin Updated Title'
        };

        const response = await adminClient.put(`/api/news/${teacherArticleId}`, updateData);

        expect(response.status).toBe(200);
        expect(response.data.data.title).toBe('Admin Updated Title');
      });

      it('should prevent non-author from updating articles', async () => {
        const otherTeacher = await authHelper.createTestUser('teacher');
        const otherTeacherClient = await authHelper.createAuthenticatedClient('news', otherTeacher);

        const updateData = { title: 'Unauthorized Update' };
        const response = await otherTeacherClient.put(`/api/news/${testArticle.id}`, updateData);

        expect(response.status).toBeOneOf([403, 401]);
        expect(response.data).toBeErrorResponse();
      });

      it('should validate update data', async () => {
        const invalidData = {
          category: 'invalid-category',
          priority: 'invalid-priority'
        };

        const response = await adminClient.put(`/api/news/${testArticle.id}`, invalidData);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });

      it('should update slug when title changes', async () => {
        const originalSlug = testArticle.slug;
        const updateData = {
          title: 'Completely Different Title'
        };

        const response = await adminClient.put(`/api/news/${testArticle.id}`, updateData);

        expect(response.status).toBe(200);
        expect(response.data.data.slug).not.toBe(originalSlug);
        expect(response.data.data.slug).toMatch(/completely-different-title/);
      });
    });

    describe('DELETE /api/news/:id', () => {
      let testArticle: any;

      beforeEach(async () => {
        const articleData = TestDataFactory.createArticle(testUsers.admin.id!);
        const createResponse = await adminClient.post('/api/news', articleData);
        testArticle = createResponse.data.data;
      });

      it('should allow admin to delete articles', async () => {
        const response = await adminClient.delete(`/api/news/${testArticle.id}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.message).toContain('deleted');
      });

      it('should prevent non-admin users from deleting articles', async () => {
        const response = await teacherClient.delete(`/api/news/${testArticle.id}`);

        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      });

      it('should prevent students from deleting articles', async () => {
        const response = await studentClient.delete(`/api/news/${testArticle.id}`);

        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      });

      it('should soft delete articles (maintain data integrity)', async () => {
        await adminClient.delete(`/api/news/${testArticle.id}`);

        // Try to get deleted article
        const getResponse = await newsClient.get(`/api/news/${testArticle.id}`);
        expect(getResponse.status).toBeOneOf([404, 410]); // Gone or Not Found
      });
    });
  });

  describe('Article Search and Discovery', () => {
    beforeEach(async () => {
      // Create test articles with different characteristics
      const articles = [
        TestDataFactory.createArticle(testUsers.admin.id!, {
          title: 'Important Academic Announcement',
          category: 'academic',
          tags: ['announcement', 'important'],
          status: 'published',
          priority: 'high',
          isFeatured: true
        }),
        TestDataFactory.createArticle(testUsers.admin.id!, {
          title: 'Sports Team Victory',
          category: 'sports',
          tags: ['victory', 'sports'],
          status: 'published',
          priority: 'normal',
          isFeatured: false
        }),
        TestDataFactory.createArticle(testUsers.admin.id!, {
          title: 'Administrative Policy Update',
          category: 'administrative',
          tags: ['policy', 'update'],
          status: 'published',
          priority: 'normal',
          isPinned: true
        }),
        TestDataFactory.createArticle(testUsers.admin.id!, {
          title: 'Draft Article',
          category: 'general',
          status: 'draft',
          priority: 'low'
        })
      ];

      for (const article of articles) {
        await adminClient.post('/api/news', article);
      }
    });

    describe('GET /api/news', () => {
      it('should get all published articles without authentication', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.news);
        const response = await unauthenticatedClient.get('/api/news');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.articles).toBeInstanceOf(Array);
        expect(response.data.data.articles.length).toBeGreaterThan(0);
        expect(response.data.data.pagination).toBeDefined();

        // Should only return published articles
        response.data.data.articles.forEach((article: any) => {
          expect(article.status).toBe('published');
        });
      });

      it('should filter articles by category', async () => {
        const response = await newsClient.get('/api/news?category=academic');

        expect(response.status).toBe(200);
        expect(response.data.data.articles.length).toBeGreaterThan(0);
        
        response.data.data.articles.forEach((article: any) => {
          expect(article.category).toBe('academic');
        });
      });

      it('should filter articles by status', async () => {
        const response = await adminClient.get('/api/news?status=draft');

        expect(response.status).toBe(200);
        response.data.data.articles.forEach((article: any) => {
          expect(article.status).toBe('draft');
        });
      });

      it('should filter articles by priority', async () => {
        const response = await newsClient.get('/api/news?priority=high');

        expect(response.status).toBe(200);
        response.data.data.articles.forEach((article: any) => {
          expect(article.priority).toBe('high');
        });
      });

      it('should filter articles by tags', async () => {
        const response = await newsClient.get('/api/news?tags=announcement');

        expect(response.status).toBe(200);
        expect(response.data.data.articles.length).toBeGreaterThan(0);
        
        response.data.data.articles.forEach((article: any) => {
          expect(article.tags).toContain('announcement');
        });
      });

      it('should support pagination', async () => {
        const response = await newsClient.get('/api/news?limit=2&offset=0');

        expect(response.status).toBe(200);
        expect(response.data.data.articles.length).toBeLessThanOrEqual(2);
        expect(response.data.data.pagination.limit).toBe(2);
        expect(response.data.data.pagination.offset).toBe(0);
        expect(typeof response.data.data.pagination.total).toBe('number');
      });

      it('should sort articles by different criteria', async () => {
        const response = await newsClient.get('/api/news?sortBy=title&sortOrder=asc');

        expect(response.status).toBe(200);
        expect(response.data.data.articles.length).toBeGreaterThan(1);

        // Check if sorted alphabetically by title
        for (let i = 1; i < response.data.data.articles.length; i++) {
          const prevTitle = response.data.data.articles[i - 1].title;
          const currTitle = response.data.data.articles[i].title;
          expect(currTitle.localeCompare(prevTitle)).toBeGreaterThanOrEqual(0);
        }
      });

      it('should handle text search in title and content', async () => {
        const response = await newsClient.get('/api/news?q=announcement');

        expect(response.status).toBe(200);
        expect(response.data.data.articles.length).toBeGreaterThan(0);

        const foundArticle = response.data.data.articles.find((article: any) => 
          article.title.toLowerCase().includes('announcement') || 
          article.content.toLowerCase().includes('announcement')
        );
        expect(foundArticle).toBeDefined();
      });

      it('should handle multiple filters', async () => {
        const response = await newsClient.get('/api/news?category=academic&priority=high&status=published');

        expect(response.status).toBe(200);
        response.data.data.articles.forEach((article: any) => {
          expect(article.category).toBe('academic');
          expect(article.priority).toBe('high');
          expect(article.status).toBe('published');
        });
      });
    });

    describe('GET /api/news/featured', () => {
      it('should get featured articles', async () => {
        const response = await newsClient.get('/api/news/featured');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.articles).toBeInstanceOf(Array);
        
        response.data.data.articles.forEach((article: any) => {
          expect(article.isFeatured).toBe(true);
          expect(article.status).toBe('published');
        });
      });

      it('should work without authentication', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.news);
        const response = await unauthenticatedClient.get('/api/news/featured');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });
    });

    describe('GET /api/news/categories/:category', () => {
      it('should get articles by category', async () => {
        const response = await newsClient.get('/api/news/categories/academic');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.articles).toBeInstanceOf(Array);
        
        response.data.data.articles.forEach((article: any) => {
          expect(article.category).toBe('academic');
          expect(article.status).toBe('published');
        });
      });

      it('should handle invalid categories gracefully', async () => {
        const response = await newsClient.get('/api/news/categories/invalid-category');

        expect(response.status).toBe(200);
        expect(response.data.data.articles).toBeInstanceOf(Array);
        expect(response.data.data.articles.length).toBe(0);
      });
    });

    describe('GET /api/news/articles/author/:authorId', () => {
      it('should get articles by specific author', async () => {
        const response = await newsClient.get(`/api/news/articles/author/${testUsers.admin.id}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.articles).toBeInstanceOf(Array);
        
        response.data.data.articles.forEach((article: any) => {
          expect(article.author).toBe(testUsers.admin.id);
        });
      });

      it('should return empty array for author with no articles', async () => {
        const newUser = await authHelper.createTestUser('teacher');
        const response = await newsClient.get(`/api/news/articles/author/${newUser.id}`);

        expect(response.status).toBe(200);
        expect(response.data.data.articles).toBeInstanceOf(Array);
        expect(response.data.data.articles.length).toBe(0);
      });
    });
  });

  describe('Article Publishing Workflow', () => {
    let testArticle: any;

    beforeEach(async () => {
      // Create draft article
      const articleData = TestDataFactory.createArticle(testUsers.admin.id!, {
        status: 'draft'
      });
      const createResponse = await adminClient.post('/api/news', articleData);
      testArticle = createResponse.data.data;
    });

    describe('PATCH /api/news/:id/publish', () => {
      it('should allow admin to publish articles', async () => {
        const response = await adminClient.patch(`/api/news/${testArticle.id}/publish`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.status).toBe('published');
        expect(response.data.data.publishedAt).toBeDefined();
      });

      it('should allow staff to publish articles', async () => {
        const response = await staffClient.patch(`/api/news/${testArticle.id}/publish`);

        expect(response.status).toBe(200);
        expect(response.data.data.status).toBe('published');
      });

      it('should prevent teachers from publishing articles directly', async () => {
        const response = await teacherClient.patch(`/api/news/${testArticle.id}/publish`);

        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      });

      it('should prevent students from publishing articles', async () => {
        const response = await studentClient.patch(`/api/news/${testArticle.id}/publish`);

        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      });

      it('should validate article content before publishing', async () => {
        // Create article with insufficient content
        const incompleteData = TestDataFactory.createArticle(testUsers.admin.id!, {
          title: '', // Empty title
          content: 'Very short content',
          status: 'draft'
        });
        const incompleteResponse = await adminClient.post('/api/news', incompleteData);
        const incompleteId = incompleteResponse.data.data.id;

        const response = await adminClient.patch(`/api/news/${incompleteId}/publish`);

        expect(response.status).toBe(400);
        expect(response.data.error).toContain('validation');
      });
    });

    describe('POST /api/news/articles/:articleId/archive', () => {
      beforeEach(async () => {
        // Publish the article first
        await adminClient.patch(`/api/news/${testArticle.id}/publish`);
      });

      it('should allow admin to archive published articles', async () => {
        const response = await adminClient.post(`/api/news/articles/${testArticle.id}/archive`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.status).toBe('archived');
      });

      it('should allow staff to archive articles', async () => {
        const response = await staffClient.post(`/api/news/articles/${testArticle.id}/archive`);

        expect(response.status).toBe(200);
        expect(response.data.data.status).toBe('archived');
      });

      it('should prevent teachers from archiving articles', async () => {
        const response = await teacherClient.post(`/api/news/articles/${testArticle.id}/archive`);

        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      });
    });

    describe('PATCH /api/news/:id/pin', () => {
      it('should allow admin to pin/unpin articles', async () => {
        // Pin article
        const pinResponse = await adminClient.patch(`/api/news/${testArticle.id}/pin`);
        expect(pinResponse.status).toBe(200);
        expect(pinResponse.data.data.isPinned).toBe(true);

        // Unpin article
        const unpinResponse = await adminClient.patch(`/api/news/${testArticle.id}/pin`);
        expect(unpinResponse.status).toBe(200);
        expect(unpinResponse.data.data.isPinned).toBe(false);
      });

      it('should allow staff to pin articles', async () => {
        const response = await staffClient.patch(`/api/news/${testArticle.id}/pin`);

        expect(response.status).toBe(200);
        expect(response.data.data.isPinned).toBe(true);
      });

      it('should prevent teachers from pinning articles', async () => {
        const response = await teacherClient.patch(`/api/news/${testArticle.id}/pin`);

        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      });
    });
  });

  describe('Article Engagement and Analytics', () => {
    let testArticle: any;

    beforeEach(async () => {
      // Create published article
      const articleData = TestDataFactory.createArticle(testUsers.admin.id!, {
        status: 'published'
      });
      const createResponse = await adminClient.post('/api/news', articleData);
      testArticle = createResponse.data.data;
    });

    describe('POST /api/news/:id/read', () => {
      it('should allow authenticated users to mark article as read', async () => {
        const response = await studentClient.post(`/api/news/${testArticle.id}/read`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });

      it('should track reading analytics', async () => {
        const initialViews = testArticle.analytics?.views || 0;
        
        await studentClient.post(`/api/news/${testArticle.id}/read`);
        
        // Check that analytics were updated
        const updatedResponse = await newsClient.get(`/api/news/${testArticle.id}`);
        expect(updatedResponse.status).toBe(200);
        expect(updatedResponse.data.data.analytics.views).toBeGreaterThan(initialViews);
      });

      it('should require authentication', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.news);
        
        try {
          const response = await unauthenticatedClient.post(`/api/news/${testArticle.id}/read`);

          expect(response.status).toBe(401);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.data).toBeErrorResponse();
        }
      });
    });

    describe('POST /api/news/articles/:articleId/like', () => {
      it('should allow authenticated users to like articles', async () => {
        const response = await studentClient.post(`/api/news/articles/${testArticle.id}/like`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.analytics.likes).toBeGreaterThan(0);
      });

      it('should toggle like status', async () => {
        // First like
        const likeResponse = await studentClient.post(`/api/news/articles/${testArticle.id}/like`);
        expect(likeResponse.status).toBe(200);
        const initialLikes = likeResponse.data.data.analytics.likes;

        // Second like (should toggle/unlike)
        const unlikeResponse = await studentClient.post(`/api/news/articles/${testArticle.id}/like`);
        expect(unlikeResponse.status).toBe(200);
        expect(unlikeResponse.data.data.analytics.likes).toBeLessThan(initialLikes);
      });

      it('should prevent duplicate likes from same user', async () => {
        await studentClient.post(`/api/news/articles/${testArticle.id}/like`);
        const secondLike = await studentClient.post(`/api/news/articles/${testArticle.id}/like`);

        // Should either toggle back or prevent duplicate
        expect(secondLike.status).toBeOneOf([200, 400]);
      });

      it('should require authentication', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.news);
        
        try {
          const response = await unauthenticatedClient.post(`/api/news/articles/${testArticle.id}/like`);

          expect(response.status).toBe(401);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.data).toBeErrorResponse();
        }
      });
    });
  });

  describe('News Analytics', () => {
    beforeEach(async () => {
      // Create various articles for analytics
      const articles = [
        TestDataFactory.createArticle(testUsers.admin.id!, {
          category: 'academic',
          status: 'published',
          priority: 'high'
        }),
        TestDataFactory.createArticle(testUsers.admin.id!, {
          category: 'sports',
          status: 'published',
          priority: 'normal'
        }),
        TestDataFactory.createArticle(testUsers.teacher.id!, {
          category: 'academic',
          status: 'published',
          priority: 'normal'
        }),
        TestDataFactory.createArticle(testUsers.admin.id!, {
          category: 'administrative',
          status: 'draft',
          priority: 'low'
        })
      ];

      for (const article of articles) {
        await adminClient.post('/api/news', article);
      }
    });

    describe('GET /api/news/analytics', () => {
      it('should get analytics for admin', async () => {
        const response = await adminClient.get('/api/news/analytics');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.totalArticles).toBeDefined();
        expect(response.data.data.publishedArticles).toBeDefined();
        expect(response.data.data.draftArticles).toBeDefined();
        expect(response.data.data.topCategories).toBeInstanceOf(Array);
        expect(response.data.data.topAuthors).toBeInstanceOf(Array);
      });

      it('should get analytics for staff', async () => {
        const response = await staffClient.get('/api/news/analytics');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });

      it('should prevent teachers from accessing global analytics', async () => {
        const response = await teacherClient.get('/api/news/analytics');

        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      });

      it('should prevent students from accessing analytics', async () => {
        const response = await studentClient.get('/api/news/analytics');

        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      });

      it('should include category breakdown', async () => {
        const response = await adminClient.get('/api/news/analytics');

        expect(response.status).toBe(200);
        expect(response.data.data.topCategories).toBeDefined();
        
        const academicCategory = response.data.data.topCategories.find((cat: any) => 
          cat.category === 'academic'
        );
        expect(academicCategory).toBeDefined();
        expect(academicCategory.count).toBeGreaterThanOrEqual(2);
      });

      it('should include author statistics', async () => {
        const response = await adminClient.get('/api/news/analytics');

        expect(response.status).toBe(200);
        expect(response.data.data.topAuthors).toBeDefined();
        
        const adminAuthor = response.data.data.topAuthors.find((author: any) => 
          author.authorId === testUsers.admin.id
        );
        expect(adminAuthor).toBeDefined();
        expect(adminAuthor.articleCount).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Security and Input Validation', () => {
    describe('XSS Prevention', () => {
      it('should sanitize article title and content', async () => {
        const maliciousArticleData = TestDataFactory.createArticle(testUsers.admin.id!, {
          title: '<script>alert("xss")</script>Malicious Title',
          content: '<img src="x" onerror="alert(1)">Article content with potential XSS'
        });

        const response = await adminClient.post('/api/news', maliciousArticleData);

        if (response.status === 201) {
          expect(response.data.data.title).not.toContain('<script>');
          expect(response.data.data.content).not.toContain('onerror');
        } else {
          expect(response.status).toBe(400);
          expect(response.data).toBeErrorResponse();
        }
      });

      it('should sanitize article tags', async () => {
        const maliciousArticleData = TestDataFactory.createArticle(testUsers.admin.id!, {
          tags: ['<script>alert("tag")</script>', 'normal-tag', '<img src=x onerror=alert(1)>']
        });

        const response = await adminClient.post('/api/news', maliciousArticleData);

        if (response.status === 201) {
          response.data.data.tags.forEach((tag: string) => {
            expect(tag).not.toContain('<script>');
            expect(tag).not.toContain('onerror');
          });
        } else {
          expect(response.status).toBe(400);
        }
      });
    });

    describe('SQL Injection Prevention', () => {
      it('should prevent SQL injection in search queries', async () => {
        const maliciousQuery = "'; DROP TABLE articles; --";
        const response = await newsClient.get(`/api/news?q=${encodeURIComponent(maliciousQuery)}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.articles).toBeInstanceOf(Array);
      });

      it('should prevent SQL injection in category filters', async () => {
        const maliciousCategory = "' OR '1'='1";
        const response = await newsClient.get(`/api/news/categories/${encodeURIComponent(maliciousCategory)}`);

        expect(response.status).toBeOneOf([200, 400]);
        if (response.status === 200) {
          expect(response.data.data.articles).toBeInstanceOf(Array);
        }
      });
    });

    describe('Authorization Testing', () => {
      it('should prevent unauthorized article modifications', async () => {
        const articleData = TestDataFactory.createArticle(testUsers.admin.id!);
        const createResponse = await adminClient.post('/api/news', articleData);
        const articleId = createResponse.data.data.id;

        // Try to update with different teacher
        const otherTeacher = await authHelper.createTestUser('teacher');
        const otherClient = await authHelper.createAuthenticatedClient('news', otherTeacher);

        const response = await otherClient.put(`/api/news/${articleId}`, {
          title: 'Unauthorized Update'
        });

        expect(response.status).toBeOneOf([403, 401]);
        expect(response.data).toBeErrorResponse();
      });

      it('should respect article visibility settings', async () => {
        // Create article with restricted visibility
        const restrictedArticle = TestDataFactory.createArticle(testUsers.admin.id!, {
          title: 'Staff Only Article',
          visibility: 'staff',
          status: 'published'
        });
        
        const createResponse = await adminClient.post('/api/news', restrictedArticle);
        const articleId = createResponse.data.data.id;

        // Student should not see staff-only article
        const studentResponse = await studentClient.get(`/api/news/${articleId}`);
        expect(studentResponse.status).toBeOneOf([403, 404]);
      });

      it('should allow role-based article creation', async () => {
        // Test all roles that should be able to create articles
        const roles = [
          { user: testUsers.admin, client: adminClient, shouldSucceed: true },
          { user: testUsers.staff, client: staffClient, shouldSucceed: true },
          { user: testUsers.teacher, client: teacherClient, shouldSucceed: true },
          { user: testUsers.student, client: studentClient, shouldSucceed: false }
        ];

        for (const role of roles) {
          const articleData = TestDataFactory.createArticle(role.user.id!);
          const response = await role.client.post('/api/news', articleData);

          if (role.shouldSucceed) {
            expect(response.status).toBe(201);
          } else {
            expect(response.status).toBe(403);
          }
        }
      });
    });

    describe('Content Validation', () => {
      it('should validate required fields', async () => {
        const incompleteData = {
          content: 'Article without title',
          // Missing title and category
        };

        const response = await adminClient.post('/api/news', incompleteData);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
        expect(response.data.error).toContain('validation');
      });

      it('should validate field length limits', async () => {
        const longData = TestDataFactory.createArticle(testUsers.admin.id!, {
          title: 'a'.repeat(1000), // Extremely long title
          content: 'b'.repeat(100000) // Extremely long content
        });

        const response = await adminClient.post('/api/news', longData);

        expect(response.status).toBeOneOf([400, 413]); // Bad Request or Payload Too Large
        if (response.status === 400) {
          expect(response.data).toBeErrorResponse();
        }
      });

      it('should validate category values', async () => {
        const invalidCategoryData = TestDataFactory.createArticle(testUsers.admin.id!, {
          category: 'invalid-category-that-does-not-exist'
        });

        const response = await adminClient.post('/api/news', invalidCategoryData);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });

      it('should validate priority values', async () => {
        const invalidPriorityData = TestDataFactory.createArticle(testUsers.admin.id!, {
          priority: 'super-ultra-high'
        });

        const response = await adminClient.post('/api/news', invalidPriorityData);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        newsClient.get('/api/news?limit=5')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      const response = await newsClient.get('/api/news?limit=20');
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle large article lists efficiently', async () => {
      // Create many articles
      const articles = Array(20).fill(null).map(() => 
        TestDataFactory.createArticle(testUsers.admin.id!, {
          status: 'published'
        })
      );

      for (const article of articles) {
        await adminClient.post('/api/news', article);
      }

      const startTime = Date.now();
      const response = await newsClient.get('/api/news?limit=50');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000);
      expect(response.data.data.articles.length).toBeGreaterThan(0);
    });

    it('should efficiently handle search queries', async () => {
      // Create articles with searchable content
      const searchableArticles = Array(10).fill(null).map((_, index) => 
        TestDataFactory.createArticle(testUsers.admin.id!, {
          title: `Searchable Article ${index}`,
          content: `This is content for article number ${index} with search terms`,
          status: 'published',
          tags: [`tag${index}`, 'searchable']
        })
      );

      for (const article of searchableArticles) {
        await adminClient.post('/api/news', article);
      }

      const startTime = Date.now();
      const response = await newsClient.get('/api/news?q=searchable&tags=searchable');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000);
      expect(response.data.data.articles.length).toBeGreaterThan(0);
      
      response.data.data.articles.forEach((article: any) => {
        expect(article.tags).toContain('searchable');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require temporarily disconnecting the database
      // For now, we'll test with operations that might cause DB errors
      const response = await newsClient.get('/api/news/000000000000000000000000');

      expect(response.status).toBeOneOf([404, 400]);
      expect(response.data).toBeErrorResponse();
    });

    it('should provide meaningful error messages', async () => {
      const response = await newsClient.get('/api/news/invalid-id');

      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toBeDefined();
      expect(response.data.error).not.toBe('');
      expect(typeof response.data.error).toBe('string');
    });

    it('should handle malformed request data', async () => {
      const malformedData = {
        title: 'Test Article',
        category: 'academic',
        content: null, // Invalid content
        tags: 'should-be-array', // Invalid tags format
        status: 123 // Invalid status type
      };

      const response = await adminClient.post('/api/news', malformedData);

      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('validation');
    });

    it('should handle missing request data', async () => {
      const response = await adminClient.post('/api/news', {});

      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toBeDefined();
    });

    it('should handle duplicate slug conflicts', async () => {
      const articleData = TestDataFactory.createArticle(testUsers.admin.id!, {
        title: 'Duplicate Title Article'
      });

      // Create first article
      const firstResponse = await adminClient.post('/api/news', articleData);
      expect(firstResponse.status).toBe(201);

      // Try to create second article with same title (which generates same slug)
      const secondResponse = await adminClient.post('/api/news', articleData);

      // Should either succeed with modified slug or handle gracefully
      expect(secondResponse.status).toBeOneOf([201, 400]);
      
      if (secondResponse.status === 201) {
        // Slug should be different
        expect(secondResponse.data.data.slug).not.toBe(firstResponse.data.data.slug);
      }
    });
  });
});

// Helper custom matchers
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}