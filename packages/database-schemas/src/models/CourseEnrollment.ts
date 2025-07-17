// packages/database-schemas/src/models/CourseEnrollment.ts
// Course enrollment and progress tracking models

import mongoose, { Document, Schema } from 'mongoose';
import { 
  CourseEnrollment, 
  CourseProgress,
  ExerciseSubmission,
  ExerciseResult
} from '@yggdrasil/shared-utilities';

// Extend interfaces with Mongoose Document
export interface CourseEnrollmentDocument extends Omit<CourseEnrollment, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
  updateProgress(): Promise<void>;
  calculateOverallProgress(): number;
}

export interface ExerciseSubmissionDocument extends Omit<ExerciseSubmission, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

// Static methods interface
export interface CourseEnrollmentModelType extends mongoose.Model<CourseEnrollmentDocument> {
  findByStudent(studentId: string): Promise<CourseEnrollmentDocument[]>;
  findByCourse(courseId: string): Promise<CourseEnrollmentDocument[]>;
  findEnrollment(courseId: string, studentId: string): Promise<CourseEnrollmentDocument | null>;
  getStudentProgress(courseId: string, studentId: string): Promise<CourseProgress | null>;
}

export interface ExerciseSubmissionModelType extends mongoose.Model<ExerciseSubmissionDocument> {
  findByStudent(studentId: string): Promise<ExerciseSubmissionDocument[]>;
  findByExercise(exerciseId: string): Promise<ExerciseSubmissionDocument[]>;
  findLatestSubmission(exerciseId: string, studentId: string): Promise<ExerciseSubmissionDocument | null>;
}

// Test Result Schema for exercise submissions
const TestResultSchema = new Schema({
  testCaseId: { 
    type: String,
    required: true 
  },
  passed: { 
    type: Boolean, 
    required: true 
  },
  actualOutput: { 
    type: String, 
    trim: true 
  },
  errorMessage: { 
    type: String, 
    trim: true 
  }
}, { _id: false });

// Code Quality Metrics Schema
const CodeQualityMetricsSchema = new Schema({
  linesOfCode: { 
    type: Number, 
    min: 0 
  },
  complexity: { 
    type: Number, 
    min: 0 
  },
  duplicateLines: { 
    type: Number, 
    min: 0 
  },
  codeSmells: [{ 
    type: String, 
    trim: true 
  }]
}, { _id: false });

// Exercise Result Schema
const ExerciseResultSchema = new Schema({
  isCorrect: { 
    type: Boolean, 
    required: true 
  },
  score: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 100 
  },
  feedback: { 
    type: String, 
    required: true, 
    trim: true 
  },
  testResults: [TestResultSchema],
  executionTime: { 
    type: Number, 
    min: 0 
  }, // milliseconds
  codeQuality: CodeQualityMetricsSchema
}, { _id: false });

// Exercise Submission Schema
const ExerciseSubmissionSchema = new Schema<ExerciseSubmissionDocument>({
  exerciseId: {
    type: String,
    required: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  code: { 
    type: String 
  },
  answer: { 
    type: String, 
    trim: true 
  },
  files: [{ 
    type: String, 
    trim: true 
  }], // URLs to uploaded files
  result: ExerciseResultSchema,
  submittedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  gradedAt: Date
}, {
  timestamps: true,
  collection: 'exercise_submissions'
});

// Course Progress Schema
const CourseProgressSchema = new Schema({
  completedSections: [{
    type: String
  }],
  completedExercises: [{
    type: String
  }],
  completedQuizzes: [{
    type: String
  }],
  lastAccessedAt: { 
    type: Date, 
    default: Date.now 
  },
  overallProgress: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 100 
  }, // percentage
  timeSpent: { 
    type: Number, 
    default: 0, 
    min: 0 
  } // minutes
}, { _id: false });

