// packages/database-schemas/src/models/PromotionProgress.ts
// Student progress tracking within promotions

import mongoose, { Document, Schema } from 'mongoose';
import { EventAttendanceModel } from './EventAttendance';

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

// Validation decision sub-document
export interface ValidationDecision {
  validatedAt: Date;
  validatorId: mongoose.Types.ObjectId; // Staff/admin who made decision
  status: 'validated' | 'failed' | 'pending_validation' | 'not_required'; // Validation outcome
  reason?: string; // Why validation passed/failed
  criteria: {
    minGrade: number; // Required minimum grade
    minAttendance: number; // Required minimum attendance %
    coursesRequired: number; // Number of courses that must be completed
    coursesCompleted: number; // Actual courses completed
    actualGrade: number; // Student's actual average grade
    actualAttendance: number; // Student's actual attendance %
  };
  nextSemester?: number; // Which semester student progresses to (if validated)
  retakeRequired?: boolean; // If student needs to retake current semester
  notes?: string; // Additional comments from validator
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

  // Semester Validation System
  validationStatus: 'pending_validation' | 'validated' | 'failed' | 'not_required';
  validationHistory: ValidationDecision[]; // Complete history of validation decisions
  nextValidationDate?: Date; // When next validation review is due
  currentSemester: number; // Which semester (1-10) student is currently in
  targetSemester?: number; // Which semester student should progress to
  validationCriteria?: {
    minGrade: number; // Minimum required grade (default 60%)
    minAttendance: number; // Minimum required attendance (default 70%)
    coursesRequired: number; // Number of courses that must be completed
    autoValidation: boolean; // Whether this student can be auto-validated
  };

