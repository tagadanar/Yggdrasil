// packages/database-schemas/src/models/Event.ts
// Event model with Mongoose schema

import mongoose, { Document, Schema } from 'mongoose';

// Define the Event interface
export interface Event {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  type: 'class' | 'exam' | 'meeting' | 'event';
  startDate: Date;
  endDate: Date;
  linkedCourse?: mongoose.Types.ObjectId;
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
    count?: number;
    days?: number[]; // For weekly pattern: 0=Sunday, 1=Monday, etc.
  };
  parentEvent?: mongoose.Types.ObjectId; // For recurring event instances
  isRecurring: boolean;
  createdBy: mongoose.Types.ObjectId;
  attendees?: Array<{
    userId: mongoose.Types.ObjectId;
    status: 'pending' | 'accepted' | 'declined';
    responseDate?: Date;
  }>;
  capacity?: number;
  isPublic: boolean;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extend the Event interface with Mongoose Document
export interface EventDocument extends Omit<Event, '_id'>, Document {
  _id: mongoose.Types.ObjectId;
  addAttendee(userId: mongoose.Types.ObjectId, status?: string): Promise<void>;
  removeAttendee(userId: mongoose.Types.ObjectId): Promise<void>;
  updateAttendeeStatus(userId: mongoose.Types.ObjectId, status: string): Promise<void>;
  checkConflicts(): Promise<EventDocument[]>;
}

// Static methods interface
export interface EventModelType extends mongoose.Model<EventDocument> {
  findByDateRange(startDate: Date, endDate: Date): Promise<EventDocument[]>;
  findByType(type: string): Promise<EventDocument[]>;
  findByCourse(courseId: mongoose.Types.ObjectId): Promise<EventDocument[]>;
  findByLocation(location: string, startDate?: Date, endDate?: Date): Promise<EventDocument[]>;
  findConflicts(startDate: Date, endDate: Date, location?: string, excludeId?: mongoose.Types.ObjectId): Promise<EventDocument[]>;
  findRecurring(): Promise<EventDocument[]>;
  findUpcoming(limit?: number): Promise<EventDocument[]>;
}

// Attendee Schema
const AttendeeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
  responseDate: {
    type: Date,
  },
}, { _id: false });

// Recurrence Schema
const RecurrenceSchema = new Schema({
  pattern: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
  },
  interval: {
    type: Number,
    default: 1,
    min: 1,
  },
  endDate: {
    type: Date,
  },
  count: {
    type: Number,
    min: 1,
  },
  days: [{
    type: Number,
    min: 0,
    max: 6,
  }],
}, { _id: false });

