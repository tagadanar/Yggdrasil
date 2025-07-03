// Path: packages/shared-utilities/src/helpers/date.ts

export class DateHelper {
  /**
   * Format date to ISO string for database storage
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse date string to Date object
   */
  static parseDate(dateString: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date string');
    }
    return date;
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date, locale = 'fr-FR'): string {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format date and time for display
   */
  static formatDateTime(date: Date, locale = 'fr-FR'): string {
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
  static startOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }

  /**
   * Get end of day
   */
  static endOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  }

  /**
   * Add days to date
   */
  static addDays(date: Date, days: number): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }

  /**
   * Add months to date
   */
  static addMonths(date: Date, months: number): Date {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: Date): boolean {
    return date < new Date();
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date: Date): boolean {
    return date > new Date();
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Get difference in days between two dates
   */
  static daysDifference(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((date2.getTime() - date1.getTime()) / oneDay);
  }

  /**
   * Get difference in hours between two dates
   */
  static hoursDifference(date1: Date, date2: Date): number {
    const oneHour = 60 * 60 * 1000;
    return Math.round((date2.getTime() - date1.getTime()) / oneHour);
  }

  /**
   * Check if two dates are on the same day
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Get week start date (Monday)
   */
  static getWeekStart(date: Date): Date {
    const newDate = new Date(date);
    const day = newDate.getDay();
    const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
    newDate.setDate(diff);
    return this.startOfDay(newDate);
  }

  /**
   * Get week end date (Sunday)
   */
  static getWeekEnd(date: Date): Date {
    const weekStart = this.getWeekStart(date);
    return this.endOfDay(this.addDays(weekStart, 6));
  }

  /**
   * Get month start date
   */
  static getMonthStart(date: Date): Date {
    const newDate = new Date(date);
    newDate.setDate(1);
    return this.startOfDay(newDate);
  }

  /**
   * Get month end date
   */
  static getMonthEnd(date: Date): Date {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + 1, 0);
    return this.endOfDay(newDate);
  }

  /**
   * Generate recurring dates based on pattern
   */
  static generateRecurringDates(
    startDate: Date,
    endDate: Date,
    pattern: {
      type: 'daily' | 'weekly' | 'monthly';
      interval: number;
      endDate?: Date;
      daysOfWeek?: number[];
    }
  ): Date[] {
    const dates: Date[] = [];
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
      } else {
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
  static datesOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Get academic year from date
   */
  static getAcademicYear(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Academic year starts in September (month 8)
    if (month >= 8) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }
}