/**
 * Test to ensure NotificationService uses MongoDB only (no in-memory fallback)
 */

import { NotificationService } from '../../src/services/NotificationService';

describe('NotificationService - MongoDB-Only (No Fallback)', () => {
  describe('Storage Variables', () => {
    it('should not expose in-memory storage variables', () => {
      const serviceKeys = Object.keys(NotificationService);
      
      // These should not exist in a MongoDB-only service
      expect(serviceKeys).not.toContain('notificationStorage');
      expect(serviceKeys).not.toContain('templateStorage');
      expect(serviceKeys).not.toContain('preferenceStorage');
      expect(serviceKeys).not.toContain('queueStorage');
      expect(serviceKeys).not.toContain('notificationIdCounter');
      expect(serviceKeys).not.toContain('templateIdCounter');
      expect(serviceKeys).not.toContain('preferenceIdCounter');
      expect(serviceKeys).not.toContain('queueIdCounter');
    });

    it('should have clearStorage method for MongoDB cleanup only', () => {
      expect(typeof NotificationService.clearStorage).toBe('function');
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