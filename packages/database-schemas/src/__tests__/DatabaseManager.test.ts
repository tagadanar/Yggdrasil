// packages/database-schemas/src/__tests__/DatabaseManager.test.ts
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { DatabaseManager } from '../connection/multi-db';
import { config } from '@yggdrasil/shared-utilities';

describe('DatabaseManager - Phase 4.1 Validation', () => {
  let dbManager: DatabaseManager;
  const testServices = ['test-service-1', 'test-service-2'];

  beforeAll(async () => {
    // Ensure we have a test MongoDB URI
    if (!config.MONGODB_URI) {
      throw new Error('MONGODB_URI is required for DatabaseManager tests');
    }
  });

  beforeEach(() => {
    dbManager = new DatabaseManager();
  });

  afterEach(async () => {
    // Clean up connections after each test
    await dbManager.disconnectAll();
  });

  describe('Service Database Creation', () => {
    test('should create separate databases for different services', async () => {
      const connections = await Promise.all([
        dbManager.connect('auth-service'),
        dbManager.connect('user-service'),
        dbManager.connect('course-service'),
      ]);

      // Verify we have separate connections
      expect(connections).toHaveLength(3);

      // Verify each connection has different database names
      const dbNames = connections.map(conn => conn.db?.databaseName);
      expect(new Set(dbNames).size).toBe(3);

      // Verify naming convention
      expect(dbNames[0]).toMatch(/yggdrasil_auth_/);
      expect(dbNames[1]).toMatch(/yggdrasil_user_/);
      expect(dbNames[2]).toMatch(/yggdrasil_course_/);
    }, 30000);

    test('should reuse existing connections for same service', async () => {
      const connection1 = await dbManager.connect('auth-service');
      const connection2 = await dbManager.connect('auth-service');

      expect(connection1).toBe(connection2);
      expect(connection1.db?.databaseName).toBe(connection2.db?.databaseName);
    }, 15000);

    test('should handle service database URIs correctly', async () => {
      // Test with custom URI (should fall back to MONGODB_URI)
      const connection = await dbManager.connect('unknown-service');

      expect(connection).toBeDefined();
      expect(connection.readyState).toBe(1); // Connected
    }, 15000);
  });

  describe('Connection Management', () => {
    test('should track all service connections', async () => {
      await Promise.all([
        dbManager.connect('auth-service'),
        dbManager.connect('user-service'),
        dbManager.connect('course-service'),
      ]);

      const authConnection = dbManager.getConnection('auth-service');
      const userConnection = dbManager.getConnection('user-service');
      const courseConnection = dbManager.getConnection('course-service');

      expect(authConnection).toBeDefined();
      expect(userConnection).toBeDefined();
      expect(courseConnection).toBeDefined();
      expect(authConnection).not.toBe(userConnection);
    }, 20000);

    test('should disconnect specific service', async () => {
      await dbManager.connect('auth-service');
      await dbManager.connect('user-service');

      // Disconnect one service
      await dbManager.disconnect('auth-service');

      expect(dbManager.getConnection('auth-service')).toBeUndefined();
      expect(dbManager.getConnection('user-service')).toBeDefined();
    }, 15000);

    test('should disconnect all services', async () => {
      await Promise.all([
        dbManager.connect('auth-service'),
        dbManager.connect('user-service'),
        dbManager.connect('course-service'),
      ]);

      await dbManager.disconnectAll();

      expect(dbManager.getConnection('auth-service')).toBeUndefined();
      expect(dbManager.getConnection('user-service')).toBeUndefined();
      expect(dbManager.getConnection('course-service')).toBeUndefined();
    }, 20000);
  });

  describe('Error Handling', () => {
    test('should handle connection failures gracefully', async () => {
      const invalidDbManager = new DatabaseManager();

      await expect(
        invalidDbManager.connect('test-service', 'mongodb://invalid:27017/test'),
      ).rejects.toThrow();
    }, 10000);

    test('should handle duplicate connection attempts', async () => {
      const connection1Promise = dbManager.connect('auth-service');
      const connection2Promise = dbManager.connect('auth-service');

      const [connection1, connection2] = await Promise.all([
        connection1Promise,
        connection2Promise,
      ]);

      expect(connection1).toBe(connection2);
    }, 15000);
  });

  describe('Database Naming Convention', () => {
    test('should create correct database names for different environments', async () => {
      const connection = await dbManager.connect('auth-service');
      const dbName = connection.db?.databaseName;

      expect(dbName).toMatch(/yggdrasil_auth_(development|test|production)/);
    }, 15000);

    test('should handle service names with hyphens correctly', async () => {
      const connection = await dbManager.connect('enrollment-service');
      const dbName = connection.db?.databaseName;

      expect(dbName).toMatch(/yggdrasil_enrollment_/);
      expect(dbName).not.toContain('-');
    }, 15000);
  });

  describe('Concurrent Connections', () => {
    test('should handle multiple concurrent service connections', async () => {
      const services = ['auth-service', 'user-service', 'course-service', 'enrollment-service'];

      const connectionPromises = services.map(service =>
        dbManager.connect(service),
      );

      const connections = await Promise.all(connectionPromises);

      expect(connections).toHaveLength(4);
      connections.forEach(connection => {
        expect(connection.readyState).toBe(1); // Connected
      });

      // Verify all connections are different
      const connectionIds = connections.map(c => c.id);
      expect(new Set(connectionIds).size).toBe(4);
    }, 30000);
  });

  describe('Connection State Management', () => {
    test('should properly track connection states', async () => {
      const connection = await dbManager.connect('auth-service');

      expect(connection.readyState).toBe(1); // Connected

      await dbManager.disconnect('auth-service');

      expect(dbManager.getConnection('auth-service')).toBeUndefined();
    }, 15000);

    test('should handle reconnection scenarios', async () => {
      // First connection
      const connection1 = await dbManager.connect('auth-service');
      const db1Name = connection1.db?.databaseName;

      // Disconnect
      await dbManager.disconnect('auth-service');

      // Reconnect
      const connection2 = await dbManager.connect('auth-service');
      const db2Name = connection2.db?.databaseName;

      expect(db1Name).toBe(db2Name);
      expect(connection2.readyState).toBe(1);
    }, 20000);
  });
});
