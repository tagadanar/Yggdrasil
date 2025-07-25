// packages/database-schemas/src/models/Course.ts
// Course model with comprehensive schema for educational platform

import mongoose, { Document, Schema } from 'mongoose';
import { 
  Course, 
  Chapter, 
  Section, 
  Content, 
  Exercise, 
  Quiz, 
  CourseResource,
  CourseSettings,
  CourseStats,
  CourseStatus,
  CourseLevel,
  ContentType,
  ExerciseType
} from '@yggdrasil/shared-utilities';

// Extend interfaces with Mongoose Document
export interface CourseDocument extends Omit<Course, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
  generateSlug(): string;
  incrementVersion(): Promise<void>;
  updateStats(): Promise<void>;
}

export interface ChapterDocument extends Omit<Chapter, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

export interface SectionDocument extends Omit<Section, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

export interface ContentDocument extends Omit<Content, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

export interface ExerciseDocument extends Omit<Exercise, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

export interface QuizDocument extends Omit<Quiz, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

// Static methods interface
export interface CourseModelType extends mongoose.Model<CourseDocument> {
  findBySlug(slug: string): Promise<CourseDocument | null>;
  findPublished(): Promise<CourseDocument[]>;
  findByInstructor(instructorId: string): Promise<CourseDocument[]>;
  findByCategory(category: string): Promise<CourseDocument[]>;
  searchCourses(query: string, filters?: any): any;
}

// Test Case Schema for exercises
const TestCaseSchema = new Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  description: { type: String, trim: true },
  isHidden: { type: Boolean, default: false }
}, { _id: true });

// Quiz Question Schema
const QuizQuestionSchema = new Schema({
  type: { 
    type: String, 
    enum: ['multiple_choice', 'true_false', 'short_answer', 'essay'],
    required: true 
  },
  question: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 1000 
  },
  options: [{ 
    type: String, 
    trim: true, 
    maxlength: 200 
  }],
  correctAnswer: { type: Schema.Types.Mixed, required: true }, // String or Array
  explanation: { 
    type: String, 
    trim: true, 
    maxlength: 500 
  },
  points: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 100 
  }
}, { _id: true });

// Quiz Schema
const QuizSchema = new Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 100 
  },
  description: { 
    type: String, 
    trim: true, 
    maxlength: 500 
  },
  questions: [QuizQuestionSchema],
  timeLimit: { 
    type: Number, 
    min: 1, 
    max: 480 
  }, // minutes
  maxAttempts: { 
    type: Number, 
    min: 1, 
    max: 10 
  },
  passingScore: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100 
  }
}, { _id: true });

// Exercise Schema
const ExerciseSchema = new Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 100 
  },
  description: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 1000 
  },
  type: { 
    type: String, 
    enum: ['code', 'quiz', 'assignment'],
    required: true 
  },
  instructions: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 2000 
  },
  starterCode: { type: String, trim: true },
  solution: { type: String, trim: true },
  testCases: [TestCaseSchema],
  hints: [{ 
    type: String, 
    trim: true, 
    maxlength: 200 
  }],
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    required: true 
  },
  programmingLanguage: { 
    type: String, 
    trim: true, 
    maxlength: 20 
  },
  maxAttempts: { 
    type: Number, 
    min: 1, 
    max: 100 
  },
  timeLimit: { 
    type: Number, 
    min: 1, 
    max: 480 
  } // minutes
}, { _id: true });

// Content Data Schema
const ContentDataSchema = new Schema({
  // Text content
  markdown: { type: String },
  html: { type: String },
  
  // Video content
  videoUrl: { type: String, trim: true },
  videoDuration: { type: Number, min: 1 },
  transcript: { type: String },
  
  // Exercise content
  exercise: ExerciseSchema,
  
  // Quiz content
  quiz: QuizSchema,
  
  // File content
  fileUrl: { type: String, trim: true },
  fileName: { type: String, trim: true },
  fileSize: { type: Number, min: 1 },
  mimeType: { type: String, trim: true }
}, { _id: false });

