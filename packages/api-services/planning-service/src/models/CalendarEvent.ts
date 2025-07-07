// Path: packages/api-services/planning-service/src/models/CalendarEvent.ts
import mongoose, { Schema, Document } from 'mongoose';
import {
  CalendarEvent as ICalendarEvent,
  EventType,
  EventCategory,
  EventVisibility,
  EventStatus,
  RecurringPattern,
  Reminder,
  ReminderType,
  RecurrenceType
} from '../types/calendar';

export interface CalendarEvent extends Omit<ICalendarEvent, '_id'>, Document {
  generateRecurrences(endDate: Date): CalendarEvent[];
  isUserAttending(userId: string): boolean;
  addAttendee(userId: string): Promise<boolean>;
  removeAttendee(userId: string): Promise<boolean>;
  hasConflict(startDate: Date, endDate: Date): boolean;
  canUserView(userId: string): boolean;
  canUserEdit(userId: string): boolean;
}

export interface CalendarEventModel extends mongoose.Model<CalendarEvent> {
  findByDateRange(startDate: Date, endDate: Date): any;
  findByUser(userId: string): any;
  findUpcoming(userId?: string, limit?: number): any;
}

const ReminderSchema = new Schema<Reminder>({
  type: {
    type: String,
    enum: ['email', 'push', 'sms', 'popup'],
    required: true
  },
  minutesBefore: {
    type: Number,
    required: true,
    min: 0,
    max: 10080 // 1 week in minutes
  },
  isEnabled: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const RecurringPatternSchema = new Schema<RecurringPattern>({
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    required: true
  },
  interval: {
    type: Number,
    required: true,
    min: 1,
    max: 365
  },
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6
  }],
  endDate: Date,
  occurrenceCount: {
    type: Number,
    min: 1,
    max: 1000
  },
  exceptions: [Date]
}, { _id: false });

const CalendarEventSchema = new Schema<CalendarEvent>({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  type: {
    type: String,
    enum: [
      'class', 'exam', 'assignment', 'meeting', 'workshop',
      'presentation', 'consultation', 'break', 'holiday', 'other'
    ],
    required: true
  },
  category: {
    type: String,
    enum: ['academic', 'administrative', 'social', 'personal', 'system'],
    required: true
  },
  location: {
    type: String,
    maxlength: [500, 'Location cannot exceed 500 characters']
  },
  attendees: [{
    type: String
  }],
  organizer: {
    type: String,
    required: true
  },
  courseId: {
    type: String
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'restricted', 'course-only'],
    default: 'public'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: RecurringPatternSchema,
  reminders: [ReminderSchema],
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'cancelled', 'completed', 'in-progress'],
    default: 'scheduled'
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
CalendarEventSchema.index({ startDate: 1, endDate: 1 });
CalendarEventSchema.index({ organizer: 1 });
CalendarEventSchema.index({ attendees: 1 });
CalendarEventSchema.index({ courseId: 1 });
CalendarEventSchema.index({ type: 1, category: 1 });
CalendarEventSchema.index({ status: 1, isActive: 1 });
CalendarEventSchema.index({ 
  startDate: 1, 
  endDate: 1, 
  type: 1, 
  status: 1 
}, { 
  name: 'calendar_query_index' 
});

// Virtuals
CalendarEventSchema.virtual('duration').get(function(this: any) {
  return Math.abs(this.endDate - this.startDate) / (1000 * 60); // Duration in minutes
});

CalendarEventSchema.virtual('isUpcoming').get(function(this: any) {
  return this.startDate > new Date() && this.status !== 'cancelled';
});

CalendarEventSchema.virtual('isCurrentlyActive').get(function(this: any) {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && this.status === 'in-progress';
});

CalendarEventSchema.virtual('attendeeCount').get(function(this: any) {
  return this.attendees ? this.attendees.length : 0;
});

// Instance Methods
CalendarEventSchema.methods.isUserAttending = function(userId: string): boolean {
  return this.attendees.includes(userId);
};

CalendarEventSchema.methods.addAttendee = async function(userId: string): Promise<boolean> {
  if (this.isUserAttending(userId)) {
    return false; // Already attending
  }
  
  this.attendees.push(userId);
  await this.save();
  return true;
};

CalendarEventSchema.methods.removeAttendee = async function(userId: string): Promise<boolean> {
  const index = this.attendees.indexOf(userId);
  if (index === -1) {
    return false; // Not attending
  }
  
  this.attendees.splice(index, 1);
  await this.save();
  return true;
};

CalendarEventSchema.methods.hasConflict = function(startDate: Date, endDate: Date): boolean {
  return (startDate < this.endDate && endDate > this.startDate);
};

CalendarEventSchema.methods.canUserView = function(userId: string): boolean {
  if (this.visibility === 'public') return true;
  if (this.visibility === 'private' && this.organizer === userId) return true;
  if (this.isUserAttending(userId)) return true;
  return false;
};

CalendarEventSchema.methods.canUserEdit = function(userId: string): boolean {
  return this.organizer === userId;
};

CalendarEventSchema.methods.generateRecurrences = function(endDate: Date): CalendarEvent[] {
  if (!this.isRecurring || !this.recurringPattern) {
    return [this as any];
  }

  const recurrences: CalendarEvent[] = [];
  const pattern = this.recurringPattern;
  let currentDate = new Date(this.startDate);
  let count = 0;
  const maxOccurrences = pattern.occurrenceCount || 100;
  const patternEndDate = pattern.endDate || endDate;

  while (currentDate <= patternEndDate && count < maxOccurrences) {
    // Skip exceptions
    if (!pattern.exceptions?.some((exception: Date) => 
      exception.toDateString() === currentDate.toDateString()
    )) {
      const eventEnd = new Date(currentDate);
      eventEnd.setTime(eventEnd.getTime() + (this.endDate.getTime() - this.startDate.getTime()));

      const occurrence = new (this.constructor as any)({
        ...this.toObject(),
        _id: undefined,
        startDate: new Date(currentDate),
        endDate: eventEnd,
        isRecurring: false,
        recurringPattern: undefined
      });

      recurrences.push(occurrence);
    }

    // Calculate next occurrence
    switch (pattern.type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + pattern.interval);
        break;
      case 'weekly':
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          // Weekly with specific days
          const nextDay = this.getNextWeeklyOccurrence(currentDate, pattern.daysOfWeek, pattern.interval);
          currentDate = nextDay;
        } else {
          currentDate.setDate(currentDate.getDate() + (7 * pattern.interval));
        }
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + pattern.interval);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + pattern.interval);
        break;
      default:
        // Stop if unknown pattern
        break;
    }

    count++;
  }

  return recurrences;
};

