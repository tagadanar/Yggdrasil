// packages/database-schemas/src/models/EnrollmentData.ts
// Enrollment service stores enrollment, progress, and submission data

import { Schema, Document, Model } from 'mongoose';
// Remove unused import
import { dbManager } from '../connection/multi-db';

export interface EnrollmentDataDocument extends Document {
  _id: string;
  userId: string; // Reference to user service
  courseId: string; // Reference to course service
  status: 'active' | 'completed' | 'cancelled' | 'suspended';
  enrolledAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  suspendedAt?: Date;
  progress: {
    percentage: number;
    chaptersCompleted: string[];
    sectionsCompleted: string[];
    exercisesCompleted: string[];
    lastAccessedSection?: string;
    timeSpent: number; // in minutes
  };
  grades: {
    averageScore: number;
    totalPoints: number;
    maxPoints: number;
    letterGrade?: string;
  };
  metadata: {
    enrollmentMethod: 'self' | 'admin' | 'bulk';
    enrolledBy?: string;
    source: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressDocument extends Document {
  _id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  sectionId: string;
  exerciseId?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  score?: number;
  maxScore?: number;
  attempts: number;
  timeSpent: number; // in seconds
  firstAccessedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionDocument extends Document {
  _id: string;
  enrollmentId: string;
  userId: string;
  courseId: string;
  exerciseId: string;
  attempt: number;
  answer: any; // JSON object with user's answers
  score: number;
  maxScore: number;
  isCorrect: boolean;
  feedback?: string;
  timeSpent: number; // in seconds
  submittedAt: Date;
  gradedAt?: Date;
  gradedBy?: string; // 'auto' or user ID
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EnrollmentDataModelType extends Model<EnrollmentDataDocument> {
  findByUser(userId: string): Promise<EnrollmentDataDocument[]>;
  findByCourse(courseId: string): Promise<EnrollmentDataDocument[]>;
  findActiveEnrollments(): Promise<EnrollmentDataDocument[]>;
}

export interface ProgressModelType extends Model<ProgressDocument> {
  findByEnrollment(enrollmentId: string): Promise<ProgressDocument[]>;
  findByUserAndCourse(userId: string, courseId: string): Promise<ProgressDocument[]>;
}

export interface SubmissionModelType extends Model<SubmissionDocument> {
  findByEnrollment(enrollmentId: string): Promise<SubmissionDocument[]>;
  findByExercise(exerciseId: string): Promise<SubmissionDocument[]>;
  findLatestSubmission(userId: string, exerciseId: string): Promise<SubmissionDocument | null>;
}

// Progress Schema
const ProgressSchema = new Schema({
  percentage: { type: Number, default: 0, min: 0, max: 100 },
  chaptersCompleted: [{ type: String }],
  sectionsCompleted: [{ type: String }],
  exercisesCompleted: [{ type: String }],
  lastAccessedSection: { type: String },
  timeSpent: { type: Number, default: 0 }, // in minutes
}, { _id: false });

// Grades Schema
const GradesSchema = new Schema({
  averageScore: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  maxPoints: { type: Number, default: 0 },
  letterGrade: { type: String },
}, { _id: false });

// Enrollment Metadata Schema
const EnrollmentMetadataSchema = new Schema({
  enrollmentMethod: {
    type: String,
    enum: ['self', 'admin', 'bulk'],
    required: true,
  },
  enrolledBy: { type: String },
  source: { type: String, required: true },
}, { _id: false });

// Progress Metadata Schema
const ProgressMetadataSchema = new Schema({
  userAgent: { type: String },
  ipAddress: { type: String },
  sessionId: { type: String },
}, { _id: false });

// Main Enrollment Schema
const EnrollmentDataSchema = new Schema<EnrollmentDataDocument>({
  userId: {
    type: String,
    required: true,
  },
  courseId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'suspended'],
    default: 'active',
  },
  enrolledAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  completedAt: Date,
  cancelledAt: Date,
  suspendedAt: Date,
  progress: {
    type: ProgressSchema,
    default: () => ({
      percentage: 0,
      chaptersCompleted: [],
      sectionsCompleted: [],
      exercisesCompleted: [],
      timeSpent: 0,
    }),
  },
  grades: {
    type: GradesSchema,
    default: () => ({
      averageScore: 0,
      totalPoints: 0,
      maxPoints: 0,
    }),
  },
  metadata: {
    type: EnrollmentMetadataSchema,
    required: true,
  },
}, {
  timestamps: true,
  collection: 'enrollments',
});

// Progress Detail Schema (separate collection)
const ProgressDetailSchema = new Schema<ProgressDocument>({
  enrollmentId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  courseId: {
    type: String,
    required: true,
  },
  sectionId: {
    type: String,
    required: true,
  },
  exerciseId: {
    type: String,
    index: true,
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'skipped'],
    default: 'not_started',
  },
  score: Number,
  maxScore: Number,
  attempts: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },
  firstAccessedAt: { type: Date, required: true, default: Date.now },
  lastAccessedAt: { type: Date, required: true, default: Date.now },
  completedAt: Date,
  metadata: {
    type: ProgressMetadataSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
  collection: 'progress',
});

// Submission Schema (separate collection)
const SubmissionSchema = new Schema<SubmissionDocument>({
  enrollmentId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
  },
  courseId: {
    type: String,
    required: true,
    index: true,
  },
  exerciseId: {
    type: String,
    required: true,
  },
  attempt: {
    type: Number,
    required: true,
    default: 1,
  },
  answer: {
    type: Schema.Types.Mixed,
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
  },
  maxScore: {
    type: Number,
    required: true,
    min: 0,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
  feedback: String,
  timeSpent: { type: Number, default: 0 },
  submittedAt: { type: Date, required: true, default: Date.now },
  gradedAt: Date,
  gradedBy: String,
  metadata: {
    type: ProgressMetadataSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
  collection: 'submissions',
});

// Indexes
EnrollmentDataSchema.index({ userId: 1, courseId: 1 }, { unique: true });
EnrollmentDataSchema.index({ status: 1, enrolledAt: -1 });

ProgressDetailSchema.index({ enrollmentId: 1, sectionId: 1 });
ProgressDetailSchema.index({ userId: 1, courseId: 1, lastAccessedAt: -1 });

SubmissionSchema.index({ userId: 1, exerciseId: 1, attempt: 1 }, { unique: true });
SubmissionSchema.index({ exerciseId: 1, submittedAt: -1 });

// Static methods for EnrollmentData
EnrollmentDataSchema.statics['findByUser'] = function(userId: string) {
  return this.find({ userId }).sort({ enrolledAt: -1 });
};

EnrollmentDataSchema.statics['findByCourse'] = function(courseId: string) {
  return this.find({ courseId }).sort({ enrolledAt: -1 });
};

EnrollmentDataSchema.statics['findActiveEnrollments'] = function() {
  return this.find({ status: 'active' });
};

// Static methods for Progress
ProgressDetailSchema.statics['findByEnrollment'] = function(enrollmentId: string) {
  return this.find({ enrollmentId }).sort({ lastAccessedAt: -1 });
};

ProgressDetailSchema.statics['findByUserAndCourse'] = function(userId: string, courseId: string) {
  return this.find({ userId, courseId }).sort({ lastAccessedAt: -1 });
};

// Static methods for Submission
SubmissionSchema.statics['findByEnrollment'] = function(enrollmentId: string) {
  return this.find({ enrollmentId }).sort({ submittedAt: -1 });
};

SubmissionSchema.statics['findByExercise'] = function(exerciseId: string) {
  return this.find({ exerciseId }).sort({ submittedAt: -1 });
};

SubmissionSchema.statics['findLatestSubmission'] = function(userId: string, exerciseId: string) {
  return this.findOne({ userId, exerciseId }).sort({ attempt: -1 });
};

// Factory functions to create models on enrollment service connection
export async function createEnrollmentModels() {
  const enrollmentConnection = await dbManager.connect('enrollment-service');

  const EnrollmentData = enrollmentConnection.model<EnrollmentDataDocument, EnrollmentDataModelType>('EnrollmentData', EnrollmentDataSchema);
  const Progress = enrollmentConnection.model<ProgressDocument, ProgressModelType>('Progress', ProgressDetailSchema);
  const Submission = enrollmentConnection.model<SubmissionDocument, SubmissionModelType>('Submission', SubmissionSchema);

  return { EnrollmentData, Progress, Submission };
}

export { EnrollmentDataSchema, ProgressDetailSchema, SubmissionSchema };
