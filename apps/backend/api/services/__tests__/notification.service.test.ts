import {
  NotificationDeliveryStatus,
  NotificationStatus,
  NotificationType,
  Roles,
} from '@prisma/client';
import { NotificationService } from '../notification.service';
import { prismaMock } from '../../test/mockPrisma';
import {
  createMockNotification,
  createMockNotifications,
} from '../../test/factories/notificaton.factory';
import { checkIfClientExists, checkIfUserExists } from '../../utils/helperHandlers';
import { NotFoundError } from '@wnp/types';

jest.mock('@/utils/SSEManager', () => ({
  sseManager: { sendNotification: jest.fn() },
}));
// Mock the helper functions
jest.mock('./../../utils/helperHandlers');

// Type the mocked functions
const mockedCheckIfUserExists = jest.mocked(checkIfUserExists);
const mockedCheckIfClientExists = jest.mocked(checkIfClientExists);
describe('NotificationService', () => {
  let service: NotificationService;
  const mockCreateNotification = prismaMock.notification.create as jest.Mock;
  const mockFindNotification = prismaMock.notification.findMany as jest.Mock;
  const mockUpdateNotification = prismaMock.notification.update as jest.Mock;
  const mockUpdateManyNotification = prismaMock.notification.updateMany as jest.Mock;

  beforeEach(() => {
    service = new NotificationService();
    jest.clearAllMocks();
  });

  describe('create()', () => {
    describe('when creating notifications', () => {
      const userNotificationData = {
        type: NotificationType.TASK_ASSIGNED,
        message: 'User notification',
        userId: 'user-123',
        data: { priority: 'high' },
        deliveryStatus: NotificationDeliveryStatus.PENDING,
      };

      it('should create notification', async () => {
        const mockNotification = createMockNotification({
          ...userNotificationData,
        });

        mockCreateNotification.mockResolvedValue(mockNotification);

        const result = await service.createNotification(userNotificationData);

        expect(result).toEqual(mockNotification);
        expect(mockCreateNotification).toHaveBeenCalledWith({
          data: userNotificationData,
        });
      });
    });
  });

  describe('getUserNotifications()', () => {
    describe('when fetching client notifications', () => {
      const clientId = 'client-123';

      it('should return notifications filtered by clientId', async () => {
        const mockNotifications = createMockNotifications(3, {
          clientId,
          type: NotificationType.PAYMENT_RECEIVED,
        });

        mockFindNotification.mockResolvedValue(mockNotifications);

        const result = await service.getUserNotifications(clientId, Roles.CLIENT);

        expect(result).toEqual(mockNotifications);
        expect(mockFindNotification).toHaveBeenCalledWith({
          where: { clientId },
          orderBy: { createdAt: 'desc' },
        });
      });
    });

    describe('when fetching user notifications', () => {
      const userId = 'user-123';

      it('should return notifications filtered by userId', async () => {
        const mockNotifications = createMockNotifications(3, {
          userId,
          type: NotificationType.TASK_ASSIGNED,
        });

        mockFindNotification.mockResolvedValue(mockNotifications);

        const result = await service.getUserNotifications(userId, Roles.SUPER_USER);

        expect(result).toEqual(mockNotifications);
        expect(mockFindNotification).toHaveBeenCalledWith({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
      });
    });
  });

  describe('markAsRead()', () => {
    const notificationId = 'notification-123';

    it('should update notification status to READ and return updated fields', async () => {
      const mockNotification = {
        id: notificationId,
        status: NotificationStatus.READ,
      };
      mockUpdateNotification.mockResolvedValue(mockNotification);

      const result = await service.markAsRead(notificationId);

      expect(result).toEqual({
        id: notificationId,
        status: NotificationStatus.READ,
      });
      expect(mockUpdateNotification).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { status: NotificationStatus.READ },
        select: {
          id: true,
          status: true,
        },
      });
    });

    it('should throw error when notification not found', async () => {
      mockUpdateNotification.mockRejectedValue(new Error('Notification not found'));

      await expect(service.markAsRead('non-existent-id')).rejects.toThrow('Notification not found');
    });

    it('should throw error when id is invalid', async () => {
      mockUpdateNotification.mockRejectedValue(new Error('Invalid notification ID'));

      await expect(service.markAsRead('invalid-id')).rejects.toThrow('Invalid notification ID');
    });
  });

  describe('mark all notifications as read', () => {
    const mockTransaction = jest.fn();

    beforeEach(() => {
      // Setup transaction mock
      prismaMock.$transaction.mockImplementation(mockTransaction);
    });
    afterEach(() => {
      jest.clearAllMocks();
    });
    it('should update all notifications status to READ and return updated count for TASK_AGENT', async () => {
      const userId = 'user-123';
      const role = Roles.TASK_AGENT;
      const updatedNotificationsCount = { count: 3 };

      // Mock the user check to return true
      mockedCheckIfUserExists.mockResolvedValue();

      // Mock the transaction to resolve with the updated count
      mockTransaction.mockImplementation(async callback => {
        return callback({
          notification: {
            updateMany: mockUpdateManyNotification,
          },
        });
      });

      // Mock the notification update
      mockUpdateManyNotification.mockResolvedValue(updatedNotificationsCount);
      const result = await service.markAllAsRead(userId, role);
      console.log(result);
      expect(result).toEqual(updatedNotificationsCount);
      expect(mockUpdateManyNotification).toHaveBeenCalledWith({
        where: { userId, status: NotificationStatus.UNREAD },
        data: { status: NotificationStatus.READ },
      });
    });
    it('should update all notifications status to READ and return updated count for CLIENT', async () => {
      const userId = 'user-123';
      const role = Roles.CLIENT;
      const updatedNotificationsCount = { count: 3 };
      // mocking the transaction to resolve with the updated count
      mockTransaction.mockImplementation(async callback => {
        return callback({
          notification: {
            updateMany: mockUpdateManyNotification,
          },
        });
      });
      mockedCheckIfClientExists.mockResolvedValue();
      mockUpdateManyNotification.mockResolvedValue(updatedNotificationsCount);

      const result = await service.markAllAsRead(userId, role);
      expect(result).toEqual(updatedNotificationsCount);
      expect(mockUpdateManyNotification).toHaveBeenCalledWith({
        where: { clientId: userId, status: NotificationStatus.UNREAD },
        data: { status: NotificationStatus.READ },
      });
    });
    it('should return error when userId is not found ', async () => {
      const userId = 'user-123';
      const role = Roles.TASK_AGENT;

      // Mock the user check to throw NotFoundError
      mockedCheckIfUserExists.mockRejectedValue(new NotFoundError('User', { userId }));

      // The transaction should not be called in this case
      mockTransaction.mockImplementation(async callback => {
        return callback({
          notification: {
            updateMany: mockUpdateManyNotification,
          },
        });
      });

      await expect(service.markAllAsRead(userId, role)).rejects.toThrow(NotFoundError);

      // Verify updateMany was not called
      expect(mockUpdateManyNotification).not.toHaveBeenCalled();
    });
  });
});
