// packages/shared-utilities/src/validation/planning.ts
// Validation schemas for planning-related operations

import { z } from 'zod';

// Event validation schemas
const eventTypeSchema = z.enum(['class', 'exam', 'meeting', 'event']);
const recurrencePatternSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
const attendeeStatusSchema = z.enum(['pending', 'accepted', 'declined']);

// Recurrence schema
const recurrenceSchema = z.object({
  pattern: recurrencePatternSchema,
  interval: z.number().min(1).max(52), // Max weekly for a year
  endDate: z.string().datetime().optional(),
  count: z.number().min(1).max(365).optional(), // Max daily for a year
  days: z.array(z.number().min(0).max(6)).optional(), // Days of week
}).refine(data => {
  // Either endDate or count must be provided, but not both
  return (data.endDate && !data.count) || (!data.endDate && data.count);
}, {
  message: "Either endDate or count must be provided, but not both"
});

// Create event schema
export const createEventSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional(),
  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .trim()
    .optional(),
  type: eventTypeSchema,
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  linkedCourse: z.string().optional(),
  recurrence: recurrenceSchema.optional(),
  capacity: z.number().min(1).max(1000).optional(),
  isPublic: z.boolean().default(true),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
}).refine(data => {
  // End date must be after start date
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "End date must be after start date",
  path: ["endDate"]
}).refine(data => {
  // Events cannot be longer than 24 hours
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return diffHours <= 24;
}, {
  message: "Event cannot be longer than 24 hours",
  path: ["endDate"]
});

// Update event schema (all fields optional except validation rules)
export const updateEventSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional(),
  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .trim()
    .optional(),
  type: eventTypeSchema.optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  linkedCourse: z.string().optional(),
  recurrence: recurrenceSchema.optional(),
  capacity: z.number().min(1).max(1000).optional(),
  isPublic: z.boolean().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
}).refine(data => {
  // If both dates provided, end date must be after start date
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"]
}).refine(data => {
  // If both dates provided, events cannot be longer than 24 hours
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }
  return true;
}, {
  message: "Event cannot be longer than 24 hours",
  path: ["endDate"]
});

// Query events schema
export const getEventsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: eventTypeSchema.optional(),
  courseId: z.string().optional(),
  location: z.string().optional(),
  isPublic: z.boolean().optional(),
}).refine(data => {
  // If both dates provided, end date must be after start date
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"]
});

// Export calendar schema
export const exportCalendarSchema = z.object({
  format: z.enum(['ical', 'csv'], {
    required_error: 'Export format is required',
    invalid_type_error: 'Invalid export format'
  }),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  eventType: eventTypeSchema.optional(),
  includePrivate: z.boolean().default(false),
}).refine(data => {
  // End date must be after start date
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "End date must be after start date",
  path: ["endDate"]
}).refine(data => {
  // Export range cannot be more than 1 year
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 365;
}, {
  message: "Export range cannot exceed 1 year",
  path: ["endDate"]
});

// Attendee response schema
export const attendeeResponseSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  status: z.enum(['accepted', 'declined'], {
    required_error: 'Response status is required'
  }),
  note: z.string().max(500, 'Note must be less than 500 characters').optional(),
});

