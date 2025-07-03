// Path: packages/api-services/planning-service/src/services/SimplifiedCalendarService.ts
import {
  CreateEventData,
  UpdateEventData,
  EventSearchFilters,
  CalendarView,
  CalendarViewType,
  CalendarStats,
  AvailabilitySlot,
  BookingRequest,
  TimeSlot,
  CalendarEvent
} from '../types/calendar';

export interface EventResult {
  success: boolean;
  event?: any;
  events?: any[];
  error?: string;
  message?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CalendarViewResult {
  success: boolean;
  view?: CalendarView;
  error?: string;
}

export interface AvailabilityResult {
  success: boolean;
  slots?: AvailabilitySlot[];
  error?: string;
}

export interface StatsResult {
  success: boolean;
  stats?: CalendarStats;
  error?: string;
}

// In-memory storage for demo purposes
let eventStorage: any[] = [];
let eventIdCounter = 1;

export class SimplifiedCalendarService {
  /**
   * Create a new calendar event
   */
  static async createEvent(eventData: CreateEventData, organizerId: string): Promise<EventResult> {
    try {
      // Validate date range
      if (eventData.endDate <= eventData.startDate) {
        return { success: false, error: 'End date must be after start date' };
      }

      // Check for conflicts
      const conflicts = eventStorage.filter(event => 
        event.organizer === organizerId &&
        event.isActive &&
        event.status !== 'cancelled' &&
        ((eventData.startDate < event.endDate && eventData.endDate > event.startDate))
      );

      if (conflicts.length > 0 && eventData.type === 'meeting') {
        return { 
          success: false, 
          error: 'Scheduling conflict detected. Please choose a different time.' 
        };
      }

      // Create the event
      const event = {
        _id: `event_${eventIdCounter++}`,
        ...eventData,
        organizer: organizerId,
        attendees: eventData.attendees || [],
        status: 'scheduled',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      eventStorage.push(event);

      return { success: true, event };
    } catch (error: any) {
      return { success: false, error: `Failed to create event: ${error.message}` };
    }
  }

  /**
   * Get event by ID
   */
  static async getEvent(eventId: string, userId?: string): Promise<EventResult> {
    try {
      const event = eventStorage.find(e => e._id === eventId && e.isActive);

      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      // Check permissions
      if (userId && !this.canUserViewEvent(event, userId)) {
        return { success: false, error: 'Insufficient permissions to view this event' };
      }

      return { success: true, event };
    } catch (error: any) {
      return { success: false, error: `Failed to get event: ${error.message}` };
    }
  }

  /**
   * Update event
   */
  static async updateEvent(eventId: string, updateData: UpdateEventData, userId: string): Promise<EventResult> {
    try {
      const eventIndex = eventStorage.findIndex(e => e._id === eventId && e.isActive);
      if (eventIndex === -1) {
        return { success: false, error: 'Event not found' };
      }

      const event = eventStorage[eventIndex];

      // Check permissions
      if (!this.canUserEditEvent(event, userId)) {
        return { success: false, error: 'Insufficient permissions to edit this event' };
      }

      // Validate date range if dates are being updated
      if (updateData.startDate && updateData.endDate) {
        if (updateData.endDate <= updateData.startDate) {
          return { success: false, error: 'End date must be after start date' };
        }
      }

      // Update the event
      const updatedEvent = {
        ...event,
        ...updateData,
        updatedAt: new Date()
      };

      eventStorage[eventIndex] = updatedEvent;

      return { success: true, event: updatedEvent };
    } catch (error: any) {
      return { success: false, error: `Failed to update event: ${error.message}` };
    }
  }

  /**
   * Delete event
   */
  static async deleteEvent(eventId: string, userId: string): Promise<EventResult> {
    try {
      const eventIndex = eventStorage.findIndex(e => e._id === eventId && e.isActive);
      if (eventIndex === -1) {
        return { success: false, error: 'Event not found' };
      }

      const event = eventStorage[eventIndex];

      // Check permissions
      if (!this.canUserEditEvent(event, userId)) {
        return { success: false, error: 'Insufficient permissions to delete this event' };
      }

      // Soft delete
      eventStorage[eventIndex] = {
        ...event,
        isActive: false,
        status: 'cancelled',
        updatedAt: new Date()
      };

      return { success: true };
    } catch (error: any) {
      return { success: false, error: `Failed to delete event: ${error.message}` };
    }
  }

  /**
   * Search events with filters
   */
  static async searchEvents(filters: EventSearchFilters, userId?: string): Promise<EventResult> {
    try {
      let filteredEvents = eventStorage.filter(event => event.isActive);

      // Apply filters
      if (filters.startDate && filters.endDate) {
        filteredEvents = filteredEvents.filter(event => 
          (event.startDate >= filters.startDate! && event.startDate <= filters.endDate!) ||
          (event.endDate >= filters.startDate! && event.endDate <= filters.endDate!) ||
          (event.startDate <= filters.startDate! && event.endDate >= filters.endDate!)
        );
      }

      if (filters.type) {
        filteredEvents = filteredEvents.filter(event => event.type === filters.type);
      }

      if (filters.category) {
        filteredEvents = filteredEvents.filter(event => event.category === filters.category);
      }

      if (filters.status) {
        filteredEvents = filteredEvents.filter(event => event.status === filters.status);
      }

      if (filters.organizer) {
        filteredEvents = filteredEvents.filter(event => event.organizer === filters.organizer);
      }

      if (filters.courseId) {
        filteredEvents = filteredEvents.filter(event => event.courseId === filters.courseId);
      }

      // Add user-specific filters
      if (userId) {
        if (filters.attendee) {
          filteredEvents = filteredEvents.filter(event => 
            event.attendees.includes(filters.attendee)
          );
        }

        // Filter by visibility permissions
        filteredEvents = filteredEvents.filter(event => 
          this.canUserViewEvent(event, userId)
        );
      }

      // Sorting
      const sortField = filters.sortBy || 'startDate';
      const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

      filteredEvents.sort((a, b) => {
        if (a[sortField] < b[sortField]) return -sortOrder;
        if (a[sortField] > b[sortField]) return sortOrder;
        return 0;
      });

      // Pagination
      const limit = Math.min(filters.limit || 50, 100);
      const offset = filters.offset || 0;
      const total = filteredEvents.length;
      const paginatedEvents = filteredEvents.slice(offset, offset + limit);

      return {
        success: true,
        events: paginatedEvents,
        pagination: {
          limit,
          offset,
          total,
          hasMore: (offset + limit) < total
        }
      };
    } catch (error: any) {
      return { success: false, error: `Failed to search events: ${error.message}` };
    }
  }

  /**
   * Get calendar view
   */
  static async getCalendarView(
    viewType: CalendarViewType,
    startDate: Date,
    userId?: string
  ): Promise<CalendarViewResult> {
    try {
      let endDate: Date;

      // Calculate end date based on view type
      switch (viewType) {
        case 'day':
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
          break;
        case 'week':
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'month':
          endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'year':
          endDate = new Date(startDate);
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7);
      }

      // Get events for the time period
      const result = await this.searchEvents({
        startDate,
        endDate,
        sortBy: 'startDate',
        sortOrder: 'asc'
      }, userId);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const view: CalendarView = {
        type: viewType,
        startDate,
        endDate,
        events: result.events || []
      };

      return { success: true, view };
    } catch (error: any) {
      return { success: false, error: `Failed to get calendar view: ${error.message}` };
    }
  }

