// packages/database-schemas/src/models/Promotion.ts
// Promotion model for semester-based student cohorts

import mongoose, { Document, Schema } from 'mongoose';

// Promotion interface
export interface Promotion {
  _id: string;
  name: string; // e.g., "Web Development 2024 - Semester 1"
  semester: number; // 1-10
  intake: 'september' | 'march';
  academicYear: string; // e.g., "2024-2025"
  startDate: Date;
  endDate: Date;
  studentIds: mongoose.Types.ObjectId[]; // Students in this promotion
  eventIds: mongoose.Types.ObjectId[]; // Events linked to this promotion
  status: 'draft' | 'active' | 'completed' | 'archived';
  metadata: {
    level?: string; // e.g., "Bachelor", "Master"
    department?: string; // e.g., "Computer Science"
    maxStudents?: number;
    description?: string;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Extend with Mongoose Document
export interface PromotionDocument extends Omit<Promotion, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
  addStudent(studentId: mongoose.Types.ObjectId): Promise<void>;
  removeStudent(studentId: mongoose.Types.ObjectId): Promise<void>;
  addEvent(eventId: mongoose.Types.ObjectId): Promise<void>;
  removeEvent(eventId: mongoose.Types.ObjectId): Promise<void>;
  getStudentCount(): number;
  isStudentEnrolled(studentId: mongoose.Types.ObjectId): boolean;
}

// Static methods interface
export interface PromotionModelType extends mongoose.Model<PromotionDocument> {
  findBySemester(semester: number, academicYear: string): Promise<PromotionDocument[]>;
  findByStudent(studentId: mongoose.Types.ObjectId): Promise<PromotionDocument | null>;
  findActive(): Promise<PromotionDocument[]>;
  findByIntake(intake: 'september' | 'march', year: number): Promise<PromotionDocument[]>;
  getNextSemester(currentSemester: number): number;
}

// Metadata Schema
const MetadataSchema = new Schema({
  level: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  department: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  maxStudents: {
    type: Number,
    min: 1,
    max: 500,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  // Semester validation system fields
  semesterSystem: {
    type: Boolean,
    default: false,
  },
  permanent: {
    type: Boolean,
    default: false,
  },
  minPassingGrade: {
    type: Number,
    min: 0,
    max: 100,
  },
  minAttendance: {
    type: Number,
    min: 0,
    max: 100,
  },
  coursesRequired: {
    type: Number,
    min: 0,
    max: 20,
  },
  autoValidation: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

// Main Promotion Schema
const PromotionSchema = new Schema<PromotionDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
  },
  intake: {
    type: String,
    enum: ['september', 'march'],
    required: true,
  },
  academicYear: {
    type: String,
    required: true,
    match: /^\d{4}-\d{4}$/,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  studentIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  eventIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Event',
  }],
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'archived'],
    default: 'draft',
  },
  metadata: {
    type: MetadataSchema,
    default: () => ({}),
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  collection: 'promotions',
});

// Indexes for performance
PromotionSchema.index({ semester: 1, academicYear: 1 });
PromotionSchema.index({ studentIds: 1 });
PromotionSchema.index({ status: 1, startDate: 1 });
PromotionSchema.index({ intake: 1, academicYear: 1 });

// Instance methods
PromotionSchema.methods['addStudent'] = async function(studentId: mongoose.Types.ObjectId): Promise<void> {
  const promotion = this as PromotionDocument;
  
  // Check if student already in promotion
  if (promotion.studentIds.some(id => id.equals(studentId))) {
    throw new Error('Student already in this promotion');
  }
  
  // Check max students limit
  if (promotion.metadata.maxStudents && promotion.studentIds.length >= promotion.metadata.maxStudents) {
    throw new Error('Promotion has reached maximum student capacity');
  }
  
  promotion.studentIds.push(studentId);
  await promotion.save();
};

PromotionSchema.methods['removeStudent'] = async function(studentId: mongoose.Types.ObjectId): Promise<void> {
  const promotion = this as PromotionDocument;
  
  promotion.studentIds = promotion.studentIds.filter(id => !id.equals(studentId));
  await promotion.save();
};