// Content Schema
const ContentSchema = new Schema({
  type: { 
    type: String, 
    enum: ['text', 'video', 'exercise', 'quiz', 'file'],
    required: true 
  },
  title: { 
    type: String, 
    trim: true, 
    maxlength: 100 
  },
  order: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  data: ContentDataSchema,
  isPublished: { 
    type: Boolean, 
    default: false 
  }
}, { _id: true });

// Section Schema
const SectionSchema = new Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 100 
  },
  description: { 
    type: String, 
    trim: true, 
    maxlength: 500 
  },
  order: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  content: [ContentSchema],
  isPublished: { 
    type: Boolean, 
    default: false 
  },
  estimatedDuration: { 
    type: Number, 
    default: 0, 
    min: 0 
  } // minutes
}, { _id: true });

// Chapter Schema
const ChapterSchema = new Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 100 
  },
  description: { 
    type: String, 
    trim: true, 
    maxlength: 500 
  },
  order: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  sections: [SectionSchema],
  isPublished: { 
    type: Boolean, 
    default: false 
  },
  estimatedDuration: { 
    type: Number, 
    default: 0, 
    min: 0 
  } // minutes
}, { _id: true });

// Course Resource Schema
const CourseResourceSchema = new Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 100 
  },
  type: { 
    type: String, 
    enum: ['file', 'link', 'reference'],
    required: true 
  },
  url: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true, 
    maxlength: 300 
  },
  size: { 
    type: Number, 
    min: 1 
  }, // for files
  uploadedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { _id: true });

// Course Settings Schema
const CourseSettingsSchema = new Schema({
  isPublic: { 
    type: Boolean, 
    default: true 
  },
  allowEnrollment: { 
    type: Boolean, 
    default: true 
  },
  requiresApproval: { 
    type: Boolean, 
    default: false 
  },
  maxStudents: { 
    type: Number, 
    min: 1, 
    max: 10000 
  },
  startDate: Date,
  endDate: Date,
  allowLateSubmissions: { 
    type: Boolean, 
    default: true 
  },
  enableDiscussions: { 
    type: Boolean, 
    default: true 
  },
  enableCollaboration: { 
    type: Boolean, 
    default: false 
  }
}, { _id: false });

// Course Statistics Schema
const CourseStatsSchema = new Schema({
  enrolledStudents: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  completedStudents: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  averageProgress: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 100 
  }, // percentage
  averageRating: { 
    type: Number, 
    min: 0, 
    max: 5 
  },
  totalViews: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  lastAccessed: Date
}, { _id: false });

// Collaborator Schema
const CollaboratorSchema = new Schema({
  _id: { 
    type: String,
    required: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    trim: true 
  },
  role: { 
    type: String, 
    enum: ['instructor', 'assistant'],
    default: 'assistant' 
  }
}, { _id: false });

