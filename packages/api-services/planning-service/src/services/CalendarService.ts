// Path: packages/api-services/planning-service/src/services/CalendarService.ts
import { CalendarEventModel, ScheduleModel } from '../models';
import {
  CreateEventData,
  UpdateEventData,
  EventSearchFilters,
  CalendarView,
  CalendarViewType,
  CalendarStats,
  AvailabilitySlot,
  BookingRequest,
  TimeSlot
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

export class CalendarService {
  /**
   * Create a new calendar event
   */
  static async createEvent(eventData: CreateEventData, organizerId: string): Promise<EventResult> {
    try {
      // Validate date range
      if (eventData.endDate <= eventData.startDate) {
        return { success: false, error: 'End date must be after start date' };
      }

      // Check for conflicts if specified
      const conflicts = await CalendarEventModel.find({
        organizer: organizerId,
        isActive: true,
        status: { $ne: 'cancelled' },
        $or: [
          {
            startDate: { $lt: eventData.endDate },
            endDate: { $gt: eventData.startDate }
          }
        ]
      });

      if (conflicts.length > 0 && eventData.type === 'meeting') {
        return { 
          success: false, 
          error: 'Scheduling conflict detected. Please choose a different time.' 
        };
      }

      // Create the event
      const event = await CalendarEventModel.create({
        ...eventData,
        organizer: organizerId,
        attendees: eventData.attendees || []
      });

      // Generate recurring events if needed
      if (eventData.isRecurring && eventData.recurringPattern) {
        const endDate = eventData.recurringPattern.endDate || 
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        
        const recurrences = event.generateRecurrences(endDate);
        
        // Save all recurring events (except the first one which is already saved)
        if (recurrences.length > 1) {
          await CalendarEventModel.insertMany(recurrences.slice(1));
        }
      }

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
      const event = await CalendarEventModel.findOne({ _id: eventId, isActive: true })
        .populate('organizer', 'profile.firstName profile.lastName email')
        .populate('attendees', 'profile.firstName profile.lastName email');

      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      // Check permissions
      if (userId && !event.canUserView(userId)) {
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
      const event = await CalendarEventModel.findById(eventId);
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      // Check permissions
      if (!event.canUserEdit(userId)) {
        return { success: false, error: 'Insufficient permissions to edit this event' };
      }

      // Validate date range if dates are being updated
      if (updateData.startDate && updateData.endDate) {
        if (updateData.endDate <= updateData.startDate) {
          return { success: false, error: 'End date must be after start date' };
        }
      }

      // Update the event
      const updatedEvent = await CalendarEventModel.findByIdAndUpdate(
        eventId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

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
      const event = await CalendarEventModel.findById(eventId);
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      // Check permissions
      if (!event.canUserEdit(userId)) {
        return { success: false, error: 'Insufficient permissions to delete this event' };
      }

      // Soft delete
      await CalendarEventModel.findByIdAndUpdate(eventId, {
        $set: { isActive: false, status: 'cancelled' }
      });

      return { success: true, message: 'Event deleted successfully' };
    } catch (error: any) {
      return { success: false, error: `Failed to delete event: ${error.message}` };
    }
  }

  /**
   * Search events with filters
   */
  static async searchEvents(filters: EventSearchFilters, userId?: string): Promise<EventResult> {
    try {
      const query: any = { isActive: true };

      // Apply filters
      if (filters.startDate && filters.endDate) {
        query.$or = [
          {
            startDate: { $gte: filters.startDate, $lte: filters.endDate }
          },
          {
            endDate: { $gte: filters.startDate, $lte: filters.endDate }
          },
          {
            startDate: { $lte: filters.startDate },
            endDate: { $gte: filters.endDate }
          }
        ];
      }

      if (filters.type) query.type = filters.type;
      if (filters.category) query.category = filters.category;
      if (filters.status) query.status = filters.status;
      if (filters.organizer) query.organizer = filters.organizer;
      if (filters.courseId) query.courseId = filters.courseId;
      if (filters.visibility) query.visibility = filters.visibility;
      if (filters.isRecurring !== undefined) query.isRecurring = filters.isRecurring;

      // Add user-specific filters
      if (userId) {
        if (filters.attendee) {
          query.attendees = filters.attendee;
        }

        // Filter by visibility permissions
        query.$or = [
          { visibility: 'public' },
          { organizer: userId },
          { attendees: userId }
        ];
      }

      // Pagination
      const limit = Math.min(filters.limit || 50, 100);
      const offset = filters.offset || 0;

      // Sorting
      let sortField = 'startDate';
      if (filters.sortBy) {
        sortField = filters.sortBy;
      }
      const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;

      const events = await CalendarEventModel.find(query)
        .populate('organizer', 'profile.firstName profile.lastName email')
        .populate('attendees', 'profile.firstName profile.lastName email')
        .sort({ [sortField]: sortOrder })
        .limit(limit)
        .skip(offset);

      const total = await CalendarEventModel.countDocuments(query);

      return {
        success: true,
        events,
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
   * Get calendar view (day, week, month, etc.)
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

      // Generate time slots for detailed views
      const timeSlots = viewType === 'day' || viewType === 'week' 
        ? this.generateTimeSlots(startDate, endDate, result.events || [])
        : undefined;

      const view: CalendarView = {
        type: viewType,
        startDate,
        endDate,
        events: result.events || [],
        timeSlots
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
      const events = await CalendarEventModel.findUpcoming(userId, limit);
      return { success: true, events };
    } catch (error: any) {
      return { success: false, error: `Failed to get upcoming events: ${error.message}` };
    }
  }

  /**
   * Join/leave event
   */
  static async toggleEventAttendance(eventId: string, userId: string): Promise<EventResult> {
    try {
      const event = await CalendarEventModel.findById(eventId);
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      if (!event.canUserView(userId)) {
        return { success: false, error: 'Insufficient permissions' };
      }

      let action: string;
      if (event.isUserAttending(userId)) {
        await event.removeAttendee(userId);
        action = 'left';
      } else {
        await event.addAttendee(userId);
        action = 'joined';
      }

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
   * Get availability slots for scheduling
   */
  static async getAvailability(
    userId: string,
    startDate: Date,
    endDate: Date,
    duration: number = 60
  ): Promise<AvailabilityResult> {
    try {
      // Get user's schedule
      const schedules = await ScheduleModel.findByUser(userId);
      if (schedules.length === 0) {
        return { success: false, error: 'No schedule found for user' };
      }

      const primarySchedule = schedules[0]; // Use first schedule

      // Get available slots from schedule
      const availableSlots = primarySchedule.getAvailableSlots(startDate, endDate, duration);

      // Filter out slots that conflict with existing events
      const userEvents = await CalendarEventModel.findByUser(userId);
      
      const filteredSlots = availableSlots.filter((slot: AvailabilitySlot) => {
        return !userEvents.some((event: any) => 
          event.hasConflict && event.hasConflict(slot.start, slot.end) && 
          event.status !== 'cancelled'
        );
      });

      return { success: true, slots: filteredSlots };
    } catch (error: any) {
      return { success: false, error: `Failed to get availability: ${error.message}` };
    }
  }

  /**
   * Get calendar statistics
   */
  static async getCalendarStats(userId?: string): Promise<StatsResult> {
    try {
      const query: any = { isActive: true };
      
      if (userId) {
        query.$or = [
          { organizer: userId },
          { attendees: userId }
        ];
      }

      const [statsAgg, typeStats, categoryStats] = await Promise.all([
        CalendarEventModel.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              totalEvents: { $sum: 1 },
              upcomingEvents: {
                $sum: {
                  $cond: [
                    { $gt: ['$startDate', new Date()] },
                    1,
                    0
                  ]
                }
              },
              completedEvents: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'completed'] },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]),
        CalendarEventModel.aggregate([
          { $match: query },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        CalendarEventModel.aggregate([
          { $match: query },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ])
      ]);

      const baseStats = statsAgg[0] || { 
        totalEvents: 0, 
        upcomingEvents: 0, 
        completedEvents: 0 
      };

      // Calculate attendance rate (simplified)
      const attendanceRate = baseStats.totalEvents > 0 
        ? (baseStats.completedEvents / baseStats.totalEvents) * 100 
        : 0;

      // Get most active day (simplified - would need more complex query in production)
      const mostActiveDay = 'Monday'; // Placeholder

      const stats: CalendarStats = {
        totalEvents: baseStats.totalEvents,
        eventsByType: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        eventsByCategory: categoryStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        attendanceRate,
        busyHours: 0, // Would calculate from actual schedule
        freeHours: 0, // Would calculate from actual schedule
        mostActiveDay,
        upcomingEvents: baseStats.upcomingEvents,
        overdueEvents: 0 // Would calculate overdue events
      };

      return { success: true, stats };
    } catch (error: any) {
      return { success: false, error: `Failed to get calendar stats: ${error.message}` };
    }
  }

  /**
   * Generate time slots for calendar views
   */
  private static generateTimeSlots(startDate: Date, endDate: Date, events: any[]): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const current = new Date(startDate);
    const slotDuration = 30; // 30 minutes

    while (current < endDate) {
      const slotEnd = new Date(current.getTime() + (slotDuration * 60 * 1000));
      
      // Check for conflicts
      const conflicts = events.filter((event: any) => 
        event.hasConflict && event.hasConflict(current, slotEnd)
      );

      slots.push({
        start: new Date(current),
        end: slotEnd,
        isAvailable: conflicts.length === 0,
        conflicts
      });

      current.setMinutes(current.getMinutes() + slotDuration);
    }

    return slots;
  }

  /**
   * Book a time slot
   */
  static async bookSlot(request: BookingRequest, organizerId: string): Promise<EventResult> {
    try {
      const { requestedSlot, requestedBy, purpose, priority } = request;

      // Check if slot is available
      const conflicts = await CalendarEventModel.find({
        isActive: true,
        status: { $ne: 'cancelled' },
        $or: [
          { organizer: requestedBy },
          { attendees: requestedBy }
        ],
        startDate: { $lt: requestedSlot.end },
        endDate: { $gt: requestedSlot.start }
      });

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
   * Clear all storage (for testing)
   */
  static async clearStorage(): Promise<void> {
    await CalendarEventModel.deleteMany({});
  }
}