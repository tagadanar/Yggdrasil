/**
 * Planning Service Functional Tests
 * 
 * Tests the complete calendar and event management functionality including:
 * - Event creation and management (CRUD operations)
 * - Event types and categories (class, exam, meeting, workshop, etc.)
 * - Event scheduling and time management
 * - Event attendance and RSVP functionality
 * - Calendar views (day, week, month, agenda)
 * - Recurring events and patterns
 * - Event permissions and visibility
 * - Course-related event integration
 * - Conflict detection and resolution
 * - Availability and booking system
 * - Role-based access control
 * - Input validation and security
 * - Performance and scalability
 */

import { ApiClient } from '../../../utils/ApiClient';
import { AuthHelper, TestUser } from '../../../utils/AuthHelper';
import { TestDataFactory } from '../../../utils/TestDataFactory';
import { databaseHelper } from '../../../utils/DatabaseHelper';
import { testEnvironment } from '../../../config/environment';

describe('Planning Service - Functional Tests', () => {
  let authHelper: AuthHelper;
  let planningClient: ApiClient;
  let adminClient: ApiClient;
  let teacherClient: ApiClient;
  let studentClient: ApiClient;
  let staffClient: ApiClient;
  let testUsers: {
    student: TestUser;
    teacher: TestUser;
    admin: TestUser;
    staff: TestUser;
  };

  beforeAll(async () => {
    authHelper = new AuthHelper();
    
    // Create test users for different scenarios
    testUsers = {
      student: await authHelper.createTestUser('student'),
      teacher: await authHelper.createTestUser('teacher'),
      admin: await authHelper.createTestUser('admin'),
      staff: await authHelper.createTestUser('staff'),
    };

    // Create authenticated clients
    planningClient = await authHelper.createAuthenticatedClient('planning', testUsers.teacher);
    adminClient = await authHelper.createAuthenticatedClient('planning', testUsers.admin);
    teacherClient = await authHelper.createAuthenticatedClient('planning', testUsers.teacher);
    studentClient = await authHelper.createAuthenticatedClient('planning', testUsers.student);
    staffClient = await authHelper.createAuthenticatedClient('planning', testUsers.staff);
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  beforeEach(async () => {
    // Clean up test data before each test for isolation
    await databaseHelper.cleanupTestData();
  });

  describe('Event Management - CRUD Operations', () => {
    describe('POST /api/planning/events', () => {
      it('should create a new event with valid data', async () => {
        const eventData = TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'JavaScript Fundamentals Lecture',
          type: 'class',
          category: 'academic',
          location: 'Room A101',
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // Tomorrow + 90 minutes
          visibility: 'public',
          attendees: [testUsers.student.id!]
        });

        const response = await teacherClient.post('/api/planning/events', eventData);

        expect(response.status).toBe(201);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.title).toBe('JavaScript Fundamentals Lecture');
        expect(response.data.data.type).toBe('class');
        expect(response.data.data.organizer).toBe(testUsers.teacher.id);
        expect(response.data.data.status).toBe('scheduled');
      });

      it('should create exam event with proper validation', async () => {
        const examData = TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Midterm Exam - JavaScript',
          type: 'exam',
          category: 'academic',
          location: 'Exam Hall B',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000), // + 2 hours
          visibility: 'course-only',
          metadata: {
            examType: 'midterm',
            duration: 120,
            maxScore: 100
          }
        });

        const response = await teacherClient.post('/api/planning/events', examData);

        expect(response.status).toBe(201);
        expect(response.data.data.type).toBe('exam');
        expect(response.data.data.visibility).toBe('course-only');
        expect(response.data.data.metadata.examType).toBe('midterm');
      });

      it('should create meeting event with attendees', async () => {
        const meetingData = TestDataFactory.createEvent(testUsers.admin.id!, {
          title: 'Faculty Meeting',
          type: 'meeting',
          category: 'administrative',
          location: 'Conference Room',
          attendees: [testUsers.teacher.id!, testUsers.staff.id!],
          visibility: 'restricted'
        });

        const response = await adminClient.post('/api/planning/events', meetingData);

        expect(response.status).toBe(201);
        expect(response.data.data.type).toBe('meeting');
        expect(response.data.data.attendees).toContain(testUsers.teacher.id);
        expect(response.data.data.attendees).toContain(testUsers.staff.id);
      });

      it('should validate required event fields', async () => {
        const invalidEventData = {
          description: 'Event without required fields'
          // Missing title, startDate, endDate, type, category
        };

        try {
          const response = await teacherClient.post('/api/planning/events', invalidEventData);

          expect(response.status).toBe(400);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toBeErrorResponse();
        }
      });

      it('should validate date consistency', async () => {
        const invalidDateData = TestDataFactory.createEvent(testUsers.teacher.id!, {
          startDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          endDate: new Date(Date.now() + 1 * 60 * 60 * 1000)    // 1 hour from now (before start)
        });

        try {
          const response = await teacherClient.post('/api/planning/events', invalidDateData);

          expect(response.status).toBe(400);
          expect(response.data.error).toContain('end date');
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toBeErrorResponse();
        }
      });

      it('should require authentication', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.planning);
        const eventData = TestDataFactory.createEvent('fake-id');

        try {
          const response = await unauthenticatedClient.post('/api/planning/events', eventData);

          expect(response.status).toBe(401);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.data).toBeErrorResponse();
        }
      });
    });

    describe('GET /api/planning/events/:eventId', () => {
      let testEvent: any;

      beforeEach(async () => {
        // Create a test event
        const eventData = TestDataFactory.createEvent(testUsers.teacher.id!);
        const createResponse = await teacherClient.post('/api/planning/events', eventData);
        testEvent = createResponse.data.data;
      });

      it('should get event by ID without authentication for public events', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.planning);
        const response = await unauthenticatedClient.get(`/api/planning/events/${testEvent.id}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.id).toBe(testEvent.id);
        expect(response.data.data.title).toBe(testEvent.title);
      });

      it('should provide additional details for authenticated users', async () => {
        const response = await studentClient.get(`/api/planning/events/${testEvent.id}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.id).toBe(testEvent.id);
        // Should include attendance status, reminders for authenticated users
      });

      it('should return 404 for non-existent event', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        
        try {
          const response = await planningClient.get(`/api/planning/events/${fakeId}`);

          expect(response.status).toBe(404);
          expect(response.data).toBeErrorResponse();
          expect(response.data.error).toContain('not found');
        } catch (error: any) {
          expect(error.response?.status).toBe(404);
          expect(error.response?.data).toBeErrorResponse();
        }
      });

      it('should handle invalid event ID format', async () => {
        try {
          const response = await planningClient.get('/api/planning/events/invalid-id');

          expect(response.status).toBe(400);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toBeErrorResponse();
        }
      });
    });

    describe('PUT /api/planning/events/:eventId', () => {
      let testEvent: any;

      beforeEach(async () => {
        const eventData = TestDataFactory.createEvent(testUsers.teacher.id!);
        const createResponse = await teacherClient.post('/api/planning/events', eventData);
        testEvent = createResponse.data.data;
      });

      it('should allow organizer to update their event', async () => {
        const updateData = {
          title: 'Updated Event Title',
          description: 'Updated description',
          location: 'New Location'
        };

        const response = await teacherClient.put(`/api/planning/events/${testEvent.id}`, updateData);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.title).toBe('Updated Event Title');
        expect(response.data.data.location).toBe('New Location');
      });

      it('should allow admin to update any event', async () => {
        const updateData = {
          title: 'Admin Updated Event'
        };

        const response = await adminClient.put(`/api/planning/events/${testEvent.id}`, updateData);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.title).toBe('Admin Updated Event');
      });

      it('should prevent non-organizer users from updating events', async () => {
        const otherTeacher = await authHelper.createTestUser('teacher');
        const otherTeacherClient = await authHelper.createAuthenticatedClient('planning', otherTeacher);

        const updateData = { title: 'Unauthorized Update' };
        
        try {
          const response = await otherTeacherClient.put(`/api/planning/events/${testEvent.id}`, updateData);

          expect(response.status).toBeOneOf([403, 401]);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBeOneOf([403, 401]);
          expect(error.response?.data).toBeErrorResponse();
        }
      });

      it('should validate update data', async () => {
        const invalidData = {
          startDate: 'invalid-date',
          type: 'invalid-type'
        };

        try {
          const response = await teacherClient.put(`/api/planning/events/${testEvent.id}`, invalidData);

          expect(response.status).toBe(400);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toBeErrorResponse();
        }
      });

      it('should prevent updating past events', async () => {
        // Create event in the past
        const pastEventData = TestDataFactory.createEvent(testUsers.teacher.id!, {
          startDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          endDate: new Date(Date.now() - 1 * 60 * 60 * 1000)    // 1 hour ago
        });
        
        const pastEventResponse = await teacherClient.post('/api/planning/events', pastEventData);
        const pastEventId = pastEventResponse.data.data.id;

        const updateData = { title: 'Cannot Update Past Event' };
        
        try {
          const response = await teacherClient.put(`/api/planning/events/${pastEventId}`, updateData);

          expect(response.status).toBe(400);
          expect(response.data.error).toContain('past event');
        } catch (error: any) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data).toBeErrorResponse();
        }
      });
    });

    describe('DELETE /api/planning/events/:eventId', () => {
      let testEvent: any;

      beforeEach(async () => {
        const eventData = TestDataFactory.createEvent(testUsers.teacher.id!);
        const createResponse = await teacherClient.post('/api/planning/events', eventData);
        testEvent = createResponse.data.data;
      });

      it('should allow organizer to delete their event', async () => {
        const response = await teacherClient.delete(`/api/planning/events/${testEvent.id}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.message).toContain('deleted');
      });

      it('should allow admin to delete any event', async () => {
        const response = await adminClient.delete(`/api/planning/events/${testEvent.id}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });

      it('should prevent students from deleting events', async () => {
        const response = await studentClient.delete(`/api/planning/events/${testEvent.id}`);

        expect(response.status).toBeOneOf([403, 401]);
        expect(response.data).toBeErrorResponse();
      });

      it('should handle deletion of events with attendees', async () => {
        // Create event with attendees
        const eventWithAttendees = TestDataFactory.createEvent(testUsers.teacher.id!, {
          attendees: [testUsers.student.id!]
        });
        const eventResponse = await teacherClient.post('/api/planning/events', eventWithAttendees);
        const eventId = eventResponse.data.data.id;

        const deleteResponse = await teacherClient.delete(`/api/planning/events/${eventId}`);
        expect(deleteResponse.status).toBe(200);
      });
    });
  });

  describe('Event Search and Filtering', () => {
    beforeEach(async () => {
      // Create test events with different characteristics
      const events = [
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Morning Class',
          type: 'class',
          category: 'academic',
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow morning
          status: 'scheduled'
        }),
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Afternoon Exam',
          type: 'exam',
          category: 'academic',
          startDate: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow afternoon
          status: 'confirmed'
        }),
        TestDataFactory.createEvent(testUsers.admin.id!, {
          title: 'Faculty Meeting',
          type: 'meeting',
          category: 'administrative',
          startDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
          status: 'scheduled'
        }),
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Workshop Session',
          type: 'workshop',
          category: 'academic',
          startDate: new Date(Date.now() + 72 * 60 * 60 * 1000), // 3 days from now
          status: 'scheduled'
        })
      ];

      for (const event of events) {
        await teacherClient.post('/api/planning/events', event);
      }
    });

    describe('GET /api/planning/events', () => {
      it('should get all events for authenticated user', async () => {
        const response = await teacherClient.get('/api/planning/events');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.events).toBeInstanceOf(Array);
        expect(response.data.data.events.length).toBeGreaterThan(0);
        expect(response.data.data.pagination).toBeDefined();
      });

      it('should filter events by type', async () => {
        const response = await teacherClient.get('/api/planning/events?type=class');

        expect(response.status).toBe(200);
        expect(response.data.data.events.length).toBeGreaterThan(0);
        
        response.data.data.events.forEach((event: any) => {
          expect(event.type).toBe('class');
        });
      });

      it('should filter events by category', async () => {
        const response = await teacherClient.get('/api/planning/events?category=academic');

        expect(response.status).toBe(200);
        response.data.data.events.forEach((event: any) => {
          expect(event.category).toBe('academic');
        });
      });

      it('should filter events by date range', async () => {
        const startDate = new Date();
        const endDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now

        const response = await teacherClient.get(
          `/api/planning/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );

        expect(response.status).toBe(200);
        response.data.data.events.forEach((event: any) => {
          const eventDate = new Date(event.startDate);
          expect(eventDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(eventDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
        });
      });

      it('should filter events by organizer', async () => {
        const response = await teacherClient.get(`/api/planning/events?organizer=${testUsers.teacher.id}`);

        expect(response.status).toBe(200);
        response.data.data.events.forEach((event: any) => {
          expect(event.organizer).toBe(testUsers.teacher.id);
        });
      });

      it('should support pagination', async () => {
        const response = await teacherClient.get('/api/planning/events?limit=2&offset=0');

        expect(response.status).toBe(200);
        expect(response.data.data.events.length).toBeLessThanOrEqual(2);
        expect(response.data.data.pagination.limit).toBe(2);
        expect(response.data.data.pagination.offset).toBe(0);
      });

      it('should sort events by different criteria', async () => {
        const response = await teacherClient.get('/api/planning/events?sortBy=startDate&sortOrder=asc');

        expect(response.status).toBe(200);
        expect(response.data.data.events.length).toBeGreaterThan(1);

        // Check if sorted by start date ascending
        for (let i = 1; i < response.data.data.events.length; i++) {
          const prev = new Date(response.data.data.events[i - 1].startDate);
          const curr = new Date(response.data.data.events[i].startDate);
          expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
        }
      });

      it('should handle multiple filters', async () => {
        const response = await teacherClient.get('/api/planning/events?type=class&category=academic&status=scheduled');

        expect(response.status).toBe(200);
        response.data.data.events.forEach((event: any) => {
          expect(event.type).toBe('class');
          expect(event.category).toBe('academic');
          expect(event.status).toBe('scheduled');
        });
      });
    });

    describe('GET /api/planning/events/upcoming', () => {
      it('should get upcoming events for user', async () => {
        const response = await teacherClient.get('/api/planning/events/upcoming');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.events).toBeInstanceOf(Array);
        
        // All events should be in the future
        response.data.data.events.forEach((event: any) => {
          const eventDate = new Date(event.startDate);
          expect(eventDate.getTime()).toBeGreaterThan(Date.now());
        });
      });

      it('should limit upcoming events', async () => {
        const response = await teacherClient.get('/api/planning/events/upcoming?limit=2');

        expect(response.status).toBe(200);
        expect(response.data.data.events.length).toBeLessThanOrEqual(2);
      });
    });

    describe('GET /api/planning/events/today', () => {
      it('should get today\'s events', async () => {
        // Create event for today
        const todayEvent = TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Today\'s Event',
          startDate: new Date(), // Now
          endDate: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
        });
        
        await teacherClient.post('/api/planning/events', todayEvent);

        const response = await teacherClient.get('/api/planning/events/today');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        
        // Find our today event
        const foundTodayEvent = response.data.data.events.find((event: any) => 
          event.title === 'Today\'s Event'
        );
        expect(foundTodayEvent).toBeDefined();
      });
    });

    describe('GET /api/planning/events/week', () => {
      it('should get this week\'s events', async () => {
        const response = await teacherClient.get('/api/planning/events/week');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.events).toBeInstanceOf(Array);
        
        // All events should be within this week
        const weekStart = new Date();
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        response.data.data.events.forEach((event: any) => {
          const eventDate = new Date(event.startDate);
          expect(eventDate.getTime()).toBeGreaterThanOrEqual(weekStart.getTime());
          expect(eventDate.getTime()).toBeLessThan(weekEnd.getTime());
        });
      });
    });
  });

  describe('Event Attendance Management', () => {
    let testEvent: any;

    beforeEach(async () => {
      // Create event with attendees
      const eventData = TestDataFactory.createEvent(testUsers.teacher.id!, {
        attendees: [testUsers.student.id!],
        title: 'Attendance Test Event'
      });
      const createResponse = await teacherClient.post('/api/planning/events', eventData);
      testEvent = createResponse.data.data;
    });

    describe('POST /api/planning/events/:eventId/attendance', () => {
      it('should allow attendee to mark attendance', async () => {
        const response = await studentClient.post(`/api/planning/events/${testEvent.id}/attendance`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.message).toContain('attendance');
      });

      it('should toggle attendance status', async () => {
        // First attendance toggle
        const response1 = await studentClient.post(`/api/planning/events/${testEvent.id}/attendance`);
        expect(response1.status).toBe(200);

        // Second attendance toggle (should toggle back)
        const response2 = await studentClient.post(`/api/planning/events/${testEvent.id}/attendance`);
        expect(response2.status).toBe(200);
      });

      it('should allow organizer to mark attendance for others', async () => {
        const response = await teacherClient.post(`/api/planning/events/${testEvent.id}/attendance`, {
          userId: testUsers.student.id
        });

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });

      it('should prevent non-attendees from marking attendance', async () => {
        const nonAttendee = await authHelper.createTestUser('student');
        const nonAttendeeClient = await authHelper.createAuthenticatedClient('planning', nonAttendee);

        try {
          const response = await nonAttendeeClient.post(`/api/planning/events/${testEvent.id}/attendance`);

          expect(response.status).toBe(403);
          expect(response.data.error).toContain('not invited');
        } catch (error: any) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.data).toBeErrorResponse();
        }
      });

      it('should require authentication', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.planning);
        
        try {
          const response = await unauthenticatedClient.post(`/api/planning/events/${testEvent.id}/attendance`);

          expect(response.status).toBe(401);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.data).toBeErrorResponse();
        }
      });
    });
  });

  describe('Calendar Views', () => {
    beforeEach(async () => {
      // Create events across different time periods
      const today = new Date();
      const events = [
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Today Event',
          startDate: today,
          endDate: new Date(today.getTime() + 60 * 60 * 1000)
        }),
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Tomorrow Event',
          startDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          endDate: new Date(today.getTime() + 25 * 60 * 60 * 1000)
        }),
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Next Week Event',
          startDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)
        })
      ];

      for (const event of events) {
        await teacherClient.post('/api/planning/events', event);
      }
    });

    describe('GET /api/planning/view/:viewType', () => {
      it('should get day view', async () => {
        const today = new Date().toISOString().split('T')[0];
        const response = await teacherClient.get(`/api/planning/view/day?date=${today}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.viewType).toBe('day');
        expect(response.data.data.events).toBeInstanceOf(Array);
        expect(response.data.data.timeSlots).toBeDefined();
      });

      it('should get week view', async () => {
        const response = await teacherClient.get('/api/planning/view/week');

        expect(response.status).toBe(200);
        expect(response.data.data.viewType).toBe('week');
        expect(response.data.data.events).toBeInstanceOf(Array);
        expect(response.data.data.startDate).toBeDefined();
        expect(response.data.data.endDate).toBeDefined();
      });

      it('should get month view', async () => {
        const response = await teacherClient.get('/api/planning/view/month');

        expect(response.status).toBe(200);
        expect(response.data.data.viewType).toBe('month');
        expect(response.data.data.events).toBeInstanceOf(Array);
      });

      it('should get agenda view', async () => {
        const response = await teacherClient.get('/api/planning/view/agenda');

        expect(response.status).toBe(200);
        expect(response.data.data.viewType).toBe('agenda');
        expect(response.data.data.events).toBeInstanceOf(Array);
        
        // Agenda view should be sorted by date
        if (response.data.data.events.length > 1) {
          for (let i = 1; i < response.data.data.events.length; i++) {
            const prev = new Date(response.data.data.events[i - 1].startDate);
            const curr = new Date(response.data.data.events[i].startDate);
            expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
          }
        }
      });

      it('should handle invalid view type', async () => {
        const response = await teacherClient.get('/api/planning/view/invalid');

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });

      it('should require authentication', async () => {
        const unauthenticatedClient = new ApiClient(testEnvironment.services.planning);
        const response = await unauthenticatedClient.get('/api/planning/view/day');

        expect(response.status).toBe(401);
        expect(response.data).toBeErrorResponse();
      });
    });
  });

  describe('Recurring Events', () => {
    describe('Creating Recurring Events', () => {
      it('should create weekly recurring event', async () => {
        const recurringEventData = TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Weekly Class',
          type: 'class',
          isRecurring: true,
          recurringPattern: {
            type: 'weekly',
            interval: 1,
            daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
            occurrenceCount: 10
          }
        });

        const response = await teacherClient.post('/api/planning/events', recurringEventData);

        expect(response.status).toBe(201);
        expect(response.data.data.isRecurring).toBe(true);
        expect(response.data.data.recurringPattern.type).toBe('weekly');
        expect(response.data.data.recurringPattern.daysOfWeek).toEqual([1, 3, 5]);
      });

      it('should create daily recurring event with end date', async () => {
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        
        const recurringEventData = TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Daily Standup',
          type: 'meeting',
          isRecurring: true,
          recurringPattern: {
            type: 'daily',
            interval: 1,
            endDate: endDate
          }
        });

        const response = await teacherClient.post('/api/planning/events', recurringEventData);

        expect(response.status).toBe(201);
        expect(response.data.data.recurringPattern.type).toBe('daily');
        expect(new Date(response.data.data.recurringPattern.endDate)).toEqual(endDate);
      });

      it('should create monthly recurring event', async () => {
        const recurringEventData = TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Monthly Review',
          type: 'meeting',
          isRecurring: true,
          recurringPattern: {
            type: 'monthly',
            interval: 1,
            occurrenceCount: 6
          }
        });

        const response = await teacherClient.post('/api/planning/events', recurringEventData);

        expect(response.status).toBe(201);
        expect(response.data.data.recurringPattern.type).toBe('monthly');
      });

      it('should validate recurring pattern data', async () => {
        const invalidRecurringData = TestDataFactory.createEvent(testUsers.teacher.id!, {
          isRecurring: true,
          recurringPattern: {
            type: 'weekly',
            interval: 0, // Invalid interval
            daysOfWeek: [8, 9] // Invalid days (only 0-6 valid)
          }
        });

        const response = await teacherClient.post('/api/planning/events', invalidRecurringData);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });
    });

    describe('Managing Recurring Event Series', () => {
      let recurringEvent: any;

      beforeEach(async () => {
        const recurringEventData = TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Test Recurring Event',
          isRecurring: true,
          recurringPattern: {
            type: 'weekly',
            interval: 1,
            daysOfWeek: [1], // Monday
            occurrenceCount: 5
          }
        });

        const response = await teacherClient.post('/api/planning/events', recurringEventData);
        recurringEvent = response.data.data;
      });

      it('should update single occurrence in series', async () => {
        const updateData = {
          title: 'Updated Single Occurrence',
          updateType: 'single'
        };

        const response = await teacherClient.put(`/api/planning/events/${recurringEvent.id}`, updateData);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });

      it('should update entire series', async () => {
        const updateData = {
          title: 'Updated Entire Series',
          updateType: 'series'
        };

        const response = await teacherClient.put(`/api/planning/events/${recurringEvent.id}`, updateData);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });

      it('should delete single occurrence', async () => {
        const deleteData = {
          deleteType: 'single'
        };

        const response = await teacherClient.delete(`/api/planning/events/${recurringEvent.id}`, {
          data: deleteData
        });

        expect(response.status).toBe(200);
        expect(response.data.message).toContain('occurrence deleted');
      });

      it('should delete entire series', async () => {
        const deleteData = {
          deleteType: 'series'
        };

        const response = await teacherClient.delete(`/api/planning/events/${recurringEvent.id}`, {
          data: deleteData
        });

        expect(response.status).toBe(200);
        expect(response.data.message).toContain('series deleted');
      });
    });
  });

  describe('Availability and Booking System', () => {
    describe('GET /api/planning/availability/:userId?', () => {
      it('should get availability for current user', async () => {
        const response = await teacherClient.get('/api/planning/availability');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.availableSlots).toBeInstanceOf(Array);
        expect(response.data.data.workingHours).toBeDefined();
      });

      it('should get availability for specific user', async () => {
        const response = await adminClient.get(`/api/planning/availability/${testUsers.teacher.id}`);

        expect(response.status).toBe(200);
        expect(response.data.data.userId).toBe(testUsers.teacher.id);
        expect(response.data.data.availableSlots).toBeInstanceOf(Array);
      });

      it('should filter availability by date range', async () => {
        const startDate = new Date();
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now

        const response = await teacherClient.get(
          `/api/planning/availability?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        );

        expect(response.status).toBe(200);
        response.data.data.availableSlots.forEach((slot: any) => {
          const slotDate = new Date(slot.start);
          expect(slotDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(slotDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
        });
      });

      it('should respect working hours', async () => {
        const response = await teacherClient.get('/api/planning/availability');

        expect(response.status).toBe(200);
        expect(response.data.data.workingHours).toBeDefined();
        
        // Available slots should be within working hours
        response.data.data.availableSlots.forEach((slot: any) => {
          const slotStart = new Date(slot.start);
          const hour = slotStart.getHours();
          
          // Assuming standard working hours (this would be configurable)
          expect(hour).toBeGreaterThanOrEqual(8);
          expect(hour).toBeLessThan(18);
        });
      });
    });

    describe('POST /api/planning/book', () => {
      it('should book available time slot', async () => {
        // First get available slots
        const availabilityResponse = await teacherClient.get('/api/planning/availability');
        expect(availabilityResponse.status).toBe(200);
        
        const availableSlots = availabilityResponse.data.data.availableSlots;
        expect(availableSlots.length).toBeGreaterThan(0);
        
        const slotToBook = availableSlots[0];
        
        const bookingData = {
          requestedSlot: {
            start: slotToBook.start,
            end: slotToBook.end
          },
          purpose: 'Student consultation',
          priority: 'medium'
        };

        const response = await studentClient.post('/api/planning/book', bookingData);

        expect(response.status).toBe(201);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.booking).toBeDefined();
        expect(response.data.data.eventCreated).toBeDefined();
      });

      it('should prevent booking overlapping slots', async () => {
        // Create an existing event
        const existingEvent = TestDataFactory.createEvent(testUsers.teacher.id!, {
          startDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          endDate: new Date(Date.now() + 3 * 60 * 60 * 1000)    // 3 hours from now
        });
        
        await teacherClient.post('/api/planning/events', existingEvent);

        // Try to book overlapping slot
        const overlappingBooking = {
          requestedSlot: {
            start: new Date(Date.now() + 2.5 * 60 * 60 * 1000), // Overlaps with existing
            end: new Date(Date.now() + 3.5 * 60 * 60 * 1000)
          },
          purpose: 'Conflicting meeting',
          priority: 'low'
        };

        const response = await studentClient.post('/api/planning/book', overlappingBooking);

        expect(response.status).toBe(400);
        expect(response.data.error).toContain('conflict');
      });

      it('should validate booking request data', async () => {
        const invalidBooking = {
          requestedSlot: {
            start: new Date(Date.now() + 3 * 60 * 60 * 1000), // End before start
            end: new Date(Date.now() + 2 * 60 * 60 * 1000)
          },
          purpose: '', // Empty purpose
          priority: 'invalid-priority'
        };

        const response = await studentClient.post('/api/planning/book', invalidBooking);

        expect(response.status).toBe(400);
        expect(response.data).toBeErrorResponse();
      });

      it('should handle high priority bookings', async () => {
        const urgentBooking = {
          requestedSlot: {
            start: new Date(Date.now() + 1 * 60 * 60 * 1000),
            end: new Date(Date.now() + 2 * 60 * 60 * 1000)
          },
          purpose: 'Urgent consultation',
          priority: 'urgent'
        };

        const response = await studentClient.post('/api/planning/book', urgentBooking);

        expect(response.status).toBe(201);
        expect(response.data.data.booking.priority).toBe('urgent');
      });
    });
  });

  describe('Conflict Detection and Resolution', () => {
    it('should detect scheduling conflicts', async () => {
      // Create first event
      const event1 = TestDataFactory.createEvent(testUsers.teacher.id!, {
        title: 'First Event',
        startDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 3 * 60 * 60 * 1000)
      });
      
      await teacherClient.post('/api/planning/events', event1);

      // Try to create conflicting event
      const conflictingEvent = TestDataFactory.createEvent(testUsers.teacher.id!, {
        title: 'Conflicting Event',
        startDate: new Date(Date.now() + 2.5 * 60 * 60 * 1000), // Overlaps
        endDate: new Date(Date.now() + 3.5 * 60 * 60 * 1000)
      });

      const response = await teacherClient.post('/api/planning/events', conflictingEvent);

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('conflict');
      expect(response.data.conflicts).toBeDefined();
    });

    it('should allow non-conflicting adjacent events', async () => {
      // Create first event
      const event1 = TestDataFactory.createEvent(testUsers.teacher.id!, {
        title: 'First Event',
        startDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 3 * 60 * 60 * 1000)
      });
      
      await teacherClient.post('/api/planning/events', event1);

      // Create adjacent (non-overlapping) event
      const adjacentEvent = TestDataFactory.createEvent(testUsers.teacher.id!, {
        title: 'Adjacent Event',
        startDate: new Date(Date.now() + 3 * 60 * 60 * 1000), // Starts when first ends
        endDate: new Date(Date.now() + 4 * 60 * 60 * 1000)
      });

      const response = await teacherClient.post('/api/planning/events', adjacentEvent);

      expect(response.status).toBe(201);
      expect(response.data).toBeSuccessResponse();
    });

    it('should detect conflicts across different attendees', async () => {
      // Create event with student as attendee
      const event1 = TestDataFactory.createEvent(testUsers.teacher.id!, {
        title: 'Class with Student',
        attendees: [testUsers.student.id!],
        startDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 3 * 60 * 60 * 1000)
      });
      
      await teacherClient.post('/api/planning/events', event1);

      // Try to create another event at same time with same student
      const conflictingEvent = TestDataFactory.createEvent(testUsers.admin.id!, {
        title: 'Meeting with Same Student',
        attendees: [testUsers.student.id!],
        startDate: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 3.5 * 60 * 60 * 1000)
      });

      const response = await adminClient.post('/api/planning/events', conflictingEvent);

      expect(response.status).toBe(400);
      expect(response.data.error).toContain('conflict');
    });
  });

  describe('Calendar Statistics', () => {
    beforeEach(async () => {
      // Create various events for statistics
      const events = [
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          type: 'class',
          category: 'academic',
          status: 'completed'
        }),
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          type: 'exam',
          category: 'academic',
          status: 'scheduled'
        }),
        TestDataFactory.createEvent(testUsers.admin.id!, {
          type: 'meeting',
          category: 'administrative',
          status: 'confirmed'
        }),
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          type: 'workshop',
          category: 'academic',
          status: 'cancelled'
        })
      ];

      for (const event of events) {
        await teacherClient.post('/api/planning/events', event);
      }
    });

    describe('GET /api/planning/stats', () => {
      it('should get calendar statistics for admin', async () => {
        const response = await adminClient.get('/api/planning/stats');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.totalEvents).toBeDefined();
        expect(response.data.data.eventsByType).toBeDefined();
        expect(response.data.data.eventsByCategory).toBeDefined();
        expect(response.data.data.attendanceRate).toBeDefined();
        expect(response.data.data.upcomingEvents).toBeDefined();
      });

      it('should get calendar statistics for staff', async () => {
        const response = await staffClient.get('/api/planning/stats');

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });

      it('should prevent students from accessing statistics', async () => {
        const response = await studentClient.get('/api/planning/stats');

        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      });

      it('should prevent teachers from accessing global statistics', async () => {
        const response = await teacherClient.get('/api/planning/stats');

        expect(response.status).toBe(403);
        expect(response.data).toBeErrorResponse();
      });

      it('should include event type breakdown', async () => {
        const response = await adminClient.get('/api/planning/stats');

        expect(response.status).toBe(200);
        expect(response.data.data.eventsByType).toBeDefined();
        expect(response.data.data.eventsByType.class).toBeGreaterThanOrEqual(1);
        expect(response.data.data.eventsByType.exam).toBeGreaterThanOrEqual(1);
        expect(response.data.data.eventsByType.meeting).toBeGreaterThanOrEqual(1);
      });

      it('should include category breakdown', async () => {
        const response = await adminClient.get('/api/planning/stats');

        expect(response.status).toBe(200);
        expect(response.data.data.eventsByCategory).toBeDefined();
        expect(response.data.data.eventsByCategory.academic).toBeGreaterThanOrEqual(2);
        expect(response.data.data.eventsByCategory.administrative).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Security and Input Validation', () => {
    describe('XSS Prevention', () => {
      it('should sanitize event title and description', async () => {
        const maliciousEventData = TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: '<script>alert("xss")</script>Malicious Event',
          description: '<img src="x" onerror="alert(1)">Event description'
        });

        const response = await teacherClient.post('/api/planning/events', maliciousEventData);

        if (response.status === 201) {
          expect(response.data.data.title).not.toContain('<script>');
          expect(response.data.data.description).not.toContain('onerror');
        } else {
          expect(response.status).toBe(400);
          expect(response.data).toBeErrorResponse();
        }
      });
    });

    describe('SQL Injection Prevention', () => {
      it('should prevent SQL injection in search queries', async () => {
        const maliciousQuery = "'; DROP TABLE events; --";
        const response = await teacherClient.get(`/api/planning/events?title=${encodeURIComponent(maliciousQuery)}`);

        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
        expect(response.data.data.events).toBeInstanceOf(Array);
      });
    });

    describe('Authorization Testing', () => {
      it('should prevent unauthorized event modifications', async () => {
        const eventData = TestDataFactory.createEvent(testUsers.teacher.id!);
        const createResponse = await teacherClient.post('/api/planning/events', eventData);
        const eventId = createResponse.data.data.id;

        // Try to update with different teacher
        const otherTeacher = await authHelper.createTestUser('teacher');
        const otherClient = await authHelper.createAuthenticatedClient('planning', otherTeacher);

        try {
          const response = await otherClient.put(`/api/planning/events/${eventId}`, {
            title: 'Unauthorized Update'
          });

          expect(response.status).toBeOneOf([403, 401]);
          expect(response.data).toBeErrorResponse();
        } catch (error: any) {
          expect(error.response?.status).toBeOneOf([403, 401]);
          expect(error.response?.data).toBeErrorResponse();
        }
      });

      it('should respect event visibility settings', async () => {
        // Create private event
        const privateEvent = TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: 'Private Event',
          visibility: 'private'
        });
        
        const createResponse = await teacherClient.post('/api/planning/events', privateEvent);
        const eventId = createResponse.data.data.id;

        // Student should not see private event in general search
        const searchResponse = await studentClient.get('/api/planning/events');
        const foundPrivateEvent = searchResponse.data.data.events.find((event: any) => 
          event.id === eventId
        );
        
        expect(foundPrivateEvent).toBeUndefined();
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        teacherClient.get('/api/planning/events?limit=5')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toBeSuccessResponse();
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      const response = await teacherClient.get('/api/planning/events?limit=20');
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle large calendar views efficiently', async () => {
      // Create many events
      const events = Array(30).fill(null).map(() => 
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          startDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Random within 30 days
          endDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)
        })
      );

      for (const event of events) {
        await teacherClient.post('/api/planning/events', event);
      }

      const startTime = Date.now();
      const response = await teacherClient.get('/api/planning/view/month');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000);
      expect(response.data.data.events.length).toBeGreaterThan(0);
    });

    it('should efficiently handle recurring event queries', async () => {
      // Create several recurring events
      const recurringEvents = Array(5).fill(null).map(() => 
        TestDataFactory.createEvent(testUsers.teacher.id!, {
          title: `Recurring Event ${Math.random()}`,
          isRecurring: true,
          recurringPattern: {
            type: 'weekly',
            interval: 1,
            daysOfWeek: [1, 3, 5],
            occurrenceCount: 10
          }
        })
      );

      for (const event of recurringEvents) {
        await teacherClient.post('/api/planning/events', event);
      }

      const startTime = Date.now();
      const response = await teacherClient.get('/api/planning/events?isRecurring=true');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000);
      
      response.data.data.events.forEach((event: any) => {
        expect(event.isRecurring).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require temporarily disconnecting the database
      // For now, we'll test with operations that might cause DB errors
      const response = await teacherClient.get('/api/planning/events/000000000000000000000000');

      expect(response.status).toBeOneOf([404, 400]);
      expect(response.data).toBeErrorResponse();
    });

    it('should provide meaningful error messages', async () => {
      const response = await teacherClient.get('/api/planning/events/invalid-id');

      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toBeDefined();
      expect(response.data.error).not.toBe('');
      expect(typeof response.data.error).toBe('string');
    });

    it('should handle malformed request data', async () => {
      const malformedData = {
        title: 'Test Event',
        startDate: 'not-a-date',
        endDate: 'also-not-a-date',
        type: 'invalid-type'
      };

      const response = await teacherClient.post('/api/planning/events', malformedData);

      expect(response.status).toBe(400);
      expect(response.data).toBeErrorResponse();
      expect(response.data.error).toContain('validation');
    });

    it('should handle timezone edge cases', async () => {
      const eventData = TestDataFactory.createEvent(testUsers.teacher.id!, {
        startDate: new Date('2024-03-10T02:30:00Z'), // During DST transition
        endDate: new Date('2024-03-10T03:30:00Z')
      });

      const response = await teacherClient.post('/api/planning/events', eventData);

      // Should handle timezone transitions gracefully
      expect(response.status).toBeOneOf([201, 400]);
      if (response.status === 201) {
        expect(response.data).toBeSuccessResponse();
      } else {
        expect(response.data).toBeErrorResponse();
      }
    });
  });
});

// Helper custom matchers
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  }
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}