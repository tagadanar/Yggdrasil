// Path: packages/api-services/news-service/src/services/NewsService.ts
import {
  NewsArticle,
  CreateArticleData,
  UpdateArticleData,
  ArticleSearchFilters,
  NewsAnalytics,
  Comment,
  CreateCommentData,
  UpdateCommentData,
  CommentSearchFilters,
  NewsCategory,
  ArticleStatus,
  ArticleVisibility,
  ArticlePriority
} from '../types/news';
import { NewsModel } from '@101-school/database-schemas/src/models/News';

export interface ArticleResult {
  success: boolean;
  article?: any;
  articles?: any[];
  error?: string;
  message?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CommentResult {
  success: boolean;
  comment?: any;
  comments?: any[];
  error?: string;
  message?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface AnalyticsResult {
  success: boolean;
  analytics?: NewsAnalytics;
  error?: string;
}

// In-memory storage for development when MongoDB is not available
let articleStorage: any[] = [];
let articleIdCounter = 1;

// Comment storage for demo purposes (to be replaced with proper model)
let commentStorage: any[] = [];
let commentIdCounter = 1;

export class NewsService {
  /**
   * Create a new article
   */
  static async createArticle(articleData: CreateArticleData, authorId: string): Promise<ArticleResult> {
    try {
      // Validate required fields
      if (!articleData.title || !articleData.content) {
        return { success: false, error: 'Title and content are required' };
      }

      // Try MongoDB first, fallback to in-memory if it fails
      try {
        // Map to MongoDB model structure
        const newsArticle = new NewsModel({
          title: articleData.title,
          content: articleData.content,
          summary: articleData.excerpt || '',
          author: authorId,
          category: articleData.category || 'general',
          tags: articleData.tags || [],
          status: articleData.status || 'draft',
          featuredImage: articleData.featuredImage?.url,
          priority: articleData.priority || 'medium',
          targetAudience: ['all'],
          notificationSent: false,
          readBy: [],
          isActive: true
        });

        const savedArticle = await newsArticle.save();
        return { success: true, article: savedArticle };
      } catch (dbError: any) {
        // If MongoDB fails, use in-memory storage
        console.log('MongoDB not available, using in-memory storage:', dbError.message);
        
        const article = {
          _id: `article-${articleIdCounter++}`,
          title: articleData.title,
          content: articleData.content,
          summary: articleData.excerpt || '',
          author: authorId,
          category: articleData.category || 'general',
          tags: articleData.tags || [],
          status: articleData.status || 'draft',
          featuredImage: articleData.featuredImage?.url,
          priority: articleData.priority || 'medium',
          targetAudience: ['all'],
          notificationSent: false,
          readBy: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        articleStorage.push(article);
        return { success: true, article };
      }
    } catch (error: any) {
      return { success: false, error: `Failed to create article: ${error.message}` };
    }
  }

  /**
   * Get article by ID or slug
   */
  static async getArticle(identifier: string, userId?: string): Promise<ArticleResult> {
    try {
      const article = await NewsModel.findOne({
        $or: [
          { _id: identifier },
          { slug: identifier }
        ],
        isActive: true
      });

      if (!article) {
        return { success: false, error: 'Article not found' };
      }

      // Check permissions
      if (!this.canUserViewArticle(article, userId)) {
        return { success: false, error: 'Insufficient permissions to view this article' };
      }

      // Mark as read if user is viewing
      if (userId) {
        await NewsModel.markAsRead((article._id as any).toString(), userId);
      }

      return { success: true, article };
    } catch (error: any) {
      return { success: false, error: `Failed to get article: ${error.message}` };
    }
  }

  /**
   * Update article
   */
  static async updateArticle(articleId: string, updateData: UpdateArticleData, userId: string): Promise<ArticleResult> {
    try {
      const article = await NewsModel.findOne({ _id: articleId, isActive: true });
      if (!article) {
        return { success: false, error: 'Article not found' };
      }

      // Check permissions
      if (!this.canUserEditArticle(article, userId)) {
        return { success: false, error: 'Insufficient permissions to edit this article' };
      }

      // Map update data to MongoDB model
      const updateFields: any = {};
      if (updateData.title) updateFields.title = updateData.title;
      if (updateData.content) updateFields.content = updateData.content;
      if (updateData.excerpt) updateFields.summary = updateData.excerpt;
      if (updateData.category) updateFields.category = updateData.category;
      if (updateData.tags) updateFields.tags = updateData.tags;
      if (updateData.featuredImage) updateFields.featuredImage = updateData.featuredImage.url;
      if (updateData.priority) updateFields.priority = updateData.priority;
      if (updateData.status) {
        updateFields.status = updateData.status;
      }

      const updatedArticle = await NewsModel.findByIdAndUpdate(
        articleId,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!updatedArticle) {
        return { success: false, error: 'Failed to update article' };
      }

      return { success: true, article: updatedArticle };
    } catch (error: any) {
      return { success: false, error: `Failed to update article: ${error.message}` };
    }
  }

  /**
   * Delete article (soft delete)
   */
  static async deleteArticle(articleId: string, userId: string): Promise<ArticleResult> {
    try {
      const article = await NewsModel.findOne({ _id: articleId, isActive: true });
      if (!article) {
        return { success: false, error: 'Article not found' };
      }

      // Check permissions
      if (!this.canUserDeleteArticle(article, userId)) {
        return { success: false, error: 'Insufficient permissions to delete this article' };
      }

      // Soft delete
      await NewsModel.findByIdAndUpdate(articleId, {
        $set: {
          isActive: false,
          status: 'archived'
        }
      });

      return { success: true, message: 'Article deleted successfully' };
    } catch (error: any) {
      return { success: false, error: `Failed to delete article: ${error.message}` };
    }
  }

  /**
   * Search articles with filters
   */
  static async searchArticles(filters: ArticleSearchFilters, userId?: string): Promise<ArticleResult> {
    try {
      // Build query
      const query: any = { isActive: true };

      // Apply permission-based filtering
      if (!userId) {
        // Public only for anonymous users
        query.status = 'published';
      }

      // Apply filters
      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.priority) {
        query.priority = filters.priority;
      }

      if (filters.author) {
        query.author = filters.author;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.dateFrom || filters.dateTo) {
        query.publishedAt = {};
        if (filters.dateFrom) query.publishedAt.$gte = filters.dateFrom;
        if (filters.dateTo) query.publishedAt.$lte = filters.dateTo;
      }

      if (filters.hasImage !== undefined) {
        if (filters.hasImage) {
          query.featuredImage = { $exists: true, $ne: null };
        } else {
          query.featuredImage = { $exists: false };
        }
      }

      // Sorting
      const sortField = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
      const sort: any = {};
      sort[sortField] = sortOrder;

      // Pagination
      const limit = Math.min(filters.limit || 20, 100);
      const offset = filters.offset || 0;

      // Try MongoDB first, fallback to in-memory if it fails
      try {
        const [articles, total] = await Promise.all([
          NewsModel.find(query)
            .sort(sort)
            .skip(offset)
            .limit(limit)
            .exec(),
          NewsModel.countDocuments(query)
        ]);

        return {
          success: true,
          articles,
          pagination: {
            limit,
            offset,
            total,
            hasMore: (offset + limit) < total
          }
        };
      } catch (dbError: any) {
        // If MongoDB fails, use in-memory storage
        console.log('MongoDB not available for search, using in-memory storage:', dbError.message);
        
        let filteredArticles = articleStorage.filter(article => {
          if (!article.isActive) return false;
          
          // Public only for anonymous users
          if (!userId && article.status !== 'published') return false;
          
          // Apply filters
          if (filters.category && article.category !== filters.category) return false;
          if (filters.status && article.status !== filters.status) return false;
          if (filters.priority && article.priority !== filters.priority) return false;
          if (filters.author && article.author !== filters.author) return false;
          if (filters.tags && filters.tags.length > 0) {
            const hasTag = filters.tags.some(tag => article.tags.includes(tag));
            if (!hasTag) return false;
          }
          
          return true;
        });

        // Sort
        filteredArticles.sort((a, b) => {
          const aValue = a[sortField] || 0;
          const bValue = b[sortField] || 0;
          return sortOrder === 1 ? 
            (aValue > bValue ? 1 : -1) : 
            (aValue < bValue ? 1 : -1);
        });

        // Pagination
        const total = filteredArticles.length;
        const paginatedArticles = filteredArticles.slice(offset, offset + limit);

        return {
          success: true,
          articles: paginatedArticles,
          pagination: {
            limit,
            offset,
            total,
            hasMore: (offset + limit) < total
          }
        };
      }
    } catch (error: any) {
      return { success: false, error: `Failed to search articles: ${error.message}` };
    }
  }

  /**
   * Get featured articles
   */
  static async getFeaturedArticles(limit: number = 5): Promise<ArticleResult> {
    try {
      const featuredArticles = await NewsModel.find({
        isActive: true,
        status: 'published',
        priority: { $in: ['high', 'urgent'] }
      })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit);

      return { success: true, articles: featuredArticles };
    } catch (error: any) {
      return { success: false, error: `Failed to get featured articles: ${error.message}` };
    }
  }

  /**
   * Get recent articles
   */
  static async getRecentArticles(limit: number = 10): Promise<ArticleResult> {
    try {
      const recentArticles = await NewsModel.find({
        isActive: true,
        status: 'published'
      })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit);

      return { success: true, articles: recentArticles };
    } catch (error: any) {
      return { success: false, error: `Failed to get recent articles: ${error.message}` };
    }
  }

