// Path: packages/database-schemas/src/models/News.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

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
  priority: 'low' | 'medium' | 'high' | 'urgent';
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

const NewsSchema = new Schema<NewsArticle>({
  title: {
    type: String,
    required: [true, 'News title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'News content is required']
  },
  summary: {
    type: String,
    maxlength: [500, 'Summary cannot exceed 500 characters']
  },
  author: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'academic', 'administrative', 'events', 'announcements', 'alerts'],
    default: 'general'
  },
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: Date,
  featuredImage: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  targetAudience: {
    type: [String],
    enum: ['all', 'students', 'teachers', 'staff', 'admin'],
    default: ['all']
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  readBy: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'news'
});

// Indexes
NewsSchema.index({ status: 1, publishedAt: -1 });
NewsSchema.index({ category: 1 });
NewsSchema.index({ author: 1 });
NewsSchema.index({ tags: 1 });
NewsSchema.index({ title: 'text', content: 'text' });

// Static Methods
NewsSchema.statics.findPublished = function() {
  return this.find({ 
    status: 'published', 
    isActive: true 
  }).sort({ publishedAt: -1 });
};

NewsSchema.statics.findByCategory = function(category: string) {
  return this.find({ 
    category, 
    status: 'published', 
    isActive: true 
  }).sort({ publishedAt: -1 });
};

NewsSchema.statics.findByAuthor = function(authorId: string) {
  return this.find({ author: authorId }).sort({ createdAt: -1 });
};

NewsSchema.statics.findForAudience = function(audience: string[]) {
  return this.find({
    status: 'published',
    isActive: true,
    $or: [
      { targetAudience: { $in: audience } },
      { targetAudience: 'all' }
    ]
  }).sort({ publishedAt: -1 }).then((articles: NewsArticle[]) => {
    // Sort by priority manually: urgent > high > medium > low
    const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
    return articles.sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Descending priority
      }
      return new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime(); // Descending date
    });
  });
};

NewsSchema.statics.markAsRead = async function(articleId: string, userId: string) {
  const result = await this.updateOne(
    { _id: articleId },
    { $addToSet: { readBy: userId } }
  );
  return result.modifiedCount > 0;
};

NewsSchema.statics.searchArticles = function(query: string) {
  return this.find({
    $text: { $search: query },
    status: 'published',
    isActive: true
  }).sort({ score: { $meta: 'textScore' } });
};

// Pre-save middleware
NewsSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export const NewsModel = mongoose.model<NewsArticle, NewsModel>('News', NewsSchema);