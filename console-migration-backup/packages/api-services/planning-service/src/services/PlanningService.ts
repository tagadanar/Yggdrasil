// packages/api-services/planning-service/src/services/PlanningService.ts
// Planning service with business logic

import mongoose from 'mongoose';
import { EventModel, UserModel, EventDocument } from '@yggdrasil/database-schemas';
import { 
  CreateEventType,
  UpdateEventType,
  GetEventsQueryType,
  Event,
  User,
  ExportCalendarType,
  ApiResponse,
} from '@yggdrasil/shared-utilities';
import { RRule } from 'rrule';

export interface EventResult extends ApiResponse {
  event?: Event;
}

export interface EventListResult extends ApiResponse {
  events: Event[];
}

export interface ConflictCheckResult extends ApiResponse {
  conflicts: Array<{
    eventId: string;
    title: string;
    location: string;
    startDate: Date;
    endDate: Date;
  }>;
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

export class PlanningService {
  /**
   * Convert EventDocument to Event (removes sensitive data and converts _id to string)
   */
  private static eventDocumentToEvent(eventDoc: EventDocument): Event {
    return eventDoc.toJSON() as Event;
  }

  /**
   * Check if user has permission to create/edit events
   */
  private static canModifyEvents(userRole: string): boolean {
    return ['admin', 'staff'].includes(userRole);
  }

  /**
   * Check if user can edit specific event (creator, admin, or staff)
   */
  private static canEditEvent(event: EventDocument, userId: string, userRole: string): boolean {
    return event.createdBy.toString() === userId || this.canModifyEvents(userRole);
  }

  /**
   * Get events with filtering
   */
  async getEvents(query: GetEventsQueryType & { userId: string }): Promise<Event[]> {
    try {
      const filter: any = {};

      // Date range filtering
      if (query.startDate || query.endDate) {
        filter.$or = [];
        
        if (query.startDate && query.endDate) {
          // Events that overlap with the date range
          filter.$or.push({
            $and: [
              { startDate: { $lte: new Date(query.endDate) } },
              { endDate: { $gte: new Date(query.startDate) } }
            ]
          });
        } else if (query.startDate) {
          filter.endDate = { $gte: new Date(query.startDate) };
        } else if (query.endDate) {
          filter.startDate = { $lte: new Date(query.endDate) };
        }
      }

      // Type filtering
      if (query.type) {
        filter.type = query.type;
      }

      // Course filtering
      if (query.courseId) {
        filter.linkedCourse = query.courseId;
      }

      const events = await EventModel.find(filter)
        .populate('createdBy', 'email profile.firstName profile.lastName')
        .populate('linkedCourse', 'title')
        .sort({ startDate: 1 });

      return events.map(PlanningService.eventDocumentToEvent);
    } catch (error) {
      throw new Error(`Failed to get events: ${error}`);
    }
  }

  /**
   * Create a new event
   */
  async createEvent(eventData: CreateEventType, user: User): Promise<Event> {
    if (!PlanningService.canModifyEvents(user.role)) {
      throw new Error('Insufficient permissions to create events');
    }

    try {
      // Check for conflicts if location is specified
      if (eventData.location) {
        const conflicts = await this.checkConflicts({
          startDate: new Date(eventData.startDate),
          endDate: new Date(eventData.endDate),
          location: eventData.location
        });

        if (conflicts.conflicts.length > 0) {
          throw new Error(`Room ${eventData.location} is already booked during this time`);
        }
      }

      const eventDoc = new EventModel({
        ...eventData,
        createdBy: user._id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedEvent = await eventDoc.save();
      await savedEvent.populate('createdBy', 'email profile.firstName profile.lastName');
      
      if (savedEvent.linkedCourse) {
        await savedEvent.populate('linkedCourse', 'title');
      }

      return PlanningService.eventDocumentToEvent(savedEvent);
    } catch (error) {
      throw new Error(`Failed to create event: ${error}`);
    }
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(eventId: string): Promise<Event | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new Error('Invalid event ID');
      }

      const event = await EventModel.findById(eventId)
        .populate('createdBy', 'email profile.firstName profile.lastName')
        .populate('linkedCourse', 'title');

      return event ? PlanningService.eventDocumentToEvent(event) : null;
    } catch (error) {
      throw new Error(`Failed to get event: ${error}`);
    }
  }

  /**
   * Update an event
   */
  async updateEvent(eventId: string, updateData: UpdateEventType, user: User): Promise<Event> {
    try {
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new Error('Invalid event ID');
      }

      const event = await EventModel.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (!PlanningService.canEditEvent(event, user._id.toString(), user.role)) {
        throw new Error('Insufficient permissions to update this event');
      }

      // Check for conflicts if location or time is being changed
      if (updateData.location || updateData.startDate || updateData.endDate) {
        const conflictData = {
          startDate: updateData.startDate ? new Date(updateData.startDate) : event.startDate,
          endDate: updateData.endDate ? new Date(updateData.endDate) : event.endDate,
          location: updateData.location || event.location,
          excludeEventId: eventId
        };

        const conflicts = await this.checkConflicts(conflictData);
        if (conflicts.conflicts.length > 0) {
          throw new Error(`Room ${conflictData.location} is already booked during this time`);
        }
      }

      const updatedEvent = await EventModel.findByIdAndUpdate(
        eventId,
        { 
          ...updateData, 
          updatedAt: new Date() 
        },
        { new: true }
      )
        .populate('createdBy', 'email profile.firstName profile.lastName')
        .populate('linkedCourse', 'title');

      return PlanningService.eventDocumentToEvent(updatedEvent!);
    } catch (error) {
      throw new Error(`Failed to update event: ${error}`);
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, user: User): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new Error('Invalid event ID');
      }

