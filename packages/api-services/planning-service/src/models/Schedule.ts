// Path: packages/api-services/planning-service/src/models/Schedule.ts
import mongoose, { Schema, Document } from 'mongoose';
import {
  Schedule as ISchedule,
  ScheduleType,
  WorkingHours,
  DaySchedule,
  Break,
  AvailabilitySlot
} from '../types/calendar';

export interface Schedule extends Omit<ISchedule, '_id'>, Document {
  isUserAllowed(userId: string): boolean;
  getAvailableSlots(startDate: Date, endDate: Date, duration: number): AvailabilitySlot[];
  hasConflict(startDate: Date, endDate: Date): Promise<boolean>;
  addEvent(eventId: string): Promise<boolean>;
  removeEvent(eventId: string): Promise<boolean>;
  isWithinWorkingHours(date: Date): boolean;
}

export interface ScheduleModel extends mongoose.Model<Schedule> {
  findByUser(userId: string): any;
  findByType(type: ScheduleType): any;
  findPublic(): any;
}

const BreakSchema = new Schema<Break>({
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  }
}, { _id: false });

const DayScheduleSchema = new Schema<DaySchedule>({
  isWorkingDay: {
    type: Boolean,
    default: true
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    default: "09:00"
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    default: "17:00"
  },
  breaks: [BreakSchema]
}, { _id: false });

const WorkingHoursSchema = new Schema<WorkingHours>({
  monday: DayScheduleSchema,
  tuesday: DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday: DayScheduleSchema,
  friday: DayScheduleSchema,
  saturday: DayScheduleSchema,
  sunday: DayScheduleSchema
}, { _id: false });

