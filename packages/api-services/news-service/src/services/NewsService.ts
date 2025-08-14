// packages/api-services/news-service/src/services/NewsService.ts
// News service with business logic

import mongoose from 'mongoose';
import { NewsArticleModel, NewsArticleDocument } from '@yggdrasil/database-schemas';
import {
  CreateNewsArticleType,
  UpdateNewsArticleType,
  GetNewsArticlesQueryType,
  NewsArticle,
  NewsArticleListItem,
  User,
} from '@yggdrasil/shared-utilities';

// Service response interfaces for better type safety
export interface NewsListResult {
  articles: NewsArticleListItem[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class NewsService {
  /**
   * Convert NewsArticleDocument to NewsArticle (removes sensitive data and converts _id to string)
   */
  private articleDocumentToArticle(articleDoc: NewsArticleDocument): NewsArticle {
    return articleDoc.toJSON() as NewsArticle;
  }

  /**
   * Check if user has permission to create/edit news articles
   */
  private canModifyNews(userRole: string): boolean {
    return ['admin', 'staff'].includes(userRole);
  }

  /**
   * Check if user can edit specific article (author, admin, or staff)
   */
  private canEditArticle(article: NewsArticleDocument, userId: string, userRole: string): boolean {
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
  async createArticle(articleData: CreateNewsArticleType, user: User): Promise<NewsArticle> {
    // Validate user has permission
    if (!this.canModifyNews(user.role)) {
      throw new Error('Insufficient permissions to create news articles');
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
    return this.articleDocumentToArticle(savedArticle);
  }

  /**
   * Update an existing news article
   */
  async updateArticle(
    articleId: string,
    updateData: UpdateNewsArticleType,
    user: User,
  ): Promise<NewsArticle | null> {
    // Validate article exists
    const article = await NewsArticleModel.findById(articleId);
    if (!article) {
      return null;
    }

    // Validate user has permission to edit this article
    const userId = user._id;
    if (!this.canEditArticle(article, userId, user.role)) {
      throw new Error('Insufficient permissions to update this article');
    }

    // Update article fields
    Object.keys(updateData).forEach(key => {
      const value = updateData[key as keyof UpdateNewsArticleType];
      if (value !== undefined) {
        (article as any)[key] = value;
      }
    });

    // Save updated article
    const updatedArticle = await article.save();
    return this.articleDocumentToArticle(updatedArticle);
  }

  /**
   * Delete a news article
   */
  async deleteArticle(articleId: string, user: User): Promise<boolean> {
    // Validate article exists
    const article = await NewsArticleModel.findById(articleId);
    if (!article) {
      return false;
    }

    // Validate user has permission to delete this article
    const userId = user._id;
    if (!this.canEditArticle(article, userId, user.role)) {
      throw new Error('Insufficient permissions to delete this article');
    }

    // Delete article
    await NewsArticleModel.findByIdAndDelete(articleId);
    return true;
  }

  /**
   * Get a news article by ID and increment view count
   */
  async getArticleById(articleId: string): Promise<NewsArticle | null> {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return null;
    }

    const article = await NewsArticleModel.findById(articleId);
    if (!article) {
      return null;
    }

    // Increment view count
    await article.incrementViewCount();
    return this.articleDocumentToArticle(article);
  }

  /**
   * Get a news article by slug and increment view count
   */
  async getArticleBySlug(slug: string): Promise<NewsArticle | null> {
    const article = await NewsArticleModel.findOne({ slug });
    if (!article) {
      return null;
    }

    // Increment view count
    await article.incrementViewCount();
    return this.articleDocumentToArticle(article);
  }

  /**
   * Get news articles with filtering, pagination, and search
   */
  async listArticles(query: GetNewsArticlesQueryType): Promise<NewsListResult> {
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
      const searchWords = search
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0);

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
      NewsArticleModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      NewsArticleModel.countDocuments(filter),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);

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
      articles: articleList,
      total,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Publish an article
   */
  async publishArticle(articleId: string, user: User): Promise<NewsArticle | null> {
    return this.updateArticle(articleId, { isPublished: true }, user);
  }

  /**
   * Unpublish an article
   */
  async unpublishArticle(articleId: string, user: User): Promise<NewsArticle | null> {
    return this.updateArticle(articleId, { isPublished: false }, user);
  }

  /**
   * Pin an article
   */
  async pinArticle(articleId: string, user: User): Promise<NewsArticle | null> {
    return this.updateArticle(articleId, { isPinned: true }, user);
  }

  /**
   * Unpin an article
   */
  async unpinArticle(articleId: string, user: User): Promise<NewsArticle | null> {
    return this.updateArticle(articleId, { isPinned: false }, user);
  }
}
