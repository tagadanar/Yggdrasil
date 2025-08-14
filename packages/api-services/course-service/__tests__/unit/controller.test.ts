// __tests__/unit/controller.test.ts
// Basic controller tests for course service

import { CourseController } from '../../src/controllers/CourseController';
import { Request, Response } from 'express';

// Mock the course service
jest.mock('../../src/services/CourseService');

describe('CourseController', () => {
  let controller: CourseController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    controller = new CourseController();
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getUserId helper', () => {
    test('should extract user ID from different user object structures', () => {
      // Access the private method through reflection for testing
      const getUserId = (controller as any).getUserId;

      // Test user.id
      expect(getUserId({ id: 'test-id-1' })).toBe('test-id-1');

      // Test user.userId
      expect(getUserId({ userId: 'test-id-2' })).toBe('test-id-2');

      // Test user._id
      expect(getUserId({ _id: 'test-id-3' })).toBe('test-id-3');

      // Test fallback priority (id takes precedence)
      expect(
        getUserId({
          id: 'id-value',
          userId: 'userId-value',
          _id: '_id-value',
        }),
      ).toBe('id-value');

      // Test userId fallback when id is missing
      expect(
        getUserId({
          userId: 'userId-value',
          _id: '_id-value',
        }),
      ).toBe('userId-value');

      // Test _id fallback when id and userId are missing
      expect(
        getUserId({
          _id: '_id-value',
        }),
      ).toBe('_id-value');
    });
  });

  describe('searchCourses', () => {
    test('should handle empty search filters', async () => {
      mockRequest.query = {};

      const result = await controller.searchCourses(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('getPublishedCourses', () => {
    test('should return published courses without authentication', async () => {
      const result = await controller.getPublishedCourses(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});
