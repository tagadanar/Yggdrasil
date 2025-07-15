import { Request, Response } from 'express';
import { NewsController } from '../../src/controllers/NewsController';
import { NewsService } from '../../src/services/NewsService';
import { ResponseHelper, AuthRequest } from '@yggdrasil/shared-utilities';

jest.mock('../../src/services/NewsService');
jest.mock('@yggdrasil/shared-utilities', () => ({
  ...jest.requireActual('@yggdrasil/shared-utilities'),
  ResponseHelper: {
    success: jest.fn(),
    error: jest.fn(),
    badRequest: jest.fn(),
    forbidden: jest.fn(),
    notFound: jest.fn()
  }
}));

describe('NewsController', () => {
  let newsController: NewsController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNewsService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    newsController = new NewsController();
    
    // Mock the service methods directly
    mockNewsService = (newsController as any).newsService;
    mockNewsService.createArticle = jest.fn();
    mockNewsService.updateArticle = jest.fn();
    mockNewsService.deleteArticle = jest.fn();
    mockNewsService.getArticleById = jest.fn();
    mockNewsService.getArticleBySlug = jest.fn();
    mockNewsService.listArticles = jest.fn();
    mockNewsService.publishArticle = jest.fn();
    mockNewsService.unpublishArticle = jest.fn();
    mockNewsService.pinArticle = jest.fn();
    mockNewsService.unpinArticle = jest.fn();
    
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        _id: 'user123',
        email: 'test@example.com',
        role: 'admin'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock ResponseHelper methods to return objects with statusCode
    (ResponseHelper.success as jest.Mock).mockReturnValue({
      success: true,
      data: null,
      message: 'success',
      timestamp: new Date().toISOString()
    });

    (ResponseHelper.badRequest as jest.Mock).mockReturnValue({
      success: false,
      error: 'Bad request',
      statusCode: 400,
      timestamp: new Date().toISOString()
    });

    (ResponseHelper.forbidden as jest.Mock).mockReturnValue({
      success: false,
      error: 'Forbidden',
      statusCode: 403,
      timestamp: new Date().toISOString()
    });

    (ResponseHelper.notFound as jest.Mock).mockReturnValue({
      success: false,
      error: 'Not found',
      statusCode: 404,
      timestamp: new Date().toISOString()
    });

    (ResponseHelper.error as jest.Mock).mockReturnValue({
      success: false,
      error: 'Internal error',
      statusCode: 500,
      timestamp: new Date().toISOString()
    });
  });

  describe('createArticle', () => {
    it('should create article successfully', async () => {
      const articleData = {
        title: 'Test Article',
        content: 'Test content',
        category: 'general' as const
      };
      const createdArticle = { _id: 'article123', ...articleData };

      mockRequest.body = articleData;
      mockNewsService.createArticle.mockResolvedValue(createdArticle);

      await newsController.createArticle(mockRequest as any, mockResponse as Response);

      expect(mockNewsService.createArticle).toHaveBeenCalledWith({
        ...articleData,
        tags: [],
        isPublished: false,
        isPinned: false
      }, mockRequest.user);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return error for invalid data', async () => {
      mockRequest.body = { title: '' }; // Invalid data

      await newsController.createArticle(mockRequest as any, mockResponse as Response);

      expect(mockNewsService.createArticle).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle permission errors', async () => {
      const articleData = {
        title: 'Test Article',
        content: 'Test content',
        category: 'general' as const
      };
      mockRequest.body = articleData;
      mockNewsService.createArticle.mockRejectedValue(new Error('Insufficient permissions'));

      await newsController.createArticle(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getArticleById', () => {
    it('should get article successfully', async () => {
      const article = { _id: 'article123', title: 'Test Article' };
      mockRequest.params = { id: 'article123' };
      mockNewsService.getArticleById.mockResolvedValue(article);

      await newsController.getArticleById(mockRequest as Request, mockResponse as Response);

      expect(mockNewsService.getArticleById).toHaveBeenCalledWith('article123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return 404 for non-existent article', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockNewsService.getArticleById.mockResolvedValue(null);

      await newsController.getArticleById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('listArticles', () => {
    it('should list articles with pagination', async () => {
      const result = {
        articles: [{ _id: '1', title: 'Article 1' }],
        total: 1,
        page: 1,
        totalPages: 1
      };
      mockRequest.query = { page: '1', limit: '10' };
      mockNewsService.listArticles.mockResolvedValue(result);

      await newsController.listArticles(mockRequest as Request, mockResponse as Response);

      expect(mockNewsService.listArticles).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sortBy: 'publishedAt',
        sortOrder: 'desc'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('publishArticle', () => {
    it('should publish article successfully', async () => {
      const article = { _id: 'article123', title: 'Test', published: true };
      mockRequest.params = { id: 'article123' };
      mockNewsService.publishArticle.mockResolvedValue(article);

      await newsController.publishArticle(mockRequest as any, mockResponse as Response);

      expect(mockNewsService.publishArticle).toHaveBeenCalledWith('article123', mockRequest.user);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('deleteArticle', () => {
    it('should delete article successfully', async () => {
      mockRequest.params = { id: 'article123' };
      mockNewsService.deleteArticle.mockResolvedValue(true);

      await newsController.deleteArticle(mockRequest as any, mockResponse as Response);

      expect(mockNewsService.deleteArticle).toHaveBeenCalledWith('article123', mockRequest.user);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return 404 for non-existent article', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockNewsService.deleteArticle.mockResolvedValue(false);

      await newsController.deleteArticle(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});