// Path: packages/database-schemas/src/models/Schedule.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface CalendarEvent extends Document {
  title: string;
  description?: string;
  type: 'class' | 'exam' | 'meeting' | 'event' | 'holiday' | 'deadline';
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  organizer: string;
  attendees: string[];
  courseId?: string;
  roomId?: string;
  isRecurring: boolean;
  recurrenceRule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
    daysOfWeek?: number[];
  };
  parentEventId?: string;
  googleCalendarEventId?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'public' | 'private' | 'restricted';
  priority: 'low' | 'medium' | 'high';
  reminders: {
    method: 'email' | 'popup' | 'sms';
    minutes: number;
  }[];
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleModel extends Model<CalendarEvent> {
  findByDateRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
  findByAttendee(userId: string): Promise<CalendarEvent[]>;
  findByCourse(courseId: string): Promise<CalendarEvent[]>;
  findByType(type: string): Promise<CalendarEvent[]>;
  checkConflicts(startDate: Date, endDate: Date, attendees: string[], excludeId?: string): Promise<CalendarEvent[]>;
  findUpcoming(userId: string, days?: number): Promise<CalendarEvent[]>;
}

const RecurrenceRuleSchema = new Schema({
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  interval: {
    type: Number,
    required: true,
    min: 1
  },
  endDate: Date,
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6
  }]
}, { _id: false });

const ReminderSchema = new Schema({
  method: {
    type: String,
    enum: ['email', 'popup', 'sms'],
    required: true
  },
  minutes: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const ScheduleSchema = new Schema<CalendarEvent>({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: ['class', 'exam', 'meeting', 'event', 'holiday', 'deadline'],
    required: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  allDay: {
    type: Boolean,
    default: false
  },
  location: String,
  organizer: {
    type: String,
    required: true
  },
  attendees: [String],
  courseId: String,
  roomId: String,
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrenceRule: RecurrenceRuleSchema,
  parentEventId: String,
  googleCalendarEventId: String,
  status: {
    type: String,
    enum: ['confirmed', 'tentative', 'cancelled'],
    default: 'confirmed'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'restricted'],
    default: 'public'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  reminders: [ReminderSchema],
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'schedule'
});

// Indexes
ScheduleSchema.index({ startDate: 1, endDate: 1 });
ScheduleSchema.index({ organizer: 1 });
ScheduleSchema.index({ attendees: 1 });
ScheduleSchema.index({ courseId: 1 });
ScheduleSchema.index({ type: 1 });
ScheduleSchema.index({ status: 1 });
ScheduleSchema.index({ googleCalendarEventId: 1 }, { sparse: true });

// Static Methods
ScheduleSchema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    $or: [
      {
        startDate: { $gte: startDate, $lte: endDate }
      },
      {
        endDate: { $gte: startDate, $lte: endDate }
      },
      {
        startDate: { $lte: startDate },
        endDate: { $gte: endDate }
      }
    ],
    status: { $ne: 'cancelled' },
    isActive: true
  }).sort({ startDate: 1 });
};

ScheduleSchema.statics.findByAttendee = function(userId: string) {
  return this.find({
    $or: [
      { organizer: userId },
      { attendees: userId }
    ],
    status: { $ne: 'cancelled' },
    isActive: true
  }).sort({ startDate: 1 });
};

ScheduleSchema.statics.findByCourse = function(courseId: string) {
  return this.find({
    courseId,
    status: { $ne: 'cancelled' },
    isActive: true
  }).sort({ startDate: 1 });
};

ScheduleSchema.statics.findByType = function(type: string) {
  return this.find({
    type,
    status: { $ne: 'cancelled' },
    isActive: true
  }).sort({ startDate: 1 });
};

ScheduleSchema.statics.checkConflicts = function(
  startDate: Date, 
  endDate: Date, 
  attendees: string[], 
  excludeId?: string
) {
  const query: any = {
    $and: [
      {
        $or: [
          {
            startDate: { $lt: endDate },
            endDate: { $gt: startDate }
          }
        ]
      },
      {
        $or: [
          { organizer: { $in: attendees } },
          { attendees: { $in: attendees } }
        ]
      }
    ],
    status: { $ne: 'cancelled' },
    isActive: true
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return this.find(query);
};

ScheduleSchema.statics.findUpcoming = function(userId: string, days: number = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);

  return this.find({
    $or: [
      { organizer: userId },
      { attendees: userId }
    ],
    startDate: { $gte: now, $lte: futureDate },
    status: { $ne: 'cancelled' },
    isActive: true
  }).sort({ startDate: 1 });
};

// Pre-save validation
ScheduleSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
    return;
  }
  
  if (this.isRecurring && !this.recurrenceRule) {
    next(new Error('Recurrence rule is required for recurring events'));
    return;
  }
  
  next();
});

export const ScheduleModel = (mongoose.models.Schedule as ScheduleModel) || mongoose.model<CalendarEvent, ScheduleModel>('Schedule', ScheduleSchema);