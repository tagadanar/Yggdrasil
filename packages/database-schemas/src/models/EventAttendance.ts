// packages/database-schemas/src/models/EventAttendance.ts
// Event attendance tracking for promotion system

import mongoose, { Document, Schema } from 'mongoose';

// EventAttendance interface
export interface EventAttendance {
  _id: string;
  eventId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  promotionId: mongoose.Types.ObjectId;
  attended: boolean;
  attendedAt?: Date;
  markedBy?: mongoose.Types.ObjectId; // Teacher/admin who marked attendance
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extend with Mongoose Document
export interface EventAttendanceDocument extends Omit<EventAttendance, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
}

// Static methods interface
export interface EventAttendanceModelType extends mongoose.Model<EventAttendanceDocument> {
  markAttendance(
    eventId: mongoose.Types.ObjectId,
    studentId: mongoose.Types.ObjectId,
    promotionId: mongoose.Types.ObjectId,
    attended: boolean,
    markedBy?: mongoose.Types.ObjectId,
    notes?: string
  ): Promise<EventAttendanceDocument>;
  
  getEventAttendance(eventId: mongoose.Types.ObjectId): Promise<EventAttendanceDocument[]>;
  getStudentAttendance(
    studentId: mongoose.Types.ObjectId,
    promotionId?: mongoose.Types.ObjectId
  ): Promise<EventAttendanceDocument[]>;
  
  calculateAttendanceRate(
    studentId: mongoose.Types.ObjectId,
    promotionId: mongoose.Types.ObjectId
  ): Promise<number>;
  
  bulkMarkAttendance(
    eventId: mongoose.Types.ObjectId,
    promotionId: mongoose.Types.ObjectId,
    attendanceRecords: Array<{
      studentId: mongoose.Types.ObjectId;
      attended: boolean;
      notes?: string;
    }>,
    markedBy: mongoose.Types.ObjectId
  ): Promise<EventAttendanceDocument[]>;
}

// EventAttendance Schema
const EventAttendanceSchema = new Schema<EventAttendanceDocument>({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  promotionId: {
    type: Schema.Types.ObjectId,
    ref: 'Promotion',
    required: true,
  },
  attended: {
    type: Boolean,
    required: true,
    default: false,
  },
  attendedAt: {
    type: Date,
  },
  markedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
    maxlength: 500,
  },
}, {
  timestamps: true,
  collection: 'event_attendance',
});

// Indexes for performance
EventAttendanceSchema.index({ eventId: 1, studentId: 1 }, { unique: true }); // Prevent duplicate attendance records
EventAttendanceSchema.index({ studentId: 1, promotionId: 1 }); // Student attendance queries
EventAttendanceSchema.index({ eventId: 1, attended: 1 }); // Event attendance reports
EventAttendanceSchema.index({ promotionId: 1, createdAt: -1 }); // Recent attendance by promotion

// Static method: Mark attendance
EventAttendanceSchema.statics['markAttendance'] = async function(
  eventId: mongoose.Types.ObjectId,
  studentId: mongoose.Types.ObjectId,
  promotionId: mongoose.Types.ObjectId,
  attended: boolean,
  markedBy?: mongoose.Types.ObjectId,
  notes?: string
): Promise<EventAttendanceDocument> {
  const existingRecord = await this.findOne({ eventId, studentId });
  
  if (existingRecord) {
    // Update existing record
    existingRecord.attended = attended;
    existingRecord.attendedAt = attended ? new Date() : undefined;
    existingRecord.markedBy = markedBy;
    existingRecord.notes = notes;
    return await existingRecord.save();
  }
  
  // Create new record
  return await this.create({
    eventId,
    studentId,
    promotionId,
    attended,
    attendedAt: attended ? new Date() : undefined,
    markedBy,
    notes,
  });
};

// Static method: Get event attendance
EventAttendanceSchema.statics['getEventAttendance'] = function(
  eventId: mongoose.Types.ObjectId
): Promise<EventAttendanceDocument[]> {
  return this.find({ eventId })
    .populate('studentId', 'email profile.firstName profile.lastName')
    .sort({ 'studentId.profile.lastName': 1, 'studentId.profile.firstName': 1 });
};

// Static method: Get student attendance
EventAttendanceSchema.statics['getStudentAttendance'] = function(
  studentId: mongoose.Types.ObjectId,
  promotionId?: mongoose.Types.ObjectId
): Promise<EventAttendanceDocument[]> {
  const query: any = { studentId };
  if (promotionId) {
    query.promotionId = promotionId;
  }
  
  return this.find(query)
    .populate('eventId', 'title startDate endDate type')
    .sort({ 'eventId.startDate': -1 });
};

// Static method: Calculate attendance rate
EventAttendanceSchema.statics['calculateAttendanceRate'] = async function(
  studentId: mongoose.Types.ObjectId,
  promotionId: mongoose.Types.ObjectId
): Promise<number> {
  const attendance = await this.find({ studentId, promotionId });
  
  if (attendance.length === 0) {
    return 100; // No events yet, consider as 100%
  }
  
  const attendedCount = attendance.filter(record => record.attended).length;
  return Math.round((attendedCount / attendance.length) * 100);
};

// Static method: Bulk mark attendance
EventAttendanceSchema.statics['bulkMarkAttendance'] = async function(
  eventId: mongoose.Types.ObjectId,
  promotionId: mongoose.Types.ObjectId,
  attendanceRecords: Array<{
    studentId: mongoose.Types.ObjectId;
    attended: boolean;
    notes?: string;
  }>,
  markedBy: mongoose.Types.ObjectId
): Promise<EventAttendanceDocument[]> {
  const bulkOps = attendanceRecords.map(record => ({
    updateOne: {
      filter: { eventId, studentId: record.studentId },
      update: {
        $set: {
          promotionId,
          attended: record.attended,
          attendedAt: record.attended ? new Date() : null,
          markedBy,
          notes: record.notes,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          eventId,
          studentId: record.studentId,
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));
  
  await this.bulkWrite(bulkOps);
  
  // Return updated records
  const studentIds = attendanceRecords.map(r => r.studentId);
  return await this.find({ eventId, studentId: { $in: studentIds } });
};

// Instance methods could be added here if needed

// Transform output
EventAttendanceSchema.set('toJSON', {
  transform: function(_doc: any, ret: any) {
    ret._id = ret._id.toString();
    ret.eventId = ret.eventId.toString();
    ret.studentId = ret.studentId.toString();
    ret.promotionId = ret.promotionId.toString();
    if (ret.markedBy) {
      ret.markedBy = ret.markedBy.toString();
    }
    delete ret.__v;
    return ret;
  },
});

// Create and export the model
export const EventAttendanceModel = mongoose.model<EventAttendanceDocument, EventAttendanceModelType>(
  'EventAttendance',
  EventAttendanceSchema,
) as EventAttendanceModelType;