"use strict";
// Path: packages/shared-utilities/src/helpers/date.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateHelper = void 0;
class DateHelper {
    /**
     * Format date to ISO string for database storage
     */
    static toISOString(date) {
        return date.toISOString();
    }
    /**
     * Parse date string to Date object
     */
    static parseDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date string');
        }
        return date;
    }
    /**
     * Format date for display
     */
    static formatDate(date, locale = 'fr-FR') {
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }
    /**
     * Format date and time for display
     */
    static formatDateTime(date, locale = 'fr-FR') {
        return date.toLocaleString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    /**
     * Get start of day
     */
    static startOfDay(date) {
        const newDate = new Date(date);
        newDate.setHours(0, 0, 0, 0);
        return newDate;
    }
    /**
     * Get end of day
     */
    static endOfDay(date) {
        const newDate = new Date(date);
        newDate.setHours(23, 59, 59, 999);
        return newDate;
    }
    /**
     * Add days to date
     */
    static addDays(date, days) {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + days);
        return newDate;
    }
    /**
     * Add months to date
     */
    static addMonths(date, months) {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + months);
        return newDate;
    }
    /**
     * Check if date is in the past
     */
    static isPast(date) {
        return date < new Date();
    }
    /**
     * Check if date is in the future
     */
    static isFuture(date) {
        return date > new Date();
    }
    /**
     * Check if date is today
     */
    static isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
    /**
     * Get difference in days between two dates
     */
    static daysDifference(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round((date2.getTime() - date1.getTime()) / oneDay);
    }
    /**
     * Get difference in hours between two dates
     */
    static hoursDifference(date1, date2) {
        const oneHour = 60 * 60 * 1000;
        return Math.round((date2.getTime() - date1.getTime()) / oneHour);
    }
    /**
     * Check if two dates are on the same day
     */
    static isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }
    /**
     * Get week start date (Monday)
     */
    static getWeekStart(date) {
        const newDate = new Date(date);
        const day = newDate.getDay();
        const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
        newDate.setDate(diff);
        return this.startOfDay(newDate);
    }
    /**
     * Get week end date (Sunday)
     */
    static getWeekEnd(date) {
        const weekStart = this.getWeekStart(date);
        return this.endOfDay(this.addDays(weekStart, 6));
    }
    /**
     * Get month start date
     */
    static getMonthStart(date) {
        const newDate = new Date(date);
        newDate.setDate(1);
        return this.startOfDay(newDate);
    }
    /**
     * Get month end date
     */
    static getMonthEnd(date) {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + 1, 0);
        return this.endOfDay(newDate);
    }
    /**
     * Generate recurring dates based on pattern
     */
    static generateRecurringDates(startDate, endDate, pattern) {
        const dates = [];
        let currentDate = new Date(startDate);
        const patternEndDate = pattern.endDate || this.addMonths(startDate, 12);
        while (currentDate <= patternEndDate) {
            if (pattern.type === 'weekly' && pattern.daysOfWeek) {
                // For weekly patterns with specific days
                const weekStart = this.getWeekStart(currentDate);
                for (const dayOfWeek of pattern.daysOfWeek) {
                    const eventDate = this.addDays(weekStart, dayOfWeek - 1);
                    if (eventDate >= startDate && eventDate <= patternEndDate) {
                        dates.push(eventDate);
                    }
                }
                currentDate = this.addDays(currentDate, 7 * pattern.interval);
            }
            else {
                dates.push(new Date(currentDate));
                switch (pattern.type) {
                    case 'daily':
                        currentDate = this.addDays(currentDate, pattern.interval);
                        break;
                    case 'weekly':
                        currentDate = this.addDays(currentDate, 7 * pattern.interval);
                        break;
                    case 'monthly':
                        currentDate = this.addMonths(currentDate, pattern.interval);
                        break;
                }
            }
        }
        return dates;
    }
    /**
     * Check if dates overlap
     */
    static datesOverlap(start1, end1, start2, end2) {
        return start1 < end2 && end1 > start2;
    }
    /**
     * Get academic year from date
     */
    static getAcademicYear(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        // Academic year starts in September (month 8)
        if (month >= 8) {
            return `${year}-${year + 1}`;
        }
        else {
            return `${year - 1}-${year}`;
        }
    }
}
exports.DateHelper = DateHelper;
//# sourceMappingURL=date.js.map