// Main Event Schema
const EventSchema = new Schema<EventDocument>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  type: {
    type: String,
    enum: ['class', 'exam', 'meeting', 'event'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  linkedCourse: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
  },
  recurrence: {
    type: RecurrenceSchema,
  },
  parentEvent: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attendees: [AttendeeSchema],
  capacity: {
    type: Number,
    min: 1,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  color: {
    type: String,
    default: '#3b82f6', // Default blue color
    match: /^#[0-9A-F]{6}$/i,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'events',
});

// Indexes for performance
EventSchema.index({ startDate: 1, endDate: 1 }); // Date range queries
EventSchema.index({ type: 1 }); // Filter by type
EventSchema.index({ location: 1 }); // Filter by location
EventSchema.index({ linkedCourse: 1 }); // Filter by course
EventSchema.index({ createdBy: 1 }); // Filter by creator
EventSchema.index({ isRecurring: 1 }); // Filter recurring events
EventSchema.index({ parentEvent: 1 }); // Find event instances
EventSchema.index({ isPublic: 1 }); // Public events
EventSchema.index({ 
  title: 'text', 
  description: 'text' 
}, { 
  weights: { 
    title: 10, 
    description: 1 
  } 
}); // Text search

// Validation: endDate must be after startDate
EventSchema.pre('save', function(next) {
  const event = this as EventDocument;
  
  if (event.endDate <= event.startDate) {
    const error = new Error('End date must be after start date');
    return next(error);
  }
  
  // Set isRecurring based on recurrence data
  event.isRecurring = !!event.recurrence;
  
  next();
});

// Instance method to add attendee
EventSchema.methods['addAttendee'] = async function(userId: mongoose.Types.ObjectId, status: string = 'pending'): Promise<void> {
  const event = this as EventDocument;
  
  // Check if attendee already exists
  const existingAttendee = event.attendees?.find(a => a.userId.toString() === userId.toString());
  if (existingAttendee) {
    throw new Error('User is already an attendee');
  }
  
  // Check capacity
  if (event.capacity && event.attendees && event.attendees.length >= event.capacity) {
    throw new Error('Event is at full capacity');
  }
  
  if (!event.attendees) {
    event.attendees = [];
  }
  
  event.attendees.push({
    userId,
    status: status as 'pending' | 'accepted' | 'declined',
    responseDate: new Date(),
  });
  
  await event.save();
};

// Instance method to remove attendee
EventSchema.methods['removeAttendee'] = async function(userId: mongoose.Types.ObjectId): Promise<void> {
  const event = this as EventDocument;
  
  if (!event.attendees) {
    throw new Error('No attendees to remove');
  }
  
  const initialLength = event.attendees.length;
  event.attendees = event.attendees.filter(a => a.userId.toString() !== userId.toString());
  
  if (event.attendees.length === initialLength) {
    throw new Error('User is not an attendee');
  }
  
  await event.save();
};

// Instance method to update attendee status
EventSchema.methods['updateAttendeeStatus'] = async function(userId: mongoose.Types.ObjectId, status: string): Promise<void> {
  const event = this as EventDocument;
  
  if (!event.attendees) {
    throw new Error('No attendees found');
  }
  
  const attendee = event.attendees.find(a => a.userId.toString() === userId.toString());
  if (!attendee) {
    throw new Error('User is not an attendee');
  }
  
  attendee.status = status as 'pending' | 'accepted' | 'declined';
  attendee.responseDate = new Date();
  
  await event.save();
};

// Instance method to check for conflicts
EventSchema.methods['checkConflicts'] = async function(): Promise<EventDocument[]> {
  const event = this as EventDocument;
  
  if (!event.location) {
    return [];
  }
  
  return EventModel.findConflicts(
    event.startDate,
    event.endDate,
    event.location,
    event._id
  );
};

// Transform output to match our interface
EventSchema.set('toJSON', {
  transform: function(_doc: any, ret: any) {
    ret._id = ret._id.toString();
    if (ret.linkedCourse) {
      ret.linkedCourse = ret.linkedCourse.toString();
    }
    if (ret.createdBy) {
      ret.createdBy = ret.createdBy.toString();
    }
    if (ret.parentEvent) {
      ret.parentEvent = ret.parentEvent.toString();
    }
    if (ret.attendees) {
      ret.attendees = ret.attendees.map((a: any) => ({
        ...a,
        userId: a.userId.toString(),
      }));
    }
    delete ret.__v;
    return ret;
  }
});

EventSchema.set('toObject', {
  transform: function(_doc: any, ret: any) {
    ret._id = ret._id.toString();
    if (ret.linkedCourse) {
      ret.linkedCourse = ret.linkedCourse.toString();
    }
    if (ret.createdBy) {
      ret.createdBy = ret.createdBy.toString();
    }
    if (ret.parentEvent) {
      ret.parentEvent = ret.parentEvent.toString();
    }
    if (ret.attendees) {
      ret.attendees = ret.attendees.map((a: any) => ({
        ...a,
        userId: a.userId.toString(),
      }));
    }
    delete ret.__v;
    return ret;
  }
});

// Static methods
EventSchema.statics['findByDateRange'] = function(startDate: Date, endDate: Date) {
  return this.find({
    $and: [
      { startDate: { $lte: endDate } },
      { endDate: { $gte: startDate } }
    ]
  }).sort({ startDate: 1 });
};

EventSchema.statics['findByType'] = function(type: string) {
  return this.find({ type }).sort({ startDate: 1 });
};

EventSchema.statics['findByCourse'] = function(courseId: mongoose.Types.ObjectId) {
  return this.find({ linkedCourse: courseId }).sort({ startDate: 1 });
};

EventSchema.statics['findByLocation'] = function(location: string, startDate?: Date, endDate?: Date) {
  const query: any = { location };
  
  if (startDate && endDate) {
    query.$and = [
      { startDate: { $lte: endDate } },
      { endDate: { $gte: startDate } }
    ];
  }
  
  return this.find(query).sort({ startDate: 1 });
};

EventSchema.statics['findConflicts'] = function(
  startDate: Date, 
  endDate: Date, 
  location?: string, 
  excludeId?: mongoose.Types.ObjectId
) {
  const query: any = {
    $and: [
      { startDate: { $lt: endDate } },
      { endDate: { $gt: startDate } }
    ]
  };
  
  if (location) {
    query.location = location;
  }
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  return this.find(query).sort({ startDate: 1 });
};

EventSchema.statics['findRecurring'] = function() {
  return this.find({ isRecurring: true }).sort({ startDate: 1 });
};

EventSchema.statics['findUpcoming'] = function(limit: number = 10) {
  return this.find({ 
    startDate: { $gte: new Date() },
    isPublic: true 
  })
    .sort({ startDate: 1 })
    .limit(limit);
};

// Create and export the model
export const EventModel = mongoose.model<EventDocument, EventModelType>('Event', EventSchema) as EventModelType;