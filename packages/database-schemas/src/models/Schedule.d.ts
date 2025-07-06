import { Document, Model } from 'mongoose';
export interface CalendarEvent extends Document {
    title: string;
    description?: string;
    type: 'class' | 'exam' | 'meeting' | 'event' | 'holiday' | 'deadline';
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    location?: string;
    organizer: string;
    attendees: string[];
    courseId?: string;
    roomId?: string;
    isRecurring: boolean;
    recurrenceRule?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        interval: number;
        endDate?: Date;
        daysOfWeek?: number[];
    };
    parentEventId?: string;
    googleCalendarEventId?: string;
    status: 'confirmed' | 'tentative' | 'cancelled';
    visibility: 'public' | 'private' | 'restricted';
    priority: 'low' | 'medium' | 'high';
    reminders: {
        method: 'email' | 'popup' | 'sms';
        minutes: number;
    }[];
    tags: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ScheduleModel extends Model<CalendarEvent> {
    findByDateRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
    findByAttendee(userId: string): Promise<CalendarEvent[]>;
    findByCourse(courseId: string): Promise<CalendarEvent[]>;
    findByType(type: string): Promise<CalendarEvent[]>;
    checkConflicts(startDate: Date, endDate: Date, attendees: string[], excludeId?: string): Promise<CalendarEvent[]>;
    findUpcoming(userId: string, days?: number): Promise<CalendarEvent[]>;
}
export declare const ScheduleModel: ScheduleModel;
//# sourceMappingURL=Schedule.d.ts.map