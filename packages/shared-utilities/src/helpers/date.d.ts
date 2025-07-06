export declare class DateHelper {
    /**
     * Format date to ISO string for database storage
     */
    static toISOString(date: Date): string;
    /**
     * Parse date string to Date object
     */
    static parseDate(dateString: string): Date;
    /**
     * Format date for display
     */
    static formatDate(date: Date, locale?: string): string;
    /**
     * Format date and time for display
     */
    static formatDateTime(date: Date, locale?: string): string;
    /**
     * Get start of day
     */
    static startOfDay(date: Date): Date;
    /**
     * Get end of day
     */
    static endOfDay(date: Date): Date;
    /**
     * Add days to date
     */
    static addDays(date: Date, days: number): Date;
    /**
     * Add months to date
     */
    static addMonths(date: Date, months: number): Date;
    /**
     * Check if date is in the past
     */
    static isPast(date: Date): boolean;
    /**
     * Check if date is in the future
     */
    static isFuture(date: Date): boolean;
    /**
     * Check if date is today
     */
    static isToday(date: Date): boolean;
    /**
     * Get difference in days between two dates
     */
    static daysDifference(date1: Date, date2: Date): number;
    /**
     * Get difference in hours between two dates
     */
    static hoursDifference(date1: Date, date2: Date): number;
    /**
     * Check if two dates are on the same day
     */
    static isSameDay(date1: Date, date2: Date): boolean;
    /**
     * Get week start date (Monday)
     */
    static getWeekStart(date: Date): Date;
    /**
     * Get week end date (Sunday)
     */
    static getWeekEnd(date: Date): Date;
    /**
     * Get month start date
     */
    static getMonthStart(date: Date): Date;
    /**
     * Get month end date
     */
    static getMonthEnd(date: Date): Date;
    /**
     * Generate recurring dates based on pattern
     */
    static generateRecurringDates(startDate: Date, endDate: Date, pattern: {
        type: 'daily' | 'weekly' | 'monthly';
        interval: number;
        endDate?: Date;
        daysOfWeek?: number[];
    }): Date[];
    /**
     * Check if dates overlap
     */
    static datesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean;
    /**
     * Get academic year from date
     */
    static getAcademicYear(date: Date): string;
}
//# sourceMappingURL=date.d.ts.map