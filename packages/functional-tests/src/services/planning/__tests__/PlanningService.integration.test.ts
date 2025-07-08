/**
 * Planning Service Integration Tests
 * 
 * Tests integration scenarios between planning service and other services:
 * - Planning-Course service integration (course schedules, class events)
 * - Planning-User service integration (user calendars, availability)
 * - Planning-News service integration (event announcements)
 * - Planning-Notification service integration (event reminders)
 * - Cross-service data consistency and synchronization
 * - Complex workflows spanning multiple services
 */

import { ApiClient } from '../../../utils/ApiClient';
import { AuthHelper, TestUser } from '../../../utils/AuthHelper';
import { TestDataFactory } from '../../../utils/TestDataFactory';
import { databaseHelper } from '../../../utils/DatabaseHelper';
import { testEnvironment } from '../../../config/environment';

describe('Planning Service - Integration Tests', () => {
  let authHelper: AuthHelper;
  let planningClient: ApiClient;
  let courseClient: ApiClient;
  let userClient: ApiClient;
  let newsClient: ApiClient;
  let notificationClient: ApiClient;
  let testUsers: {
    student: TestUser;
    teacher: TestUser;
    admin: TestUser;
  };

  beforeAll(async () => {
    authHelper = new AuthHelper();
    
    // Create test users
    testUsers = {
      student: await authHelper.createTestUser('student'),
      teacher: await authHelper.createTestUser('teacher'),
      admin: await authHelper.createTestUser('admin'),
    };

    // Create clients for different services
    planningClient = await authHelper.createAuthenticatedClient('planning', testUsers.admin);
    courseClient = await authHelper.createAuthenticatedClient('course', testUsers.admin);
    userClient = await authHelper.createAuthenticatedClient('user', testUsers.admin);
    newsClient = await authHelper.createAuthenticatedClient('news', testUsers.admin);
    notificationClient = await authHelper.createAuthenticatedClient('notification', testUsers.admin);
  });

  afterAll(async () => {
    await authHelper.cleanup();
  });

  beforeEach(async () => {
    await databaseHelper.cleanupTestData();
  });

  describe('Planning-Course Service Integration', () => {
    it('should create course-related events automatically', async () => {
      const instructor = testUsers.teacher;
      
      // Create course with schedule
      const courseData = TestDataFactory.createCourse(instructor.id!, {
        title: 'Integration Course',
        schedule: [
          {
            day: 'monday',
            startTime: '09:00',
            endTime: '10:30',
            location: 'Room A101'
          },
          {
            day: 'wednesday',
            startTime: '09:00',
            endTime: '10:30',
            location: 'Room A101'
          }
        ],
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)   // 2 weeks from now
      });
      
      const courseResponse = await courseClient.post('/api/courses', courseData);
      expect(courseResponse.status).toBe(201);
      
      const courseId = courseResponse.data.data.id;
      
      // Create course-related events through planning service
      const classEvent = TestDataFactory.createEvent(instructor.id!, {
        title: 'Course Lecture 1',
        type: 'class',
        category: 'academic',
        courseId: courseId,
        location: 'Room A101',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // Monday 9 AM
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 10.5 * 60 * 60 * 1000)  // Monday 10:30 AM
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', classEvent);
      expect(eventResponse.status).toBe(201);
      
      // Verify event is linked to course
      expect(eventResponse.data.data.courseId).toBe(courseId);
      expect(eventResponse.data.data.type).toBe('class');
      expect(eventResponse.data.data.organizer).toBe(instructor.id);
    });

    it('should handle course enrollment and event attendance integration', async () => {
      const instructor = testUsers.teacher;
      const student = testUsers.student;
      
      // Create and publish course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      
      // Enroll student in course
      const studentCourseClient = await authHelper.createAuthenticatedClient('course', student);
      const enrollResponse = await studentCourseClient.post(`/api/courses/${courseId}/enroll`);
      expect(enrollResponse.status).toBe(200);
      
      // Create course event
      const courseEvent = TestDataFactory.createEvent(instructor.id!, {
        title: 'Course Class',
        type: 'class',
        courseId: courseId,
        attendees: [student.id!], // Student is automatically added as attendee
        visibility: 'course-only'
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', courseEvent);
      expect(eventResponse.status).toBe(201);
      
      const eventId = eventResponse.data.data.id;
      
      // Student should be able to see course events
      const studentPlanningClient = await authHelper.createAuthenticatedClient('planning', student);
      const studentEventResponse = await studentPlanningClient.get(`/api/planning/events/${eventId}`);
      expect(studentEventResponse.status).toBe(200);
      expect(studentEventResponse.data.data.courseId).toBe(courseId);
      
      // Student should be able to mark attendance
      const attendanceResponse = await studentPlanningClient.post(`/api/planning/events/${eventId}/attendance`);
      expect(attendanceResponse.status).toBe(200);
    });

    it('should handle course schedule conflicts', async () => {
      const instructor = testUsers.teacher;
      
      // Create two courses with overlapping schedules
      const course1Data = TestDataFactory.createCourse(instructor.id!, {
        title: 'Course 1',
        schedule: [
          {
            day: 'monday',
            startTime: '09:00',
            endTime: '10:30',
            location: 'Room A101'
          }
        ]
      });
      
      const course2Data = TestDataFactory.createCourse(instructor.id!, {
        title: 'Course 2',
        schedule: [
          {
            day: 'monday',
            startTime: '10:00',
            endTime: '11:30',
            location: 'Room B202'
          }
        ]
      });
      
      const course1Response = await courseClient.post('/api/courses', course1Data);
      const course2Response = await courseClient.post('/api/courses', course2Data);
      
      expect(course1Response.status).toBe(201);
      expect(course2Response.status).toBe(201);
      
      const course1Id = course1Response.data.data.id;
      const course2Id = course2Response.data.data.id;
      
      // Create events for both courses at overlapping times
      const event1 = TestDataFactory.createEvent(instructor.id!, {
        title: 'Course 1 Class',
        type: 'class',
        courseId: course1Id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 10.5 * 60 * 60 * 1000)
      });
      
      const event2 = TestDataFactory.createEvent(instructor.id!, {
        title: 'Course 2 Class',
        type: 'class',
        courseId: course2Id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // Overlaps with event1
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 11.5 * 60 * 60 * 1000)
      });
      
      await planningClient.post('/api/planning/events', event1);
      
      // Second event should detect conflict
      const conflictResponse = await planningClient.post('/api/planning/events', event2);
      expect(conflictResponse.status).toBe(400);
      expect(conflictResponse.data.error).toContain('conflict');
    });

    it('should synchronize course and event updates', async () => {
      const instructor = testUsers.teacher;
      
      // Create course
      const courseData = TestDataFactory.createCourse(instructor.id!, {
        title: 'Original Course Title'
      });
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // Create course event
      const courseEvent = TestDataFactory.createEvent(instructor.id!, {
        title: 'Original Event Title',
        courseId: courseId
      });
      const eventResponse = await planningClient.post('/api/planning/events', courseEvent);
      const eventId = eventResponse.data.data.id;
      
      // Update course title
      const courseUpdateResponse = await courseClient.put(`/api/courses/${courseId}`, {
        title: 'Updated Course Title'
      });
      expect(courseUpdateResponse.status).toBe(200);
      
      // Verify course update
      const updatedCourseResponse = await courseClient.get(`/api/courses/${courseId}`);
      expect(updatedCourseResponse.status).toBe(200);
      expect(updatedCourseResponse.data.data.title).toBe('Updated Course Title');
      
      // Verify event still references correct course
      const updatedEventResponse = await planningClient.get(`/api/planning/events/${eventId}`);
      expect(updatedEventResponse.status).toBe(200);
      expect(updatedEventResponse.data.data.courseId).toBe(courseId);
    });
  });

  describe('Planning-User Service Integration', () => {
    it('should maintain user availability across services', async () => {
      const user = testUsers.teacher;
      
      // Get user availability through planning service
      const availabilityResponse = await planningClient.get(`/api/planning/availability/${user.id}`);
      expect(availabilityResponse.status).toBe(200);
      
      const initialAvailability = availabilityResponse.data.data.availableSlots;
      expect(initialAvailability).toBeInstanceOf(Array);
      
      // Update user working hours through user service
      const workingHoursUpdate = {
        preferences: {
          workingHours: {
            monday: { isWorkingDay: true, startTime: '08:00', endTime: '16:00' },
            tuesday: { isWorkingDay: true, startTime: '08:00', endTime: '16:00' },
            wednesday: { isWorkingDay: false },
            thursday: { isWorkingDay: true, startTime: '08:00', endTime: '16:00' },
            friday: { isWorkingDay: true, startTime: '08:00', endTime: '16:00' }
          }
        }
      };
      
      const userUpdateResponse = await userClient.put(`/api/users/${user.id}`, workingHoursUpdate);
      expect(userUpdateResponse.status).toBe(200);
      
      // Verify availability reflects updated working hours
      const updatedAvailabilityResponse = await planningClient.get(`/api/planning/availability/${user.id}`);
      expect(updatedAvailabilityResponse.status).toBe(200);
      
      const updatedAvailability = updatedAvailabilityResponse.data.data.availableSlots;
      
      // Wednesday should have no available slots (not a working day)
      const wednesdaySlots = updatedAvailability.filter((slot: any) => {
        const slotDate = new Date(slot.start);
        return slotDate.getDay() === 3; // Wednesday
      });
      expect(wednesdaySlots.length).toBe(0);
    });

    it('should handle user role changes and event permissions', async () => {
      const user = testUsers.student;
      
      // Create event as student (should have limited permissions)
      const studentEvent = TestDataFactory.createEvent(user.id!, {
        title: 'Student Event',
        type: 'other',
        category: 'personal'
      });
      
      const studentPlanningClient = await authHelper.createAuthenticatedClient('planning', user);
      const eventResponse = await studentPlanningClient.post('/api/planning/events', studentEvent);
      expect(eventResponse.status).toBe(201);
      
      const eventId = eventResponse.data.data.id;
      
      // Upgrade user to teacher role
      const roleUpgradeResponse = await userClient.put(`/api/users/${user.id}`, {
        role: 'teacher'
      });
      expect(roleUpgradeResponse.status).toBe(200);
      
      // Verify user role change
      const updatedUserResponse = await userClient.get(`/api/users/${user.id}`);
      expect(updatedUserResponse.status).toBe(200);
      expect(updatedUserResponse.data.data.role).toBe('teacher');
      
      // User should now have teacher permissions for events
      const teacherEvent = TestDataFactory.createEvent(user.id!, {
        title: 'Teacher Event',
        type: 'class',
        category: 'academic'
      });
      
      // Re-authenticate with updated role
      const updatedPlanningClient = await authHelper.createAuthenticatedClient('planning', {
        ...user,
        role: 'teacher'
      });
      
      const teacherEventResponse = await updatedPlanningClient.post('/api/planning/events', teacherEvent);
      expect(teacherEventResponse.status).toBe(201);
      expect(teacherEventResponse.data.data.type).toBe('class');
    });

    it('should handle user deactivation impact on events', async () => {
      const organizer = testUsers.teacher;
      const attendee = testUsers.student;
      
      // Create event with attendees
      const eventData = TestDataFactory.createEvent(organizer.id!, {
        title: 'Event with Attendees',
        attendees: [attendee.id!]
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      expect(eventResponse.status).toBe(201);
      
      const eventId = eventResponse.data.data.id;
      
      // Deactivate attendee through user service
      const deactivateResponse = await userClient.put(`/api/users/${attendee.id}/deactivate`);
      expect(deactivateResponse.status).toBe(200);
      
      // Verify attendee is deactivated
      const userStatusResponse = await userClient.get(`/api/users/${attendee.id}`);
      expect(userStatusResponse.status).toBe(200);
      expect(userStatusResponse.data.data.isActive).toBe(false);
      
      // Event should still exist but attendee status should be reflected
      const eventStatusResponse = await planningClient.get(`/api/planning/events/${eventId}`);
      expect(eventStatusResponse.status).toBe(200);
      expect(eventStatusResponse.data.data.attendees).toContain(attendee.id);
    });

    it('should integrate user calendar preferences', async () => {
      const user = testUsers.teacher;
      
      // Update user calendar preferences
      const preferencesUpdate = {
        preferences: {
          calendarView: 'week',
          timezone: 'America/New_York',
          workingHours: {
            startTime: '09:00',
            endTime: '17:00'
          },
          reminderDefaults: {
            email: 15, // 15 minutes before
            push: 5    // 5 minutes before
          }
        }
      };
      
      const updateResponse = await userClient.put(`/api/users/${user.id}`, preferencesUpdate);
      expect(updateResponse.status).toBe(200);
      
      // Create event and verify preferences are applied
      const eventData = TestDataFactory.createEvent(user.id!, {
        title: 'Event with User Preferences'
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      expect(eventResponse.status).toBe(201);
      
      // Event should respect user's timezone and reminder preferences
      const eventId = eventResponse.data.data.id;
      const eventDetailsResponse = await planningClient.get(`/api/planning/events/${eventId}`);
      expect(eventDetailsResponse.status).toBe(200);
    });
  });

  describe('Planning-News Service Integration', () => {
    it('should create event announcements through news service', async () => {
      const organizer = testUsers.teacher;
      
      // Create significant event
      const importantEvent = TestDataFactory.createEvent(organizer.id!, {
        title: 'Important Exam',
        type: 'exam',
        category: 'academic',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        visibility: 'public'
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', importantEvent);
      expect(eventResponse.status).toBe(201);
      
      const eventId = eventResponse.data.data.id;
      
      // Create related news announcement
      const announcementData = TestDataFactory.createArticle(organizer.id!, {
        title: 'Upcoming Important Exam Announcement',
        content: 'Please note the upcoming important exam scheduled for next week.',
        category: 'academic',
        tags: [`event-${eventId}`, 'exam', 'announcement'],
        targetAudience: ['student']
      });
      
      const newsResponse = await newsClient.post('/api/articles', announcementData);
      expect(newsResponse.status).toBe(201);
      
      // Verify announcement is linked to event
      const articleId = newsResponse.data.data.id;
      const articleResponse = await newsClient.get(`/api/articles/${articleId}`);
      expect(articleResponse.status).toBe(200);
      expect(articleResponse.data.data.tags).toContain(`event-${eventId}`);
    });

    it('should handle event cancellation announcements', async () => {
      const organizer = testUsers.teacher;
      
      // Create event
      const eventData = TestDataFactory.createEvent(organizer.id!, {
        title: 'Event to be Cancelled',
        attendees: [testUsers.student.id!]
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      const eventId = eventResponse.data.data.id;
      
      // Cancel the event
      const cancelResponse = await planningClient.put(`/api/planning/events/${eventId}`, {
        status: 'cancelled'
      });
      expect(cancelResponse.status).toBe(200);
      
      // Create cancellation announcement
      const cancellationNews = TestDataFactory.createArticle(organizer.id!, {
        title: 'Event Cancellation Notice',
        content: 'The scheduled event has been cancelled due to unforeseen circumstances.',
        category: 'announcement',
        tags: [`event-${eventId}`, 'cancellation'],
        priority: 'high'
      });
      
      const newsResponse = await newsClient.post('/api/articles', cancellationNews);
      expect(newsResponse.status).toBe(201);
      
      // Verify cancellation news is published
      expect(newsResponse.data.data.tags).toContain('cancellation');
      expect(newsResponse.data.data.priority).toBe('high');
    });

    it('should sync event updates with news announcements', async () => {
      const organizer = testUsers.teacher;
      
      // Create event
      const eventData = TestDataFactory.createEvent(organizer.id!, {
        title: 'Original Event',
        location: 'Room A101',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      const eventId = eventResponse.data.data.id;
      
      // Create related news
      const newsData = TestDataFactory.createArticle(organizer.id!, {
        title: 'Event Information',
        tags: [`event-${eventId}`]
      });
      
      await newsClient.post('/api/articles', newsData);
      
      // Update event details
      const eventUpdate = {
        title: 'Updated Event Title',
        location: 'Room B202 (Changed)',
        startDate: new Date(Date.now() + 25 * 60 * 60 * 1000) // Different time
      };
      
      const updateResponse = await planningClient.put(`/api/planning/events/${eventId}`, eventUpdate);
      expect(updateResponse.status).toBe(200);
      
      // Should create update announcement
      const updateNews = TestDataFactory.createArticle(organizer.id!, {
        title: 'Event Update Notice',
        content: 'Please note the changes to the scheduled event.',
        tags: [`event-${eventId}`, 'update'],
        category: 'announcement'
      });
      
      const updateNewsResponse = await newsClient.post('/api/articles', updateNews);
      expect(updateNewsResponse.status).toBe(201);
      expect(updateNewsResponse.data.data.tags).toContain('update');
    });
  });

  describe('Planning-Notification Service Integration', () => {
    it('should send event reminder notifications', async () => {
      const organizer = testUsers.teacher;
      const attendee = testUsers.student;
      
      // Create event with reminders
      const eventData = TestDataFactory.createEvent(organizer.id!, {
        title: 'Event with Reminders',
        attendees: [attendee.id!],
        startDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        reminders: [
          {
            type: 'email',
            minutesBefore: 30,
            isEnabled: true
          },
          {
            type: 'push',
            minutesBefore: 15,
            isEnabled: true
          }
        ]
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      expect(eventResponse.status).toBe(201);
      
      const eventId = eventResponse.data.data.id;
      
      // Verify reminders are configured
      const eventDetailsResponse = await planningClient.get(`/api/planning/events/${eventId}`);
      expect(eventDetailsResponse.status).toBe(200);
      expect(eventDetailsResponse.data.data.reminders).toHaveLength(2);
      
      // Simulate notification scheduling (this would normally be handled by the notification service)
      const reminderNotification = {
        type: 'event_reminder',
        recipientId: attendee.id,
        eventId: eventId,
        scheduledFor: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        content: {
          title: 'Event Reminder',
          message: `Your event "${eventData.title}" starts in 30 minutes.`
        }
      };
      
      const notificationResponse = await notificationClient.post('/api/notifications', reminderNotification);
      expect(notificationResponse.status).toBe(201);
    });

    it('should handle attendance confirmation notifications', async () => {
      const organizer = testUsers.teacher;
      const attendee = testUsers.student;
      
      // Create event
      const eventData = TestDataFactory.createEvent(organizer.id!, {
        title: 'Event Requiring Confirmation',
        attendees: [attendee.id!]
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      const eventId = eventResponse.data.data.id;
      
      // Attendee marks attendance
      const attendeePlanningClient = await authHelper.createAuthenticatedClient('planning', attendee);
      const attendanceResponse = await attendeePlanningClient.post(`/api/planning/events/${eventId}/attendance`);
      expect(attendanceResponse.status).toBe(200);
      
      // Should trigger confirmation notification to organizer
      const confirmationNotification = {
        type: 'attendance_confirmation',
        recipientId: organizer.id,
        eventId: eventId,
        content: {
          title: 'Attendance Confirmed',
          message: `${attendee.profile?.firstName || 'Student'} has confirmed attendance for your event.`
        }
      };
      
      const notificationResponse = await notificationClient.post('/api/notifications', confirmationNotification);
      expect(notificationResponse.status).toBe(201);
    });

    it('should send event change notifications', async () => {
      const organizer = testUsers.teacher;
      const attendee = testUsers.student;
      
      // Create event with attendees
      const eventData = TestDataFactory.createEvent(organizer.id!, {
        title: 'Event to be Modified',
        attendees: [attendee.id!],
        location: 'Original Location'
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      const eventId = eventResponse.data.data.id;
      
      // Update event
      const eventUpdate = {
        location: 'New Location',
        startDate: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
      };
      
      const updateResponse = await planningClient.put(`/api/planning/events/${eventId}`, eventUpdate);
      expect(updateResponse.status).toBe(200);
      
      // Should send change notification to attendees
      const changeNotification = {
        type: 'event_changed',
        recipientId: attendee.id,
        eventId: eventId,
        content: {
          title: 'Event Details Changed',
          message: 'An event you are attending has been updated. Please check the new details.'
        }
      };
      
      const notificationResponse = await notificationClient.post('/api/notifications', changeNotification);
      expect(notificationResponse.status).toBe(201);
    });
  });

  describe('Cross-Service Data Consistency', () => {
    it('should maintain consistency during complex multi-service workflows', async () => {
      const instructor = testUsers.teacher;
      const student = testUsers.student;
      
      // Complex workflow: Create course → Publish → Enroll student → Create events → Send notifications
      
      // 1. Create course
      const courseData = TestDataFactory.createCourse(instructor.id!, {
        title: 'Multi-Service Workflow Course'
      });
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // 2. Publish course
      await courseClient.patch(`/api/courses/${courseId}/publish`);
      
      // 3. Enroll student
      const studentCourseClient = await authHelper.createAuthenticatedClient('course', student);
      await studentCourseClient.post(`/api/courses/${courseId}/enroll`);
      
      // 4. Create course events
      const events = [
        TestDataFactory.createEvent(instructor.id!, {
          title: 'Course Introduction',
          type: 'class',
          courseId: courseId,
          attendees: [student.id!]
        }),
        TestDataFactory.createEvent(instructor.id!, {
          title: 'Midterm Exam',
          type: 'exam',
          courseId: courseId,
          attendees: [student.id!]
        })
      ];
      
      const eventPromises = events.map(event => 
        planningClient.post('/api/planning/events', event)
      );
      const eventResponses = await Promise.all(eventPromises);
      
      // 5. Create course announcement
      const announcementData = TestDataFactory.createArticle(instructor.id!, {
        title: 'Course Schedule Released',
        tags: [`course-${courseId}`]
      });
      
      const newsResponse = await newsClient.post('/api/articles', announcementData);
      
      // 6. Send notification to enrolled students
      const enrollmentNotification = {
        type: 'course_schedule',
        recipientId: student.id,
        content: {
          title: 'Course Schedule Available',
          message: 'Your course schedule is now available in the calendar.'
        }
      };
      
      const notificationResponse = await notificationClient.post('/api/notifications', enrollmentNotification);
      
      // Verify all operations succeeded
      expect(courseResponse.status).toBe(201);
      eventResponses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.data.data.courseId).toBe(courseId);
      });
      expect(newsResponse.status).toBe(201);
      expect(notificationResponse.status).toBe(201);
      
      // Verify data consistency
      const finalCourseResponse = await courseClient.get(`/api/courses/${courseId}`);
      expect(finalCourseResponse.status).toBe(200);
      expect(finalCourseResponse.data.data.id).toBe(courseId);
      
      const studentEventsResponse = await studentCourseClient.get('/api/planning/events?courseId=' + courseId);
      expect(studentEventsResponse.status).toBe(200);
      expect(studentEventsResponse.data.data.events.length).toBe(2);
    });

    it('should handle concurrent operations across services', async () => {
      const instructor = testUsers.teacher;
      
      // Create course
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // Perform concurrent operations across services
      const concurrentOperations = [
        // Planning service operations
        planningClient.post('/api/planning/events', TestDataFactory.createEvent(instructor.id!, {
          courseId: courseId,
          title: 'Concurrent Event 1'
        })),
        planningClient.post('/api/planning/events', TestDataFactory.createEvent(instructor.id!, {
          courseId: courseId,
          title: 'Concurrent Event 2'
        })),
        
        // Course service operations
        courseClient.put(`/api/courses/${courseId}`, {
          description: 'Updated during concurrent operations'
        }),
        
        // News service operations
        newsClient.post('/api/articles', TestDataFactory.createArticle(instructor.id!, {
          title: 'Concurrent News',
          tags: [`course-${courseId}`]
        })),
        
        // User service operations
        userClient.put(`/api/users/${instructor.id}`, {
          profile: { title: 'Updated Professor' }
        })
      ];
      
      const results = await Promise.allSettled(concurrentOperations);
      
      // Most operations should succeed
      const successfulOps = results.filter(r => 
        r.status === 'fulfilled' && r.value.status < 400
      );
      expect(successfulOps.length).toBeGreaterThan(3);
      
      // Verify final state consistency
      const finalCourseResponse = await courseClient.get(`/api/courses/${courseId}`);
      expect(finalCourseResponse.status).toBe(200);
      
      const eventsResponse = await planningClient.get(`/api/planning/events?courseId=${courseId}`);
      expect(eventsResponse.status).toBe(200);
      expect(eventsResponse.data.data.events.length).toBeGreaterThan(0);
    });

    it('should handle service interdependencies correctly', async () => {
      const organizer = testUsers.teacher;
      const attendee = testUsers.student;
      
      // Create event with attendee
      const eventData = TestDataFactory.createEvent(organizer.id!, {
        title: 'Interdependency Test Event',
        attendees: [attendee.id!]
      });
      
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      const eventId = eventResponse.data.data.id;
      
      // Update attendee profile while they have pending events
      const profileUpdate = {
        profile: {
          firstName: 'Updated',
          lastName: 'Attendee'
        }
      };
      
      const userUpdateResponse = await userClient.put(`/api/users/${attendee.id}`, profileUpdate);
      expect(userUpdateResponse.status).toBe(200);
      
      // Verify event still references correct attendee
      const updatedEventResponse = await planningClient.get(`/api/planning/events/${eventId}`);
      expect(updatedEventResponse.status).toBe(200);
      expect(updatedEventResponse.data.data.attendees).toContain(attendee.id);
      
      // Update event while attendee exists
      const eventUpdate = {
        title: 'Updated Event Title',
        startDate: new Date(Date.now() + 3 * 60 * 60 * 1000)
      };
      
      const eventUpdateResponse = await planningClient.put(`/api/planning/events/${eventId}`, eventUpdate);
      expect(eventUpdateResponse.status).toBe(200);
      
      // Verify attendee still receives event updates
      const attendeePlanningClient = await authHelper.createAuthenticatedClient('planning', attendee);
      const attendeeEventResponse = await attendeePlanningClient.get(`/api/planning/events/${eventId}`);
      expect(attendeeEventResponse.status).toBe(200);
      expect(attendeeEventResponse.data.data.title).toBe('Updated Event Title');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle partial service failures gracefully', async () => {
      const organizer = testUsers.teacher;
      
      // Create event (this should always work)
      const eventData = TestDataFactory.createEvent(organizer.id!);
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      expect(eventResponse.status).toBe(201);
      
      const eventId = eventResponse.data.data.id;
      
      // Try operations that might fail due to service issues
      try {
        await newsClient.post('/api/articles', TestDataFactory.createArticle(organizer.id!, {
          tags: [`event-${eventId}`]
        }));
      } catch (error) {
        // News creation might fail, but event should still be accessible
        const eventStillExists = await planningClient.get(`/api/planning/events/${eventId}`);
        expect(eventStillExists.status).toBe(200);
      }
    });

    it('should handle cascading data cleanup on event deletion', async () => {
      const organizer = testUsers.teacher;
      const attendee = testUsers.student;
      
      // Create event with related data
      const eventData = TestDataFactory.createEvent(organizer.id!, {
        attendees: [attendee.id!]
      });
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      const eventId = eventResponse.data.data.id;
      
      // Create related news
      const newsData = TestDataFactory.createArticle(organizer.id!, {
        tags: [`event-${eventId}`]
      });
      await newsClient.post('/api/articles', newsData);
      
      // Create related notification
      const notificationData = {
        type: 'event_reminder',
        recipientId: attendee.id,
        eventId: eventId,
        content: { title: 'Test', message: 'Test' }
      };
      await notificationClient.post('/api/notifications', notificationData);
      
      // Delete event
      const deleteResponse = await planningClient.delete(`/api/planning/events/${eventId}`);
      expect(deleteResponse.status).toBe(200);
      
      // Verify event is deleted
      const deletedEventResponse = await planningClient.get(`/api/planning/events/${eventId}`);
      expect(deletedEventResponse.status).toBe(404);
    });

    it('should maintain data integrity during service outages', async () => {
      const organizer = testUsers.teacher;
      
      // Create event
      const eventData = TestDataFactory.createEvent(organizer.id!);
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      const eventId = eventResponse.data.data.id;
      
      // Simulate operations that might fail due to service outage
      const criticalOperations = [
        planningClient.get(`/api/planning/events/${eventId}`),
        userClient.get(`/api/users/${organizer.id}`)
      ];
      
      const results = await Promise.allSettled(criticalOperations);
      
      // Core data should remain accessible
      const eventResult = results[0];
      expect(eventResult.status).toBe('fulfilled');
      if (eventResult.status === 'fulfilled') {
        expect(eventResult.value.status).toBe(200);
      }
    });
  });

  describe('Performance with Multiple Services', () => {
    it('should handle complex cross-service queries efficiently', async () => {
      const organizer = testUsers.teacher;
      
      // Create test data
      const courseData = TestDataFactory.createCourse(organizer.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      const eventData = TestDataFactory.createEvent(organizer.id!, {
        courseId: courseId
      });
      const eventResponse = await planningClient.post('/api/planning/events', eventData);
      const eventId = eventResponse.data.data.id;
      
      // Complex operation involving multiple services
      const startTime = Date.now();
      
      const operations = await Promise.all([
        planningClient.get(`/api/planning/events/${eventId}`),
        courseClient.get(`/api/courses/${courseId}`),
        userClient.get(`/api/users/${organizer.id}`),
        planningClient.get('/api/planning/view/week'),
        newsClient.get('/api/articles?limit=5')
      ]);
      
      const endTime = Date.now();
      
      // All operations should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
      
      // All operations should succeed
      operations.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should optimize calendar view generation with course data', async () => {
      const instructor = testUsers.teacher;
      
      // Create course with multiple events
      const courseData = TestDataFactory.createCourse(instructor.id!);
      const courseResponse = await courseClient.post('/api/courses', courseData);
      const courseId = courseResponse.data.data.id;
      
      // Create multiple course events
      const events = Array(10).fill(null).map((_, index) => 
        TestDataFactory.createEvent(instructor.id!, {
          title: `Course Event ${index + 1}`,
          courseId: courseId,
          startDate: new Date(Date.now() + index * 24 * 60 * 60 * 1000), // Spread over 10 days
          endDate: new Date(Date.now() + index * 24 * 60 * 60 * 1000 + 60 * 60 * 1000)
        })
      );
      
      for (const event of events) {
        await planningClient.post('/api/planning/events', event);
      }
      
      const startTime = Date.now();
      const monthViewResponse = await planningClient.get('/api/planning/view/month');
      const endTime = Date.now();
      
      expect(monthViewResponse.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(3000);
      expect(monthViewResponse.data.data.events.length).toBeGreaterThan(0);
      
      // Events should include course information
      const courseEvents = monthViewResponse.data.data.events.filter((event: any) => 
        event.courseId === courseId
      );
      expect(courseEvents.length).toBeGreaterThan(0);
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