// Main Course Enrollment Schema
const CourseEnrollmentSchema = new Schema<CourseEnrollmentDocument>({
  courseId: {
    type: String,
    required: true,
    index: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  enrolledAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  progress: {
    type: CourseProgressSchema,
    default: () => ({})
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'dropped'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true,
  collection: 'course_enrollments'
});

// Compound indexes for performance
CourseEnrollmentSchema.index({ courseId: 1, studentId: 1 }, { unique: true });
CourseEnrollmentSchema.index({ studentId: 1, status: 1 });
CourseEnrollmentSchema.index({ courseId: 1, status: 1 });
CourseEnrollmentSchema.index({ enrolledAt: -1 });

ExerciseSubmissionSchema.index({ exerciseId: 1, studentId: 1 });
ExerciseSubmissionSchema.index({ studentId: 1, submittedAt: -1 });
ExerciseSubmissionSchema.index({ exerciseId: 1, submittedAt: -1 });

// Instance methods for CourseEnrollment
CourseEnrollmentSchema.methods.calculateOverallProgress = function(): number {
  const enrollment = this as CourseEnrollmentDocument;
  // This would calculate progress based on completed sections, exercises, quizzes
  // For now, return the stored progress
  return enrollment.progress.overallProgress;
};

CourseEnrollmentSchema.methods.updateProgress = async function(): Promise<void> {
  const enrollment = this as CourseEnrollmentDocument;
  
  // Calculate overall progress based on completed items
  // This is a simplified calculation - in practice, you'd weight different types of content
  const totalCompleted = enrollment.progress.completedSections.length + 
                         enrollment.progress.completedExercises.length + 
                         enrollment.progress.completedQuizzes.length;
  
  // This would need to be calculated against the total course content
  // For now, we'll just ensure progress doesn't exceed 100%
  enrollment.progress.overallProgress = Math.min(totalCompleted * 10, 100);
  enrollment.progress.lastAccessedAt = new Date();
  
  // Update enrollment status based on progress
  if (enrollment.progress.overallProgress >= 100) {
    enrollment.status = 'completed';
  }
  
  await enrollment.save();
};

// Static methods for CourseEnrollment
CourseEnrollmentSchema.statics.findByStudent = function(studentId: string) {
  return this.find({ studentId }).populate('courseId').sort({ enrolledAt: -1 });
};

CourseEnrollmentSchema.statics.findByCourse = function(courseId: string) {
  return this.find({ courseId }).populate('studentId').sort({ enrolledAt: -1 });
};

CourseEnrollmentSchema.statics.findEnrollment = function(courseId: string, studentId: string) {
  return this.findOne({ courseId, studentId });
};

CourseEnrollmentSchema.statics.getStudentProgress = async function(courseId: string, studentId: string) {
  const enrollment = await this.findOne({ courseId, studentId });
  return enrollment ? enrollment.progress : null;
};

// Static methods for ExerciseSubmission
ExerciseSubmissionSchema.statics.findByStudent = function(studentId: string) {
  return this.find({ studentId }).sort({ submittedAt: -1 });
};

ExerciseSubmissionSchema.statics.findByExercise = function(exerciseId: string) {
  return this.find({ exerciseId }).populate('studentId').sort({ submittedAt: -1 });
};

ExerciseSubmissionSchema.statics.findLatestSubmission = function(exerciseId: string, studentId: string) {
  return this.findOne({ exerciseId, studentId }).sort({ submittedAt: -1 });
};

// Transform output to match our interface
CourseEnrollmentSchema.set('toJSON', {
  transform: function(doc: any, ret: any) {
    ret._id = ret._id.toString();
    ret.courseId = ret.courseId.toString();
    ret.studentId = ret.studentId.toString();
    
    // Transform progress ObjectIds to strings
    if (ret.progress) {
      ret.progress.completedSections = ret.progress.completedSections.map((id: any) => id.toString());
      ret.progress.completedExercises = ret.progress.completedExercises.map((id: any) => id.toString());
      ret.progress.completedQuizzes = ret.progress.completedQuizzes.map((id: any) => id.toString());
    }
    
    delete ret.__v;
    return ret;
  }
});

ExerciseSubmissionSchema.set('toJSON', {
  transform: function(doc: any, ret: any) {
    ret._id = ret._id.toString();
    ret.exerciseId = ret.exerciseId.toString();
    ret.studentId = ret.studentId.toString();
    
    // Transform test result IDs
    if (ret.result?.testResults) {
      ret.result.testResults.forEach((testResult: any) => {
        testResult.testCaseId = testResult.testCaseId.toString();
      });
    }
    
    delete ret.__v;
    return ret;
  }
});

// Create and export the models
export const CourseEnrollmentModel = mongoose.model<CourseEnrollmentDocument, CourseEnrollmentModelType>(
  'CourseEnrollment', 
  CourseEnrollmentSchema
) as CourseEnrollmentModelType;

export const ExerciseSubmissionModel = mongoose.model<ExerciseSubmissionDocument, ExerciseSubmissionModelType>(
  'ExerciseSubmission', 
  ExerciseSubmissionSchema
) as ExerciseSubmissionModelType;