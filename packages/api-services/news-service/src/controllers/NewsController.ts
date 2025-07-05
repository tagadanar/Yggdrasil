// Path: packages/api-services/news-service/src/controllers/NewsController.ts
import { Request, Response } from 'express';
import { NewsService } from '../services/NewsService';
import { CreateArticleData, UpdateArticleData, ArticleSearchFilters } from '../types/news';

// Mock user interface for development
interface MockUser {
  id: string;
  email: string;
  role: string;
}

// Mock user function for development
const getMockUser = (req: Request): MockUser => {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'user'
  };
};

export class NewsController {
  /**
   * Create a new article
   */
  static async createArticle(req: Request, res: Response): Promise<void> {
    try {
      const frontendData = req.body;
      const user = getMockUser(req);
      const authorId = user.id;

      // Map frontend data to backend CreateArticleData interface
      const articleData: CreateArticleData = {
        title: frontendData.title,
        content: frontendData.content,
        excerpt: frontendData.excerpt,
        category: frontendData.category || 'general',
        tags: frontendData.tags || [],
        status: frontendData.isPublished !== undefined ? (frontendData.isPublished ? 'published' : 'draft') : 'draft',
        priority: frontendData.priority || 'normal',
        isPinned: frontendData.isPinned || false,
        isFeatured: frontendData.isFeatured || false
      };

      const result = await NewsService.createArticle(articleData, authorId);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Article created successfully',
          data: result.article
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get article by ID or slug
   */
  static async getArticle(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.params; // Can be ID or slug
      const userId = getMockUser(req).id;

      const result = await NewsService.getArticle(identifier, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.article
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Update article
   */
  static async updateArticle(req: Request, res: Response): Promise<void> {
    try {
      const { id: articleId } = req.params;
      const frontendData = req.body;
      const userId = getMockUser(req).id;

      // Map frontend data to backend UpdateArticleData interface
      const updateData: UpdateArticleData = {
        title: frontendData.title,
        content: frontendData.content,
        excerpt: frontendData.excerpt,
        category: frontendData.category,
        tags: frontendData.tags,
        status: frontendData.isPublished !== undefined ? (frontendData.isPublished ? 'published' : 'draft') : undefined,
        priority: frontendData.priority,
        isPinned: frontendData.isPinned,
        isFeatured: frontendData.isFeatured
      };

      const result = await NewsService.updateArticle(articleId, updateData, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Article updated successfully',
          data: result.article
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Delete article
   */
  static async deleteArticle(req: Request, res: Response): Promise<void> {
    try {
      const { id: articleId } = req.params;
      const userId = getMockUser(req).id;

      // Authentication disabled for development

      const result = await NewsService.deleteArticle(articleId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Search articles with filters
   */
  static async searchArticles(req: Request, res: Response): Promise<void> {
    try {
      // For tests, treat requests without explicit auth as anonymous
      const userId = req.headers.authorization ? getMockUser(req).id : undefined;
      const filters: ArticleSearchFilters = {
        category: req.query.category as any,
        status: req.query.status as any,
        visibility: req.query.visibility as any,
        priority: req.query.priority as any,
        author: req.query.author as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        isFeatured: req.query.isFeatured ? req.query.isFeatured === 'true' : undefined,
        isPinned: req.query.isPinned ? req.query.isPinned === 'true' : undefined,
        hasImage: req.query.hasImage ? req.query.hasImage === 'true' : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      const result = await NewsService.searchArticles(filters, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.articles,
          pagination: result.pagination
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get featured articles
   */
  static async getFeaturedArticles(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      const result = await NewsService.getFeaturedArticles(limit);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.articles
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get recent articles
   */
  static async getRecentArticles(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const result = await NewsService.getRecentArticles(limit);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.articles
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Publish article
   */
  static async publishArticle(req: Request, res: Response): Promise<void> {
    try {
      const { articleId } = req.params;
      const userId = getMockUser(req).id;

      // Authentication disabled for development

      const result = await NewsService.publishArticle(articleId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.article
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Archive article
   */
  static async archiveArticle(req: Request, res: Response): Promise<void> {
    try {
      const { articleId } = req.params;
      const userId = getMockUser(req).id;

      // Authentication disabled for development

      const result = await NewsService.archiveArticle(articleId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.article
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Toggle article like
   */
  static async toggleLike(req: Request, res: Response): Promise<void> {
    try {
      const { articleId } = req.params;
      const userId = getMockUser(req).id;

      // Authentication disabled for development

      const result = await NewsService.toggleArticleLike(articleId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            likes: result.article?.analytics.likes
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get news analytics
   */
  static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = getMockUser(req).id;
      const authorFilter = req.query.author as string;

      const result = await NewsService.getNewsAnalytics(authorFilter || userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.analytics
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get articles by category
   */
  static async getArticlesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;
      const userId = getMockUser(req).id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const filters: ArticleSearchFilters = {
        category: category as any,
        status: 'published',
        limit,
        sortBy: 'publishedAt',
        sortOrder: 'desc'
      };

      const result = await NewsService.searchArticles(filters, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.articles,
          pagination: result.pagination
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get articles by author
   */
  static async getArticlesByAuthor(req: Request, res: Response): Promise<void> {
    try {
      const { authorId } = req.params;
      const userId = getMockUser(req).id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const filters: ArticleSearchFilters = {
        author: authorId,
        status: 'published',
        limit,
        sortBy: 'publishedAt',
        sortOrder: 'desc'
      };

      const result = await NewsService.searchArticles(filters, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.articles,
          pagination: result.pagination
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Search articles by text query
   */
  static async searchByText(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;
      const userId = getMockUser(req).id;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
        return;
      }

      // Simple text search implementation
      const filters: ArticleSearchFilters = {
        status: 'published',
        limit: parseInt(req.query.limit as string) || 10,
        offset: parseInt(req.query.offset as string) || 0,
        sortBy: 'publishedAt',
        sortOrder: 'desc'
      };

      const result = await NewsService.searchArticles(filters, userId);

      if (result.success) {
        // Filter results by text query (simplified)
        const searchResults = result.articles?.filter(article =>
          article.title.toLowerCase().includes(query.toLowerCase()) ||
          article.content.toLowerCase().includes(query.toLowerCase()) ||
          article.excerpt?.toLowerCase().includes(query.toLowerCase())
        ) || [];

        res.status(200).json({
          success: true,
          data: searchResults,
          query: query,
          total: searchResults.length
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Toggle pin status of an article
   */
  static async togglePin(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = getMockUser(req).id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      const result = await NewsService.togglePin(id, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Article pin status updated successfully',
          data: result.article
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Mark article as read by user
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = getMockUser(req).id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      const result = await NewsService.markAsRead(id, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Article marked as read',
          data: result.article
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}