      const event = await EventModel.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (!PlanningService.canEditEvent(event, user._id.toString(), user.role)) {
        throw new Error('Insufficient permissions to delete this event');
      }

      await EventModel.findByIdAndDelete(eventId);
    } catch (error) {
      throw new Error(`Failed to delete event: ${error}`);
    }
  }

  /**
   * Check for scheduling conflicts
   */
  async checkConflicts(params: {
    startDate: Date;
    endDate: Date;
    location?: string;
    excludeEventId?: string;
  }): Promise<ConflictCheckResult> {
    try {
      const filter: any = {
        $and: [
          { startDate: { $lt: params.endDate } },
          { endDate: { $gt: params.startDate } }
        ]
      };

      if (params.location) {
        filter.location = params.location;
      }

      if (params.excludeEventId) {
        filter._id = { $ne: params.excludeEventId };
      }

      const conflictingEvents = await EventModel.find(filter)
        .select('title location startDate endDate');

      const conflicts = conflictingEvents.map(event => ({
        eventId: event._id.toString(),
        title: event.title,
        location: event.location || '',
        startDate: event.startDate,
        endDate: event.endDate
      }));

      return {
        success: true,
        conflicts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to check conflicts: ${error}`);
    }
  }

  /**
   * Export calendar in various formats
   */
  async exportCalendar(exportData: ExportCalendarType, user: User): Promise<ExportResult> {
    try {
      const events = await this.getEvents({
        startDate: exportData.startDate,
        endDate: exportData.endDate,
        type: exportData.eventType,
        userId: user._id.toString()
      });

      switch (exportData.format) {
        case 'ical':
          return this.generateICalFormat(events, exportData);
        case 'csv':
          return this.generateCSVFormat(events, exportData);
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      throw new Error(`Failed to export calendar: ${error}`);
    }
  }

  /**
   * Generate iCal format
   */
  private generateICalFormat(events: Event[], exportData: ExportCalendarType): ExportResult {
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Yggdrasil//Planning Service//EN',
      'CALSCALE:GREGORIAN'
    ];

    events.forEach(event => {
      icalContent.push('BEGIN:VEVENT');
      icalContent.push(`UID:${event._id}@yggdrasil.edu`);
      icalContent.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
      icalContent.push(`DTSTART:${new Date(event.startDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
      icalContent.push(`DTEND:${new Date(event.endDate).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
      icalContent.push(`SUMMARY:${event.title}`);
      if (event.description) {
        icalContent.push(`DESCRIPTION:${event.description}`);
      }
      if (event.location) {
        icalContent.push(`LOCATION:${event.location}`);
      }
      icalContent.push('END:VEVENT');
    });

    icalContent.push('END:VCALENDAR');

    return {
      content: icalContent.join('\r\n'),
      filename: `calendar_${exportData.startDate}_${exportData.endDate}.ics`,
      mimeType: 'text/calendar'
    };
  }

  /**
   * Generate CSV format
   */
  private generateCSVFormat(events: Event[], exportData: ExportCalendarType): ExportResult {
    const headers = ['Title', 'Start Date', 'End Date', 'Location', 'Type', 'Description'];
    let csvContent = headers.join(',') + '\n';

    events.forEach(event => {
      const row = [
        `"${event.title}"`,
        `"${new Date(event.startDate).toISOString()}"`,
        `"${new Date(event.endDate).toISOString()}"`,
        `"${event.location || ''}"`,
        `"${event.type}"`,
        `"${event.description || ''}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    return {
      content: csvContent,
      filename: `calendar_${exportData.startDate}_${exportData.endDate}.csv`,
      mimeType: 'text/csv'
    };
  }

  /**
   * Generate recurring event instances
   */
  async generateRecurringInstances(eventId: string, user: User): Promise<Event[]> {
    try {
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new Error('Invalid event ID');
      }

      const event = await EventModel.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (!PlanningService.canEditEvent(event, user._id.toString(), user.role)) {
        throw new Error('Insufficient permissions to generate instances for this event');
      }

      if (!event.recurrence) {
        throw new Error('Event is not set up for recurrence');
      }

      // Generate instances using RRule
      const rule = new RRule({
        freq: this.mapFrequency(event.recurrence.pattern),
        interval: event.recurrence.interval || 1,
        until: event.recurrence.endDate ? new Date(event.recurrence.endDate) : undefined,
        count: event.recurrence.count || undefined
      });

      const instances = rule.all();
      const createdInstances: Event[] = [];

      for (const instanceDate of instances) {
        const instanceData = {
          title: event.title,
          description: event.description,
          location: event.location,
          type: event.type,
          startDate: instanceDate.toISOString(),
          endDate: new Date(instanceDate.getTime() + (event.endDate.getTime() - event.startDate.getTime())).toISOString(),
          linkedCourse: event.linkedCourse?.toString(),
          parentEvent: event._id.toString()
        };

        const instance = await this.createEvent(instanceData, user);
        createdInstances.push(instance);
      }

      return createdInstances;
    } catch (error) {
      throw new Error(`Failed to generate recurring instances: ${error}`);
    }
  }

  /**
   * Map recurrence pattern to RRule frequency
   */
  private mapFrequency(pattern: string): number {
    const frequencyMap: { [key: string]: number } = {
      'daily': RRule.DAILY,
      'weekly': RRule.WEEKLY,
      'monthly': RRule.MONTHLY,
      'yearly': RRule.YEARLY
    };

    return frequencyMap[pattern] || RRule.WEEKLY;
  }
}