// Main Course Schema
const CourseSchema = new Schema<CourseDocument>({
  code: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    index: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  instructor: {
    _id: { 
      type: String,
      required: true,
      index: true
    },
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      trim: true 
    }
  },
  collaborators: [CollaboratorSchema],
  thumbnail: { 
    type: String, 
    trim: true 
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  prerequisites: [{
    type: String,
    trim: true,
    maxlength: 100
  }],
  estimatedDuration: {
    type: Number,
    default: 0,
    min: 0
  }, // minutes
  chapters: [ChapterSchema],
  resources: [CourseResourceSchema],
  settings: {
    type: CourseSettingsSchema,
    default: () => ({})
  },
  stats: {
    type: CourseStatsSchema,
    default: () => ({})
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'courses'
});

// Indexes for performance
CourseSchema.index({ title: 'text', description: 'text' }); // Text search
CourseSchema.index({ 'instructor._id': 1, status: 1 });
CourseSchema.index({ category: 1, level: 1, status: 1 });
CourseSchema.index({ tags: 1 });
CourseSchema.index({ status: 1, 'settings.isPublic': 1 });
CourseSchema.index({ createdAt: -1 });
CourseSchema.index({ lastModified: -1 });

// OPTIMIZED: Additional indexes for Statistics Service time-based queries
CourseSchema.index({ updatedAt: -1, status: 1 });
CourseSchema.index({ 'instructor._id': 1, updatedAt: -1 });
CourseSchema.index({ 'collaborators._id': 1, updatedAt: -1 });
CourseSchema.index({ updatedAt: -1 }); // For time-range queries

// Pre-save middleware to generate slug
CourseSchema.pre<CourseDocument>('save', function(next) {
  const course = this;
  
  if (course.isModified('title') && !course.slug) {
    course.slug = course.generateSlug();
  }
  
  course.lastModified = new Date();
  next();
});

// Instance method to generate slug from title
CourseSchema.methods.generateSlug = function(): string {
  const course = this as CourseDocument;
  return course.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

// Instance method to increment version
CourseSchema.methods.incrementVersion = async function(): Promise<void> {
  const course = this as CourseDocument;
  course.version += 1;
  course.lastModified = new Date();
  await course.save();
};

// Instance method to update statistics
CourseSchema.methods.updateStats = async function(): Promise<void> {
  const course = this as CourseDocument;
  // This would typically aggregate data from enrollments, progress, etc.
  // For now, just update the lastAccessed timestamp
  course.stats.lastAccessed = new Date();
  await course.save();
};

// Transform output to match our interface
CourseSchema.set('toJSON', {
  transform: function(doc: any, ret: any) {
    ret._id = ret._id.toString();
    
    // Transform nested ObjectIds to strings
    if (ret.chapters) {
      ret.chapters.forEach((chapter: any) => {
        chapter._id = chapter._id.toString();
        if (chapter.sections) {
          chapter.sections.forEach((section: any) => {
            section._id = section._id.toString();
            if (section.content) {
              section.content.forEach((content: any) => {
                content._id = content._id.toString();
                if (content.data?.exercise?._id) {
                  content.data.exercise._id = content.data.exercise._id.toString();
                }
                if (content.data?.quiz?._id) {
                  content.data.quiz._id = content.data.quiz._id.toString();
                }
              });
            }
          });
        }
      });
    }
    
    if (ret.resources) {
      ret.resources.forEach((resource: any) => {
        resource._id = resource._id.toString();
      });
    }
    
    delete ret.__v;
    return ret;
  }
});

// Static methods
CourseSchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug: slug.toLowerCase() });
};

CourseSchema.statics.findPublished = function() {
  return this.find({ 
    status: 'published', 
    'settings.isPublic': true 
  }).sort({ createdAt: -1 });
};

CourseSchema.statics.findByInstructor = function(instructorId: string) {
  return this.find({ 'instructor._id': instructorId }).sort({ lastModified: -1 });
};

CourseSchema.statics.findByCategory = function(category: string) {
  return this.find({ 
    category: category, 
    status: 'published',
    'settings.isPublic': true 
  }).sort({ createdAt: -1 });
};

CourseSchema.statics.searchCourses = function(query: string, filters: any = {}) {
  const searchCriteria: any = {
    status: 'published',
    'settings.isPublic': true
  };
  
  // Text search
  if (query) {
    searchCriteria.$text = { $search: query };
  }
  
  // Apply filters
  if (filters.category) {
    searchCriteria.category = filters.category;
  }
  
  if (filters.level) {
    searchCriteria.level = filters.level;
  }
  
  if (filters.instructor) {
    searchCriteria['instructor._id'] = filters.instructor;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    searchCriteria.tags = { $in: filters.tags };
  }
  
  // Build sort criteria properly to avoid "Invalid sort value" error
  if (query && query.trim().length > 0) {
    return this.find(searchCriteria).sort({ 
      score: { $meta: 'textScore' },
      createdAt: -1 
    });
  } else {
    return this.find(searchCriteria).sort({ createdAt: -1 });
  }
};

// Create and export the model
export const CourseModel = mongoose.model<CourseDocument, CourseModelType>('Course', CourseSchema) as CourseModelType;