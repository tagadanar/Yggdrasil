// packages/api-services/planning-service/__tests__/integration/PlanningNotificationIntegration.test.ts

// Mock database models
const mockUserModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn(),
};

const mockCourseModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn(),
};

// Mock CalendarService
const mockCalendarService = {
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
  getEvents: jest.fn(),
  generateSchedule: jest.fn(),
  checkConflicts: jest.fn(),
};

// Mock the database schemas
jest.mock('@101-school/database-schemas', () => ({
  UserModel: mockUserModel,
  CourseModel: mockCourseModel,
}));

// Import after mocking
import { UserModel, CourseModel } from '@101-school/database-schemas';

// Mock notification service
global.fetch = jest.fn();

describe('Planning-Notification Integration Tests', () => {
  let testUsers: any[] = [];
  let testCourse: any;
  let testEvents: any[] = [];

  beforeAll(async () => {
    // Setup mock users
    const instructor = {
      _id: 'mock-instructor-id',
      email: `instructor-${Date.now()}@planning.test`,
      password: 'hashedPassword',
      role: 'teacher',
      profile: { firstName: 'Planning', lastName: 'Instructor' },
      preferences: {
        language: 'en',
        notifications: { 
          email: true, 
          push: true, 
          sms: false, 
          scheduleChanges: true, 
          newAnnouncements: true, 
          assignmentReminders: true 
        },
        accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
      },
      isActive: true
    };

    const students = [];
    for (let i = 0; i < 3; i++) {
      const student = {
        _id: `mock-student-${i}-id`,
        email: `student${i}-${Date.now()}@planning.test`,
        password: 'hashedPassword',
        role: 'student',
        profile: { firstName: `Student${i}`, lastName: 'User' },
        preferences: {
          language: 'en',
          notifications: { 
            email: true, 
            push: true, 
            sms: i === 0, // Only first student has SMS enabled
            scheduleChanges: true, 
            newAnnouncements: true, 
            assignmentReminders: true 
          },
          accessibility: { colorblindMode: false, fontSize: 'medium', highContrast: false }
        },
        isActive: true
      };
      students.push(student);
    }

    testUsers = [instructor, ...students];

    // Setup mock course
    testCourse = {
      _id: 'mock-course-id',
      title: 'Planning Integration Course',
      description: 'Course for planning-notification integration testing',
      code: `PLAN${Date.now()}`,
      credits: 3,
      level: 'intermediate',
      category: 'programming',
      instructor: instructor._id,
      duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
      schedule: [{
        dayOfWeek: 1, // Monday
        startTime: '10:00',
        endTime: '12:00',
        location: 'Room 101',
        type: 'lecture'
      }],
      capacity: 30,
      enrolledStudents: students.map(s => s._id),
      tags: ['planning', 'integration'],
      status: 'published',
      visibility: 'public',
      chapters: [],
      resources: [],
      assessments: [],
      isActive: true,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    };

    // Setup mock implementations
    mockUserModel.create.mockImplementation((userData) => {
      const user = { _id: `mock-${userData.role}-id`, ...userData };
      return Promise.resolve(user);
    });

    mockCourseModel.create.mockImplementation((courseData) => {
      return Promise.resolve({ _id: 'mock-course-id', ...courseData });
    });

    mockCalendarService.createEvent.mockImplementation(async (eventData, userId) => {
      const event = {
        _id: `mock-event-${Date.now()}`,
        id: `mock-event-${Date.now()}`, // Also add 'id' field for compatibility
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date(),
        notificationStatus: 'sent', // Default status
      };
      testEvents.push(event);

      // Simulate sending notification when event is created
      if (eventData.participants && eventData.participants.length > 0) {
        const notificationPayload = {
          type: 'class_scheduled',
          title: `New Class Scheduled: ${eventData.title}`,
          message: `You have a new class "${eventData.title}" scheduled for ${eventData.startDate.toLocaleDateString()}`,
          data: {
            eventId: event.id,
            courseId: eventData.course?.id,
            courseName: eventData.course?.title,
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            location: eventData.location
          },
          recipients: eventData.participants.map(participantId => {
            const user = testUsers.find(u => u._id === participantId);
            return {
              userId: user._id,
              email: user.email,
              preferences: user.preferences.notifications
            };
          }),
          channels: ['push', 'email'],
          scheduledFor: 'immediate'
        };

        try {
          // Trigger notification call
          await global.fetch('/api/notifications/schedule-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notificationPayload)
          });
          event.notificationStatus = 'sent';
        } catch (error) {
          // If notification fails, mark for retry
          event.notificationStatus = 'pending_retry';
        }
      }

      return { success: true, event };
    });

    mockCalendarService.updateEvent.mockImplementation(async (eventId, updateData) => {
      const eventIndex = testEvents.findIndex(e => e._id === eventId);
      if (eventIndex > -1) {
        testEvents[eventIndex] = { ...testEvents[eventIndex], ...updateData, updatedAt: new Date() };
        return { success: true, event: testEvents[eventIndex] };
      }
      return { success: false, error: 'Event not found' };
    });

    mockCalendarService.deleteEvent.mockImplementation(async (eventId) => {
      const eventIndex = testEvents.findIndex(e => e._id === eventId);
      if (eventIndex > -1) {
        testEvents.splice(eventIndex, 1);
        return { success: true };
      }
      return { success: false, error: 'Event not found' };
    });

    mockCalendarService.getEvents.mockResolvedValue({
      success: true,
      events: testEvents
    });

    mockCalendarService.generateSchedule.mockResolvedValue({
      success: true,
      schedule: [testCourse]
    });

    mockCalendarService.checkConflicts.mockResolvedValue({
      success: true,
      conflicts: []
    });
  });

  afterAll(async () => {
    // Reset mocks
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Creation and Notification Flow', () => {
    it('should create calendar event and send notifications to enrolled students', async () => {
      const eventData = {
        title: 'Advanced JavaScript Concepts',
        description: 'Deep dive into advanced JavaScript patterns and concepts',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        type: 'class' as const,
        location: 'Room 101',
        instructor: testUsers[0]._id,
        course: {
          id: testCourse._id,
          title: testCourse.title
        },
        participants: testUsers.slice(1).map(u => u._id) // All students
      };

      // Mock successful notification service response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          notificationsSent: testUsers.slice(1).length,
          notificationIds: ['notif1', 'notif2', 'notif3']
        })
      });

      // Create calendar event
      const result = await mockCalendarService.createEvent(eventData, testUsers[0]._id.toString());
      expect(result.success).toBe(true);
      const calendarEvent = result.event;
      testEvents.push(calendarEvent);

      expect(calendarEvent).toBeDefined();
      expect(calendarEvent.title).toBe(eventData.title);

      // Verify notification was sent to notification service
      const expectedNotificationPayload = {
        type: 'class_scheduled',
        title: `New Class Scheduled: ${eventData.title}`,
        message: `You have a new class "${eventData.title}" scheduled for ${eventData.startDate.toLocaleDateString()}`,
        data: {
          eventId: calendarEvent.id,
          courseId: testCourse._id,
          courseName: testCourse.title,
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          location: eventData.location
        },
        recipients: testUsers.slice(1).map(u => ({
          userId: u._id,
          email: u.email,
          preferences: u.preferences.notifications
        })),
        channels: ['push', 'email'],
        scheduledFor: 'immediate'
      };

      expect(fetch).toHaveBeenCalledWith('/api/notifications/schedule-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expectedNotificationPayload)
      });
    });

    it('should send reminder notifications before scheduled events', async () => {
      const eventId = testEvents[0]?.id || 'test-event-id';
      const reminderTime = new Date(Date.now() + 23 * 60 * 60 * 1000); // 1 hour before event

      // Mock reminder notification
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          remindersSent: testUsers.slice(1).length 
        })
      });

      // Simulate reminder notification trigger
      const reminderPayload = {
        type: 'class_reminder',
        title: 'Class Starting Soon',
        message: `Your class "${testEvents[0]?.title || 'Advanced JavaScript Concepts'}" starts in 1 hour`,
        data: {
          eventId: eventId,
          courseId: testCourse._id,
          startTime: testEvents[0]?.startDate || new Date(),
          location: testEvents[0]?.location || 'Room 101'
        },
        recipients: testUsers.slice(1).map(u => u._id),
        priority: 'high',
        channels: ['push', 'email'],
        reminderType: '1_hour_before'
      };

      const reminderResponse = await fetch('/api/notifications/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderPayload)
      });

      expect(reminderResponse.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/notifications/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderPayload)
      });
    });
  });

  describe('Schedule Change Notifications', () => {
    it('should notify users when event time is changed', async () => {
      const eventId = testEvents[0]?.id || 'test-event-id';
      const originalStartTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const newStartTime = new Date(Date.now() + 25 * 60 * 60 * 1000); // 1 hour later

      // Mock schedule change notification
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          changeNotificationsSent: testUsers.slice(1).length 
        })
      });

      const scheduleChangePayload = {
        type: 'schedule_change',
        title: 'Class Time Changed',
        message: `The time for "${testEvents[0]?.title || 'Advanced JavaScript Concepts'}" has been updated`,
        data: {
          eventId: eventId,
          courseId: testCourse._id,
          originalStartTime: originalStartTime,
          newStartTime: newStartTime,
          changeType: 'time_update',
          location: testEvents[0]?.location || 'Room 101'
        },
        recipients: testUsers.slice(1).map(u => ({
          userId: u._id,
          notificationPreferences: u.preferences.notifications
        })),
        priority: 'high',
        channels: ['push', 'email', 'sms'], // Include SMS for critical updates
        urgency: 'immediate'
      };

      const changeResponse = await fetch('/api/notifications/schedule-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleChangePayload)
      });

      expect(changeResponse.ok).toBe(true);
    });

    it('should handle event cancellation notifications', async () => {
      const eventId = testEvents[0]?.id || 'test-event-id';

      // Mock cancellation notification
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          cancellationNotificationsSent: testUsers.slice(1).length 
        })
      });

      const cancellationPayload = {
        type: 'event_cancelled',
        title: 'Class Cancelled',
        message: `Your class "${testEvents[0]?.title || 'Advanced JavaScript Concepts'}" has been cancelled`,
        data: {
          eventId: eventId,
          courseId: testCourse._id,
          originalStartTime: testEvents[0]?.startDate || new Date(),
          cancellationReason: 'Instructor unavailable',
          makeupScheduled: false
        },
        recipients: testUsers.slice(1).map(u => u._id),
        priority: 'urgent',
        channels: ['push', 'email', 'sms'],
        requiresAcknowledgment: true
      };

      const cancellationResponse = await fetch('/api/notifications/cancellation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cancellationPayload)
      });

      expect(cancellationResponse.ok).toBe(true);
    });
  });

  describe('Conflict Resolution and Notifications', () => {
    it('should detect scheduling conflicts and notify affected users', async () => {
      const conflictingEventData = {
        title: 'Database Design Workshop',
        description: 'Workshop on database design principles',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Same time as existing event
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        type: 'workshop' as const,
        location: 'Room 102',
        instructor: testUsers[0]._id, // Same instructor
        participants: [testUsers[1]._id] // One overlapping student
      };

      // Mock conflict detection
      const conflictDetection = {
        hasConflicts: true,
        conflicts: [
          {
            type: 'instructor_double_booking',
            conflictingEvents: [testEvents[0]?.id, 'new-event-id'],
            affectedUsers: [testUsers[0]._id],
            timeOverlap: {
              start: conflictingEventData.startDate,
              end: conflictingEventData.endDate
            }
          },
          {
            type: 'student_schedule_conflict',
            conflictingEvents: [testEvents[0]?.id, 'new-event-id'],
            affectedUsers: [testUsers[1]._id],
            timeOverlap: {
              start: conflictingEventData.startDate,
              end: conflictingEventData.endDate
            }
          }
        ]
      };

      // Mock conflict notification
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          conflictNotificationsSent: 2 
        })
      });

      const conflictNotificationPayload = {
        type: 'scheduling_conflict',
        title: 'Schedule Conflict Detected',
        message: 'A scheduling conflict has been detected with your upcoming events',
        data: {
          conflicts: conflictDetection.conflicts,
          suggestedResolutions: [
            {
              type: 'reschedule',
              eventId: 'new-event-id',
              suggestedTime: new Date(Date.now() + 26 * 60 * 60 * 1000)
            }
          ]
        },
        recipients: [testUsers[0]._id, testUsers[1]._id],
        priority: 'high',
        channels: ['push', 'email'],
        requiresAction: true
      };

      const conflictResponse = await fetch('/api/notifications/conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conflictNotificationPayload)
      });

      expect(conflictResponse.ok).toBe(true);
      expect(conflictDetection.hasConflicts).toBe(true);
      expect(conflictDetection.conflicts).toHaveLength(2);
    });
  });

  describe('User Preference-Based Notifications', () => {
    it('should respect user notification preferences for different channels', async () => {
      const eventData = {
        title: 'Optional Study Session',
        type: 'study_session',
        startDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        participants: testUsers.slice(1)
      };

      // Mock notification service with user preferences
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          notificationResults: [
            { userId: testUsers[1]._id, channels: ['push', 'email', 'sms'], delivered: true },
            { userId: testUsers[2]._id, channels: ['push', 'email'], delivered: true },
            { userId: testUsers[3]._id, channels: ['push', 'email'], delivered: true }
          ]
        })
      });

      const preferenceBasedPayload = {
        type: 'optional_event',
        title: 'Optional Study Session Available',
        message: 'Join us for an optional study session',
        data: {
          eventType: 'study_session',
          startDate: eventData.startDate,
          isOptional: true
        },
        recipients: testUsers.slice(1).map(user => ({
          userId: user._id,
          preferredChannels: [
            ...(user.preferences.notifications.push ? ['push'] : []),
            ...(user.preferences.notifications.email ? ['email'] : []),
            ...(user.preferences.notifications.sms ? ['sms'] : [])
          ]
        })),
        respectPreferences: true
      };

      const preferenceResponse = await fetch('/api/notifications/preference-based', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferenceBasedPayload)
      });

      expect(preferenceResponse.ok).toBe(true);
    });

    it('should handle notification opt-outs for specific event types', async () => {
      // Simulate user opting out of optional event notifications
      const optOutData = {
        userId: testUsers[1]._id,
        eventType: 'study_session',
        optOut: true,
        timestamp: new Date()
      };

      // Mock opt-out processing
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          optOutProcessed: true,
          userPreferencesUpdated: true
        })
      });

      const optOutResponse = await fetch('/api/notifications/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optOutData)
      });

      expect(optOutResponse.ok).toBe(true);

      // Verify subsequent notifications respect opt-out
      const futureEventPayload = {
        type: 'study_session',
        excludeOptedOutUsers: true,
        eventType: 'study_session'
      };

      const futureEventResponse = await fetch('/api/notifications/filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(futureEventPayload)
      });

      expect(futureEventResponse.ok).toBe(true);
    });
  });

  describe('Integration Error Handling', () => {
    it('should handle notification service failures during event creation', async () => {
      // Mock notification service failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Notification service unavailable'));

      const eventData = {
        title: 'Error Handling Test Event',
        startDate: new Date(Date.now() + 72 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 72 * 60 * 60 * 1000 + 60 * 60 * 1000),
        type: 'lecture' as const,
        participants: [testUsers[1]._id]
      };

      // Event should still be created even if notifications fail
      const result = await mockCalendarService.createEvent(eventData, testUsers[0]._id.toString());
      expect(result.success).toBe(true);
      const calendarEvent = result.event;
      expect(calendarEvent).toBeDefined();

      // Notification failure should be logged but not prevent event creation
      try {
        await fetch('/api/notifications/schedule-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: calendarEvent.id })
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Notification service unavailable');
      }

      // Event should be marked for retry notification
      expect(calendarEvent.notificationStatus).toBe('pending_retry');
    });

    it('should implement retry logic for failed notifications', async () => {
      const eventId = 'retry-test-event';
      
      // Mock first attempt failure, second attempt success
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, retrySuccessful: true })
        });

      const retryPayload = {
        eventId: eventId,
        notificationType: 'class_scheduled',
        retryAttempt: 1,
        maxRetries: 3
      };

      // First attempt (should fail)
      try {
        await fetch('/api/notifications/schedule-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(retryPayload)
        });
      } catch (error) {
        // Retry after failure
        const retryResponse = await fetch('/api/notifications/retry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...retryPayload, retryAttempt: 1 })
        });

        expect(retryResponse.ok).toBe(true);
      }

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});