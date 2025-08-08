// packages/database-schemas/src/models/PromotionProgress.ts
// Student progress tracking within promotions

import mongoose, { Document, Schema } from 'mongoose';

// CourseProgress sub-document
export interface CourseProgressItem {
  courseId: mongoose.Types.ObjectId;
  startedAt: Date;
  completedAt?: Date;
  progressPercentage: number; // 0-100
  chaptersCompleted: number;
  totalChapters: number;
  exercisesCompleted: number;
  totalExercises: number;
  averageScore?: number; // Average score on exercises
  lastActivityAt?: Date;
}

// PromotionProgress interface
export interface PromotionProgress {
  _id: string;
  promotionId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  
  // Course tracking
  coursesProgress: CourseProgressItem[];
  coursesCompleted: mongoose.Types.ObjectId[];
  coursesInProgress: mongoose.Types.ObjectId[];
  coursesNotStarted: mongoose.Types.ObjectId[];
  
  // Event tracking
  totalEvents: number;
  eventsAttended: number;
  attendanceRate: number; // 0-100
  
  // Overall metrics
  overallProgress: number; // 0-100
  averageGrade?: number; // Average across all courses
  
  // Milestones
  milestones: {
    firstCourseStarted?: Date;
    firstCourseCompleted?: Date;
    halfwayCompleted?: Date;
    allCoursesCompleted?: Date;
  };
  
  // Metadata
  lastCalculated: Date;
  calculationVersion: number; // For tracking calculation algorithm changes
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Extend with Mongoose Document
export interface PromotionProgressDocument extends Omit<PromotionProgress, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
  recalculate(): Promise<void>;
  updateCourseProgress(courseId: mongoose.Types.ObjectId, progress: Partial<CourseProgressItem>): Promise<void>;
  markCourseCompleted(courseId: mongoose.Types.ObjectId): Promise<void>;
}

// Static methods interface
export interface PromotionProgressModelType extends mongoose.Model<PromotionProgressDocument> {
  findOrCreateForStudent(
    promotionId: mongoose.Types.ObjectId,
    studentId: mongoose.Types.ObjectId
  ): Promise<PromotionProgressDocument>;
  
  recalculateForPromotion(promotionId: mongoose.Types.ObjectId): Promise<void>;
  recalculateForStudent(studentId: mongoose.Types.ObjectId, promotionId: mongoose.Types.ObjectId): Promise<PromotionProgressDocument>;
  
  getPromotionStatistics(promotionId: mongoose.Types.ObjectId): Promise<{
    averageProgress: number;
    averageAttendance: number;
    completionRate: number;
    atRiskStudents: number;
  }>;
  
  getTopPerformers(promotionId: mongoose.Types.ObjectId, limit?: number): Promise<PromotionProgressDocument[]>;
  getStrugglingStudents(promotionId: mongoose.Types.ObjectId, threshold?: number): Promise<PromotionProgressDocument[]>;
}

// CourseProgress sub-schema
const CourseProgressSchema = new Schema({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  completedAt: Date,
  progressPercentage: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100,
  },
  chaptersCompleted: {
    type: Number,
    default: 0,
  },
  totalChapters: {
    type: Number,
    default: 0,
  },
  exercisesCompleted: {
    type: Number,
    default: 0,
  },
  totalExercises: {
    type: Number,
    default: 0,
  },
  averageScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  lastActivityAt: Date,
}, { _id: false });

// Milestones sub-schema
const MilestonesSchema = new Schema({
  firstCourseStarted: Date,
  firstCourseCompleted: Date,
  halfwayCompleted: Date,
  allCoursesCompleted: Date,
}, { _id: false });

// Main PromotionProgress Schema
const PromotionProgressSchema = new Schema<PromotionProgressDocument>({
  promotionId: {
    type: Schema.Types.ObjectId,
    ref: 'Promotion',
    required: true,
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Course tracking
  coursesProgress: [CourseProgressSchema],
  coursesCompleted: [{
    type: Schema.Types.ObjectId,
    ref: 'Course',
  }],
  coursesInProgress: [{
    type: Schema.Types.ObjectId,
    ref: 'Course',
  }],
  coursesNotStarted: [{
    type: Schema.Types.ObjectId,
    ref: 'Course',
  }],
  
  // Event tracking
  totalEvents: {
    type: Number,
    default: 0,
  },
  eventsAttended: {
    type: Number,
    default: 0,
  },
  attendanceRate: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
  
  // Overall metrics
  overallProgress: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100,
  },
  averageGrade: {
    type: Number,
    min: 0,
    max: 100,
  },
  
  // Milestones
  milestones: {
    type: MilestonesSchema,
    default: () => ({}),
  },
  
  // Metadata
  lastCalculated: {
    type: Date,
    default: Date.now,
  },
  calculationVersion: {
    type: Number,
    default: 1,
  },
  notes: {
    type: String,
    maxlength: 1000,
  },
}, {
  timestamps: true,
  collection: 'promotion_progress',
});

