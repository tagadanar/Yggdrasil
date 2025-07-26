// Jest setup for planning service tests
jest.setTimeout(30000);

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.PLANNING_SERVICE_PORT = '3005';