// Conflict check schema
export const conflictCheckSchema = z.object({
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  location: z.string().optional(),
  excludeEventId: z.string().optional(),
}).refine(data => {
  // End date must be after start date
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

// Resource booking schema
export const resourceBookingSchema = z.object({
  resourceId: z.string().min(1, 'Resource ID is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
}).refine(data => {
  // End date must be after start date
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

// Bulk operations schema
export const bulkUpdateEventsSchema = z.object({
  eventIds: z.array(z.string()).min(1, 'At least one event ID is required').max(100, 'Cannot update more than 100 events at once'),
  updates: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim().optional(),
    description: z.string().max(1000, 'Description must be less than 1000 characters').trim().optional(),
    location: z.string().max(100, 'Location must be less than 100 characters').trim().optional(),
    type: eventTypeSchema.optional(),
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional(),
    capacity: z.number().min(1).max(1000).optional(),
    isPublic: z.boolean().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  }),
  updateRecurring: z.boolean().default(false), // Whether to update all instances of recurring events
});

export const bulkDeleteEventsSchema = z.object({
  eventIds: z.array(z.string()).min(1, 'At least one event ID is required').max(100, 'Cannot delete more than 100 events at once'),
  deleteRecurring: z.boolean().default(false), // Whether to delete all instances of recurring events
});

// Event template schema (for creating reusable event templates)
export const eventTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name must be less than 100 characters'),
  description: z.string().max(500, 'Template description must be less than 500 characters').optional(),
  eventData: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters').trim(),
    description: z.string().max(1000, 'Description must be less than 1000 characters').trim().optional(),
    location: z.string().max(100, 'Location must be less than 100 characters').trim().optional(),
    type: eventTypeSchema,
    linkedCourse: z.string().optional(),
    recurrence: recurrenceSchema.optional(),
    capacity: z.number().min(1).max(1000).optional(),
    isPublic: z.boolean().default(true),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  }),
  isPublic: z.boolean().default(false), // Templates are private by default
});

// Google Calendar integration schema
export const googleCalendarSyncSchema = z.object({
  calendarId: z.string().min(1, 'Calendar ID is required'),
  syncDirection: z.enum(['import', 'export', 'bidirectional'], {
    required_error: 'Sync direction is required'
  }),
  dateRange: z.object({
    startDate: z.string().datetime('Invalid start date format'),
    endDate: z.string().datetime('Invalid end date format'),
  }).optional(),
}).refine(data => {
  // If date range provided, end date must be after start date
  if (data.dateRange) {
    return new Date(data.dateRange.endDate) > new Date(data.dateRange.startDate);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["dateRange", "endDate"]
});

// Event notification preferences schema
export const notificationPreferencesSchema = z.object({
  eventCreated: z.boolean().default(true),
  eventUpdated: z.boolean().default(true),
  eventDeleted: z.boolean().default(true),
  eventReminder: z.boolean().default(true),
  reminderTimes: z.array(z.number().min(0).max(10080)).default([15, 60]), // Minutes before event (max 1 week)
  digestFrequency: z.enum(['none', 'daily', 'weekly']).default('weekly'),
});

// Export all schemas
export const planningValidationSchemas = {
  createEvent: createEventSchema,
  updateEvent: updateEventSchema,
  getEventsQuery: getEventsQuerySchema,
  exportCalendar: exportCalendarSchema,
  attendeeResponse: attendeeResponseSchema,
  conflictCheck: conflictCheckSchema,
  resourceBooking: resourceBookingSchema,
  bulkUpdateEvents: bulkUpdateEventsSchema,
  bulkDeleteEvents: bulkDeleteEventsSchema,
  eventTemplate: eventTemplateSchema,
  googleCalendarSync: googleCalendarSyncSchema,
  notificationPreferences: notificationPreferencesSchema,
};

// Type exports for use in other files (validation-specific types)
export type CreateEventSchema = z.infer<typeof createEventSchema>;
export type UpdateEventSchema = z.infer<typeof updateEventSchema>;
export type GetEventsQuerySchema = z.infer<typeof getEventsQuerySchema>;
export type ExportCalendarSchema = z.infer<typeof exportCalendarSchema>;
export type AttendeeResponseSchema = z.infer<typeof attendeeResponseSchema>;
export type ConflictCheckSchema = z.infer<typeof conflictCheckSchema>;
export type ResourceBookingSchema = z.infer<typeof resourceBookingSchema>;
export type BulkUpdateEventsSchema = z.infer<typeof bulkUpdateEventsSchema>;
export type BulkDeleteEventsSchema = z.infer<typeof bulkDeleteEventsSchema>;
export type EventTemplateSchema = z.infer<typeof eventTemplateSchema>;
export type GoogleCalendarSyncSchema = z.infer<typeof googleCalendarSyncSchema>;
export type NotificationPreferencesSchema = z.infer<typeof notificationPreferencesSchema>;