// Indexes for performance
PromotionProgressSchema.index({ promotionId: 1, studentId: 1 }, { unique: true });
PromotionProgressSchema.index({ promotionId: 1, overallProgress: -1 }); // For leaderboards
PromotionProgressSchema.index({ studentId: 1 });
PromotionProgressSchema.index({ attendanceRate: 1 }); // For finding at-risk students
PromotionProgressSchema.index({ lastCalculated: 1 }); // For recalculation jobs

// Instance method: Recalculate progress
PromotionProgressSchema.methods['recalculate'] = async function(): Promise<void> {
  const progress = this as PromotionProgressDocument;
  
  // Get promotion details to know total courses
  const Promotion = mongoose.model('Promotion');
  const EventAttendance = mongoose.model('EventAttendance');
  const promotion = await Promotion.findById(progress.promotionId).populate('eventIds');
  
  if (!promotion) {
    throw new Error('Promotion not found');
  }
  
  // Calculate attendance
  const attendance = await EventAttendance.calculateAttendanceRate(
    progress.studentId,
    progress.promotionId
  );
  progress.attendanceRate = attendance;
  
  // Calculate course progress
  let totalCourseProgress = 0;
  let completedCourses = 0;
  let totalGrade = 0;
  let gradedCourses = 0;
  
  for (const courseProgress of progress.coursesProgress) {
    totalCourseProgress += courseProgress.progressPercentage;
    
    if (courseProgress.progressPercentage === 100) {
      completedCourses++;
      if (!courseProgress.completedAt) {
        courseProgress.completedAt = new Date();
      }
    }
    
    if (courseProgress.averageScore !== undefined) {
      totalGrade += courseProgress.averageScore;
      gradedCourses++;
    }
  }
  
  // Calculate overall progress (weighted: 70% courses, 30% attendance)
  const courseProgressAvg = progress.coursesProgress.length > 0 
    ? totalCourseProgress / progress.coursesProgress.length 
    : 0;
  
  progress.overallProgress = Math.round(
    (courseProgressAvg * 0.7) + (progress.attendanceRate * 0.3)
  );
  
  // Update average grade
  if (gradedCourses > 0) {
    progress.averageGrade = Math.round(totalGrade / gradedCourses);
  }
  
  // Update milestones
  if (!progress.milestones.firstCourseStarted && progress.coursesProgress.length > 0) {
    progress.milestones.firstCourseStarted = new Date();
  }
  
  if (!progress.milestones.firstCourseCompleted && completedCourses > 0) {
    progress.milestones.firstCourseCompleted = new Date();
  }
  
  const halfwayPoint = Math.floor(progress.coursesProgress.length / 2);
  if (!progress.milestones.halfwayCompleted && completedCourses >= halfwayPoint && halfwayPoint > 0) {
    progress.milestones.halfwayCompleted = new Date();
  }
  
  if (!progress.milestones.allCoursesCompleted && 
      progress.coursesProgress.length > 0 && 
      completedCourses === progress.coursesProgress.length) {
    progress.milestones.allCoursesCompleted = new Date();
  }
  
  // Update course arrays
  progress.coursesCompleted = progress.coursesProgress
    .filter(cp => cp.progressPercentage === 100)
    .map(cp => cp.courseId);
  
  progress.coursesInProgress = progress.coursesProgress
    .filter(cp => cp.progressPercentage > 0 && cp.progressPercentage < 100)
    .map(cp => cp.courseId);
  
  progress.lastCalculated = new Date();
  await progress.save();
};

