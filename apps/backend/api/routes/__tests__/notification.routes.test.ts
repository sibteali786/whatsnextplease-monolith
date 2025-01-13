// src/routes/__tests__/notification.routes.test.ts
import { Express } from 'express';
import { createServer } from '../../server';
import { NotificationStatus, NotificationType, Roles } from '@prisma/client';
import { prismaMock } from '../../test/mockPrisma';
import {
  createMockNotification,
  createMockNotifications,
} from '../../test/factories/notificaton.factory';
import { testRequest } from '../../test/testUtils';

describe('Notification Routes', () => {
  let app: Express;
  const mockNotificationUpdate = prismaMock.notification.update as jest.Mock;

  beforeAll(async () => {
    app = await createServer();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /', () => {
    it('should create a new notification', async () => {
      const notificationData = {
        type: NotificationType.TASK_ASSIGNED,
        message: 'Test notification',
        userId: 'user123',
        data: { testData: 'test' },
      };

      const mockNotification = createMockNotification(notificationData);
      prismaMock.notification.create.mockResolvedValueOnce(mockNotification);

      const response = await testRequest(app)
        .post('/notifications')
        .send(notificationData)
        .expect(201);

      expect(response.body).toEqual(expect.objectContaining(notificationData));
      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: notificationData,
      });
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        type: 'INVALID_TYPE',
        message: '',
      };

      const response = await testRequest(app).post('/notifications').send(invalidData).expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /:userId', () => {
    it('should return user notifications', async () => {
      const userId = 'user123';
      const mockNotifications = createMockNotifications(3, {
        userId,
        type: NotificationType.TASK_ASSIGNED,
      });

      prismaMock.notification.findMany.mockResolvedValueOnce(mockNotifications);

      const response = await testRequest(app)
        .get(`/notifications/${userId}`)
        .query({ role: Roles.TASK_AGENT })
        .expect(200);

      expect(response.body.total).toEqual(3);
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle invalid role parameter', async () => {
      const response = await testRequest(app)
        .get('/notifications/user123')
        .query({ role: 'INVALID_ROLE' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  // describe("GET /subscribe/:userId", () => {
  //   it("should establish SSE connection", async () => {
  //     const userId = "user123";

  //     const response = await testRequest(app)
  //       .get(`/notifications/subscribe/${userId}`)
  //       .expect(200)
  //       .expect("Content-Type", "text/event-stream")
  //       .expect("Cache-Control", "no-cache")
  //       .expect("Connection", "keep-alive");

  //     // Note: Testing actual SSE events would require a different approach
  //     // as supertest doesn't maintain persistent connections
  //   });
  // });

  describe('PATCH /:id/read', () => {
    it('should mark notification as read', async () => {
      const notificationId = '529ac636-2812-412d-a540-c3cb79c693f5';
      mockNotificationUpdate.mockResolvedValueOnce({
        id: notificationId,
        status: NotificationStatus.READ,
      });
      const response = await testRequest(app)
        .patch(`/notifications/${notificationId}/read`)
        .expect(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: notificationId,
          status: NotificationStatus.READ,
        })
      );
      expect(mockNotificationUpdate).toHaveBeenCalledWith({
        where: { id: notificationId },
        select: { id: true, status: true },
        data: { status: NotificationStatus.READ },
      });
    });
    it('should handle non-existent notification', async () => {
      const nonExistentId = '529ac636-2812-412d-a540-c3cb79c693f5';
      prismaMock.notification.update.mockRejectedValueOnce(new Error('Notification not found'));

      const response = await testRequest(app)
        .patch(`/notifications/${nonExistentId}/read`)
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to mark notification as read',
        message: 'Notification not found',
      });
    });

    it('should handle invalid notification ID', async () => {
      const response = await testRequest(app).patch(`/notifications/""/read`).expect(400);

      expect(response.body).toEqual({
        error: 'Validation error',
        message: 'Invalid notification ID format - must be a valid UUID',
      });
    });
  });
});
