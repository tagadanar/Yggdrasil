// Path: packages/database-schemas/src/models/Promotion.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface Promotion extends Document {
  name: string;
  code: string;
  description?: string;
  startYear: number;
  endYear: number;
  students: string[];
  courses: string[];
  coordinator: string;
  status: 'active' | 'completed' | 'suspended';
  specialization?: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionModel extends Model<Promotion> {
  findByYear(year: number): Promise<Promotion[]>;
  findByCoordinator(coordinatorId: string): Promise<Promotion[]>;
  findActive(): Promise<Promotion[]>;
  addStudent(promotionId: string, studentId: string): Promise<boolean>;
  removeStudent(promotionId: string, studentId: string): Promise<boolean>;
  addCourse(promotionId: string, courseId: string): Promise<boolean>;
  removeCourse(promotionId: string, courseId: string): Promise<boolean>;
}

const PromotionSchema = new Schema<Promotion>({
  name: {
    type: String,
    required: [true, 'Promotion name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Promotion code is required'],
    uppercase: true,
    match: [/^[A-Z0-9]{2,10}$/, 'Code must be 2-10 alphanumeric characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  startYear: {
    type: Number,
    required: true,
    min: [2020, 'Start year cannot be before 2020']
  },
  endYear: {
    type: Number,
    required: true,
    validate: {
      validator: function(this: Promotion, value: number) {
        return value > this.startYear;
      },
      message: 'End year must be after start year'
    }
  },
  students: [String],
  courses: [String],
  coordinator: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'suspended'],
    default: 'active'
  },
  specialization: String,
  capacity: {
    type: Number,
    required: true,
    min: [1, 'Capacity must be at least 1'],
    max: [100, 'Capacity cannot exceed 100']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'promotions'
});

// Indexes
PromotionSchema.index({ code: 1 }, { unique: true });
PromotionSchema.index({ startYear: 1, endYear: 1 });
PromotionSchema.index({ coordinator: 1 });
PromotionSchema.index({ status: 1 });

// Virtual for current enrollment count
PromotionSchema.virtual('enrollmentCount').get(function() {
  return this.students ? this.students.length : 0;
});

PromotionSchema.virtual('availableSpots').get(function() {
  const enrolled = this.students ? this.students.length : 0;
  return Math.max(0, this.capacity - enrolled);
});

// Static Methods
PromotionSchema.statics.findByYear = function(year: number) {
  return this.find({
    $or: [
      { startYear: year },
      { endYear: year },
      { startYear: { $lte: year }, endYear: { $gte: year } }
    ],
    isActive: true
  }).sort({ startYear: 1 });
};

PromotionSchema.statics.findByCoordinator = function(coordinatorId: string) {
  return this.find({ 
    coordinator: coordinatorId,
    isActive: true 
  }).sort({ startYear: -1 });
};

PromotionSchema.statics.findActive = function() {
  return this.find({ 
    status: 'active',
    isActive: true 
  }).sort({ startYear: -1 });
};

PromotionSchema.statics.addStudent = async function(promotionId: string, studentId: string) {
  const promotion = await this.findById(promotionId);
  if (!promotion) return false;
  
  if (promotion.students.includes(studentId)) return false;
  if (promotion.students.length >= promotion.capacity) return false;
  
  promotion.students.push(studentId);
  await promotion.save();
  return true;
};

PromotionSchema.statics.removeStudent = async function(promotionId: string, studentId: string) {
  const promotion = await this.findById(promotionId);
  if (!promotion) return false;
  
  const index = promotion.students.indexOf(studentId);
  if (index === -1) return false;
  
  promotion.students.splice(index, 1);
  await promotion.save();
  return true;
};

PromotionSchema.statics.addCourse = async function(promotionId: string, courseId: string) {
  const promotion = await this.findById(promotionId);
  if (!promotion) return false;
  
  if (promotion.courses.includes(courseId)) return false;
  
  promotion.courses.push(courseId);
  await promotion.save();
  return true;
};

PromotionSchema.statics.removeCourse = async function(promotionId: string, courseId: string) {
  const promotion = await this.findById(promotionId);
  if (!promotion) return false;
  
  const index = promotion.courses.indexOf(courseId);
  if (index === -1) return false;
  
  promotion.courses.splice(index, 1);
  await promotion.save();
  return true;
};

export const PromotionModel = mongoose.model<Promotion, PromotionModel>('Promotion', PromotionSchema);