// packages/shared-utilities/src/types/news.ts
// Types for news articles and related functionality

export interface NewsAuthor {
  userId: string;
  name: string;
  role: string;
}

export interface NewsArticle {
  _id: string;
  title: string;
  content: string;
  summary?: string;
  slug: string;
  category: 'general' | 'academic' | 'events' | 'announcements';
  tags: string[];
  author: NewsAuthor;
  isPublished: boolean;
  isPinned: boolean;
  publishedAt?: Date;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsArticleListItem {
  _id: string;
  title: string;
  summary?: string;
  slug: string;
  category: 'general' | 'academic' | 'events' | 'announcements';
  tags: string[];
  author: NewsAuthor;
  isPublished: boolean;
  isPinned: boolean;
  publishedAt?: Date;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewsArticleDetail extends NewsArticle {
  // Same as NewsArticle, but explicitly shows this is the full article view
}

export interface CreateNewsArticleRequest {
  title: string;
  content: string;
  summary?: string;
  category?: 'general' | 'academic' | 'events' | 'announcements';
  tags?: string[];
  isPublished?: boolean;
  isPinned?: boolean;
}

export interface UpdateNewsArticleRequest {
  title?: string;
  content?: string;
  summary?: string;
  category?: 'general' | 'academic' | 'events' | 'announcements';
  tags?: string[];
  isPublished?: boolean;
  isPinned?: boolean;
}

export interface NewsSearchFilters {
  category?: 'general' | 'academic' | 'events' | 'announcements';
  search?: string;
  tag?: string;
  published?: boolean;
  pinned?: boolean;
  author?: string;
}

export interface NewsPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: 'publishedAt' | 'createdAt' | 'updatedAt' | 'viewCount' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface NewsListQuery extends NewsPaginationQuery, NewsSearchFilters {}

export interface NewsStatistics {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  pinnedArticles: number;
  categoryCounts: Record<string, number>;
  tagCounts: Record<string, number>;
  authorCounts: Record<string, number>;
  viewCounts: {
    total: number;
    average: number;
    topArticles: Array<{
      _id: string;
      title: string;
      viewCount: number;
    }>;
  };
  recentActivity: {
    articlesCreated: number;
    articlesUpdated: number;
    articlesPublished: number;
  };
}

export interface BulkNewsOperation {
  articleIds: string[];
  operation: 'publish' | 'unpublish' | 'pin' | 'unpin' | 'delete';
}

export interface BulkNewsResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    articleId: string;
    error: string;
  }>;
}