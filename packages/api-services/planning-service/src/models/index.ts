// Path: packages/api-services/planning-service/src/models/index.ts

// Mock models for development
export const CalendarEventModel = {
  create: async (data: any) => ({
    _id: 'mock-event-id',
    ...data,
    generateRecurrences: (endDate: Date) => [data],
    isUserAttending: (userId: string) => false,
    addAttendee: async (userId: string) => true,
    removeAttendee: async (userId: string) => true,
    hasConflict: (start: Date, end: Date) => false,
    canUserView: (userId: string) => true,
    canUserEdit: (userId: string) => data.organizer === userId
  }),
  findById: async (id: string) => null,
  find: async (query: any) => [],
  findByIdAndUpdate: async (id: string, data: any) => null,
  countDocuments: async (query: any) => 0,
  aggregate: async (pipeline: any[]) => [],
  findUpcoming: async (userId?: string, limit: number = 10) => [],
  findByUser: async (userId: string) => [],
  findByDateRange: async (startDate: Date, endDate: Date) => []
};

export const ScheduleModel = {
  create: async (data: any) => ({
    _id: 'mock-schedule-id',
    ...data,
    isUserAllowed: (userId: string) => true,
    getAvailableSlots: (start: Date, end: Date, duration: number) => [],
    hasConflict: async (start: Date, end: Date) => false,
    addEvent: async (eventId: string) => true,
    removeEvent: async (eventId: string) => true,
    isWithinWorkingHours: (date: Date) => true
  }),
  findById: async (id: string) => null,
  find: async (query: any) => [],
  findByUser: async (userId: string) => [],
  findByType: async (type: string) => [],
  findPublic: async () => []
};