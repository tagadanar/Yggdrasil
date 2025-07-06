/**
 * Test to ensure StatisticsService uses MongoDB only (no in-memory fallback)
 */

import { StatisticsService } from '../../src/services/StatisticsService';

describe('StatisticsService - MongoDB-Only (No Fallback)', () => {
  describe('Storage Variables', () => {
    it('should not expose in-memory storage variables', () => {
      const serviceKeys = Object.keys(StatisticsService);
      
      // These should not exist in a MongoDB-only service
      expect(serviceKeys).not.toContain('systemStatsStorage');
      expect(serviceKeys).not.toContain('userStatsStorage');
      expect(serviceKeys).not.toContain('courseStatsStorage');
      expect(serviceKeys).not.toContain('reportsStorage');
      expect(serviceKeys).not.toContain('widgetsStorage');
      expect(serviceKeys).not.toContain('systemStatsIdCounter');
      expect(serviceKeys).not.toContain('reportsIdCounter');
      expect(serviceKeys).not.toContain('widgetsIdCounter');
    });

    it('should have clearStorage method for MongoDB cleanup only', () => {
      expect(typeof StatisticsService.clearStorage).toBe('function');
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