// Path: packages/api-services/planning-service/src/controllers/CalendarController.ts
import { Request, Response } from 'express';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}
import { CalendarService } from '../services/CalendarService';
import { CreateEventData, UpdateEventData, EventSearchFilters, CalendarViewType } from '../types/calendar';

export class CalendarController {
  /**
   * Create a new calendar event
   */
  static async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const eventData: CreateEventData = req.body;
      const organizerId = req.user?.id;

      if (!organizerId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - organizer ID required'
        });
        return;
      }

      const result = await CalendarService.createEvent(eventData, organizerId);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Event created successfully',
          data: result.event
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get event by ID
   */
  static async getEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user?.id;

      const result = await CalendarService.getEvent(eventId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.event
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Update event
   */
  static async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const updateData: UpdateEventData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CalendarService.updateEvent(eventId, updateData, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Event updated successfully',
          data: result.event
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Delete event
   */
  static async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CalendarService.deleteEvent(eventId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Event deleted successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Search events with filters
   */
  static async searchEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const filters: EventSearchFilters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        type: req.query.type as any,
        category: req.query.category as any,
        status: req.query.status as any,
        organizer: req.query.organizer as string,
        attendee: req.query.attendee as string,
        courseId: req.query.courseId as string,
        visibility: req.query.visibility as any,
        isRecurring: req.query.isRecurring ? req.query.isRecurring === 'true' : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any
      };

      const result = await CalendarService.searchEvents(filters, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.events,
          pagination: result.pagination
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get calendar view
   */
  static async getCalendarView(req: Request, res: Response): Promise<void> {
    try {
      const { viewType } = req.params;
      const startDate = new Date(req.query.startDate as string || Date.now());
      const userId = req.user?.id;

      const result = await CalendarService.getCalendarView(
        viewType as CalendarViewType,
        startDate,
        userId
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.view
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get upcoming events for user
   */
  static async getUpcomingEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CalendarService.getUpcomingEvents(userId, limit);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.events
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Join or leave an event
   */
  static async toggleEventAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - user ID required'
        });
        return;
      }

      const result = await CalendarService.toggleEventAttendance(eventId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.event
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get user availability
   */
  static async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.params.userId;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const duration = req.query.duration ? parseInt(req.query.duration as string) : 60;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User ID required'
        });
        return;
      }

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Valid start and end dates are required'
        });
        return;
      }

      const result = await CalendarService.getAvailability(userId, startDate, endDate, duration);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.slots
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Book a time slot
   */
  static async bookSlot(req: Request, res: Response): Promise<void> {
    try {
      const organizerId = req.user?.id;
      const bookingRequest = req.body;

      if (!organizerId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized - organizer ID required'
        });
        return;
      }

      // Validate booking request
      if (!bookingRequest.requestedSlot || !bookingRequest.requestedBy || !bookingRequest.purpose) {
        res.status(400).json({
          success: false,
          error: 'Invalid booking request. Required fields: requestedSlot, requestedBy, purpose'
        });
        return;
      }

      const result = await CalendarService.bookSlot(bookingRequest, organizerId);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Time slot booked successfully',
          data: result.event
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get calendar statistics
   */
  static async getCalendarStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      const result = await CalendarService.getCalendarStats(userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.stats
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get events for today
   */
  static async getTodayEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const filters: EventSearchFilters = {
        startDate: today,
        endDate: tomorrow,
        sortBy: 'startDate',
        sortOrder: 'asc'
      };

      const result = await CalendarService.searchEvents(filters, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.events
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get events for this week
   */
  static async getWeekEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const filters: EventSearchFilters = {
        startDate: weekStart,
        endDate: weekEnd,
        sortBy: 'startDate',
        sortOrder: 'asc'
      };

      const result = await CalendarService.searchEvents(filters, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.events
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}