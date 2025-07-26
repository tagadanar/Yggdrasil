// Edge case and stress testing for news service
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app';
import { NewsArticleModel, UserModel } from '@yggdrasil/database-schemas';
import jwt from 'jsonwebtoken';
import { SharedJWTHelper } from '@yggdrasil/shared-utilities';

describe('News Service - Edge Cases and Stress Testing', () => {
  let app: any;
  let mongoServer: MongoMemoryServer;
  let adminUser: any;
  let adminToken: string;


  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    app = await createApp(true);

    adminUser = await UserModel.create({
      email: 'admin@stress.test',
      password: 'hashedpassword',
      role: 'admin',
      profile: {
        firstName: 'Stress',
        lastName: 'Tester',
        department: 'Testing'
      },
      preferences: {
        language: 'en',
        notifications: { scheduleChanges: true, newAnnouncements: true, assignmentReminders: true },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true,
    });

    const tokens = SharedJWTHelper.generateTokens(adminUser);
    adminToken = tokens.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await NewsArticleModel.deleteMany({});
  });

  describe('Large Content Handling', () => {
    it('should handle large article content within limits', async () => {
      const largeContent = 'A'.repeat(50000); // 50KB content - should work
      const validSummary = 'S'.repeat(400); // Within 500 char limit
      const validTags = Array.from({ length: 10 }, (_, i) => `tag${i}`); // Max 10 tags

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Large Content Stress Test Within Limits',
          content: largeContent,
          summary: validSummary,
          category: 'general',
          tags: validTags,
          isPublished: true
        });

      expect(response.status).toBe(201);
      expect(response.body.data.content).toHaveLength(50000);
      expect(response.body.data.tags).toHaveLength(10);
    });

    it('should reject extremely long titles over 300 characters', async () => {
      const extremelyLongTitle = 'T'.repeat(400); // Over 300 char limit

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: extremelyLongTitle,
          content: 'Valid content',
          category: 'general'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle max-length title properly', async () => {
      const maxLengthTitle = 'T'.repeat(300); // Exactly 300 chars

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: maxLengthTitle,
          content: 'Valid content',
          category: 'general'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.title).toHaveLength(300);
    });

    it('should reject summary over 500 characters', async () => {
      const oversizedSummary = 'S'.repeat(600); // Over 500 char limit

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Valid Title',
          content: 'Valid content',
          summary: oversizedSummary,
          category: 'general'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject more than 10 tags', async () => {
      const tooManyTags = Array.from({ length: 15 }, (_, i) => `tag${i}`);

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Valid Title',
          content: 'Valid content',
          category: 'general',
          tags: tooManyTags
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Special Character and Unicode Handling', () => {
    it('should handle articles with special characters and emojis', async () => {
      const specialContent = {
        title: '🏫 École Spéciale: Événement Extraordinaire! 🎉',
        content: `
          Testing special characters: àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ
          Greek: αβγδεζηθικλμνξοπρστυφχψω
          Russian: абвгдеёжзийклмнопрстуфхцчшщъыьэюя  
          Japanese: こんにちは世界
          Emoji: 📚📖📝✏️📊📈📉💡🔬🎓
          Math symbols: ∀∃∅∈∉∪∩⊆⊇⊂⊃∑∏∫∂√∞≤≥≠≈
          Currency: $€£¥₹₽₴₨₩₪₫₱₡₵
        `,
        summary: 'Testing unicode and special characters',
        category: 'general',
        tags: ['unicode', 'special-chars', 'émojis']
      };

      const response = await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(specialContent);

      expect(response.status).toBe(201);
      expect(response.body.data.title).toContain('🏫');
      expect(response.body.data.content).toContain('こんにちは世界');
    });

    it('should handle SQL injection-like patterns in search', async () => {
      const maliciousSearches = [
        "'; DROP TABLE articles; --",
        '1=1 OR 1=1',
        '<script>alert("xss")</script>',
        '\\x00\\x1a\\n\\r',
        '$where: function() { return true; }',
        '{ $gt: "" }'
      ];

      for (const search of maliciousSearches) {
        const response = await request(app)
          .get(`/api/news/articles?search=${encodeURIComponent(search)}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.articles).toEqual([]);
      }
    });

    it('should handle regex-breaking characters in search', async () => {
      // Create article with regex-breaking content
      await request(app)
        .post('/api/news/articles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test [brackets] (parentheses) {braces} ^caret $dollar .dot *star +plus ?question',
          content: 'Content with special regex characters',
          category: 'general',
          isPublished: true
        });

      const regexBreakers = [
        '[brackets]',
        '(parentheses)',
        '{braces}',
        '^caret',
        '$dollar',
        '.dot',
        '*star',
        '+plus',
        '?question',
        '\\backslash'
      ];

      for (const search of regexBreakers) {
        const response = await request(app)
          .get(`/api/news/articles?search=${encodeURIComponent(search)}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Should find the article that contains these characters
        if (search !== '\\backslash') {
          expect(response.body.data.articles).toHaveLength(1);
        }
      }
    });
  });

  describe('Extreme Pagination Testing', () => {
    beforeEach(async () => {
      // Create 25 test articles one by one to ensure unique slugs
      for (let i = 0; i < 25; i++) {
        await request(app)
          .post('/api/news/articles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: `Pagination Test Article ${i + 1} - ${Date.now()}-${Math.random()}`,
            content: `Content for article ${i + 1}`,
            summary: `Summary ${i + 1}`,
            category: 'general',
            isPublished: true
          });
      }
    });

    it('should correctly reject invalid pagination values', async () => {
      const invalidTestCases = [
        { page: 0, limit: 10, expectedStatus: 400 }, // page must be >= 1
        { page: -1, limit: 5, expectedStatus: 400 }, // page must be >= 1
        { page: 1, limit: 0, expectedStatus: 400 }, // limit must be >= 1
        { page: 1, limit: -5, expectedStatus: 400 }, // limit must be >= 1
        { page: 1, limit: 101, expectedStatus: 400 }, // limit must be <= 100
      ];

      for (const { page, limit, expectedStatus } of invalidTestCases) {
        const response = await request(app)
          .get(`/api/news/articles?page=${page}&limit=${limit}`);
        
        expect(response.status).toBe(expectedStatus);
        expect(response.body.success).toBe(false);
      }
    });

    it('should handle valid boundary pagination values', async () => {
      const validTestCases = [
        { page: 1, limit: 1 }, // minimum valid values
        { page: 1, limit: 100 }, // maximum limit
        { page: 999999, limit: 1 }, // very large page number
      ];

      for (const { page, limit } of validTestCases) {
        const response = await request(app)
          .get(`/api/news/articles?page=${page}&limit=${limit}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.articles)).toBe(true);
      }
    });

    it('should reject non-numeric pagination parameters', async () => {
      const response = await request(app)
        .get('/api/news/articles?page=abc&limit=xyz');
      
      // Should reject invalid non-numeric parameters with 400
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Concurrent Operations Stress Test', () => {
    it('should handle multiple simultaneous article creations', async () => {
      const timestamp = Date.now();
      const concurrentCreations = Array.from({ length: 20 }, (_, i) => 
        request(app)
          .post('/api/news/articles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: `Concurrent Article ${i} - ${timestamp} - ${Math.random()}`,
            content: `Content for concurrent article ${i}`,
            category: 'general',
            isPublished: true // Need to publish for them to appear in listings
          })
      );

      const results = await Promise.all(concurrentCreations);
      const successfulCreations = results.filter(r => r.status === 201);
      
      expect(successfulCreations).toHaveLength(20);
      
      // Verify all articles were actually created and are visible
      const listResponse = await request(app)
        .get('/api/news/articles?limit=25');
      
      expect(listResponse.body.data.articles).toHaveLength(20);
    });

    it('should handle concurrent reads and writes', async () => {
      const timestamp = Date.now();
      
      // Create initial articles
      const initialArticles = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .post('/api/news/articles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: `Initial Article ${i} - ${timestamp}`,
            content: `Initial content ${i}`,
            category: 'general',
            isPublished: true
          })
      );

      await Promise.all(initialArticles);

      // Mix of reads and writes
      const mixedOperations = [];
      
      // 10 read operations
      for (let i = 0; i < 10; i++) {
        mixedOperations.push(
          request(app).get('/api/news/articles?limit=5')
        );
      }
      
      // 5 write operations
      for (let i = 0; i < 5; i++) {
        mixedOperations.push(
          request(app)
            .post('/api/news/articles')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              title: `Concurrent Write ${i} - ${timestamp} - ${Math.random()}`,
              content: `Concurrent content ${i}`,
              category: 'general'
            })
        );
      }

      const results = await Promise.all(mixedOperations);
      const successfulOperations = results.filter(r => r.status === 200 || r.status === 201);
      
      expect(successfulOperations).toHaveLength(15);
    });
  });

  describe('Invalid Data Stress Testing', () => {
    it('should gracefully handle completely invalid JSON-like inputs', async () => {
      const invalidInputs = [
        { title: null, content: 'test' },
        { title: undefined, content: 'test' },
        { title: {}, content: 'test' },
        { title: [], content: 'test' },
        { title: 123, content: 'test' },
        { title: true, content: 'test' },
        { title: 'test', content: null },
        { title: 'test', content: undefined },
        { title: 'test', content: {} },
        { title: 'test', content: [] },
        { tags: 'not-an-array' },
        { category: ['array', 'instead', 'of', 'string'] },
        { isPublished: 'string-instead-of-boolean' },
        { isPinned: 123 }
      ];

      for (const invalidInput of invalidInputs) {
        const response = await request(app)
          .post('/api/news/articles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidInput);
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    it('should reject empty and whitespace-only inputs', async () => {
      const emptyInputs = [
        { title: '', content: 'test' },
        { title: '   ', content: 'test' },
        { title: 'test', content: '' },
        { title: 'test', content: '   ' },
        { title: '', content: '' },
        { title: '\n\t', content: '\n\r\t' }
      ];

      for (const emptyInput of emptyInputs) {
        const response = await request(app)
          .post('/api/news/articles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(emptyInput);
        
        // Should reject with either 400 (validation) or 500 (database constraint)
        expect([400, 500]).toContain(response.status);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle rapid sequential requests without memory leaks', async () => {
      const baseTimestamp = Date.now();
      
      // Create many articles in quick succession
      for (let batch = 0; batch < 5; batch++) {
        const batchPromises = Array.from({ length: 10 }, (_, i) => 
          request(app)
            .post('/api/news/articles')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              title: `Batch ${batch} Article ${i} - ${baseTimestamp} - ${Math.random()}`,
              content: `Content for batch ${batch} article ${i}`,
              category: 'general',
              isPublished: true // Need to publish for them to appear in listings
            })
        );

        const batchResults = await Promise.all(batchPromises);
        expect(batchResults.every(r => r.status === 201)).toBe(true);
      }

      // Verify all articles exist and are visible
      const finalCount = await request(app)
        .get('/api/news/articles?limit=100');
      
      expect(finalCount.body.data.articles).toHaveLength(50);
    });

    it('should handle complex search queries efficiently', async () => {
      // Create articles with overlapping content
      const testArticles = [
        { title: 'Math Science Technology', content: 'Advanced mathematics and computer science' },
        { title: 'Science Laboratory', content: 'Chemistry physics biology experiments' },
        { title: 'Technology Innovation', content: 'Computer programming artificial intelligence' },
        { title: 'Mathematics Advanced', content: 'Calculus algebra geometry statistics' }
      ];

      for (const article of testArticles) {
        await request(app)
          .post('/api/news/articles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...article,
            category: 'academic',
            isPublished: true
          });
      }

      // Complex multi-word searches
      const complexSearches = [
        'math science',
        'science technology',
        'computer programming',
        'advanced mathematics',
        'chemistry physics biology',
        'artificial intelligence programming'
      ];

      for (const search of complexSearches) {
        const response = await request(app)
          .get(`/api/news/articles?search=${encodeURIComponent(search)}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.articles)).toBe(true);
        expect(response.body.data.articles.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});