// Jest setup for planning service tests
jest.setTimeout(30000);

// Mock environment variables
process.env.JWT_SECRET = 'your-super-secret-jwt-key-for-development-only';
process.env.PLANNING_SERVICE_PORT = '3005';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27018/yggdrasil-test';
process.env.NODE_ENV = 'test';