// packages/shared-utilities/src/types/planning.ts
// Planning-related TypeScript types

// import { z } from 'zod'; // Unused import

// Event types
export interface Event {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  type: 'class' | 'exam' | 'meeting' | 'event' | 'academic';
  startDate: Date;
  endDate: Date;
  linkedCourse?: string; // Course ID
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
    count?: number;
    days?: number[]; // For weekly pattern: 0=Sunday, 1=Monday, etc.
  };
  parentEvent?: string; // Parent event ID for recurring instances
  isRecurring: boolean;
  createdBy: string; // User ID
  attendees?: Array<{
    userId: string;
    status: 'pending' | 'accepted' | 'declined';
    responseDate?: Date;
  }>;
  capacity?: number;
  isPublic: boolean;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventListItem {
  _id: string;
  title: string;
  type: 'class' | 'exam' | 'meeting' | 'event' | 'academic';
  startDate: Date;
  endDate: Date;
  location?: string;
  linkedCourse?: {
    _id: string;
    title: string;
  };
  isRecurring: boolean;
  attendeeCount?: number;
  color?: string;
}

// Query types
export interface GetEventsQueryType {
  startDate?: string;
  endDate?: string;
  type?: 'class' | 'exam' | 'meeting' | 'event' | 'academic';
  courseId?: string;
  location?: string;
  isPublic?: boolean;
}

// Create/Update types
export interface CreateEventType {
  title: string;
  description?: string;
  location?: string;
  type: 'class' | 'exam' | 'meeting' | 'event' | 'academic';
  startDate: string | Date;
  endDate: string | Date;
  linkedCourse?: string;
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string | Date;
    count?: number;
    days?: number[];
  };
  capacity?: number;
  isPublic?: boolean;
  color?: string;
}

export interface UpdateEventType {
  title?: string;
  description?: string;
  location?: string;
  type?: 'class' | 'exam' | 'meeting' | 'event' | 'academic';
  startDate?: string | Date;
  endDate?: string | Date;
  linkedCourse?: string;
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: string | Date;
    count?: number;
    days?: number[];
  };
  capacity?: number;
  isPublic?: boolean;
  color?: string;
}

// Export calendar types
export interface ExportCalendarType {
  format: 'ical' | 'csv';
  startDate: string;
  endDate: string;
  eventType?: 'class' | 'exam' | 'meeting' | 'event' | 'academic';
  includePrivate?: boolean;
}

// Conflict detection
export interface ConflictCheckType {
  startDate: Date;
  endDate: Date;
  location?: string;
  excludeEventId?: string;
}

export interface ConflictWarning {
  eventId: string;
  title: string;
  location: string;
  startDate: Date;
  endDate: Date;
  conflictType: 'location' | 'time' | 'resource';
}

// Attendee management
export interface AttendeeType {
  userId: string;
  status: 'pending' | 'accepted' | 'declined';
  responseDate?: Date;
  userInfo?: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface AttendeeResponseType {
  eventId: string;
  status: 'accepted' | 'declined';
  note?: string;
}

// Calendar view types
export type CalendarViewType = 'month' | 'week' | 'day' | 'list';

export interface CalendarEventType {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any;
  color?: string;
  textColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  extendedProps?: {
    type: 'class' | 'exam' | 'meeting' | 'event' | 'academic';
    location?: string;
    description?: string;
    linkedCourse?: string;
    attendeeCount?: number;
    isRecurring?: boolean;
  };
}

// Recurring event types
export interface RecurrenceRuleType {
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
  days?: number[]; // 0=Sunday, 1=Monday, etc.
  monthlyType?: 'dayOfMonth' | 'dayOfWeek'; // For monthly recurrence
  yearlyType?: 'dayOfYear' | 'dayOfWeek'; // For yearly recurrence
}

export interface RecurringEventInstanceType {
  parentEventId: string;
  instanceDate: Date;
  isModified: boolean;
  modifications?: Partial<Event>;
}

// Statistics and analytics
export interface EventStatisticsType {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByMonth: Record<string, number>;
  averageAttendance: number;
  popularLocations: Array<{
    location: string;
    count: number;
  }>;
  recurringEventStats: {
    totalRecurring: number;
    instancesGenerated: number;
  };
}

// Event integration types
export interface GoogleCalendarIntegrationType {
  calendarId: string;
  syncDirection: 'import' | 'export' | 'bidirectional';
  lastSyncDate?: Date;
  syncErrors?: string[];
}

export interface EventNotificationType {
  eventId: string;
  userId: string;
  type: 'created' | 'updated' | 'deleted' | 'reminder';
  reminderTime?: number; // Minutes before event
  isRead: boolean;
  createdAt: Date;
}

// Room/Resource management
export interface ResourceType {
  _id: string;
  name: string;
  type: 'room' | 'equipment' | 'person';
  capacity?: number;
  location?: string;
  description?: string;
  isActive: boolean;
  availability?: Array<{
    dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
  }>;
}

export interface ResourceBookingType {
  resourceId: string;
  eventId: string;
  startDate: Date;
  endDate: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
}
