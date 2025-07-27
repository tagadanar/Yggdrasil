// packages/database-schemas/src/models/NewsArticle.ts
// NewsArticle model with Mongoose schema

import mongoose, { Document, Schema } from 'mongoose';

// Define the NewsArticle interface
export interface NewsArticle {
  _id: string;
  title: string;
  content: string;
  summary?: string;
  slug: string;
  category: 'general' | 'academic' | 'events' | 'announcements';
  tags: string[];
  author: {
    userId: mongoose.Types.ObjectId;
    name: string;
    role: string;
  };
  isPublished: boolean;
  isPinned: boolean;
  publishedAt?: Date;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Extend the NewsArticle interface with Mongoose Document
export interface NewsArticleDocument extends Omit<NewsArticle, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
  incrementViewCount(): Promise<void>;
  publish(): Promise<void>;
  unpublish(): Promise<void>;
}

// Static methods interface
export interface NewsArticleModelType extends mongoose.Model<NewsArticleDocument> {
  findPublished(): Promise<NewsArticleDocument[]>;
  findPinned(): Promise<NewsArticleDocument[]>;
  findByCategory(category: string): Promise<NewsArticleDocument[]>;
  searchArticles(query: string): Promise<NewsArticleDocument[]>;
  findByTag(tag: string): Promise<NewsArticleDocument[]>;
  getRecent(limit?: number): Promise<NewsArticleDocument[]>;
}

// Author Schema
const AuthorSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  role: {
    type: String,
    required: true,
    enum: ['admin', 'staff', 'teacher', 'student'],
  },
}, { _id: false });

// Generate URL-friendly slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Main NewsArticle Schema
const NewsArticleSchema = new Schema<NewsArticleDocument>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  summary: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['general', 'academic', 'events', 'announcements'],
    default: 'general',
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
  author: {
    type: AuthorSchema,
    required: true,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  publishedAt: {
    type: Date,
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'news_articles',
});

// Indexes for performance
NewsArticleSchema.index({ publishedAt: -1 }); // Latest articles first
NewsArticleSchema.index({ category: 1 }); // Filter by category
NewsArticleSchema.index({ tags: 1 }); // Filter by tags
NewsArticleSchema.index({ isPublished: 1 }); // Published articles
NewsArticleSchema.index({ isPinned: 1 }); // Pinned articles
// slug index is automatically created by unique: true
NewsArticleSchema.index({ 'author.userId': 1 }); // Articles by author
NewsArticleSchema.index({
  title: 'text',
  content: 'text',
  summary: 'text',
}, {
  weights: {
    title: 10,
    summary: 5,
    content: 1,
  },
}); // Text search

// Pre-save middleware to generate slug
NewsArticleSchema.pre('save', async function(next) {
  const article = this as NewsArticleDocument;

  // Generate slug if title is modified or article is new
  if (article.isModified('title') || article.isNew) {
    const baseSlug = generateSlug(article.title);
    let slug = baseSlug;
    let counter = 0;

    // Ensure unique slug
    while (await NewsArticleModel.findOne({ slug, _id: { $ne: article._id } })) {
      counter++;
      slug = `${baseSlug}-${Math.random().toString(36).substr(2, 9)}`;
    }

    article.slug = slug;
  }

  // Set publishedAt when publishing
  if (article.isModified('isPublished')) {
    if (article.isPublished) {
      article.publishedAt = new Date();
    } else {
      article.publishedAt = undefined;
    }
  }

  next();
});

// Instance method to increment view count
NewsArticleSchema.methods['incrementViewCount'] = async function(): Promise<void> {
  const article = this as NewsArticleDocument;
  article.viewCount += 1;
  await article.save();
};

// Instance method to publish article
NewsArticleSchema.methods['publish'] = async function(): Promise<void> {
  const article = this as NewsArticleDocument;
  article.isPublished = true;
  article.publishedAt = new Date();
  await article.save();
};

// Instance method to unpublish article
NewsArticleSchema.methods['unpublish'] = async function(): Promise<void> {
  const article = this as NewsArticleDocument;
  article.isPublished = false;
  article.publishedAt = undefined;
  await article.save();
};

// Transform output to match our interface
NewsArticleSchema.set('toJSON', {
  transform: function(_doc: any, ret: any) {
    ret._id = ret._id.toString();
    if (ret.author && ret.author.userId) {
      ret.author.userId = ret.author.userId.toString();
    }
    delete ret.__v;
    return ret;
  },
});

NewsArticleSchema.set('toObject', {
  transform: function(_doc: any, ret: any) {
    ret._id = ret._id.toString();
    if (ret.author && ret.author.userId) {
      ret.author.userId = ret.author.userId.toString();
    }
    delete ret.__v;
    return ret;
  },
});

// Static methods
NewsArticleSchema.statics['findPublished'] = function() {
  return this.find({ isPublished: true })
    .sort({ publishedAt: -1 });
};

NewsArticleSchema.statics['findPinned'] = function() {
  return this.find({ isPinned: true, isPublished: true })
    .sort({ publishedAt: -1 });
};

NewsArticleSchema.statics['findByCategory'] = function(category: string) {
  return this.find({ category, isPublished: true })
    .sort({ publishedAt: -1 });
};

NewsArticleSchema.statics['searchArticles'] = function(query: string) {
  return this.find({
    $and: [
      { isPublished: true },
      {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { summary: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } },
        ],
      },
    ],
  }).sort({ publishedAt: -1 });
};

NewsArticleSchema.statics['findByTag'] = function(tag: string) {
  return this.find({
    tags: { $in: [tag] },
    isPublished: true,
  }).sort({ publishedAt: -1 });
};

NewsArticleSchema.statics['getRecent'] = function(limit: number = 10) {
  return this.find({ isPublished: true })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Create and export the model
export const NewsArticleModel = mongoose.model<NewsArticleDocument, NewsArticleModelType>('NewsArticle', NewsArticleSchema) as NewsArticleModelType;
