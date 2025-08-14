// __tests__/setup.ts
// Test setup and configuration for course service

import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-jwt-secret';
process.env['MONGODB_URI'] = 'mongodb://localhost:27017/yggdrasil-test';

// Mock shared utilities to prevent actual database connections during unit tests
jest.mock('@yggdrasil/database-schemas', () => ({
  connectDatabase: jest.fn().mockResolvedValue(undefined),
  disconnectDatabase: jest.fn().mockResolvedValue(undefined),
  CourseModel: {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    searchCourses: jest.fn().mockReturnValue({
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnValue([]),
    }),
    findByInstructor: jest.fn(),
    findPublished: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    }),
  },
  UserModel: {
    findById: jest.fn(),
  },
  EventModel: {
    find: jest.fn().mockResolvedValue([]),
  },
}));

// Mock shared utilities logger
jest.mock('@yggdrasil/shared-utilities', () => ({
  ResponseHelper: {
    success: (data: any, message?: string) => ({
      success: true,
      data,
      message: message || 'Success',
    }),
    error: (message: string, statusCode?: number) => ({
      success: false,
      message,
      statusCode: statusCode || 500,
    }),
    badRequest: (message: string) => ({
      success: false,
      message,
      statusCode: 400,
    }),
    unauthorized: (message: string) => ({
      success: false,
      message,
      statusCode: 401,
    }),
    forbidden: (message: string) => ({
      success: false,
      message,
      statusCode: 403,
    }),
    notFound: (message: string) => ({
      success: false,
      message,
      statusCode: 404,
    }),
    conflict: (message: string) => ({
      success: false,
      message,
      statusCode: 409,
    }),
  },
  courseLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  initializeJWT: jest.fn(),
  AuthFactory: {
    createServiceAuth: jest.fn().mockReturnValue({
      authenticateToken: jest.fn(),
      verifyToken: jest.fn(),
      optionalAuth: jest.fn(),
      requireRole: jest.fn(),
      adminOnly: jest.fn(),
      staffOnly: jest.fn(),
      teacherAndAbove: jest.fn(),
      authenticated: jest.fn(),
      requireOwnership: jest.fn(),
      requireOwnershipOrAdmin: jest.fn(),
      requireOwnershipOrStaff: jest.fn(),
      requireOwnershipOrTeacher: jest.fn(),
    }),
  },
}));

// Mock file system for .env loading
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

// Setup global test timeout
jest.setTimeout(30000);
