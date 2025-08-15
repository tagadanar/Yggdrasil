// packages/api-services/planning-service/__tests__/unit/PromotionCrudController.test.ts
// Comprehensive unit tests for PromotionCrudController

import { Request, Response } from 'express';
import { PromotionCrudController } from '../../src/controllers/PromotionCrudController';
import { PromotionService } from '../../src/services/PromotionService';
import { ResponseHelper, AuthRequest } from '@yggdrasil/shared-utilities';

// Mock the PromotionService
jest.mock('../../src/services/PromotionService');
const MockedPromotionService = PromotionService as jest.MockedClass<typeof PromotionService>;

// Mock the static promotionService instance
const mockPromotionServiceInstance = {
  createPromotion: jest.fn(),
  getPromotions: jest.fn(),
  getPromotionWithDetails: jest.fn(),
  updatePromotion: jest.fn(),
  deletePromotion: jest.fn(),
  linkEventsToPromotion: jest.fn(),
  unlinkEventFromPromotion: jest.fn(),
  getStudentPromotion: jest.fn(),
};

// Mock ResponseHelper
jest.mock('@yggdrasil/shared-utilities', () => ({
  ResponseHelper: {
    success: jest.fn((data, message) => ({ success: true, data, message, statusCode: 200 })),
    error: jest.fn(message => ({ success: false, message, statusCode: 500 })),
    badRequest: jest.fn(message => ({ success: false, message, statusCode: 400 })),
    notFound: jest.fn(message => ({ success: false, message, statusCode: 404 })),
    forbidden: jest.fn(message => ({ success: false, message, statusCode: 403 })),
  },
  promotionValidationSchemas: {
    createPromotion: {
      safeParse: jest.fn(),
    },
    updatePromotion: {
      safeParse: jest.fn(),
    },
    filters: {
      safeParse: jest.fn(),
    },
    linkEvents: {
      safeParse: jest.fn(),
    },
  },
}));