  /**
   * Publish article
   */
  static async publishArticle(articleId: string, userId: string): Promise<ArticleResult> {
    try {
      const article = await NewsModel.findOne({ _id: articleId, isActive: true });
      if (!article) {
        return { success: false, error: 'Article not found' };
      }

      if (!this.canUserEditArticle(article, userId)) {
        return { success: false, error: 'Insufficient permissions to publish this article' };
      }

      const updatedArticle = await NewsModel.findByIdAndUpdate(
        articleId,
        { $set: { status: 'published', publishedAt: new Date() } },
        { new: true }
      );

      return { success: true, article: updatedArticle, message: 'Article published successfully' };
    } catch (error: any) {
      return { success: false, error: `Failed to publish article: ${error.message}` };
    }
  }

  /**
   * Archive article
   */
  static async archiveArticle(articleId: string, userId: string): Promise<ArticleResult> {
    try {
      const article = await NewsModel.findOne({ _id: articleId, isActive: true });
      if (!article) {
        return { success: false, error: 'Article not found' };
      }

      if (!this.canUserEditArticle(article, userId)) {
        return { success: false, error: 'Insufficient permissions to archive this article' };
      }

      const updatedArticle = await NewsModel.findByIdAndUpdate(
        articleId,
        { $set: { status: 'archived' } },
        { new: true }
      );

      return { success: true, article: updatedArticle, message: 'Article archived successfully' };
    } catch (error: any) {
      return { success: false, error: `Failed to archive article: ${error.message}` };
    }
  }

