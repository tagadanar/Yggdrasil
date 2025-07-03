// Path: packages/api-services/planning-service/src/types/calendar.ts

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: EventType;
  category: EventCategory;
  location?: string;
  attendees: string[]; // User IDs
  organizer: string; // User ID
  courseId?: string; // Optional reference to course
  visibility: EventVisibility;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  reminders: Reminder[];
  status: EventStatus;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type EventType = 
  | 'class'
  | 'exam'
  | 'assignment'
  | 'meeting'
  | 'workshop'
  | 'presentation'
  | 'consultation'
  | 'break'
  | 'holiday'
  | 'other';

export type EventCategory = 
  | 'academic'
  | 'administrative'
  | 'social'
  | 'personal'
  | 'system';

export type EventVisibility = 
  | 'public'
  | 'private'
  | 'restricted'
  | 'course-only';

export type EventStatus = 
  | 'scheduled'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'in-progress';

export interface RecurringPattern {
  type: RecurrenceType;
  interval: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  endDate?: Date;
  occurrenceCount?: number;
  exceptions?: Date[]; // Dates to skip
}

export type RecurrenceType = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export interface Reminder {
  type: ReminderType;
  minutesBefore: number;
  isEnabled: boolean;
}

export type ReminderType = 
  | 'email'
  | 'push'
  | 'sms'
  | 'popup';

// Create/Update interfaces
export interface CreateEventData {
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  type: EventType;
  category: EventCategory;
  location?: string;
  attendees?: string[];
  courseId?: string;
  visibility: EventVisibility;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  reminders?: Reminder[];
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  type?: EventType;
  category?: EventCategory;
  location?: string;
  attendees?: string[];
  courseId?: string;
  visibility?: EventVisibility;
  status?: EventStatus;
  reminders?: Reminder[];
}

// Search and filter interfaces
export interface EventSearchFilters {
  startDate?: Date;
  endDate?: Date;
  type?: EventType;
  category?: EventCategory;
  status?: EventStatus;
  organizer?: string;
  attendee?: string;
  courseId?: string;
  visibility?: EventVisibility;
  isRecurring?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'startDate' | 'title' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// Calendar view interfaces
export interface CalendarView {
  type: CalendarViewType;
  startDate: Date;
  endDate: Date;
  events: CalendarEvent[];
  timeSlots?: TimeSlot[];
}

export type CalendarViewType = 
  | 'day'
  | 'week'
  | 'month'
  | 'year'
  | 'agenda';

export interface TimeSlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
  conflicts?: CalendarEvent[];
}

// Schedule management
export interface Schedule {
  _id: string;
  name: string;
  description?: string;
  owner: string; // User ID
  type: ScheduleType;
  timezone: string;
  workingHours: WorkingHours;
  events: string[]; // Event IDs
  isActive: boolean;
  isPublic: boolean;
  sharedWith: string[]; // User IDs
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduleType = 
  | 'personal'
  | 'course'
  | 'institutional'
  | 'shared';

export interface WorkingHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface DaySchedule {
  isWorkingDay: boolean;
  startTime: string; // "08:00"
  endTime: string; // "18:00"
  breaks?: Break[];
}

export interface Break {
  startTime: string;
  endTime: string;
  title: string;
}

// Availability and booking
export interface AvailabilitySlot {
  start: Date;
  end: Date;
  duration: number; // minutes
  isAvailable: boolean;
  bookedBy?: string; // User ID
  eventId?: string;
}

export interface BookingRequest {
  requestedSlot: {
    start: Date;
    end: Date;
  };
  requestedBy: string; // User ID
  purpose: string;
  priority: BookingPriority;
  metadata?: Record<string, any>;
}

export type BookingPriority = 'low' | 'medium' | 'high' | 'urgent';

// Statistics and analytics
export interface CalendarStats {
  totalEvents: number;
  eventsByType: Record<EventType, number>;
  eventsByCategory: Record<EventCategory, number>;
  attendanceRate: number;
  busyHours: number;
  freeHours: number;
  mostActiveDay: string;
  upcomingEvents: number;
  overdueEvents: number;
}

// Integration interfaces
export interface ExternalCalendarSync {
  provider: CalendarProvider;
  externalId: string;
  syncEnabled: boolean;
  lastSync?: Date;
  syncDirection: SyncDirection;
}

export type CalendarProvider = 
  | 'google'
  | 'outlook'
  | 'apple'
  | 'ics';

export type SyncDirection = 
  | 'import'
  | 'export'
  | 'bidirectional';