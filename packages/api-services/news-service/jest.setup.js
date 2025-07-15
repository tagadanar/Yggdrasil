// Jest setup for news service tests
jest.setTimeout(30000);

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.NEWS_SERVICE_PORT = '3003';