  /**
   * Like/unlike article
   */
  static async toggleArticleLike(articleId: string, userId: string): Promise<ArticleResult> {
    try {
      const article = await NewsModel.findOne({ _id: articleId, isActive: true });
      if (!article) {
        return { success: false, error: 'Article not found' };
      }

      // For simplicity, just add to readBy array to track interaction
      await NewsModel.markAsRead(articleId, userId);

      return { 
        success: true, 
        article,
        message: 'Article liked successfully'
      };
    } catch (error: any) {
      return { success: false, error: `Failed to toggle like: ${error.message}` };
    }
  }

  /**
   * Get news analytics
   */
  static async getNewsAnalytics(userId?: string): Promise<AnalyticsResult> {
    try {
      const query: any = { isActive: true };
      if (userId) {
        query.author = userId;
      }

      const articles = await NewsModel.find(query);
      
      const totalArticles = articles.length;
      const publishedArticles = articles.filter(a => a.status === 'published').length;
      const draftArticles = articles.filter(a => a.status === 'draft').length;
      const scheduledArticles = 0; // Not implemented yet

      const totalViews = articles.reduce((sum, a) => sum + (a.readBy?.length || 0), 0);
      const totalComments = commentStorage.filter(c => 
        articles.some(a => (a._id as any).toString() === c.articleId)
      ).length;
      const totalShares = 0; // Not implemented yet
      const avgReadTime = 0; // Not implemented yet

      // Top articles
      const topArticles = articles
        .filter(a => a.status === 'published')
        .sort((a, b) => (b.readBy?.length || 0) - (a.readBy?.length || 0))
        .slice(0, 5)
        .map(a => ({
          articleId: (a._id as any).toString(),
          title: a.title,
          views: a.readBy?.length || 0,
          engagement: a.readBy?.length || 0
        }));

      // Top categories
      const categoryStats: Record<string, { count: number; views: number }> = articles.reduce((acc, article) => {
        if (!acc[article.category]) {
          acc[article.category] = { count: 0, views: 0 };
        }
        acc[article.category].count++;
        acc[article.category].views += article.readBy?.length || 0;
        return acc;
      }, {} as Record<string, { count: number; views: number }>);

      const topCategories = Object.entries(categoryStats)
        .map(([category, stats]) => ({
          category: category as NewsCategory,
          count: stats.count,
          views: stats.views
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      const analytics: NewsAnalytics = {
        totalArticles,
        publishedArticles,
        draftArticles,
        scheduledArticles,
        totalViews,
        totalComments,
        totalShares,
        avgReadTime,
        topArticles,
        topCategories,
        topAuthors: [], // Would require user data
        recentActivity: [] // Would require activity tracking
      };

      return { success: true, analytics };
    } catch (error: any) {
      return { success: false, error: `Failed to get analytics: ${error.message}` };
    }
  }

  /**
   * Helper methods
   */
  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private static canUserViewArticle(article: any, userId?: string): boolean {
    if (article.status !== 'published') {
      // Only author and admins can view unpublished articles
      return userId === article.author; // Simplified - would check admin role too
    }

    switch (article.visibility) {
      case 'public':
        return true;
      case 'students':
      case 'faculty':
      case 'staff':
      case 'admin':
        return !!userId; // Simplified - would check actual roles
      default:
        return userId === article.author;
    }
  }

  private static canUserEditArticle(article: any, userId: string): boolean {
    return article.author === userId; // Simplified - would check admin/editor roles
  }

  private static canUserDeleteArticle(article: any, userId: string): boolean {
    return article.author === userId; // Simplified - would check admin roles
  }

  /**
   * Toggle pin status of an article
   */
  static async togglePin(articleId: string, userId: string): Promise<ArticleResult> {
    try {
      const article = await NewsModel.findOne({ _id: articleId, isActive: true });

      if (!article) {
        return { success: false, error: 'Article not found' };
      }

      // Check if user can edit this article
      if (!this.canUserEditArticle(article, userId)) {
        return { success: false, error: 'Insufficient permissions to modify this article' };
      }

      // Toggle pin status by changing priority
      const newPriority = article.priority === 'urgent' ? 'medium' : 'urgent';
      const updatedArticle = await NewsModel.findByIdAndUpdate(
        articleId,
        { $set: { priority: newPriority } },
        { new: true }
      );

      return { success: true, article: updatedArticle };
    } catch (error: any) {
      return { success: false, error: `Failed to toggle pin status: ${error.message}` };
    }
  }

  /**
   * Mark article as read by user
   */
  static async markAsRead(articleId: string, userId: string): Promise<ArticleResult> {
    try {
      const article = await NewsModel.findOne({ _id: articleId, isActive: true });

      if (!article) {
        return { success: false, error: 'Article not found' };
      }

      // Check if user can view this article
      if (!this.canUserViewArticle(article, userId)) {
        return { success: false, error: 'Insufficient permissions to view this article' };
      }

      // Mark as read using the model's method
      const wasMarked = await NewsModel.markAsRead(articleId, userId);
      
      if (wasMarked) {
        const updatedArticle = await NewsModel.findById(articleId);
        return { success: true, article: updatedArticle };
      }

      return { success: true, article };
    } catch (error: any) {
      return { success: false, error: `Failed to mark as read: ${error.message}` };
    }
  }

  /**
   * Clear storage (for testing)
   */
  static async clearStorage(): Promise<void> {
    await NewsModel.deleteMany({});
    commentStorage = [];
    commentIdCounter = 1;
  }
}