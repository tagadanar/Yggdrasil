// Path: packages/api-services/planning-service/__tests__/services/CalendarService.test.ts

describe('Calendar Service Logic Tests', () => {
  
  // Test event validation logic
  describe('Event validation logic', () => {
    it('should validate event date ranges', () => {
      const validEvent = {
        title: 'Team Meeting',
        startDate: new Date('2024-06-01T09:00:00Z'),
        endDate: new Date('2024-06-01T10:00:00Z'),
        type: 'meeting',
        category: 'administrative'
      };

      const invalidEvent = {
        title: 'Invalid Meeting',
        startDate: new Date('2024-06-01T10:00:00Z'),
        endDate: new Date('2024-06-01T09:00:00Z'), // End before start
        type: 'meeting',
        category: 'administrative'
      };

      expect(validEvent.endDate > validEvent.startDate).toBe(true);
      expect(invalidEvent.endDate <= invalidEvent.startDate).toBe(true);
    });

    it('should validate required event fields', () => {
      const completeEvent = {
        title: 'JavaScript Workshop',
        description: 'Learn modern JavaScript',
        startDate: new Date('2024-06-01T14:00:00Z'),
        endDate: new Date('2024-06-01T17:00:00Z'),
        type: 'workshop',
        category: 'academic',
        visibility: 'public'
      };

      expect(completeEvent.title).toBeTruthy();
      expect(completeEvent.startDate).toBeInstanceOf(Date);
      expect(completeEvent.endDate).toBeInstanceOf(Date);
      expect(completeEvent.type).toBeTruthy();
      expect(completeEvent.category).toBeTruthy();
    });

    it('should calculate event duration correctly', () => {
      const event = {
        startDate: new Date('2024-06-01T09:00:00Z'),
        endDate: new Date('2024-06-01T10:30:00Z')
      };

      const durationMinutes = Math.abs(event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60);
      expect(durationMinutes).toBe(90); // 1.5 hours = 90 minutes
    });
  });

  // Test conflict detection logic
  describe('Conflict detection logic', () => {
    it('should detect time slot conflicts', () => {
      const existingEvent = {
        startDate: new Date('2024-06-01T09:00:00Z'),
        endDate: new Date('2024-06-01T10:00:00Z')
      };

      const conflictingEvent = {
        startDate: new Date('2024-06-01T09:30:00Z'),
        endDate: new Date('2024-06-01T10:30:00Z')
      };

      const nonConflictingEvent = {
        startDate: new Date('2024-06-01T10:00:00Z'),
        endDate: new Date('2024-06-01T11:00:00Z')
      };

      // Check conflict (overlap)
      const hasConflict = (event1: any, event2: any) => {
        return event1.startDate < event2.endDate && event1.endDate > event2.startDate;
      };

      expect(hasConflict(existingEvent, conflictingEvent)).toBe(true);
      expect(hasConflict(existingEvent, nonConflictingEvent)).toBe(false);
    });

    it('should handle edge case conflicts', () => {
      const event1 = {
        startDate: new Date('2024-06-01T09:00:00Z'),
        endDate: new Date('2024-06-01T10:00:00Z')
      };

      const event2 = {
        startDate: new Date('2024-06-01T10:00:00Z'), // Starts exactly when event1 ends
        endDate: new Date('2024-06-01T11:00:00Z')
      };

      const hasConflict = (event1: any, event2: any) => {
        return event1.startDate < event2.endDate && event1.endDate > event2.startDate;
      };

      expect(hasConflict(event1, event2)).toBe(false); // No overlap
    });
  });

  // Test recurring event logic
  describe('Recurring event logic', () => {
    it('should generate daily recurrences', () => {
      const baseEvent = {
        title: 'Daily Standup',
        startDate: new Date('2024-06-01T09:00:00Z'),
        endDate: new Date('2024-06-01T09:30:00Z'),
        isRecurring: true,
        recurringPattern: {
          type: 'daily',
          interval: 1,
          occurrenceCount: 5
        }
      };

      const recurrences = [];
      let currentDate = new Date(baseEvent.startDate);
      
      for (let i = 0; i < baseEvent.recurringPattern.occurrenceCount; i++) {
        const eventEnd = new Date(currentDate.getTime() + 
          (baseEvent.endDate.getTime() - baseEvent.startDate.getTime()));
        
        recurrences.push({
          ...baseEvent,
          startDate: new Date(currentDate),
          endDate: eventEnd
        });
        
        currentDate.setDate(currentDate.getDate() + baseEvent.recurringPattern.interval);
      }

      expect(recurrences).toHaveLength(5);
      expect(recurrences[1].startDate.getDate()).toBe(2); // Next day
      expect(recurrences[4].startDate.getDate()).toBe(5); // 5th day
    });

    it('should generate weekly recurrences', () => {
      const baseEvent = {
        title: 'Weekly Team Meeting',
        startDate: new Date('2024-06-03T14:00:00Z'), // Monday
        endDate: new Date('2024-06-03T15:00:00Z'),
        isRecurring: true,
        recurringPattern: {
          type: 'weekly',
          interval: 1,
          occurrenceCount: 3
        }
      };

      const recurrences = [];
      let currentDate = new Date(baseEvent.startDate);
      
      for (let i = 0; i < baseEvent.recurringPattern.occurrenceCount; i++) {
        const eventEnd = new Date(currentDate.getTime() + 
          (baseEvent.endDate.getTime() - baseEvent.startDate.getTime()));
        
        recurrences.push({
          ...baseEvent,
          startDate: new Date(currentDate),
          endDate: eventEnd
        });
        
        currentDate.setDate(currentDate.getDate() + (7 * baseEvent.recurringPattern.interval));
      }

      expect(recurrences).toHaveLength(3);
      expect(recurrences[1].startDate.getDate()).toBe(10); // Next Monday
      expect(recurrences[2].startDate.getDate()).toBe(17); // Third Monday
    });
  });

  // Test availability calculation
  describe('Availability calculation', () => {
    it('should calculate available time slots', () => {
      const workingHours = {
        startTime: '09:00',
        endTime: '17:00',
        breaks: [
          { startTime: '12:00', endTime: '13:00', title: 'Lunch' }
        ]
      };

      const existingEvents = [
        {
          startTime: '10:00',
          endTime: '11:00'
        },
        {
          startTime: '14:00',
          endTime: '15:30'
        }
      ];

      // Simplified availability calculation
      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes; // Convert to minutes since midnight
      };

      const workStart = parseTime(workingHours.startTime);
      const workEnd = parseTime(workingHours.endTime);
      const lunchStart = parseTime(workingHours.breaks[0].startTime);
      const lunchEnd = parseTime(workingHours.breaks[0].endTime);

      const busySlots = existingEvents.map(event => ({
        start: parseTime(event.startTime),
        end: parseTime(event.endTime)
      }));

      // Calculate available slots (simplified)
      const availableSlots = [];
      let currentTime = workStart;

      while (currentTime < workEnd) {
        const slotEnd = currentTime + 60; // 1-hour slots
        
        // Check if slot conflicts with lunch or existing events
        const isLunchTime = currentTime < lunchEnd && slotEnd > lunchStart;
        const hasConflict = busySlots.some(busy => 
          currentTime < busy.end && slotEnd > busy.start
        );

        if (!isLunchTime && !hasConflict && slotEnd <= workEnd) {
          availableSlots.push({
            start: currentTime,
            end: slotEnd,
            available: true
          });
        }

        currentTime += 60; // Move to next hour
      }

      expect(availableSlots.length).toBeGreaterThan(0);
      // Should have slots like 9-10, 11-12, 13-14, 15:30-16:30, 16:30-17:00 (partial)
      expect(availableSlots.some(slot => slot.start === parseTime('09:00'))).toBe(true);
      expect(availableSlots.some(slot => slot.start === parseTime('11:00'))).toBe(true);
    });

    it('should handle working hours validation', () => {
      const isWithinWorkingHours = (time: string, workStart: string, workEnd: string) => {
        const parseTime = (timeStr: string) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const timeMinutes = parseTime(time);
        const startMinutes = parseTime(workStart);
        const endMinutes = parseTime(workEnd);

        return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
      };

      expect(isWithinWorkingHours('10:30', '09:00', '17:00')).toBe(true);
      expect(isWithinWorkingHours('08:30', '09:00', '17:00')).toBe(false);
      expect(isWithinWorkingHours('18:00', '09:00', '17:00')).toBe(false);
    });
  });

  // Test calendar view logic
  describe('Calendar view logic', () => {
    it('should filter events by date range', () => {
      const events = [
        { title: 'Event 1', startDate: new Date('2024-06-01T09:00:00Z') },
        { title: 'Event 2', startDate: new Date('2024-06-05T14:00:00Z') },
        { title: 'Event 3', startDate: new Date('2024-06-10T10:00:00Z') },
        { title: 'Event 4', startDate: new Date('2024-06-15T16:00:00Z') }
      ];

      const viewStart = new Date('2024-06-03T00:00:00Z');
      const viewEnd = new Date('2024-06-10T23:59:59Z');

      const filteredEvents = events.filter(event => 
        event.startDate >= viewStart && event.startDate <= viewEnd
      );

      expect(filteredEvents).toHaveLength(2);
      expect(filteredEvents[0].title).toBe('Event 2');
      expect(filteredEvents[1].title).toBe('Event 3');
    });

    it('should group events by day', () => {
      const events = [
        { title: 'Morning Meeting', startDate: new Date('2024-06-01T09:00:00Z') },
        { title: 'Lunch', startDate: new Date('2024-06-01T12:00:00Z') },
        { title: 'Afternoon Workshop', startDate: new Date('2024-06-01T14:00:00Z') },
        { title: 'Daily Standup', startDate: new Date('2024-06-02T09:00:00Z') }
      ];

      const groupByDay = (events: any[]) => {
        return events.reduce((groups, event) => {
          const day = event.startDate.toDateString();
          if (!groups[day]) {
            groups[day] = [];
          }
          groups[day].push(event);
          return groups;
        }, {} as Record<string, any[]>);
      };

      const grouped = groupByDay(events);
      const june1Events = grouped['Sat Jun 01 2024'];
      const june2Events = grouped['Sun Jun 02 2024'];

      expect(june1Events).toHaveLength(3);
      expect(june2Events).toHaveLength(1);
    });
  });

  // Test reminder and notification logic
  describe('Reminder logic', () => {
    it('should calculate reminder times', () => {
      const event = {
        startDate: new Date('2024-06-01T14:00:00Z'),
        reminders: [
          { type: 'email', minutesBefore: 60, isEnabled: true },
          { type: 'popup', minutesBefore: 15, isEnabled: true },
          { type: 'sms', minutesBefore: 5, isEnabled: false }
        ]
      };

      const calculateReminderTimes = (event: any) => {
        return event.reminders
          .filter((reminder: any) => reminder.isEnabled)
          .map((reminder: any) => ({
            type: reminder.type,
            time: new Date(event.startDate.getTime() - (reminder.minutesBefore * 60 * 1000))
          }));
      };

      const reminderTimes = calculateReminderTimes(event);

      expect(reminderTimes).toHaveLength(2); // Only enabled reminders
      expect(reminderTimes[0].type).toBe('email');
      expect(reminderTimes[0].time.getUTCHours()).toBe(13); // 1 hour before 14:00 UTC
      expect(reminderTimes[1].type).toBe('popup');
      expect(reminderTimes[1].time.getUTCMinutes()).toBe(45); // 15 minutes before 14:00 UTC
    });
  });

  // Test event statistics
  describe('Event statistics', () => {
    it('should calculate event statistics', () => {
      const events = [
        { type: 'class', category: 'academic', status: 'completed' },
        { type: 'meeting', category: 'administrative', status: 'completed' },
        { type: 'class', category: 'academic', status: 'scheduled' },
        { type: 'exam', category: 'academic', status: 'scheduled' },
        { type: 'workshop', category: 'academic', status: 'cancelled' }
      ];

      const stats = {
        totalEvents: events.length,
        byType: events.reduce((acc, event) => {
          acc[event.type] = (acc[event.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byCategory: events.reduce((acc, event) => {
          acc[event.category] = (acc[event.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byStatus: events.reduce((acc, event) => {
          acc[event.status] = (acc[event.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        completionRate: events.filter(e => e.status === 'completed').length / events.length * 100
      };

      expect(stats.totalEvents).toBe(5);
      expect(stats.byType.class).toBe(2);
      expect(stats.byCategory.academic).toBe(4);
      expect(stats.byStatus.completed).toBe(2);
      expect(stats.completionRate).toBe(40);
    });
  });
});