const ScheduleSchema = new Schema<Schedule>({
  name: {
    type: String,
    required: [true, 'Schedule name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  owner: {
    type: String,
    required: true,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['personal', 'course', 'institutional', 'shared'],
    required: true
  },
  timezone: {
    type: String,
    required: true,
    default: 'UTC'
  },
  workingHours: {
    type: WorkingHoursSchema,
    required: true
  },
  events: [{
    type: Schema.Types.ObjectId,
    ref: 'CalendarEvent'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    type: String,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
ScheduleSchema.index({ owner: 1 });
ScheduleSchema.index({ type: 1, isActive: 1 });
ScheduleSchema.index({ isPublic: 1, isActive: 1 });
ScheduleSchema.index({ sharedWith: 1 });

// Virtuals
ScheduleSchema.virtual('eventCount').get(function(this: any) {
  return this.events ? this.events.length : 0;
});

ScheduleSchema.virtual('totalWorkingHours').get(function(this: any) {
  let totalHours = 0;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  days.forEach(day => {
    const daySchedule = this.workingHours[day];
    if (daySchedule && daySchedule.isWorkingDay) {
      const start = this.parseTime(daySchedule.startTime);
      const end = this.parseTime(daySchedule.endTime);
      let dayHours = (end - start) / (1000 * 60 * 60);
      
      // Subtract break time
      if (daySchedule.breaks) {
        daySchedule.breaks.forEach((breakTime: Break) => {
          const breakStart = this.parseTime(breakTime.startTime);
          const breakEnd = this.parseTime(breakTime.endTime);
          dayHours -= (breakEnd - breakStart) / (1000 * 60 * 60);
        });
      }
      
      totalHours += Math.max(0, dayHours);
    }
  });
  
  return totalHours;
});

// Instance Methods
ScheduleSchema.methods.parseTime = function(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).getTime();
};

ScheduleSchema.methods.isUserAllowed = function(userId: string): boolean {
  if (this.owner === userId) return true;
  if (this.isPublic) return true;
  if (this.sharedWith.includes(userId)) return true;
  return false;
};

ScheduleSchema.methods.isWithinWorkingHours = function(date: Date): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  const daySchedule = this.workingHours[dayName];
  
  if (!daySchedule || !daySchedule.isWorkingDay) {
    return false;
  }
  
  const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  const currentTime = this.parseTime(timeString);
  const startTime = this.parseTime(daySchedule.startTime);
  const endTime = this.parseTime(daySchedule.endTime);
  
  if (currentTime < startTime || currentTime > endTime) {
    return false;
  }
  
  // Check if time falls within a break
  if (daySchedule.breaks) {
    for (const breakTime of daySchedule.breaks) {
      const breakStart = this.parseTime(breakTime.startTime);
      const breakEnd = this.parseTime(breakTime.endTime);
      if (currentTime >= breakStart && currentTime <= breakEnd) {
        return false;
      }
    }
  }
  
  return true;
};

ScheduleSchema.methods.getAvailableSlots = function(
  startDate: Date, 
  endDate: Date, 
  duration: number
): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (this.isWithinWorkingHours(current)) {
      const slotEnd = new Date(current.getTime() + (duration * 60 * 1000));
      
      if (slotEnd <= endDate && this.isWithinWorkingHours(slotEnd)) {
        slots.push({
          start: new Date(current),
          end: slotEnd,
          duration,
          isAvailable: true
        });
      }
    }
    
    // Move to next 15-minute interval
    current.setMinutes(current.getMinutes() + 15);
  }
  
  return slots;
};

ScheduleSchema.methods.hasConflict = async function(startDate: Date, endDate: Date): Promise<boolean> {
  const CalendarEventModel = mongoose.model('CalendarEvent');
  
  const conflictingEvents = await CalendarEventModel.find({
    _id: { $in: this.events },
    isActive: true,
    status: { $ne: 'cancelled' },
    $or: [
      {
        startDate: { $lt: endDate },
        endDate: { $gt: startDate }
      }
    ]
  });
  
  return conflictingEvents.length > 0;
};

ScheduleSchema.methods.addEvent = async function(eventId: string): Promise<boolean> {
  if (this.events.includes(eventId)) {
    return false; // Already added
  }
  
  this.events.push(eventId);
  await this.save();
  return true;
};

ScheduleSchema.methods.removeEvent = async function(eventId: string): Promise<boolean> {
  const index = this.events.indexOf(eventId);
  if (index === -1) {
    return false; // Not found
  }
  
  this.events.splice(index, 1);
  await this.save();
  return true;
};

// Static Methods
ScheduleSchema.statics.findByUser = function(userId: string) {
  return this.find({
    $or: [
      { owner: userId },
      { sharedWith: userId },
      { isPublic: true }
    ],
    isActive: true
  });
};

ScheduleSchema.statics.findByType = function(type: ScheduleType) {
  return this.find({ type, isActive: true });
};

ScheduleSchema.statics.findPublic = function() {
  return this.find({ isPublic: true, isActive: true });
};

// Pre-save middleware
ScheduleSchema.pre('save', function(this: any, next) {
  // Validate working hours
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of days) {
    const daySchedule = this.workingHours[day];
    if (daySchedule && daySchedule.isWorkingDay) {
      const startTime = this.parseTime(daySchedule.startTime);
      const endTime = this.parseTime(daySchedule.endTime);
      
      if (endTime <= startTime) {
        next(new Error(`End time must be after start time for ${day}`));
        return;
      }
      
      // Validate breaks
      if (daySchedule.breaks) {
        for (const breakTime of daySchedule.breaks) {
          const breakStart = this.parseTime(breakTime.startTime);
          const breakEnd = this.parseTime(breakTime.endTime);
          
          if (breakEnd <= breakStart) {
            next(new Error(`Break end time must be after start time for ${day}`));
            return;
          }
          
          if (breakStart < startTime || breakEnd > endTime) {
            next(new Error(`Break must be within working hours for ${day}`));
            return;
          }
        }
      }
    }
  }
  
  next();
});

export const ScheduleModel = mongoose.model<Schedule, ScheduleModel>('Schedule', ScheduleSchema);