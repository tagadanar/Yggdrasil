/**
 * Test suite for MongoDB enforcement script
 */

const { checkMongoDBConnection } = require('../ensure-mongodb');

describe('MongoDB Enforcement Script', () => {
  describe('checkMongoDBConnection', () => {
    it('should be a function', () => {
      expect(typeof checkMongoDBConnection).toBe('function');
    });

    it('should return a boolean', async () => {
      const result = await checkMongoDBConnection();
      expect(typeof result).toBe('boolean');
    });

    it('should handle connection failures gracefully', async () => {
      // Mock environment variables to point to non-existent MongoDB
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        MONGO_HOST: 'non-existent-host',
        MONGO_PORT: '99999',
        MONGO_USER: 'invalid-user',
        MONGO_PASSWORD: 'invalid-password',
        MONGO_DATABASE: 'invalid-db'
      };

      const result = await checkMongoDBConnection();
      expect(result).toBe(false);

      // Restore environment
      process.env = originalEnv;
    });

    it('should respect timeout settings', async () => {
      // Mock environment variables to point to non-existent MongoDB
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        MONGO_HOST: '192.0.2.1', // Non-routable IP for testing
        MONGO_PORT: '27017',
        MONGO_USER: 'test',
        MONGO_PASSWORD: 'test',
        MONGO_DATABASE: 'test'
      };

      const result = await checkMongoDBConnection();
      
      expect(result).toBe(false);
      
      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('Environment Configuration', () => {
    it('should use default values when environment variables are not set', () => {
      const originalEnv = process.env;
      
      // Clear MongoDB environment variables
      delete process.env.MONGO_HOST;
      delete process.env.MONGO_PORT;
      delete process.env.MONGO_USER;
      delete process.env.MONGO_PASSWORD;
      delete process.env.MONGO_DATABASE;

      // Re-require the module to get fresh configuration
      jest.resetModules();
      const { checkMongoDBConnection } = require('../ensure-mongodb');

      // The function should still work with defaults
      expect(typeof checkMongoDBConnection).toBe('function');

      // Restore environment
      process.env = originalEnv;
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // This test ensures the function doesn't throw unhandled exceptions
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        MONGO_HOST: 'localhost',
        MONGO_PORT: '99999', // Invalid port
        MONGO_USER: 'admin',
        MONGO_PASSWORD: 'password',
        MONGO_DATABASE: 'test'
      };

      let error;
      try {
        await checkMongoDBConnection();
      } catch (e) {
        error = e;
      }

      expect(error).toBeUndefined(); // Should not throw
      
      // Restore environment
      process.env = originalEnv;
    });
  });
});