describe('PromotionCrudController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock request and response
    mockRequest = {
      user: {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@test.com',
        role: 'admin',
      },
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock the static promotionService instance
    (PromotionCrudController as any).promotionService = mockPromotionServiceInstance;
  });

  describe('createPromotion', () => {
    const validPromotionData = {
      name: 'Test Promotion',
      semester: 1,
      intake: 'september',
      academicYear: '2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-06-30',
      description: 'Test promotion description',
    };

    it('should create promotion successfully for admin user', async () => {
      // Arrange
      const mockCreatedPromotion = { _id: '507f1f77bcf86cd799439012', ...validPromotionData };

      require('@yggdrasil/shared-utilities').promotionValidationSchemas.createPromotion.safeParse.mockReturnValue(
        {
          success: true,
          data: validPromotionData,
        },
      );

      mockPromotionServiceInstance.createPromotion.mockResolvedValue(mockCreatedPromotion as any);

      // Act
      await PromotionCrudController.createPromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockPromotionServiceInstanceInstance.createPromotion).toHaveBeenCalledWith(
        validPromotionData,
        '507f1f77bcf86cd799439011',
      );
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockCreatedPromotion,
        'Promotion created successfully',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should reject promotion creation for non-admin/staff user', async () => {
      // Arrange
      mockRequest.user!.role = 'student';

      // Act
      await PromotionCrudController.createPromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.forbidden).toHaveBeenCalledWith(
        'Only admin and staff can create promotions',
      );
      expect(mockPromotionServiceInstance.createPromotion).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      // Arrange
      const validationError = {
        success: false,
        error: {
          errors: [{ message: 'Name is required' }],
        },
      };

      require('@yggdrasil/shared-utilities').promotionValidationSchemas.createPromotion.safeParse.mockReturnValue(
        validationError,
      );

      // Act
      await PromotionCrudController.createPromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.badRequest).toHaveBeenCalledWith('Name is required');
      expect(mockPromotionServiceInstance.createPromotion).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      // Arrange
      require('@yggdrasil/shared-utilities').promotionValidationSchemas.createPromotion.safeParse.mockReturnValue(
        {
          success: true,
          data: validPromotionData,
        },
      );

      mockPromotionServiceInstance.createPromotion.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act
      await PromotionCrudController.createPromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.error).toHaveBeenCalledWith('Database connection failed');
    });
  });

  describe('getPromotions', () => {
    it('should retrieve promotions successfully', async () => {
      // Arrange
      const mockPromotions = [
        { _id: '1', name: 'Promotion 1' },
        { _id: '2', name: 'Promotion 2' },
      ];

      require('@yggdrasil/shared-utilities').promotionValidationSchemas.filters.safeParse.mockReturnValue(
        {
          success: true,
          data: {},
        },
      );

      mockPromotionServiceInstance.getPromotions.mockResolvedValue(mockPromotions as any);

      // Act
      await PromotionCrudController.getPromotions(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockPromotionServiceInstance.getPromotions).toHaveBeenCalledWith({});
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockPromotions,
        'Promotions retrieved successfully',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle query validation errors', async () => {
      // Arrange
      const validationError = {
        success: false,
        error: {
          errors: [{ message: 'Invalid filter parameter' }],
        },
      };

      require('@yggdrasil/shared-utilities').promotionValidationSchemas.filters.safeParse.mockReturnValue(
        validationError,
      );

      // Act
      await PromotionCrudController.getPromotions(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.badRequest).toHaveBeenCalledWith('Invalid filter parameter');
      expect(mockPromotionServiceInstance.getPromotions).not.toHaveBeenCalled();
    });
  });

  describe('getPromotion', () => {
    it('should retrieve single promotion successfully', async () => {
      // Arrange
      const promotionId = '507f1f77bcf86cd799439012';
      const mockPromotion = { _id: promotionId, name: 'Test Promotion' };

      mockRequest.params = { promotionId };
      mockPromotionServiceInstance.getPromotionWithDetails.mockResolvedValue(mockPromotion as any);

      // Act
      await PromotionCrudController.getPromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockPromotionServiceInstance.getPromotionWithDetails).toHaveBeenCalledWith(
        promotionId,
      );
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockPromotion,
        'Promotion retrieved successfully',
      );
    });

    it('should handle promotion not found', async () => {
      // Arrange
      const promotionId = '507f1f77bcf86cd799439012';
      mockRequest.params = { promotionId };
      mockPromotionServiceInstance.getPromotionWithDetails.mockResolvedValue(null);

      // Act
      await PromotionCrudController.getPromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.notFound).toHaveBeenCalledWith('Promotion not found');
    });
  });

  describe('updatePromotion', () => {
    const updateData = {
      name: 'Updated Promotion',
      description: 'Updated description',
    };

    it('should update promotion successfully for admin user', async () => {
      // Arrange
      const promotionId = '507f1f77bcf86cd799439012';
      const mockUpdatedPromotion = { _id: promotionId, ...updateData };

      mockRequest.params = { promotionId };
      require('@yggdrasil/shared-utilities').promotionValidationSchemas.updatePromotion.safeParse.mockReturnValue(
        {
          success: true,
          data: updateData,
        },
      );

      mockPromotionServiceInstance.updatePromotion.mockResolvedValue(mockUpdatedPromotion as any);

      // Act
      await PromotionCrudController.updatePromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockPromotionServiceInstance.updatePromotion).toHaveBeenCalledWith(
        promotionId,
        updateData,
      );
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockUpdatedPromotion,
        'Promotion updated successfully',
      );
    });

    it('should reject update for non-admin/staff user', async () => {
      // Arrange
      mockRequest.user!.role = 'teacher';

      // Act
      await PromotionCrudController.updatePromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.forbidden).toHaveBeenCalledWith(
        'Only admin and staff can update promotions',
      );
      expect(mockPromotionServiceInstance.updatePromotion).not.toHaveBeenCalled();
    });
  });

  describe('deletePromotion', () => {
    it('should delete promotion successfully for admin user', async () => {
      // Arrange
      const promotionId = '507f1f77bcf86cd799439012';
      mockRequest.params = { promotionId };
      mockPromotionServiceInstance.deletePromotion.mockResolvedValue(true);

      // Act
      await PromotionCrudController.deletePromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockPromotionServiceInstance.deletePromotion).toHaveBeenCalledWith(promotionId);
      expect(ResponseHelper.success).toHaveBeenCalledWith(null, 'Promotion deleted successfully');
    });

    it('should reject deletion for non-admin user', async () => {
      // Arrange
      mockRequest.user!.role = 'staff';

      // Act
      await PromotionCrudController.deletePromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.forbidden).toHaveBeenCalledWith('Only admin can delete promotions');
      expect(mockPromotionServiceInstance.deletePromotion).not.toHaveBeenCalled();
    });

    it('should handle promotion not found on delete', async () => {
      // Arrange
      const promotionId = '507f1f77bcf86cd799439012';
      mockRequest.params = { promotionId };
      mockPromotionServiceInstance.deletePromotion.mockResolvedValue(false);

      // Act
      await PromotionCrudController.deletePromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.notFound).toHaveBeenCalledWith('Promotion not found');
    });

    it('should handle deletion constraint errors', async () => {
      // Arrange
      const promotionId = '507f1f77bcf86cd799439012';
      mockRequest.params = { promotionId };
      mockPromotionServiceInstance.deletePromotion.mockRejectedValue(
        new Error('Cannot delete promotion with enrolled students'),
      );

      // Act
      await PromotionCrudController.deletePromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.badRequest).toHaveBeenCalledWith(
        'Cannot delete promotion with enrolled students',
      );
    });
  });

  describe('linkEventsToPromotion', () => {
    it('should link events successfully for admin user', async () => {
      // Arrange
      const promotionId = '507f1f77bcf86cd799439012';
      const eventIds = ['event1', 'event2'];
      const mockUpdatedPromotion = { _id: promotionId, eventIds };

      mockRequest.params = { promotionId };
      require('@yggdrasil/shared-utilities').promotionValidationSchemas.linkEvents.safeParse.mockReturnValue(
        {
          success: true,
          data: { eventIds },
        },
      );

      mockPromotionServiceInstance.linkEventsToPromotion.mockResolvedValue(
        mockUpdatedPromotion as any,
      );

      // Act
      await PromotionCrudController.linkEventsToPromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockPromotionServiceInstance.linkEventsToPromotion).toHaveBeenCalledWith(
        promotionId,
        eventIds,
      );
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockUpdatedPromotion,
        'Events linked successfully',
      );
    });

    it('should reject event linking for non-admin/staff user', async () => {
      // Arrange
      mockRequest.user!.role = 'teacher';

      // Act
      await PromotionCrudController.linkEventsToPromotion(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.forbidden).toHaveBeenCalledWith(
        'Only admin and staff can manage promotion events',
      );
      expect(mockPromotionServiceInstance.linkEventsToPromotion).not.toHaveBeenCalled();
    });
  });

  describe('getPromotionCalendar', () => {
    it('should retrieve promotion calendar for authorized user', async () => {
      // Arrange
      const promotionId = '507f1f77bcf86cd799439012';
      const mockPromotion = {
        _id: promotionId,
        events: [
          { _id: 'event1', title: 'Event 1' },
          { _id: 'event2', title: 'Event 2' },
        ],
      };

      mockRequest.params = { promotionId };
      mockPromotionServiceInstance.getPromotionWithDetails.mockResolvedValue(mockPromotion as any);

      // Act
      await PromotionCrudController.getPromotionCalendar(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(mockPromotionServiceInstance.getPromotionWithDetails).toHaveBeenCalledWith(
        promotionId,
      );
      expect(ResponseHelper.success).toHaveBeenCalledWith(
        mockPromotion.events,
        'Promotion calendar retrieved successfully',
      );
    });

    it('should validate student access to their own promotion calendar', async () => {
      // Arrange
      const promotionId = '507f1f77bcf86cd799439012';
      const differentPromotionId = '507f1f77bcf86cd799439013';

      mockRequest.user!.role = 'student';
      mockRequest.params = { promotionId };

      mockPromotionServiceInstance.getStudentPromotion.mockResolvedValue({
        _id: differentPromotionId,
      } as any);

      // Act
      await PromotionCrudController.getPromotionCalendar(
        mockRequest as AuthRequest,
        mockResponse as Response,
      );

      // Assert
      expect(ResponseHelper.forbidden).toHaveBeenCalledWith(
        'You can only access your own promotion calendar',
      );
    });
  });
});