  /**
   * Get user's upcoming events
   */
  static async getUpcomingEvents(userId: string, limit: number = 10): Promise<EventResult> {
    try {
      const now = new Date();
      const events = eventStorage
        .filter(event => 
          event.isActive &&
          event.startDate >= now &&
          event.status !== 'cancelled' &&
          (event.organizer === userId || 
           event.attendees.includes(userId) || 
           event.visibility === 'public')
        )
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
        .slice(0, limit);

      return { success: true, events };
    } catch (error: any) {
      return { success: false, error: `Failed to get upcoming events: ${error.message}` };
    }
  }

  /**
   * Toggle event attendance
   */
  static async toggleEventAttendance(eventId: string, userId: string): Promise<EventResult> {
    try {
      const eventIndex = eventStorage.findIndex(e => e._id === eventId && e.isActive);
      if (eventIndex === -1) {
        return { success: false, error: 'Event not found' };
      }

      const event = eventStorage[eventIndex];

      if (!this.canUserViewEvent(event, userId)) {
        return { success: false, error: 'Insufficient permissions' };
      }

      let action: string;
      if (event.attendees.includes(userId)) {
        event.attendees = event.attendees.filter((id: string) => id !== userId);
        action = 'left';
      } else {
        event.attendees.push(userId);
        action = 'joined';
      }

      event.updatedAt = new Date();
      eventStorage[eventIndex] = event;

      return { 
        success: true, 
        event, 
        message: `Successfully ${action} the event` 
      };
    } catch (error: any) {
      return { success: false, error: `Failed to toggle attendance: ${error.message}` };
    }
  }

