import { NotificationStatus, NotificationType, Roles } from '@prisma/client';
import { NotificationService } from '../notification.service';
import { prismaMock } from '../../test/mockPrisma';
import { sseManager } from '../../utils/SSEManager';
import {
  createMockNotification,
  createMockNotifications,
} from '../../test/factories/notificaton.factory';

jest.mock('@/utils/SSEManager', () => ({
  sseManager: { sendNotification: jest.fn() },
}));

describe('NotificationService', () => {
  let service: NotificationService;
  const mockCreateNotification = prismaMock.notification.create as jest.Mock;
  const mockFindNotification = prismaMock.notification.findMany as jest.Mock;
  const mockUpdateNotification = prismaMock.notification.update as jest.Mock;

  beforeEach(() => {
    service = new NotificationService();
    jest.clearAllMocks();
  });

  describe('create()', () => {
    describe('when creating user notifications', () => {
      const userNotificationData = {
        type: NotificationType.TASK_ASSIGNED,
        message: 'User notification',
        userId: 'user-123',
        data: { priority: 'high' },
      };

      it('should create and send SSE notification to user', async () => {
        const mockNotification = createMockNotification({
          ...userNotificationData,
        });

        mockCreateNotification.mockResolvedValue(mockNotification);

        const result = await service.create(userNotificationData);

        expect(result).toEqual(mockNotification);
        expect(mockCreateNotification).toHaveBeenCalledWith({
          data: userNotificationData,
        });
        expect(sseManager.sendNotification).toHaveBeenCalledWith(
          userNotificationData.userId,
          mockNotification
        );
      });
    });

    describe('when creating client notifications', () => {
      const clientNotificationData = {
        type: NotificationType.PAYMENT_RECEIVED,
        message: 'Client notification',
        clientId: 'client-123',
        data: { amount: 1000 },
      };

      it('should create and send SSE notification to client', async () => {
        const mockNotification = createMockNotification({
          ...clientNotificationData,
        });

        mockCreateNotification.mockResolvedValue(mockNotification);

        const result = await service.create(clientNotificationData);

        expect(result).toEqual(mockNotification);
        expect(sseManager.sendNotification).toHaveBeenCalledWith(
          clientNotificationData.clientId,
          mockNotification
        );
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
});
