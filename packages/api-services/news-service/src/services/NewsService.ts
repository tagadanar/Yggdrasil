// packages/api-services/news-service/src/services/NewsService.ts
// News service with business logic

import mongoose from 'mongoose';
import { NewsArticleModel, UserModel, NewsArticleDocument } from '@yggdrasil/database-schemas';
import {
  CreateNewsArticleType,
  UpdateNewsArticleType,
  GetNewsArticlesQueryType,
  NewsArticle,
  NewsArticleListItem,
  ApiResponse,
  newsLogger as logger,
} from '@yggdrasil/shared-utilities';

export interface NewsResult extends ApiResponse {
  article?: NewsArticle;
}

export interface NewsListResult extends ApiResponse {
  articles: NewsArticleListItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface DeleteResult extends ApiResponse {}

export class NewsService {
  /**
   * Convert NewsArticleDocument to NewsArticle (removes sensitive data and converts _id to string)
   */
  private static articleDocumentToArticle(articleDoc: NewsArticleDocument): NewsArticle {
    return articleDoc.toJSON() as NewsArticle;
  }

  /**
   * Check if user has permission to create/edit news articles
   */
  private static canModifyNews(userRole: string): boolean {
    return ['admin', 'staff'].includes(userRole);
  }

  /**
   * Check if user can edit specific article (author, admin, or staff)
   */
  private static canEditArticle(article: NewsArticleDocument, userId: string, userRole: string, _userDepartment?: string): boolean {
    // Author can always edit their own content
    if (article.author.userId.toString() === userId.toString()) {
      return true;
    }

    // Admin can edit any content
    if (userRole === 'admin') {
      return true;
    }

    // Staff can edit any content for consistency and clarity
    if (userRole === 'staff') {
      return true;
    }

    return false;
  }

  /**
   * Create a new news article
   */
  static async createArticle(articleData: CreateNewsArticleType, userId: string): Promise<NewsResult> {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          error: { message: 'User not found' },
        };
      }

      // Validate user exists and has permission
      const user = await UserModel.findById(userId);
      if (!user) {
        return {
          success: false,
          error: { message: 'User not found' },
        };
      }

      if (!this.canModifyNews(user.role)) {
        return {
          success: false,
          error: { message: 'Insufficient permissions to create news articles' },
        };
      }

      // Create new article
      const newArticle = new NewsArticleModel({
        title: articleData.title,
        content: articleData.content,
        summary: articleData.summary,
        category: articleData.category || 'general',
        tags: articleData.tags || [],
        author: {
          userId: user._id,
          name: `${user.profile.firstName} ${user.profile.lastName}`,
          role: user.role,
        },
        isPublished: articleData.isPublished || false,
        isPinned: articleData.isPinned || false,
      });

      // Save article to database
      const savedArticle = await newArticle.save();