  // Milestones
  milestones: {
    firstCourseStarted?: Date;
    firstCourseCompleted?: Date;
    halfwayCompleted?: Date;
    allCoursesCompleted?: Date;
    semesterValidated?: Date; // When current semester was validated
    lastValidationAttempt?: Date; // When last validation was attempted
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
  
  // Semester Validation Methods
  checkValidationCriteria(): Promise<{
    meetsGradeRequirement: boolean;
    meetsAttendanceRequirement: boolean;
    meetsCompletionRequirement: boolean;
    canProgress: boolean;
    summary: {
      currentGrade: number;
      requiredGrade: number;
      currentAttendance: number;
      requiredAttendance: number;
      coursesCompleted: number;
      coursesRequired: number;
    };
  }>;
  
  validateProgression(
    validatorId: mongoose.Types.ObjectId, 
    status: 'validated' | 'failed' | 'conditional',
    reason?: string,
    notes?: string
  ): Promise<void>;
  
  progressToNextSemester(newPromotionId: mongoose.Types.ObjectId): Promise<void>;
  
  flagForValidation(nextDate?: Date): Promise<void>;
  
  canAutoValidate(): boolean;
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

  // Semester Validation Static Methods
  getStudentsPendingValidation(promotionId?: mongoose.Types.ObjectId): Promise<PromotionProgressDocument[]>;
  
  bulkValidateStudents(
    studentIds: mongoose.Types.ObjectId[],
    validatorId: mongoose.Types.ObjectId,
    status: 'validated' | 'failed' | 'conditional',
    reason?: string
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }>;
  
  flagStudentsForValidation(
    promotionId: mongoose.Types.ObjectId,
    nextValidationDate?: Date
  ): Promise<number>; // Returns number of students flagged
  
  getValidationStatistics(promotionId?: mongoose.Types.ObjectId): Promise<{
    pendingValidation: number;
    validated: number;
    failed: number;
    readyForProgression: number;
    averageValidationTime: number; // Days between flagged and validated
  }>;
  
  getStudentsByCurrentSemester(semester: number): Promise<PromotionProgressDocument[]>;
  
  autoValidateEligibleStudents(): Promise<{
    validated: number;
    errors: string[];
  }>;
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

// Validation Decision sub-schema
const ValidationDecisionSchema = new Schema({
  validatedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  validatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['validated', 'failed', 'conditional'],
    required: true,
  },
  reason: String,
  criteria: {
    minGrade: { type: Number, required: true },
    minAttendance: { type: Number, required: true },
    coursesRequired: { type: Number, required: true },
    coursesCompleted: { type: Number, required: true },
    actualGrade: { type: Number, required: true },
    actualAttendance: { type: Number, required: true },
  },
  nextSemester: {
    type: Number,
    min: 1,
    max: 10,
  },
  retakeRequired: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
}, { _id: false });

// Validation Criteria sub-schema
const ValidationCriteriaSchema = new Schema({
  minGrade: {
    type: Number,
    default: 60,
    min: 0,
    max: 100,
  },
  minAttendance: {
    type: Number,
    default: 70,
    min: 0,
    max: 100,
  },
  coursesRequired: {
    type: Number,
    default: 1,
    min: 0,
  },
  autoValidation: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Milestones sub-schema
const MilestonesSchema = new Schema({
  firstCourseStarted: Date,
  firstCourseCompleted: Date,
  halfwayCompleted: Date,
  allCoursesCompleted: Date,
  semesterValidated: Date,
  lastValidationAttempt: Date,
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

  // Semester Validation System
  validationStatus: {
    type: String,
    enum: ['pending_validation', 'validated', 'failed', 'not_required'],
    default: 'not_required',
  },
  validationHistory: [ValidationDecisionSchema],
  nextValidationDate: Date,
  currentSemester: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
    default: 1,
  },
  targetSemester: {
    type: Number,
    min: 1,
    max: 10,
  },
  validationCriteria: {
    type: ValidationCriteriaSchema,
    default: () => ({}),
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

// Validation system indexes
PromotionProgressSchema.index({ validationStatus: 1 }); // For finding pending validations
PromotionProgressSchema.index({ currentSemester: 1 }); // For semester-based queries
PromotionProgressSchema.index({ nextValidationDate: 1 }); // For validation scheduling
PromotionProgressSchema.index({ validationStatus: 1, currentSemester: 1 }); // Combined validation queries
PromotionProgressSchema.index({ promotionId: 1, validationStatus: 1 }); // Promotion validation status

// Instance method: Recalculate progress
PromotionProgressSchema.methods['recalculate'] = async function(): Promise<void> {
  const progress = this as PromotionProgressDocument;

  // Get promotion details to know total courses
  const Promotion = mongoose.models['Promotion'] || mongoose.model('Promotion');
  const promotion = await Promotion.findById(progress.promotionId).populate('eventIds');

  if (!promotion) {
    throw new Error('Promotion not found');
  }

  // Calculate attendance
  const attendance = await EventAttendanceModel.calculateAttendanceRate(
    progress.studentId,
    progress.promotionId,
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
    (courseProgressAvg * 0.7) + (progress.attendanceRate * 0.3),
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
  progressUpdate: Partial<CourseProgressItem>,
): Promise<void> {
  const progress = this as PromotionProgressDocument;

  // Find or create course progress entry
  const courseProgress = progress.coursesProgress.find(
    cp => cp.courseId.equals(courseId),
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
  courseId: mongoose.Types.ObjectId,
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
  studentId: mongoose.Types.ObjectId,
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
  promotionId: mongoose.Types.ObjectId,
): Promise<void> {
  const progressRecords = await this.find({ promotionId });

  // Recalculate in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < progressRecords.length; i += batchSize) {
    const batch = progressRecords.slice(i, i + batchSize);
    await Promise.all(batch.map((record: PromotionProgressDocument) => record.recalculate()));
  }
};

// Static method: Get promotion statistics
PromotionProgressSchema.statics['getPromotionStatistics'] = async function(
  promotionId: mongoose.Types.ObjectId,
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
          $sum: { $cond: [{ $eq: ['$overallProgress', 100] }, 1, 0] },
        },
        atRiskStudents: {
          $sum: { $cond: [{ $lt: ['$overallProgress', 30] }, 1, 0] },
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

// =============================================================================
// SEMESTER VALIDATION INSTANCE METHODS
// =============================================================================

// Instance method: Check validation criteria
PromotionProgressSchema.methods['checkValidationCriteria'] = async function(): Promise<any> {
  const progress = this as PromotionProgressDocument;
  
  const criteria = progress.validationCriteria || {
    minGrade: 60,
    minAttendance: 70,
    coursesRequired: 1,
    autoValidation: false,
  };

  const currentGrade = progress.averageGrade || 0;
  const currentAttendance = progress.attendanceRate;
  const coursesCompleted = progress.coursesCompleted.length;

  const meetsGradeRequirement = currentGrade >= criteria.minGrade;
  const meetsAttendanceRequirement = currentAttendance >= criteria.minAttendance;
  const meetsCompletionRequirement = coursesCompleted >= criteria.coursesRequired;

  return {
    meetsGradeRequirement,
    meetsAttendanceRequirement,
    meetsCompletionRequirement,
    canProgress: meetsGradeRequirement && meetsAttendanceRequirement && meetsCompletionRequirement,
    summary: {
      currentGrade,
      requiredGrade: criteria.minGrade,
      currentAttendance,
      requiredAttendance: criteria.minAttendance,
      coursesCompleted,
      coursesRequired: criteria.coursesRequired,
    },
  };
};

// Instance method: Validate progression
PromotionProgressSchema.methods['validateProgression'] = async function(
  validatorId: mongoose.Types.ObjectId,
  status: 'validated' | 'failed' | 'pending_validation' | 'not_required',
  reason?: string,
  notes?: string,
): Promise<void> {
  const progress = this as PromotionProgressDocument;
  
  const criteria = progress.validationCriteria || {
    minGrade: 60,
    minAttendance: 70,
    coursesRequired: 1,
    autoValidation: false,
  };

  const validationDecision: ValidationDecision = {
    validatedAt: new Date(),
    validatorId,
    status,
    reason,
    criteria: {
      minGrade: criteria.minGrade,
      minAttendance: criteria.minAttendance,
      coursesRequired: criteria.coursesRequired,
      coursesCompleted: progress.coursesCompleted.length,
      actualGrade: progress.averageGrade || 0,
      actualAttendance: progress.attendanceRate,
    },
    nextSemester: status === 'validated' ? Math.min(progress.currentSemester + 1, 10) : undefined,
    retakeRequired: status === 'failed',
    notes,
  };

  progress.validationHistory.push(validationDecision);
  progress.validationStatus = status;
  progress.milestones.lastValidationAttempt = new Date();

  if (status === 'validated') {
    progress.milestones.semesterValidated = new Date();
    progress.targetSemester = validationDecision.nextSemester;
  }

  await progress.save();
};

// Instance method: Progress to next semester
PromotionProgressSchema.methods['progressToNextSemester'] = async function(
  newPromotionId: mongoose.Types.ObjectId,
): Promise<void> {
  const progress = this as PromotionProgressDocument;
  
  // Update semester information
  progress.currentSemester = Math.min(progress.currentSemester + 1, 10);
  progress.promotionId = newPromotionId;
  progress.validationStatus = 'not_required';
  progress.targetSemester = undefined;
  
  // Set next validation date (6 months from now)
  const nextValidation = new Date();
  nextValidation.setMonth(nextValidation.getMonth() + 6);
  progress.nextValidationDate = nextValidation;
  
  await progress.save();
};

// Instance method: Flag for validation
PromotionProgressSchema.methods['flagForValidation'] = async function(
  nextDate?: Date,
): Promise<void> {
  const progress = this as PromotionProgressDocument;
  
  progress.validationStatus = 'pending_validation';
  progress.nextValidationDate = nextDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  
  await progress.save();
};

// Instance method: Can auto validate
PromotionProgressSchema.methods['canAutoValidate'] = function(): boolean {
  const progress = this as PromotionProgressDocument;
  
  const criteria = progress.validationCriteria || { autoValidation: false };
  if (!criteria.autoValidation) return false;
  
  const currentGrade = progress.averageGrade || 0;
  const currentAttendance = progress.attendanceRate;
  const coursesCompleted = progress.coursesCompleted.length;
  
  return (
    currentGrade >= (criteria.minGrade || 60) &&
    currentAttendance >= (criteria.minAttendance || 70) &&
    coursesCompleted >= (criteria.coursesRequired || 1)
  );
};

// =============================================================================
// SEMESTER VALIDATION STATIC METHODS
// =============================================================================

// Static method: Get students pending validation
PromotionProgressSchema.statics['getStudentsPendingValidation'] = async function(
  promotionId?: mongoose.Types.ObjectId,
): Promise<PromotionProgressDocument[]> {
  try {
    const query: any = { validationStatus: 'pending_validation' };
    if (promotionId) {
      query.promotionId = promotionId;
    }
    
    console.log(`🔍 Searching for students with query:`, JSON.stringify(query));
    
    // First, get raw documents without populate to check the data
    const rawDocuments = await this.find(query);
    console.log(`📊 Found ${rawDocuments.length} raw documents`);
    
    if (rawDocuments.length > 0) {
      console.log(`🔍 Raw document 0 studentId:`, rawDocuments[0].studentId);
      console.log(`🔍 Raw document 0 promotionId:`, rawDocuments[0].promotionId);
      console.log(`🔍 studentId type:`, typeof rawDocuments[0].studentId);
      console.log(`🔍 promotionId type:`, typeof rawDocuments[0].promotionId);
      
      // Check if referenced documents exist
      if (rawDocuments[0].studentId) {
        const UserModel = mongoose.models['User'] || mongoose.model('User');
        const userExists = await UserModel.findById(rawDocuments[0].studentId);
        console.log(`🔍 User exists for studentId ${rawDocuments[0].studentId}:`, !!userExists);
        if (userExists) {
          console.log(`🔍 User profile:`, userExists.profile);
        }
      }
      
      if (rawDocuments[0].promotionId) {
        const PromotionModel = mongoose.models['Promotion'] || mongoose.model('Promotion');
        const promotionExists = await PromotionModel.findById(rawDocuments[0].promotionId);
        console.log(`🔍 Promotion exists for promotionId ${rawDocuments[0].promotionId}:`, !!promotionExists);
        if (promotionExists) {
          console.log(`🔍 Promotion name:`, promotionExists.name);
        }
      }
    }
    
    // Try manual lookup instead of populate to diagnose the issue
    const rawResults = await this.find(query).sort({ createdAt: -1 });
    
    const resultsWithManualPopulation = [];
    
    for (const doc of rawResults) {
      console.log(`🔍 Processing document ${doc._id} with studentId: ${doc.studentId}, promotionId: ${doc.promotionId}`);
      
      // Manual lookup of referenced documents
      let populatedStudent = null;
      let populatedPromotion = null;
      
      if (doc.studentId) {
        const UserModel = mongoose.models['User'] || mongoose.model('User');
        console.log(`🔍 Looking up User with ID: ${doc.studentId}`);
        
        // Try finding the user
        populatedStudent = await UserModel.findById(doc.studentId).select('profile email');
        console.log(`🔍 Manual student lookup for ${doc.studentId}:`, !!populatedStudent);
        
        // If not found, check if ANY users exist
        if (!populatedStudent) {
          const userCount = await UserModel.countDocuments();
          console.log(`🔍 Total users in database: ${userCount}`);
          
          // Try to find ANY student user
          const anyStudent = await UserModel.findOne({ role: 'student' }).select('_id email profile');
          console.log(`🔍 Found any student user:`, !!anyStudent);
          if (anyStudent) {
            console.log(`🔍 Sample student ID: ${anyStudent._id}, email: ${anyStudent.email}`);
          }
        }
      }
      
      if (doc.promotionId) {
        const PromotionModel = mongoose.models['Promotion'] || mongoose.model('Promotion');
        populatedPromotion = await PromotionModel.findById(doc.promotionId).select('name semester intake');
        console.log(`🔍 Manual promotion lookup for ${doc.promotionId}:`, !!populatedPromotion);
      }
      
      // Create a manually populated result
      const populatedDoc = doc.toObject();
      populatedDoc.studentId = populatedStudent;
      populatedDoc.promotionId = populatedPromotion;
      
      resultsWithManualPopulation.push(populatedDoc);
    }
    
    console.log(`📊 Manual population completed: ${resultsWithManualPopulation.length} documents`);
    
    const results = resultsWithManualPopulation;
    
    if (results.length > 0) {
      console.log(`🔍 Manually populated document 0 studentId:`, results[0].studentId);
      console.log(`🔍 Manually populated document 0 promotionId:`, results[0].promotionId);
    }
    
    return results;
  } catch (error: any) {
    console.error(`❌ Error in getStudentsPendingValidation:`, error);
    throw error;
  }
};

// Static method: Bulk validate students
PromotionProgressSchema.statics['bulkValidateStudents'] = async function(
  studentIds: mongoose.Types.ObjectId[],
  validatorId: mongoose.Types.ObjectId,
  status: 'validated' | 'failed' | 'conditional',
  reason?: string,
): Promise<any> {
  const results = { success: 0, failed: 0, errors: [] as string[] };
  
  for (const studentId of studentIds) {
    try {
      const progress = await this.findOne({ 
        studentId, 
        validationStatus: 'pending_validation' 
      });
      
      if (!progress) {
        results.errors.push(`Student ${studentId} not found or not pending validation`);
        results.failed++;
        continue;
      }
      
      await progress.validateProgression(validatorId, status, reason);
      results.success++;
    } catch (error: any) {
      results.errors.push(`Failed to validate student ${studentId}: ${error.message}`);
      results.failed++;
    }
  }
  
  return results;
};

// Static method: Flag students for validation
PromotionProgressSchema.statics['flagStudentsForValidation'] = async function(
  promotionId: mongoose.Types.ObjectId,
  nextValidationDate?: Date,
): Promise<number> {
  const result = await this.updateMany(
    {
      promotionId,
      validationStatus: { $ne: 'pending_validation' },
      currentSemester: { $lt: 10 }, // Don't flag final semester students
    },
    {
      $set: {
        validationStatus: 'pending_validation',
        nextValidationDate: nextValidationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
  );
  
  return result.modifiedCount;
};

// Static method: Get validation statistics
PromotionProgressSchema.statics['getValidationStatistics'] = async function(
  promotionId?: mongoose.Types.ObjectId,
): Promise<any> {
  const matchStage: any = {};
  if (promotionId) {
    matchStage.promotionId = promotionId;
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        pendingValidation: {
          $sum: { $cond: [{ $eq: ['$validationStatus', 'pending_validation'] }, 1, 0] },
        },
        validated: {
          $sum: { $cond: [{ $eq: ['$validationStatus', 'validated'] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$validationStatus', 'failed'] }, 1, 0] },
        },
        readyForProgression: {
          $sum: { $cond: [{ $ne: ['$targetSemester', null] }, 1, 0] },
        },
        totalStudents: { $sum: 1 },
      },
    },
  ]);
  
  if (stats.length === 0) {
    return {
      pendingValidation: 0,
      validated: 0,
      failed: 0,
      readyForProgression: 0,
      averageValidationTime: 0,
    };
  }
  
  return {
    ...stats[0],
    averageValidationTime: 7, // Mock value - would need to calculate from validation history
  };
};

// Static method: Get students by current semester
PromotionProgressSchema.statics['getStudentsByCurrentSemester'] = async function(
  semester: number,
): Promise<PromotionProgressDocument[]> {
  return this.find({ currentSemester: semester })
    .populate('studentId', 'profile email')
    .populate('promotionId', 'name semester intake')
    .sort({ 'studentId.profile.lastName': 1 });
};

// Static method: Auto validate eligible students
PromotionProgressSchema.statics['autoValidateEligibleStudents'] = async function(): Promise<any> {
  const eligibleStudents = await this.find({
    validationStatus: 'pending_validation',
    'validationCriteria.autoValidation': true,
  });
  
  const results = { validated: 0, errors: [] as string[] };
  
  for (const student of eligibleStudents) {
    try {
      if (student.canAutoValidate()) {
        // Use system user ID for auto-validation
        const systemUserId = new mongoose.Types.ObjectId('000000000000000000000000');
        await student.validateProgression(
          systemUserId,
          'validated',
          'Auto-validated based on criteria',
        );
        results.validated++;
      }
    } catch (error: any) {
      results.errors.push(`Failed to auto-validate student ${student.studentId?.toString() || 'unknown'}: ${error.message}`);
    }
  }
  
  return results;
};

// Transform output - TEMPORARILY DISABLED to fix API errors
// PromotionProgressSchema.set('toJSON', {
//   transform: function(_doc: any, ret: any) {
//     // Only convert non-null ObjectIds to strings
//     if (ret._id) ret._id = ret._id.toString();
//     if (ret.promotionId) ret.promotionId = ret.promotionId.toString();
//     if (ret.studentId) ret.studentId = ret.studentId.toString();

//     // Safely handle arrays with null checks
//     if (ret.coursesCompleted && Array.isArray(ret.coursesCompleted)) {
//       ret.coursesCompleted = ret.coursesCompleted.map((id: any) => id ? id.toString() : id);
//     }
//     if (ret.coursesInProgress && Array.isArray(ret.coursesInProgress)) {
//       ret.coursesInProgress = ret.coursesInProgress.map((id: any) => id ? id.toString() : id);
//     }
//     if (ret.coursesNotStarted && Array.isArray(ret.coursesNotStarted)) {
//       ret.coursesNotStarted = ret.coursesNotStarted.map((id: any) => id ? id.toString() : id);
//     }

//     // Transform course progress items with null checks
//     if (ret.coursesProgress && Array.isArray(ret.coursesProgress)) {
//       ret.coursesProgress = ret.coursesProgress.map((cp: any) => {
//         if (cp && cp.courseId) {
//           return { ...cp, courseId: cp.courseId.toString() };
//         }
//         return cp;
//       });
//     }

//     // Transform validation history with null checks
//     if (ret.validationHistory && Array.isArray(ret.validationHistory)) {
//       ret.validationHistory = ret.validationHistory.map((vh: any) => {
//         if (vh && vh.validatorId) {
//           return { ...vh, validatorId: vh.validatorId.toString() };
//         }
//         return vh;
//       });
//     }

//     delete ret.__v;
//     return ret;
//   },
// });

// Create and export the model with overwrite protection
export const PromotionProgressModel = (mongoose.models['PromotionProgress'] || mongoose.model<PromotionProgressDocument, PromotionProgressModelType>(
  'PromotionProgress',
  PromotionProgressSchema,
)) as PromotionProgressModelType;
