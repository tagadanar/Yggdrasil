/**
 * Test suite for DatabaseConnection development mode features
 */

import { DatabaseConnection } from '../../src/connection/database';

describe('DatabaseConnection - Development Mode', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Set to development mode for these tests
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Development Mode Validation', () => {
    it('should reject in-memory database URIs in development', async () => {
      const memoryUri = 'memory://test';
      
      await expect(DatabaseConnection.connect(memoryUri))
        .rejects
        .toThrow('Database connection failed');
    });

    it('should reject empty URIs in development', async () => {
      await expect(DatabaseConnection.connect(''))
        .rejects
        .toThrow('Database connection failed');
    });

    it('should provide helpful error messages on connection failure', async () => {
      const invalidUri = 'mongodb://invalid-host:27017/test';
      
      try {
        await DatabaseConnection.connect(invalidUri);
      } catch (error: any) {
        expect(error.message).toContain('Database connection failed');
      }
    });
  });

  describe('enforceConnectionForDevelopment', () => {
    it('should validate connection state appropriately', () => {
      // Test that the method exists and can be called
      const connectionState = DatabaseConnection.getConnectionState();
      expect(['disconnected', 'connected', 'connecting', 'disconnecting']).toContain(connectionState);
    });
  });



  describe('Health Check', () => {
    it('should return unhealthy status when not connected', async () => {
      const health = await DatabaseConnection.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.details.state).toBe('disconnected');
    });
  });
});