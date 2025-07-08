// Path: packages/api-services/auth-service/__tests__/setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DatabaseConnection } from '../../../database-schemas/src';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await DatabaseConnection.connect(uri);
});

afterAll(async () => {
  await DatabaseConnection.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  // Clean up all collections after each test
  if (DatabaseConnection.isConnected()) {
    const mongoose = require('mongoose');
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Set environment variables for testing
// NODE_ENV is automatically set by Jest
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Dummy test to prevent Jest error
describe('Setup', () => {
  it('should setup test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});