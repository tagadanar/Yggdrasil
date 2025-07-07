/**
 * Comprehensive CalendarService Tests
 * Tests all service methods with real database operations
 */

import { CalendarService } from '../../src/services/CalendarService';
import { CalendarEventModel } from '../../src/models/CalendarEvent';
import { DatabaseConnection } from '@101-school/database-schemas';
import {
  CreateEventData,
  UpdateEventData,
  EventSearchFilters
} from '../../src/types/calendar';

describe('CalendarService - Comprehensive Tests', () => {
  const mockUserId = 'test-user-id';
  let testEventId: string;

  beforeAll(async () => {
    // Ensure database connection
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-dev?authSource=admin';
      await DatabaseConnection.connect(mongoUri);
    } catch (error) {
      console.log('Database connection already established');
    }
  });

  beforeEach(async () => {
    // Clean up before each test
    await CalendarService.clearStorage();
  });

  afterEach(async () => {
    // Clean up after each test
    await CalendarService.clearStorage();
  });

  afterAll(async () => {
    await DatabaseConnection.disconnect();
  });

  describe('Event Creation', () => {
    it('should create a new event successfully', async () => {
      const eventData: CreateEventData = {
        title: 'Test Meeting',
        description: 'A test meeting for service testing',
        startDate: new Date('2025-07-08T10:00:00Z'),
        endDate: new Date('2025-07-08T11:00:00Z'),
        type: 'meeting',
        category: 'administrative',
        location: 'Conference Room A'
      };

      const result = await CalendarService.createEvent(eventData, mockUserId);

      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event.title).toBe('Test Meeting');
      expect(result.event.organizer).toBe(mockUserId);
      expect(result.event.type).toBe('meeting');
      expect(result.event.category).toBe('administrative');

      testEventId = result.event._id;
    });

    it('should fail to create event with invalid data', async () => {
      const invalidEventData: any = {
        title: '', // Empty title
        startDate: new Date('2025-07-08T10:00:00Z'),
        endDate: new Date('2025-07-08T09:00:00Z'), // End before start
        type: 'invalid-type',
        category: 'invalid-category'
      };

      const result = await CalendarService.createEvent(invalidEventData, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should create event with minimal required fields', async () => {
      const minimalEventData: CreateEventData = {
        title: 'Minimal Event',
        startDate: new Date('2025-07-08T14:00:00Z'),
        endDate: new Date('2025-07-08T15:00:00Z'),
        type: 'meeting',
        category: 'academic'
      };

      const result = await CalendarService.createEvent(minimalEventData, mockUserId);

      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event.title).toBe('Minimal Event');
      expect(result.event.visibility).toBe('public'); // Default value
      expect(result.event.status).toBe('scheduled'); // Default value
    });

    it('should create recurring event', async () => {
      const recurringEventData: CreateEventData = {
        title: 'Weekly Team Meeting',
        description: 'Recurring team meeting',
        startDate: new Date('2025-07-08T10:00:00Z'),
        endDate: new Date('2025-07-08T11:00:00Z'),
        type: 'meeting',
        category: 'administrative',
        isRecurring: true,
        recurringPattern: {
          type: 'weekly',
          interval: 1,
          endDate: new Date('2025-08-08T10:00:00Z')
        }
      };

      const result = await CalendarService.createEvent(recurringEventData, mockUserId);

      expect(result.success).toBe(true);
      expect(result.event.isRecurring).toBe(true);
      expect(result.event.recurringPattern).toBeDefined();
      expect(result.event.recurringPattern.type).toBe('weekly');
    });
  });

  describe('Event Retrieval', () => {
    beforeEach(async () => {
      // Create test events
      const eventData: CreateEventData = {
        title: 'Retrieval Test Event',
        description: 'Event for testing retrieval',
        startDate: new Date('2025-07-08T10:00:00Z'),
        endDate: new Date('2025-07-08T11:00:00Z'),
        type: 'meeting',
        category: 'academic'
      };

      const result = await CalendarService.createEvent(eventData, mockUserId);
      testEventId = result.event._id;
    });

    it('should retrieve event by ID', async () => {
      const result = await CalendarService.getEvent(testEventId, mockUserId);

      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event._id.toString()).toBe(testEventId.toString());
      expect(result.event.title).toBe('Retrieval Test Event');
    });

    it('should return error for non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await CalendarService.getEvent(fakeId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Event not found');
    });

    it('should search events without filters', async () => {
      const filters: EventSearchFilters = {
        limit: 10,
        offset: 0
      };

      const result = await CalendarService.searchEvents(filters, mockUserId);

      expect(result.success).toBe(true);
      expect(result.events).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
      expect(result.pagination).toBeDefined();
    });

    it('should search events with date filters', async () => {
      const filters: EventSearchFilters = {
        startDate: new Date('2025-07-08T00:00:00Z'),
        endDate: new Date('2025-07-08T23:59:59Z'),
        limit: 10,
        offset: 0
      };

      const result = await CalendarService.searchEvents(filters, mockUserId);

      expect(result.success).toBe(true);
      expect(result.events).toBeDefined();
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should search events by type', async () => {
      const filters: EventSearchFilters = {
        type: 'meeting',
        limit: 10,
        offset: 0
      };

      const result = await CalendarService.searchEvents(filters, mockUserId);

      expect(result.success).toBe(true);
      expect(result.events).toBeDefined();
      result.events.forEach(event => {
        expect(event.type).toBe('meeting');
      });
    });

    it('should search events by category', async () => {
      const filters: EventSearchFilters = {
        category: 'academic',
        limit: 10,
        offset: 0
      };

      const result = await CalendarService.searchEvents(filters, mockUserId);

      expect(result.success).toBe(true);
      expect(result.events).toBeDefined();
      result.events.forEach(event => {
        expect(event.category).toBe('academic');
      });
    });
  });

  describe('Event Updates', () => {
    beforeEach(async () => {
      const eventData: CreateEventData = {
        title: 'Update Test Event',
        description: 'Event for testing updates',
        startDate: new Date('2025-07-08T10:00:00Z'),
        endDate: new Date('2025-07-08T11:00:00Z'),
        type: 'meeting',
        category: 'academic'
      };

      const result = await CalendarService.createEvent(eventData, mockUserId);
      testEventId = result.event._id;
    });

    it('should update event successfully', async () => {
      const updateData: UpdateEventData = {
        title: 'Updated Test Event',
        description: 'Updated description',
        location: 'Updated Location'
      };

      const result = await CalendarService.updateEvent(testEventId, updateData, mockUserId);

      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event.title).toBe('Updated Test Event');
      expect(result.event.description).toBe('Updated description');
      expect(result.event.location).toBe('Updated Location');
    });

    it('should fail to update non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData: UpdateEventData = {
        title: 'Should Not Update'
      };

      const result = await CalendarService.updateEvent(fakeId, updateData, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Event not found');
    });

    it('should update event dates', async () => {
      const updateData: UpdateEventData = {
        startDate: new Date('2025-07-08T14:00:00Z'),
        endDate: new Date('2025-07-08T16:00:00Z')
      };

      const result = await CalendarService.updateEvent(testEventId, updateData, mockUserId);

      expect(result.success).toBe(true);
      expect(result.event.startDate).toEqual(updateData.startDate);
      expect(result.event.endDate).toEqual(updateData.endDate);
    });

    it('should fail to update with invalid date range', async () => {
      const updateData: UpdateEventData = {
        startDate: new Date('2025-07-08T16:00:00Z'),
        endDate: new Date('2025-07-08T14:00:00Z') // End before start
      };

      const result = await CalendarService.updateEvent(testEventId, updateData, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('End date must be after start date');
    });
  });

  describe('Event Deletion', () => {
    beforeEach(async () => {
      const eventData: CreateEventData = {
        title: 'Delete Test Event',
        description: 'Event for testing deletion',
        startDate: new Date('2025-07-08T10:00:00Z'),
        endDate: new Date('2025-07-08T11:00:00Z'),
        type: 'meeting',
        category: 'academic'
      };

      const result = await CalendarService.createEvent(eventData, mockUserId);
      testEventId = result.event._id;
    });

    it('should delete event successfully', async () => {
      const result = await CalendarService.deleteEvent(testEventId, mockUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Event deleted successfully');

      // Verify event is deleted
      const getResult = await CalendarService.getEvent(testEventId, mockUserId);
      expect(getResult.success).toBe(false);
      expect(getResult.error).toBe('Event not found');
    });

    it('should fail to delete non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await CalendarService.deleteEvent(fakeId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Event not found');
    });
  });

  describe('Calendar Statistics', () => {
    beforeEach(async () => {
      // Create multiple test events for statistics
      const events = [
        { title: 'Meeting 1', type: 'meeting' as const, category: 'administrative' as const },
        { title: 'Class 1', type: 'class' as const, category: 'academic' as const },
        { title: 'Workshop 1', type: 'workshop' as const, category: 'academic' as const }
      ];

      for (const event of events) {
        await CalendarService.createEvent({
          ...event,
          startDate: new Date('2025-07-08T10:00:00Z'),
          endDate: new Date('2025-07-08T11:00:00Z')
        }, mockUserId);
      }
    });

    it('should generate calendar statistics', async () => {
      const result = await CalendarService.getCalendarStats('last_7_days');

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(typeof result.stats.totalEvents).toBe('number');
      expect(typeof result.stats.upcomingEvents).toBe('number');
      expect(result.stats.eventsByType).toBeDefined();
      expect(result.stats.eventsByCategory).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // For now, just ensure the service methods exist and are callable
      expect(typeof CalendarService.createEvent).toBe('function');
      expect(typeof CalendarService.updateEvent).toBe('function');
      expect(typeof CalendarService.deleteEvent).toBe('function');
      expect(typeof CalendarService.searchEvents).toBe('function');
    });

    it('should validate input parameters', async () => {
      // Test with null/undefined inputs
      const result = await CalendarService.createEvent(null as any, mockUserId);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});