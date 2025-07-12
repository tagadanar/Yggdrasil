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
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent' | 'emergency';
  targetAudience: string[];
  notificationSent: boolean;
  readBy: string[];
  isActive: boolean;
  metadata?: {
    readTime: number;
    wordCount: number;
    characterCount: number;
    language: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    customFields?: Record<string, any>;
  };
  visibility?: 'public' | 'students' | 'faculty' | 'staff' | 'admin' | 'custom';
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
  ensureLatestSchema(): Promise<void>;
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
    enum: ['low', 'normal', 'medium', 'high', 'urgent', 'emergency'],
    default: 'normal'
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
  },
  metadata: {
    readTime: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    characterCount: { type: Number, default: 0 },
    language: { type: String, default: 'en' },
    seoTitle: String,
    seoDescription: String,
    seoKeywords: [String],
    customFields: { type: Schema.Types.Mixed, default: {} }
  },
  visibility: {
    type: String,
    enum: ['public', 'students', 'faculty', 'staff', 'admin', 'custom'],
    default: 'public'
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

// Method to ensure collection uses latest schema
NewsSchema.statics.ensureLatestSchema = async function() {
  try {
    // Check if collection exists
    const collections = await mongoose.connection.db.listCollections({ name: 'news' }).toArray();
    
    if (collections.length > 0) {
      // Drop existing collection to force recreation with new schema
      await mongoose.connection.db.collection('news').drop();
      console.log('✅ Dropped existing news collection to apply schema updates');
    }
    
    // Create indexes for the new collection
    await this.createIndexes();
    console.log('✅ Created indexes for news collection');
  } catch (error: any) {
    console.log('ℹ️  News collection schema update:', error.message);
  }
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
    // Sort by priority manually: emergency > urgent > high > medium > normal > low
    const priorityOrder = { 'emergency': 6, 'urgent': 5, 'high': 4, 'medium': 3, 'normal': 2, 'low': 1 };
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
NewsSchema.pre<NewsArticle>('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export const NewsModel = (mongoose.models.News as NewsModel) || mongoose.model<NewsArticle, NewsModel>('News', NewsSchema);