// Instance method: Update course progress
PromotionProgressSchema.methods['updateCourseProgress'] = async function(
  courseId: mongoose.Types.ObjectId,
  progressUpdate: Partial<CourseProgressItem>
): Promise<void> {
  const progress = this as PromotionProgressDocument;
  
  // Find or create course progress entry
  let courseProgress = progress.coursesProgress.find(
    cp => cp.courseId.equals(courseId)
  );
  
  if (!courseProgress) {
    // Create new course progress entry
    progress.coursesProgress.push({
      courseId,
      startedAt: new Date(),
      progressPercentage: 0,
      chaptersCompleted: 0,
      totalChapters: 0,
      exercisesCompleted: 0,
      totalExercises: 0,
      ...progressUpdate,
    } as CourseProgressItem);
  } else {
    // Update existing entry
    Object.assign(courseProgress, progressUpdate);
    courseProgress.lastActivityAt = new Date();
  }
  
  // Recalculate overall progress
  await progress.recalculate();
};

// Instance method: Mark course as completed
PromotionProgressSchema.methods['markCourseCompleted'] = async function(
  courseId: mongoose.Types.ObjectId
): Promise<void> {
  const progress = this as PromotionProgressDocument;
  
  await progress.updateCourseProgress(courseId, {
    progressPercentage: 100,
    completedAt: new Date(),
  });
};

// Static method: Find or create for student
PromotionProgressSchema.statics['findOrCreateForStudent'] = async function(
  promotionId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId
): Promise<PromotionProgressDocument> {
  let progress = await this.findOne({ promotionId, studentId });
  
  if (!progress) {
    progress = await this.create({
      promotionId,
      studentId,
      coursesProgress: [],
      coursesCompleted: [],
      coursesInProgress: [],
      coursesNotStarted: [],
      overallProgress: 0,
      totalEvents: 0,
      eventsAttended: 0,
      attendanceRate: 100,
      milestones: {},
    });
  }
  
  return progress;
};

// Static method: Recalculate for entire promotion
PromotionProgressSchema.statics['recalculateForPromotion'] = async function(
  promotionId: mongoose.Types.ObjectId
): Promise<void> {
  const progressRecords = await this.find({ promotionId });
  
  // Recalculate in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < progressRecords.length; i += batchSize) {
    const batch = progressRecords.slice(i, i + batchSize);
    await Promise.all(batch.map(record => record.recalculate()));
  }
};

// Static method: Get promotion statistics
PromotionProgressSchema.statics['getPromotionStatistics'] = async function(
  promotionId: mongoose.Types.ObjectId
): Promise<any> {
  const stats = await this.aggregate([
    { $match: { promotionId } },
    {
      $group: {
        _id: null,
        averageProgress: { $avg: '$overallProgress' },
        averageAttendance: { $avg: '$attendanceRate' },
        totalStudents: { $sum: 1 },
        completedStudents: {
          $sum: { $cond: [{ $eq: ['$overallProgress', 100] }, 1, 0] }
        },
        atRiskStudents: {
          $sum: { $cond: [{ $lt: ['$overallProgress', 30] }, 1, 0] }
        },
      },
    },
  ]);
  
  if (stats.length === 0) {
    return {
      averageProgress: 0,
      averageAttendance: 100,
      completionRate: 0,
      atRiskStudents: 0,
    };
  }
  
  const result = stats[0];
  return {
    averageProgress: Math.round(result.averageProgress || 0),
    averageAttendance: Math.round(result.averageAttendance || 100),
    completionRate: Math.round((result.completedStudents / result.totalStudents) * 100),
    atRiskStudents: result.atRiskStudents || 0,
  };
};

// Transform output
PromotionProgressSchema.set('toJSON', {
  transform: function(_doc: any, ret: any) {
    ret._id = ret._id.toString();
    ret.promotionId = ret.promotionId.toString();
    ret.studentId = ret.studentId.toString();
    
    // Transform course IDs
    ret.coursesCompleted = ret.coursesCompleted.map((id: any) => id.toString());
    ret.coursesInProgress = ret.coursesInProgress.map((id: any) => id.toString());
    ret.coursesNotStarted = ret.coursesNotStarted.map((id: any) => id.toString());
    
    // Transform course progress items
    ret.coursesProgress = ret.coursesProgress.map((cp: any) => ({
      ...cp,
      courseId: cp.courseId.toString(),
    }));
    
    delete ret.__v;
    return ret;
  },
});

// Create and export the model
export const PromotionProgressModel = mongoose.model<PromotionProgressDocument, PromotionProgressModelType>(
  'PromotionProgress',
  PromotionProgressSchema,
) as PromotionProgressModelType;