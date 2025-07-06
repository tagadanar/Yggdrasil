"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsModel = void 0;
// Path: packages/database-schemas/src/models/News.ts
const mongoose_1 = __importStar(require("mongoose"));
const NewsSchema = new mongoose_1.Schema({
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
NewsSchema.statics.findPublished = function () {
    return this.find({
        status: 'published',
        isActive: true
    }).sort({ publishedAt: -1 });
};
NewsSchema.statics.findByCategory = function (category) {
    return this.find({
        category,
        status: 'published',
        isActive: true
    }).sort({ publishedAt: -1 });
};
NewsSchema.statics.findByAuthor = function (authorId) {
    return this.find({ author: authorId }).sort({ createdAt: -1 });
};
NewsSchema.statics.findForAudience = function (audience) {
    return this.find({
        status: 'published',
        isActive: true,
        $or: [
            { targetAudience: { $in: audience } },
            { targetAudience: 'all' }
        ]
    }).sort({ publishedAt: -1 }).then((articles) => {
        // Sort by priority manually: emergency > urgent > high > medium > normal > low
        const priorityOrder = { 'emergency': 6, 'urgent': 5, 'high': 4, 'medium': 3, 'normal': 2, 'low': 1 };
        return articles.sort((a, b) => {
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
            if (aPriority !== bPriority) {
                return bPriority - aPriority; // Descending priority
            }
            return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(); // Descending date
        });
    });
};
NewsSchema.statics.markAsRead = async function (articleId, userId) {
    const result = await this.updateOne({ _id: articleId }, { $addToSet: { readBy: userId } });
    return result.modifiedCount > 0;
};
NewsSchema.statics.searchArticles = function (query) {
    return this.find({
        $text: { $search: query },
        status: 'published',
        isActive: true
    }).sort({ score: { $meta: 'textScore' } });
};
// Pre-save middleware
NewsSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    next();
});
exports.NewsModel = mongoose_1.default.models.News || mongoose_1.default.model('News', NewsSchema);
//# sourceMappingURL=News.js.map