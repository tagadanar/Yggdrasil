// Jest setup for news service tests
jest.setTimeout(30000);

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long-for-testing';
process.env.NEWS_SERVICE_PORT = '3003';
