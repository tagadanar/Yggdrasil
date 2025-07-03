// Path: packages/api-services/news-service/src/types/news.ts

export interface NewsArticle {
  _id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  author: string; // User ID
  authorInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  category: NewsCategory;
  tags: string[];
  status: ArticleStatus;
  visibility: ArticleVisibility;
  priority: ArticlePriority;
  featuredImage?: {
    url: string;
    alt: string;
    caption?: string;
  };
  attachments: Attachment[];
  metadata: ArticleMetadata;
  analytics: ArticleAnalytics;
  isActive: boolean;
  isFeatured: boolean;
  isPinned: boolean;
  publishedAt?: Date;
  scheduledAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NewsCategory = 
  | 'announcement'
  | 'academic'
  | 'administrative'
  | 'events'
  | 'achievement'
  | 'sports'
  | 'technology'
  | 'scholarship'
  | 'admission'
  | 'emergency'
  | 'general';

export type ArticleStatus = 
  | 'draft'
  | 'review'
  | 'scheduled'
  | 'published'
  | 'archived'
  | 'rejected';

export type ArticleVisibility = 
  | 'public'
  | 'students'
  | 'faculty'
  | 'staff'
  | 'admin'
  | 'custom';

export type ArticlePriority = 
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | 'emergency';

export interface Attachment {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  description?: string;
  uploadedAt: Date;
}

export interface ArticleMetadata {
  readTime: number; // estimated reading time in minutes
  wordCount: number;
  characterCount: number;
  language: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  customFields?: Record<string, any>;
}

export interface ArticleAnalytics {
  views: number;
  uniqueViews: number;
  likes: number;
  shares: number;
  comments: number;
  readingTime: number; // average time spent reading
  bounceRate: number; // percentage who left immediately
  lastViewedAt?: Date;
}

// Comment system
export interface Comment {
  _id: string;
  articleId: string;
  author: string; // User ID
  authorInfo?: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  content: string;
  parentComment?: string; // For reply threads
  replies: string[]; // Comment IDs
  status: CommentStatus;
  likes: number;
  dislikes: number;
  isApproved: boolean;
  moderatedBy?: string; // User ID
  moderatedAt?: Date;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CommentStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'spam'
  | 'deleted';

// Newsletter and subscriptions
export interface Newsletter {
  _id: string;
  title: string;
  description: string;
  template: string;
  categories: NewsCategory[];
  isActive: boolean;
  frequency: NewsletterFrequency;
  subscribers: string[]; // User IDs
  lastSent?: Date;
  nextScheduled?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NewsletterFrequency = 
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'custom';

export interface NewsletterIssue {
  _id: string;
  newsletterId: string;
  title: string;
  content: string;
  articles: string[]; // Article IDs
  status: IssueStatus;
  sentTo: number; // number of recipients
  openRate: number;
  clickRate: number;
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
}

export type IssueStatus = 
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed';

// CRUD interfaces
export interface CreateArticleData {
  title: string;
  content: string;
  excerpt?: string;
  category: NewsCategory;
  tags?: string[];
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  priority?: ArticlePriority;
  featuredImage?: {
    url: string;
    alt: string;
    caption?: string;
  };
  isFeatured?: boolean;
  isPinned?: boolean;
  publishedAt?: Date;
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface UpdateArticleData {
  title?: string;
  content?: string;
  excerpt?: string;
  category?: NewsCategory;
  tags?: string[];
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  priority?: ArticlePriority;
  featuredImage?: {
    url: string;
    alt: string;
    caption?: string;
  };
  isFeatured?: boolean;
  isPinned?: boolean;
  publishedAt?: Date;
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface CreateCommentData {
  content: string;
  parentComment?: string;
}

export interface UpdateCommentData {
  content?: string;
  status?: CommentStatus;
}

// Search and filter interfaces
export interface ArticleSearchFilters {
  category?: NewsCategory;
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  priority?: ArticlePriority;
  author?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  isFeatured?: boolean;
  isPinned?: boolean;
  hasImage?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'publishedAt' | 'title' | 'views' | 'likes';
  sortOrder?: 'asc' | 'desc';
}

export interface CommentSearchFilters {
  articleId?: string;
  author?: string;
  status?: CommentStatus;
  isApproved?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'likes' | 'replies';
  sortOrder?: 'asc' | 'desc';
}

// Analytics and statistics
export interface NewsAnalytics {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  scheduledArticles: number;
  totalViews: number;
  totalComments: number;
  totalShares: number;
  avgReadTime: number;
  topArticles: Array<{
    articleId: string;
    title: string;
    views: number;
    engagement: number;
  }>;
  topCategories: Array<{
    category: NewsCategory;
    count: number;
    views: number;
  }>;
  topAuthors: Array<{
    authorId: string;
    name: string;
    articleCount: number;
    totalViews: number;
  }>;
  recentActivity: Array<{
    type: 'publish' | 'view' | 'comment' | 'share';
    count: number;
    date: Date;
  }>;
}

// Notification interfaces
export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  categories: NewsCategory[];
  frequency: NotificationFrequency;
  digestTime?: string; // "09:00" for 9 AM
  keywords?: string[];
}

export type NotificationFrequency = 
  | 'immediate'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'never';

// Content moderation
export interface ModerationRule {
  _id: string;
  name: string;
  description: string;
  type: ModerationType;
  conditions: ModerationCondition[];
  actions: ModerationAction[];
  isActive: boolean;
  priority: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ModerationType = 
  | 'keyword'
  | 'content_length'
  | 'user_role'
  | 'sentiment'
  | 'spam_detection';

export interface ModerationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'greater_than' | 'less_than';
  value: any;
}

export interface ModerationAction {
  type: 'auto_approve' | 'auto_reject' | 'flag_for_review' | 'notify_moderator' | 'block_user';
  parameters?: Record<string, any>;
}

// Media management
export interface MediaFile {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  caption?: string;
  uploadedBy: string;
  usedInArticles: string[];
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// RSS and syndication
export interface RSSFeed {
  _id: string;
  title: string;
  description: string;
  link: string;
  categories: NewsCategory[];
  maxItems: number;
  isActive: boolean;
  includeContent: boolean;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}