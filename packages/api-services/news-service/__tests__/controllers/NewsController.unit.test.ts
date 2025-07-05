import { Request, Response } from 'express';
import { NewsController } from '../../src/controllers/NewsController';
import { NewsService } from '../../src/services/NewsService';

// Mock the NewsService
jest.mock('../../src/services/NewsService');
const MockedNewsService = NewsService as jest.Mocked<typeof NewsService>;

describe('NewsController Unit Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    req = {
      body: {},
      params: {},
      query: {}
    };
    
    res = {
      status: mockStatus,
      json: mockJson
    };

    jest.clearAllMocks();
  });

  describe('createArticle', () => {
    it('should successfully create article with frontend data format', async () => {
      const frontendData = {
        title: 'Test Article',
        content: 'Test content',
        excerpt: 'Test excerpt',
        category: 'general',
        tags: ['test'],
        isPublished: true,
        isPinned: false
      };

      req.body = frontendData;

      const mockArticle = {
        _id: 'test-id',
        title: 'Test Article',
        status: 'published'
      };

      MockedNewsService.createArticle.mockResolvedValue({
        success: true,
        article: mockArticle
      });

      await NewsController.createArticle(req as Request, res as Response);

      // Verify NewsService was called with properly mapped data
      expect(MockedNewsService.createArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Article',
          content: 'Test content',
          excerpt: 'Test excerpt',
          category: 'general',
          tags: ['test'],
          status: 'published', // Should be mapped from isPublished: true
          priority: 'normal',
          isPinned: false,
          isFeatured: false
        }),
        'test-user-id'
      );

      // Verify response
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Article created successfully',
        data: mockArticle
      });
    });

    it('should create draft when isPublished is false', async () => {
      const frontendData = {
        title: 'Draft Article',
        content: 'Draft content',
        excerpt: 'Draft excerpt',
        category: 'general',
        isPublished: false
      };

      req.body = frontendData;

      MockedNewsService.createArticle.mockResolvedValue({
        success: true,
        article: { _id: 'draft-id', status: 'draft' }
      });

      await NewsController.createArticle(req as Request, res as Response);

      expect(MockedNewsService.createArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'draft' // Should be mapped from isPublished: false
        }),
        'test-user-id'
      );
    });

    it('should handle validation errors from service', async () => {
      const frontendData = {
        title: '',
        content: '',
        category: 'general'
      };

      req.body = frontendData;

      MockedNewsService.createArticle.mockResolvedValue({
        success: false,
        error: 'Title and content are required'
      });

      await NewsController.createArticle(req as Request, res as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Title and content are required'
      });
    });

    it('should handle service exceptions', async () => {
      req.body = {
        title: 'Test',
        content: 'Test',
        category: 'general'
      };

      MockedNewsService.createArticle.mockRejectedValue(new Error('Database connection failed'));

      await NewsController.createArticle(req as Request, res as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Database connection failed'
      });
    });
  });

  describe('updateArticle', () => {
    it('should update article with frontend data format', async () => {
      const frontendData = {
        title: 'Updated Title',
        content: 'Updated content',
        isPublished: true
      };

      req.params = { id: 'test-id' };
      req.body = frontendData;

      MockedNewsService.updateArticle.mockResolvedValue({
        success: true,
        article: { _id: 'test-id', title: 'Updated Title', status: 'published' }
      });

      await NewsController.updateArticle(req as Request, res as Response);

      expect(MockedNewsService.updateArticle).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({
          title: 'Updated Title',
          content: 'Updated content',
          status: 'published' // Should be mapped from isPublished: true
        }),
        'test-user-id'
      );
    });
  });

  describe('Data mapping verification', () => {
    it('should correctly map all frontend fields to backend interface', async () => {
      const frontendData = {
        title: 'Complete Test',
        content: 'Complete content',
        excerpt: 'Complete excerpt',
        category: 'academic',
        tags: ['tag1', 'tag2'],
        isPublished: true,
        isPinned: true,
        isFeatured: true,
        priority: 'high'
      };

      req.body = frontendData;

      MockedNewsService.createArticle.mockResolvedValue({
        success: true,
        article: { _id: 'complete-id' }
      });

      await NewsController.createArticle(req as Request, res as Response);

      expect(MockedNewsService.createArticle).toHaveBeenCalledWith(
        {
          title: 'Complete Test',
          content: 'Complete content',
          excerpt: 'Complete excerpt',
          category: 'academic',
          tags: ['tag1', 'tag2'],
          status: 'published',
          priority: 'high',
          isPinned: true,
          isFeatured: true
        },
        'test-user-id'
      );
    });
  });
});