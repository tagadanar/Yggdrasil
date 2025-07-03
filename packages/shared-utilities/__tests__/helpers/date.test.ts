// Path: packages/shared-utilities/__tests__/helpers/date.test.ts
import { DateHelper } from '../../src/helpers/date';

describe('DateHelper', () => {
  const testDate = new Date('2023-06-15T14:30:00.000Z');
  const testDate2 = new Date('2023-06-16T10:00:00.000Z');

  describe('parseDate', () => {
    it('should parse valid date strings', () => {
      const result = DateHelper.parseDate('2023-06-15T14:30:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(testDate.getTime());
    });

    it('should throw error for invalid date strings', () => {
      expect(() => DateHelper.parseDate('invalid-date')).toThrow('Invalid date string');
    });
  });

  describe('formatDate', () => {
    it('should format date in French locale', () => {
      const result = DateHelper.formatDate(testDate, 'fr-FR');
      expect(result).toContain('juin');
      expect(result).toContain('2023');
    });

    it('should format date in English locale', () => {
      const result = DateHelper.formatDate(testDate, 'en-US');
      expect(result).toContain('June');
      expect(result).toContain('2023');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const result = DateHelper.formatDateTime(testDate, 'en-US');
      expect(result).toContain('June');
      expect(result).toContain('2023');
      expect(result).toMatch(/\d{2}:\d{2}/); // Should contain time
    });
  });

  describe('startOfDay', () => {
    it('should return start of day', () => {
      const result = DateHelper.startOfDay(testDate);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('endOfDay', () => {
    it('should return end of day', () => {
      const result = DateHelper.endOfDay(testDate);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe('addDays', () => {
    it('should add days to date', () => {
      const result = DateHelper.addDays(testDate, 5);
      expect(result.getDate()).toBe(testDate.getDate() + 5);
    });

    it('should subtract days from date', () => {
      const result = DateHelper.addDays(testDate, -3);
      expect(result.getDate()).toBe(testDate.getDate() - 3);
    });
  });

  describe('addMonths', () => {
    it('should add months to date', () => {
      const result = DateHelper.addMonths(testDate, 2);
      expect(result.getMonth()).toBe(testDate.getMonth() + 2);
    });

    it('should subtract months from date', () => {
      const result = DateHelper.addMonths(testDate, -1);
      expect(result.getMonth()).toBe(testDate.getMonth() - 1);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(DateHelper.isPast(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(DateHelper.isPast(futureDate)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const futureDate = new Date('2030-01-01');
      expect(DateHelper.isFuture(futureDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(DateHelper.isFuture(pastDate)).toBe(false);
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const today = new Date();
      expect(DateHelper.isToday(today)).toBe(true);
    });

    it('should return false for other dates', () => {
      const yesterday = DateHelper.addDays(new Date(), -1);
      expect(DateHelper.isToday(yesterday)).toBe(false);
    });
  });

  describe('daysDifference', () => {
    it('should calculate days difference', () => {
      const result = DateHelper.daysDifference(testDate, testDate2);
      expect(result).toBe(1);
    });

    it('should handle negative differences', () => {
      const result = DateHelper.daysDifference(testDate2, testDate);
      expect(result).toBe(-1);
    });
  });

  describe('hoursDifference', () => {
    it('should calculate hours difference', () => {
      const date1 = new Date('2023-06-15T10:00:00.000Z');
      const date2 = new Date('2023-06-15T15:00:00.000Z');
      const result = DateHelper.hoursDifference(date1, date2);
      expect(result).toBe(5);
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const sameDay = new Date('2023-06-15T10:00:00.000Z');
      expect(DateHelper.isSameDay(testDate, sameDay)).toBe(true);
    });

    it('should return false for different days', () => {
      expect(DateHelper.isSameDay(testDate, testDate2)).toBe(false);
    });
  });

  describe('getWeekStart', () => {
    it('should return Monday as week start', () => {
      const wednesday = new Date('2023-06-14'); // Wednesday
      const weekStart = DateHelper.getWeekStart(wednesday);
      expect(weekStart.getDay()).toBe(1); // Monday
    });
  });

  describe('getWeekEnd', () => {
    it('should return Sunday as week end', () => {
      const wednesday = new Date('2023-06-14'); // Wednesday
      const weekEnd = DateHelper.getWeekEnd(wednesday);
      expect(weekEnd.getDay()).toBe(0); // Sunday
    });
  });

  describe('getMonthStart', () => {
    it('should return first day of month', () => {
      const monthStart = DateHelper.getMonthStart(testDate);
      expect(monthStart.getDate()).toBe(1);
      expect(monthStart.getMonth()).toBe(testDate.getMonth());
    });
  });

  describe('getMonthEnd', () => {
    it('should return last day of month', () => {
      const monthEnd = DateHelper.getMonthEnd(testDate);
      expect(monthEnd.getDate()).toBe(30); // June has 30 days
      expect(monthEnd.getMonth()).toBe(testDate.getMonth());
    });
  });

  describe('generateRecurringDates', () => {
    const startDate = new Date('2023-06-01');
    const endDate = new Date('2023-06-01');

    it('should generate daily recurring dates', () => {
      const pattern = {
        type: 'daily',
        interval: 1,
        endDate: new Date('2023-06-05'),
      };

      const dates = DateHelper.generateRecurringDates(startDate, endDate, pattern);
      expect(dates).toHaveLength(5);
    });

    it('should generate weekly recurring dates', () => {
      const pattern = {
        type: 'weekly',
        interval: 1,
        endDate: new Date('2023-06-22'),
      };

      const dates = DateHelper.generateRecurringDates(startDate, endDate, pattern);
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should generate monthly recurring dates', () => {
      const pattern = {
        type: 'monthly',
        interval: 1,
        endDate: new Date('2023-08-01'),
      };

      const dates = DateHelper.generateRecurringDates(startDate, endDate, pattern);
      expect(dates.length).toBeGreaterThan(0);
    });
  });

  describe('datesOverlap', () => {
    it('should return true for overlapping dates', () => {
      const start1 = new Date('2023-06-01T10:00:00Z');
      const end1 = new Date('2023-06-01T12:00:00Z');
      const start2 = new Date('2023-06-01T11:00:00Z');
      const end2 = new Date('2023-06-01T13:00:00Z');

      expect(DateHelper.datesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should return false for non-overlapping dates', () => {
      const start1 = new Date('2023-06-01T10:00:00Z');
      const end1 = new Date('2023-06-01T11:00:00Z');
      const start2 = new Date('2023-06-01T12:00:00Z');
      const end2 = new Date('2023-06-01T13:00:00Z');

      expect(DateHelper.datesOverlap(start1, end1, start2, end2)).toBe(false);
    });
  });

  describe('getAcademicYear', () => {
    it('should return correct academic year for fall semester', () => {
      const fallDate = new Date('2023-09-15');
      expect(DateHelper.getAcademicYear(fallDate)).toBe('2023-2024');
    });

    it('should return correct academic year for spring semester', () => {
      const springDate = new Date('2023-03-15');
      expect(DateHelper.getAcademicYear(springDate)).toBe('2022-2023');
    });
  });
});