      return {
        success: true,
        article: this.articleDocumentToArticle(savedArticle),
      };
    } catch (error) {
      logger.error('Error creating article:', error);
      return {
        success: false,
        error: { message: 'Failed to create article' },
      };
    }
  }

  /**
   * Update an existing news article
   */
  static async updateArticle(
    articleId: string,
    updateData: UpdateNewsArticleType,
    userId: string,
  ): Promise<NewsResult> {
    try {
      // Validate article exists
      const article = await NewsArticleModel.findById(articleId);
      if (!article) {
        return {
          success: false,
          error: { message: 'Article not found' },
        };
      }

      // Validate user exists and has permission
      const user = await UserModel.findById(userId);
      if (!user) {
        return {
          success: false,
          error: { message: 'User not found' },
        };
      }

      if (!this.canEditArticle(article, userId, user.role, user.profile?.department)) {
        return {
          success: false,
          error: { message: 'Insufficient permissions to update this article' },
        };
      }

      // Update article fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof UpdateNewsArticleType] !== undefined) {
          (article as any)[key] = updateData[key as keyof UpdateNewsArticleType];
        }
      });

      // Save updated article
      const updatedArticle = await article.save();

      return {
        success: true,
        article: this.articleDocumentToArticle(updatedArticle),
      };
    } catch (error) {
      logger.error('Error updating article:', error);
      return {
        success: false,
        error: { message: 'Failed to update article' },
      };
    }
  }

  /**
   * Delete a news article
   */
  static async deleteArticle(articleId: string, userId: string): Promise<DeleteResult> {
    try {
      // Validate article exists
      const article = await NewsArticleModel.findById(articleId);
      if (!article) {
        return {
          success: false,
          error: { message: 'Article not found' },
        };
      }

      // Validate user exists and has permission
      const user = await UserModel.findById(userId);
      if (!user) {
        return {
          success: false,
          error: { message: 'User not found' },
        };
      }

      if (!this.canEditArticle(article, userId, user.role, user.profile?.department)) {
        return {
          success: false,
          error: { message: 'Insufficient permissions to delete this article' },
        };
      }

      // Delete article
      await NewsArticleModel.findByIdAndDelete(articleId);

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error deleting article:', error);
      return {
        success: false,
        error: { message: 'Failed to delete article' },
      };
    }
  }

  /**
   * Get a news article by ID and increment view count
   */
  static async getArticleById(articleId: string): Promise<NewsResult> {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(articleId)) {
        return {
          success: false,
          error: { message: 'Invalid article ID format' },
        };
      }

      const article = await NewsArticleModel.findById(articleId);
      if (!article) {
        return {
          success: false,
          error: { message: 'Article not found' },
        };
      }

      // Increment view count
      await article.incrementViewCount();

      return {
        success: true,
        article: this.articleDocumentToArticle(article),
      };
    } catch (error) {
      logger.error('Error getting article by ID:', error);
      return {
        success: false,
        error: { message: 'Failed to get article' },
      };
    }
  }

  /**
   * Get a news article by slug and increment view count
   */
  static async getArticleBySlug(slug: string): Promise<NewsResult> {
    try {
      const article = await NewsArticleModel.findOne({ slug });
      if (!article) {
        return {
          success: false,
          error: { message: 'Article not found' },
        };
      }

      // Increment view count
      await article.incrementViewCount();

      return {
        success: true,
        article: this.articleDocumentToArticle(article),
      };
    } catch (error) {
      logger.error('Error getting article by slug:', error);
      return {
        success: false,
        error: { message: 'Failed to get article' },
      };
    }
  }

  /**
   * Get news articles with filtering, pagination, and search
   */
  static async getArticles(query: GetNewsArticlesQueryType): Promise<NewsListResult> {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        search,
        tag,
        published,
        pinned,
        author,
        sortBy = 'publishedAt',
        sortOrder = 'desc',
      } = query;

      // Build filter conditions
      const filter: any = {};

      // Filter by publication status (default to published only)
      if (published !== undefined) {
        filter.isPublished = published;
      } else {
        filter.isPublished = true; // Default to published articles only
      }

      if (category) {
        filter.category = category;
      }

      if (tag) {
        filter.tags = { $in: [tag] };
      }

      if (pinned !== undefined) {
        filter.isPinned = pinned;
      }

      if (author) {
        filter['author.userId'] = author;
      }

      // Add search conditions with improved word-based matching
      if (search) {
        // Split search into individual words and create regex patterns for each
        const searchWords = search.trim().split(/\s+/).filter(word => word.length > 0);

        if (searchWords.length === 1) {
          // Single word search - look for the word anywhere in text (handles hyphens, etc.)
          const wordPattern = searchWords[0]!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex chars
          filter.$or = [
            { title: { $regex: wordPattern, $options: 'i' } },
            { content: { $regex: wordPattern, $options: 'i' } },
            { summary: { $regex: wordPattern, $options: 'i' } },
            { tags: { $in: [new RegExp(wordPattern, 'i')] } },
          ];
        } else {
          // Multiple words - create AND condition so all words must appear somewhere
          filter.$and = searchWords.map(word => {
            const wordPattern = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return {
              $or: [
                { title: { $regex: wordPattern, $options: 'i' } },
                { content: { $regex: wordPattern, $options: 'i' } },
                { summary: { $regex: wordPattern, $options: 'i' } },
                { tags: { $in: [new RegExp(wordPattern, 'i')] } },
              ],
            };
          });
        }
      }

      // Build sort conditions
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query with pagination
      const [articles, total] = await Promise.all([
        NewsArticleModel.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        NewsArticleModel.countDocuments(filter),
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);
      const pagination = {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      // Convert to NewsArticleListItem format
      const articleList: NewsArticleListItem[] = articles.map(article => ({
        ...article,
        _id: article._id.toString(),
        author: {
          ...article.author,
          userId: article.author.userId.toString(),
        },
      }));

      return {
        success: true,
        articles: articleList,
        pagination,
      };
    } catch (error) {
      logger.error('Error getting articles:', error);
      return {
        success: false,
        articles: [],
        error: { message: 'Failed to get articles' },
      };
    }
  }

  /**
   * Publish an article
   */
  static async publishArticle(articleId: string, userId: string): Promise<NewsResult> {
    return this.updateArticle(articleId, { isPublished: true }, userId);
  }

  /**
   * Unpublish an article
   */
  static async unpublishArticle(articleId: string, userId: string): Promise<NewsResult> {
    return this.updateArticle(articleId, { isPublished: false }, userId);
  }

  /**
   * Pin an article
   */
  static async pinArticle(articleId: string, userId: string): Promise<NewsResult> {
    return this.updateArticle(articleId, { isPinned: true }, userId);
  }

  /**
   * Unpin an article
   */
  static async unpinArticle(articleId: string, userId: string): Promise<NewsResult> {
    return this.updateArticle(articleId, { isPinned: false }, userId);
  }

  // Instance methods that delegate to static methods for controller compatibility

  async createArticle(articleData: CreateNewsArticleType, user: any): Promise<any> {
    const result = await NewsService.createArticle(articleData, user._id || user.id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error');
    }
    return result.article;
  }

  async updateArticle(articleId: string, updateData: UpdateNewsArticleType, user: any): Promise<any> {
    const result = await NewsService.updateArticle(articleId, updateData, user._id || user.id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error');
    }
    return result.article;
  }

  async deleteArticle(articleId: string, user: any): Promise<boolean> {
    const result = await NewsService.deleteArticle(articleId, user._id || user.id);
    if (!result.success) {
      if (result.error?.message === 'Article not found') {
        return false; // Return false for not found instead of throwing
      }
      throw new Error(result.error?.message || 'Unknown error');
    }
    return true;
  }

  async getArticleById(articleId: string): Promise<any> {
    const result = await NewsService.getArticleById(articleId);
    if (!result.success) {
      return null;
    }
    return result.article;
  }

  async getArticleBySlug(slug: string): Promise<any> {
    const result = await NewsService.getArticleBySlug(slug);
    if (!result.success) {
      return null;
    }
    return result.article;
  }

  async listArticles(query: any): Promise<any> {
    const result = await NewsService.getArticles(query);
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error');
    }
    // Return the articles data structure that the controller expects
    return {
      articles: result.articles,
      total: result.pagination?.total || 0,
      page: result.pagination?.page || 1,
      totalPages: result.pagination?.totalPages || 1,
      hasNextPage: result.pagination?.hasNextPage || false,
      hasPrevPage: result.pagination?.hasPrevPage || false,
    };
  }

  async publishArticle(articleId: string, user: any): Promise<any> {
    const result = await NewsService.publishArticle(articleId, user._id || user.id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error');
    }
    return result.article;
  }

  async unpublishArticle(articleId: string, user: any): Promise<any> {
    const result = await NewsService.unpublishArticle(articleId, user._id || user.id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error');
    }
    return result.article;
  }

  async pinArticle(articleId: string, user: any): Promise<any> {
    const result = await NewsService.pinArticle(articleId, user._id || user.id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error');
    }
    return result.article;
  }

  async unpinArticle(articleId: string, user: any): Promise<any> {
    const result = await NewsService.unpinArticle(articleId, user._id || user.id);
    if (!result.success) {
      throw new Error(result.error?.message || 'Unknown error');
    }
    return result.article;
  }
}