  /**
   * Get calendar statistics
   */
  static async getCalendarStats(userId?: string): Promise<StatsResult> {
    try {
      let events = eventStorage.filter(e => e.isActive);
      
      if (userId) {
        events = events.filter(event => 
          event.organizer === userId || event.attendees.includes(userId)
        );
      }

      const now = new Date();
      const totalEvents = events.length;
      const upcomingEvents = events.filter(e => e.startDate > now).length;
      const completedEvents = events.filter(e => e.status === 'completed').length;

      // Calculate type statistics
      const eventsByType = events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate category statistics
      const eventsByCategory = events.reduce((acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const attendanceRate = totalEvents > 0 
        ? (completedEvents / totalEvents) * 100 
        : 0;

      const stats: CalendarStats = {
        totalEvents,
        eventsByType,
        eventsByCategory,
        attendanceRate,
        busyHours: 0,
        freeHours: 0,
        mostActiveDay: 'Monday',
        upcomingEvents,
        overdueEvents: 0
      };

      return { success: true, stats };
    } catch (error: any) {
      return { success: false, error: `Failed to get calendar stats: ${error.message}` };
    }
  }

  /**
   * Permission helper methods
   */
  private static canUserViewEvent(event: any, userId: string): boolean {
    if (event.visibility === 'public') return true;
    if (event.visibility === 'private' && event.organizer === userId) return true;
    if (event.attendees.includes(userId)) return true;
    return false;
  }

  private static canUserEditEvent(event: any, userId: string): boolean {
    return event.organizer === userId;
  }

  /**
   * Get availability slots (simplified implementation)
   */
  static async getAvailability(
    userId: string,
    startDate: Date,
    endDate: Date,
    duration: number = 60
  ): Promise<AvailabilityResult> {
    try {
      // Get user's events in the time range
      const userEvents = eventStorage.filter(event => 
        event.isActive &&
        (event.organizer === userId || event.attendees.includes(userId)) &&
        event.status !== 'cancelled' &&
        ((event.startDate < endDate && event.endDate > startDate))
      );

      // Generate time slots (simplified - every hour during business hours)
      const slots: AvailabilitySlot[] = [];
      const current = new Date(startDate);
      current.setHours(9, 0, 0, 0); // Start at 9 AM

      while (current < endDate) {
        const slotEnd = new Date(current.getTime() + (duration * 60 * 1000));
        
        // Check if slot conflicts with existing events
        const hasConflict = userEvents.some(event => 
          current < event.endDate && slotEnd > event.startDate
        );

        // Only add slots during business hours (9 AM - 5 PM)
        if (current.getHours() >= 9 && current.getHours() < 17) {
          slots.push({
            start: new Date(current),
            end: slotEnd,
            duration,
            isAvailable: !hasConflict
          });
        }

        current.setTime(current.getTime() + (duration * 60 * 1000));
      }

      return { success: true, slots };
    } catch (error: any) {
      return { success: false, error: `Failed to get availability: ${error.message}` };
    }
  }

  /**
   * Book a time slot
   */
  static async bookSlot(request: BookingRequest, organizerId: string): Promise<EventResult> {
    try {
      const { requestedSlot, requestedBy, purpose } = request;

      // Check if slot is available
      const conflicts = eventStorage.filter(event =>
        event.isActive &&
        event.status !== 'cancelled' &&
        (event.organizer === requestedBy || event.attendees.includes(requestedBy)) &&
        event.startDate < requestedSlot.end &&
        event.endDate > requestedSlot.start
      );

      if (conflicts.length > 0) {
        return { success: false, error: 'Time slot conflicts with existing events' };
      }

      // Create booking event
      const eventData: CreateEventData = {
        title: `Booking: ${purpose}`,
        description: `Booked by user ${requestedBy}`,
        startDate: requestedSlot.start,
        endDate: requestedSlot.end,
        type: 'meeting',
        category: 'personal',
        visibility: 'private',
        attendees: [requestedBy]
      };

      return await this.createEvent(eventData, organizerId);
    } catch (error: any) {
      return { success: false, error: `Failed to book slot: ${error.message}` };
    }
  }

  /**
   * Clear storage (for testing)
   */
  static clearStorage(): void {
    eventStorage = [];
    eventIdCounter = 1;
  }
}