CalendarEventSchema.methods.getNextWeeklyOccurrence = function(
  currentDate: Date, 
  daysOfWeek: number[], 
  interval: number
): Date {
  const nextDate = new Date(currentDate);
  const currentDay = currentDate.getDay();
  
  // Find next day in the same week
  const nextDayInWeek = daysOfWeek.find(day => day > currentDay);
  
  if (nextDayInWeek !== undefined) {
    nextDate.setDate(nextDate.getDate() + (nextDayInWeek - currentDay));
  } else {
    // Go to next week and find first day
    const firstDayNextWeek = Math.min(...daysOfWeek);
    const daysToAdd = (7 * interval) - currentDay + firstDayNextWeek;
    nextDate.setDate(nextDate.getDate() + daysToAdd);
  }
  
  return nextDate;
};

// Pre-save middleware
CalendarEventSchema.pre('save', function(this: any, next) {
  // Validate date range
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
    return;
  }

  // Validate recurring pattern
  if (this.isRecurring && !this.recurringPattern) {
    next(new Error('Recurring pattern is required for recurring events'));
    return;
  }

  next();
});

// Static Methods
CalendarEventSchema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    isActive: true,
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
    ]
  });
};

CalendarEventSchema.statics.findByUser = function(userId: string) {
  return this.find({
    isActive: true,
    $or: [
      { organizer: userId },
      { attendees: userId }
    ]
  });
};

CalendarEventSchema.statics.findUpcoming = function(userId?: string, limit: number = 10) {
  const query: any = {
    isActive: true,
    startDate: { $gte: new Date() },
    status: { $ne: 'cancelled' }
  };

  if (userId) {
    query.$or = [
      { organizer: userId },
      { attendees: userId },
      { visibility: 'public' }
    ];
  }

  return this.find(query)
    .sort({ startDate: 1 })
    .limit(limit);
};

export const CalendarEventModel = mongoose.model<CalendarEvent, CalendarEventModel>('CalendarEvent', CalendarEventSchema);