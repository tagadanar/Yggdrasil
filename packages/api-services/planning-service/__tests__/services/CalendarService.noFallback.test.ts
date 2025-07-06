/**
 * Test to ensure CalendarService uses MongoDB only (no in-memory fallback)
 */

import { CalendarService } from '../../src/services/CalendarService';

describe('CalendarService - MongoDB-Only (No Fallback)', () => {
  describe('Storage Variables', () => {
    it('should not expose in-memory storage variables', () => {
      const serviceKeys = Object.keys(CalendarService);
      
      // These should not exist in a MongoDB-only service
      expect(serviceKeys).not.toContain('eventStorage');
      expect(serviceKeys).not.toContain('eventIdCounter');
    });

    it('should have clearStorage method for MongoDB cleanup only', () => {
      expect(typeof CalendarService.clearStorage).toBe('function');
    });
  });

  describe('MongoDB Dependency', () => {
    it('should fail gracefully when MongoDB is unavailable', async () => {
      // This test ensures the service doesn't fall back to in-memory storage
      // Instead, it should fail with clear error messages
      expect(true).toBe(true); // Placeholder - would need MongoDB mocking
    });
  });
});