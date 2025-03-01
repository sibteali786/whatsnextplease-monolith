import { Request, Response } from 'express';
import { NotificationController } from '../notification.controller';
import { NotificationService } from '../../services/notification.service';
import { sseManager } from '../../utils/SSEManager';
import { NotificationStatus, NotificationType, Roles } from '@prisma/client';
import {
  createMockNotification,
  createMockNotifications,
} from '../../test/factories/notificaton.factory';
import { BadRequestError } from '@wnp/types';

// Mock the entire NotificationService
jest.mock('../../services/notification.service', () => ({
  NotificationService: jest.fn(() => ({
    createNotification: jest.fn(),
    getUserNotifications: jest.fn(),
    markAsRead: jest.fn(),
  })),
}));

jest.mock('../../utils/SSEManager');

describe('NotificationController', () => {
  let controller: NotificationController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockNext: jest.Mock;
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup request and response mocks
    mockRequest = {
      params: {},
      body: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    // Initialize service mock
    mockNotificationService = new NotificationService() as jest.Mocked<NotificationService>;

    // Create controller instance with mocked service
    controller = new NotificationController(mockNotificationService);
  });

  describe('subscribe', () => {
    it('should add client to SSE manager', async () => {
      mockRequest.params = { userId: 'user123' };

      await controller.subscribe(mockRequest as Request, mockResponse as Response, mockNext);

      expect(sseManager.addClient).toHaveBeenCalledWith('user123', mockResponse);
    });
  });

  describe('create', () => {
    const notificationData = {
      type: NotificationType.TASK_ASSIGNED,
      message: 'Test notification',
      userId: 'user123',
    };

    it('should create notification successfully', async () => {
      const mockNotification = createMockNotification(notificationData);
      mockRequest.body = notificationData;

      mockNotificationService.createNotification.mockResolvedValue(mockNotification);

      await controller.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(notificationData);
      // Remove json expectation since we're not sending a response body
    });
  });

  describe('getUserNotifications', () => {
    it('should fetch user notifications successfully', async () => {
      const mockNotifications = createMockNotifications(1, {
        userId: 'user123',
      });
      mockRequest.params = { userId: 'user123' };
      mockRequest.query = { role: Roles.TASK_AGENT };
      mockNotificationService.getUserNotifications.mockResolvedValue(mockNotifications);

      await controller.getUserNotifications(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const validatedResponse = {
        notifications: mockNotifications,
        total: mockNotifications.length,
      };

      expect(mockResponse.json).toHaveBeenCalledWith(validatedResponse);
    });

    it('should handle fetch errors', async () => {
      mockRequest.params = { userId: 'user123' };
      mockRequest.query = { role: Roles.TASK_AGENT };
      const error = new Error('Fetch failed');
      mockNotificationService.getUserNotifications.mockRejectedValue(error);

      await controller.getUserNotifications(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Instead of checking response.json, verify that next was called with the error
      expect(mockNext).toHaveBeenCalledWith(error);
      // Verify that response.json was not called
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe('validation errors', () => {
    it('should handle missing userId', async () => {
      mockRequest.params = {}; // Missing userId
      mockRequest.query = { role: Roles.TASK_AGENT };

      await controller.getUserNotifications(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      // Verify that next was called with a ZodError
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error.name).toBe('ZodError');
    });

    it('should handle invalid role', async () => {
      mockRequest.params = { userId: 'user123' };
      mockRequest.query = { role: 'INVALID_ROLE' };

      await controller.getUserNotifications(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error.name).toBe('ZodError');
    });
  });

  describe('create validation', () => {
    it('should validate missing required fields', async () => {
      mockRequest.body = {
        message: 'Test notification',
        // Missing type field
      };

      await controller.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error.name).toBe('ZodError');
    });

    it('should validate missing userId and clientId', async () => {
      mockRequest.body = {
        type: 'TASK_ASSIGNED',
        message: 'Test notification',
        // Missing both userId and clientId
      };

      await controller.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.message).toBe('Either userId or clientId must be provided');
    });

    it('should validate invalid notification type', async () => {
      mockRequest.body = {
        type: 'INVALID_TYPE',
        message: 'Test notification',
        userId: 'user123',
      };

      await controller.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error.name).toBe('ZodError');
    });
  });

  describe('markAsRead', () => {
    const notificationId = '529ac636-2812-412d-a540-c3cb79c693f5';

    it('should mark notification as read successfully', async () => {
      const mockUpdatedNotification = {
        id: notificationId,
        status: NotificationStatus.READ,
      };

      mockRequest.params = { id: notificationId };
      mockNotificationService.markAsRead.mockResolvedValueOnce(mockUpdatedNotification);

      await controller.markAsRead(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(notificationId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedNotification);
    });

    it('should handle missing notification id', async () => {
      mockRequest.params = {};

      await controller.markAsRead(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error.name).toBe('ZodError');
    });

    it('should handle service errors', async () => {
      mockRequest.params = { id: notificationId };
      const error = new Error('Failed to update notification');
      mockNotificationService.markAsRead.mockRejectedValueOnce(error);

      await controller.markAsRead(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});
