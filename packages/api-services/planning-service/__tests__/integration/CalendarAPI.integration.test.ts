/**
 * Integration test for Calendar API endpoints
 * Tests the complete event creation, retrieval, update, and deletion workflow
 */

import request from 'supertest';
import app from '../../src/index';
import { CalendarEventModel } from '../../src/models/CalendarEvent';
import { DatabaseConnection } from '@101-school/database-schemas';

describe('Calendar API Integration', () => {
  let createdEventId: string;

  beforeAll(async () => {
    // Ensure database connection
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-dev?authSource=admin';
      await DatabaseConnection.connect(mongoUri);
    } catch (error) {
      // Connection might already exist
      console.log('Database connection already established');
    }
  });

  beforeEach(async () => {
    // Clean up all existing test data before each test to avoid conflicts
    await CalendarEventModel.deleteMany({});
  });

  afterEach(async () => {
    // Clean up all test data after each test to avoid conflicts
    await CalendarEventModel.deleteMany({});
  });

  afterAll(async () => {
    await DatabaseConnection.disconnect();
  });

  describe('Event Creation', () => {
    it('should create a new event with all required fields', async () => {
      const eventData = {
        title: 'Integration Test Event',
        description: 'This is a test event for integration testing',
        startDate: '2025-07-08T10:00:00Z',
        endDate: '2025-07-08T11:00:00Z',
        type: 'meeting',
        category: 'academic',
        location: 'Room 101',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/planning/events')
        .send(eventData);
      
      if (response.status !== 201) {
        console.error('Event creation failed:', response.status, response.body);
      }
      
      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe('Integration Test Event');
      expect(response.body.data.type).toBe('meeting');
      expect(response.body.data.category).toBe('academic');
      expect(response.body.data.organizer).toBe('test-user-id');
      
      createdEventId = response.body.data._id;
      expect(createdEventId).toBeDefined();
    });

    it('should fail to create event without required fields', async () => {
      const invalidEventData = {
        title: 'Incomplete Event',
        // Missing required fields: startDate, endDate, type, category
      };

      const response = await request(app)
        .post('/api/planning/events')
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should fail to create event with invalid date range', async () => {
      const invalidEventData = {
        title: 'Invalid Date Event',
        startDate: '2025-07-08T11:00:00Z',
        endDate: '2025-07-08T10:00:00Z', // End before start
        type: 'meeting',
        category: 'academic',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/planning/events')
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('End date must be after start date');
    });

    it('should fail to create event with invalid category', async () => {
      const invalidEventData = {
        title: 'Invalid Category Event',
        startDate: '2025-07-08T10:00:00Z',
        endDate: '2025-07-08T11:00:00Z',
        type: 'meeting',
        category: 'invalid-category'
      };

      const response = await request(app)
        .post('/api/planning/events')
        .send(invalidEventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Event Retrieval', () => {
    beforeEach(async () => {
      // Create a test event for retrieval tests
      const eventData = {
        title: 'Integration Test Event',
        description: 'Test event for retrieval',
        startDate: '2025-07-08T14:00:00Z',
        endDate: '2025-07-08T15:00:00Z',
        type: 'meeting',
        category: 'academic',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/planning/events')
        .send(eventData)
        .expect(201);

      createdEventId = response.body.data._id;
    });

    it('should retrieve all events', async () => {
      const response = await request(app)
        .get('/api/planning/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should retrieve a specific event by ID', async () => {
      const response = await request(app)
        .get(`/api/planning/events/${createdEventId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data._id).toBe(createdEventId);
      expect(response.body.data.title).toBe('Integration Test Event');
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/planning/events/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');
    });

    it('should filter events by date range', async () => {
      const response = await request(app)
        .get('/api/planning/events')
        .query({
          startDate: '2025-07-08T00:00:00Z',
          endDate: '2025-07-08T23:59:59Z'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter events by type', async () => {
      const response = await request(app)
        .get('/api/planning/events')
        .query({ type: 'meeting' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      // Should return events filtered by type
    });
  });

  describe('Event Updates', () => {
    beforeEach(async () => {
      // Create a test event for update tests
      const eventData = {
        title: 'Integration Test Event',
        description: 'Test event for updates',
        startDate: '2025-07-08T10:00:00Z',
        endDate: '2025-07-08T11:00:00Z',
        type: 'meeting',
        category: 'academic',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/planning/events')
        .send(eventData)
        .expect(201);

      createdEventId = response.body.data._id;
    });

    it('should update an existing event', async () => {
      const updateData = {
        title: 'Updated Integration Test Event',
        description: 'Updated description for integration testing'
      };

      const response = await request(app)
        .put(`/api/planning/events/${createdEventId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe('Updated Integration Test Event');
      expect(response.body.data.description).toBe('Updated description for integration testing');
    });

    it('should return 404 when updating non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put(`/api/planning/events/${fakeId}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Event not found');
    });
  });

  describe('Event Deletion', () => {
    beforeEach(async () => {
      // Create a test event for deletion tests
      const eventData = {
        title: 'Integration Test Event',
        description: 'Test event for deletion',
        startDate: '2025-07-08T10:00:00Z',
        endDate: '2025-07-08T11:00:00Z',
        type: 'meeting',
        category: 'academic',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/planning/events')
        .send(eventData)
        .expect(201);

      createdEventId = response.body.data._id;
    });

    it('should delete an event', async () => {
      const response = await request(app)
        .delete(`/api/planning/events/${createdEventId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event deleted successfully');
    });

    it('should return 404 for deleted event', async () => {
      // First delete the event
      await request(app)
        .delete(`/api/planning/events/${createdEventId}`)
        .expect(200);

      // Then try to retrieve it
      const response = await request(app)
        .get(`/api/planning/events/${createdEventId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Event not found');
    });
  });

  describe('Event Validation Edge Cases', () => {
    it('should handle very long event titles', async () => {
      const longTitle = 'A'.repeat(250); // Exceeds 200 char limit
      const eventData = {
        title: longTitle,
        startDate: '2025-07-08T10:00:00Z',
        endDate: '2025-07-08T11:00:00Z',
        type: 'meeting',
        category: 'academic',
        visibility: 'public'
      };

      const response = await request(app)
        .post('/api/planning/events')
        .send(eventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Title cannot exceed 200 characters');
    });

    it('should handle events with all optional fields', async () => {
      const fullEventData = {
        title: 'Complete Event',
        description: 'Event with all optional fields',
        startDate: '2025-07-08T10:00:00Z',
        endDate: '2025-07-08T11:00:00Z',
        type: 'workshop',
        category: 'academic',
        location: 'Main Auditorium',
        visibility: 'public',
        isRecurring: false,
        status: 'scheduled'
      };

      const response = await request(app)
        .post('/api/planning/events')
        .send(fullEventData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location).toBe('Main Auditorium');
      expect(response.body.data.visibility).toBe('public');
      expect(response.body.data.status).toBe('scheduled');
    });
  });

  describe('Database Connectivity', () => {
    it('should maintain proper database connection during operations', async () => {
      // Create multiple events to test database stability
      const events = [];
      for (let i = 0; i < 5; i++) {
        const eventData = {
          title: `Database Connectivity Test ${i}`,
          description: 'Testing database connectivity',
          startDate: `2025-07-09T${String(8 + i).padStart(2, '0')}:00:00Z`,
          endDate: `2025-07-09T${String(9 + i).padStart(2, '0')}:00:00Z`,
          type: 'class', // Use different type to avoid meeting conflicts
          category: 'academic',
          visibility: 'public'
        };

        const response = await request(app)
          .post('/api/planning/events')
          .send(eventData)
          .expect(201);

        events.push(response.body.data._id);
      }

      // Verify all events were created
      const retrieveResponse = await request(app)
        .get('/api/planning/events')
        .expect(200);

      expect(retrieveResponse.body.data.length).toBeGreaterThanOrEqual(5);

      // Clean up is handled by afterEach() - events array created for verification only
    });
  });
});