PromotionSchema.methods['addEvent'] = async function(eventId: mongoose.Types.ObjectId): Promise<void> {
  const promotion = this as PromotionDocument;
  
  // Check if event already linked
  if (promotion.eventIds.some(id => id.equals(eventId))) {
    throw new Error('Event already linked to this promotion');
  }
  
  promotion.eventIds.push(eventId);
  await promotion.save();
};

PromotionSchema.methods['removeEvent'] = async function(eventId: mongoose.Types.ObjectId): Promise<void> {
  const promotion = this as PromotionDocument;
  
  promotion.eventIds = promotion.eventIds.filter(id => !id.equals(eventId));
  await promotion.save();
};

PromotionSchema.methods['getStudentCount'] = function(): number {
  const promotion = this as PromotionDocument;
  return promotion.studentIds.length;
};

PromotionSchema.methods['isStudentEnrolled'] = function(studentId: mongoose.Types.ObjectId): boolean {
  const promotion = this as PromotionDocument;
  return promotion.studentIds.some(id => id.equals(studentId));
};

// Static methods
PromotionSchema.statics['findBySemester'] = function(semester: number, academicYear: string) {
  return this.find({ semester, academicYear }).sort({ name: 1 });
};

PromotionSchema.statics['findByStudent'] = async function(studentId: mongoose.Types.ObjectId) {
  // Each student can only be in one promotion
  return this.findOne({ studentIds: studentId, status: { $in: ['active', 'draft'] } });
};

PromotionSchema.statics['findActive'] = function() {
  return this.find({ status: 'active' }).sort({ semester: 1, name: 1 });
};

PromotionSchema.statics['findByIntake'] = function(intake: 'september' | 'march', year: number) {
  const academicYear = intake === 'september' 
    ? `${year}-${year + 1}` 
    : `${year - 1}-${year}`;
  
  return this.find({ intake, academicYear }).sort({ semester: 1 });
};

PromotionSchema.statics['getNextSemester'] = function(currentSemester: number): number {
  if (currentSemester < 1 || currentSemester > 10) {
    throw new Error('Invalid semester number');
  }
  return currentSemester < 10 ? currentSemester + 1 : 10;
};

// Validation
PromotionSchema.pre('save', function(next) {
  const promotion = this as PromotionDocument;
  
  // Validate date range
  if (promotion.endDate <= promotion.startDate) {
    next(new Error('End date must be after start date'));
    return;
  }
  
  // Validate academic year format
  const yearParts = promotion.academicYear.split('-').map(Number);
  if (yearParts.length !== 2) {
    next(new Error('Academic year must be in format YYYY-YYYY'));
    return;
  }
  
  const [startYear, endYear] = yearParts;
  if (!startYear || !endYear || endYear !== startYear + 1) {
    next(new Error('Academic year must span consecutive years'));
    return;
  }
  
  // Validate semester intake alignment
  // September intake: odd semesters (1,3,5,7,9)
  // March intake: even semesters (2,4,6,8,10)
  const isOddSemester = promotion.semester % 2 === 1;
  if ((promotion.intake === 'september' && !isOddSemester) || 
      (promotion.intake === 'march' && isOddSemester)) {
    next(new Error(`Semester ${promotion.semester} is not valid for ${promotion.intake} intake`));
    return;
  }
  
  next();
});

// Transform output
PromotionSchema.set('toJSON', {
  transform: function(_doc: any, ret: any) {
    ret._id = ret._id.toString();
    // Add null checks to prevent map() errors
    ret.studentIds = ret.studentIds && Array.isArray(ret.studentIds) ? ret.studentIds.map((id: any) => id ? id.toString() : id) : [];
    ret.eventIds = ret.eventIds && Array.isArray(ret.eventIds) ? ret.eventIds.map((id: any) => id ? id.toString() : id) : [];
    ret.createdBy = ret.createdBy ? ret.createdBy.toString() : ret.createdBy;
    delete ret.__v;
    return ret;
  },
});

// Create and export the model with overwrite protection
export const PromotionModel = (mongoose.models['Promotion'] || mongoose.model<PromotionDocument, PromotionModelType>(
  'Promotion',
  PromotionSchema,
)) as PromotionModelType;