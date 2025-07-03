// Path: packages/database-schemas/__tests__/connection/database.test.ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DatabaseConnection } from '../../src/connection/database';

describe('DatabaseConnection', () => {
  let mongoServer: MongoMemoryServer;
  let mongoUri: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await DatabaseConnection.disconnect();
    }
  });

  describe('connect', () => {
    it('should connect to MongoDB successfully', async () => {
      await DatabaseConnection.connect(mongoUri);
      
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    });

    it('should throw error for invalid connection string', async () => {
      const invalidUri = 'invalid-connection-string';
      
      await expect(DatabaseConnection.connect(invalidUri)).rejects.toThrow();
    });

    it('should not connect twice if already connected', async () => {
      await DatabaseConnection.connect(mongoUri);
      
      const isAlreadyConnected = await DatabaseConnection.connect(mongoUri);
      expect(isAlreadyConnected).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from MongoDB', async () => {
      await DatabaseConnection.connect(mongoUri);
      
      await DatabaseConnection.disconnect();
      expect(mongoose.connection.readyState).toBe(0); // 0 = disconnected
    });

    it('should handle disconnect when not connected', async () => {
      await expect(DatabaseConnection.disconnect()).resolves.not.toThrow();
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', async () => {
      await DatabaseConnection.connect(mongoUri);
      
      expect(DatabaseConnection.isConnected()).toBe(true);
    });

    it('should return false when not connected', () => {
      expect(DatabaseConnection.isConnected()).toBe(false);
    });
  });

  describe('getConnectionState', () => {
    it('should return current connection state', async () => {
      expect(DatabaseConnection.getConnectionState()).toBe('disconnected');
      
      await DatabaseConnection.connect(mongoUri);
      
      expect(DatabaseConnection.getConnectionState()).toBe('connected');
    });
  });

  describe('createIndexes', () => {
    it('should create indexes successfully', async () => {
      await DatabaseConnection.connect(mongoUri);
      
      await expect(DatabaseConnection.createIndexes()).resolves.not.toThrow();
    });

    it('should throw error when not connected', async () => {
      await expect(DatabaseConnection.createIndexes()).rejects.toThrow('Database not connected');
    });
  });
});