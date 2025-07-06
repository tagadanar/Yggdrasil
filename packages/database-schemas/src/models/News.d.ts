import { Document, Model } from 'mongoose';
export interface NewsArticle extends Document {
    title: string;
    content: string;
    summary: string;
    author: string;
    category: string;
    tags: string[];
    status: 'draft' | 'published' | 'archived';
    publishedAt?: Date;
    featuredImage?: string;
    priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent' | 'emergency';
    targetAudience: string[];
    notificationSent: boolean;
    readBy: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface NewsModel extends Model<NewsArticle> {
    findPublished(): Promise<NewsArticle[]>;
    findByCategory(category: string): Promise<NewsArticle[]>;
    findByAuthor(authorId: string): Promise<NewsArticle[]>;
    findForAudience(audience: string[]): Promise<NewsArticle[]>;
    markAsRead(articleId: string, userId: string): Promise<boolean>;
    searchArticles(query: string): Promise<NewsArticle[]>;
}
export declare const NewsModel: NewsModel;
//# sourceMappingURL=News.d.ts.map