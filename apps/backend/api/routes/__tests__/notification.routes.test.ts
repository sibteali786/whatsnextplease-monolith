// src/routes/__tests__/notification.routes.test.ts
import { Express } from 'express';
import { createServer } from '../../server';
import {
  NotificationDeliveryStatus,
  NotificationStatus,
  NotificationType,
  Roles,
} from '@prisma/client';
import { prismaMock } from '../../test/mockPrisma';
import {
  createMockNotification,
  createMockNotifications,
} from '../../test/factories/notificaton.factory';
import { testRequest } from '../../test/testUtils';
import jwt from 'jsonwebtoken';
import { checkIfUserExists } from '../../utils/helperHandlers';
import { NotFoundError } from '@wnp/types';
jest.mock('./../../utils/helperHandlers');

// Type the mocked functions
const mockedCheckIfUserExists = jest.mocked(checkIfUserExists);
describe('Notification Routes', () => {
  let app: Express;
  let mockToken: string;
  const mockNotificationUpdate = prismaMock.notification.update as jest.Mock;
  const mockUserId = 'user123';
  beforeAll(async () => {
    app = await createServer();
    mockToken = jwt.sign(
      { id: mockUserId, role: Roles.TASK_AGENT },
      process.env.SECRET || 'test-secret'
    );
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
        deliveryStatus: NotificationDeliveryStatus.PENDING,
      };

      const mockNotification = createMockNotification(notificationData);
      prismaMock.notification.create.mockResolvedValueOnce(mockNotification);

      const response = await testRequest(app)
        .post('/notifications')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(notificationData)
        .expect(201);

      expect(response.status).toEqual(201);
      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: notificationData,
      });
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        type: 'INVALID_TYPE',
        message: '',
      };

      const response = await testRequest(app)
        .post('/notifications')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(422);

      expect(response.body).toEqual(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );
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
      mockedCheckIfUserExists.mockResolvedValue();
      const response = await testRequest(app)
        .get(`/notifications/${userId}`)
        .set('Authorization', `Bearer ${mockToken}`)
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
        .set('Authorization', `Bearer ${mockToken}`)
        .query({ role: 'INVALID_ROLE' })
        .expect(422);

      expect(response.body).toEqual(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );
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
        .set('Authorization', `Bearer ${mockToken}`)
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
      const error = new NotFoundError('Notification not found');
      prismaMock.notification.update.mockRejectedValueOnce(error);

      const response = await testRequest(app)
        .patch(`/notifications/${nonExistentId}/read`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);

      expect(response.body).toEqual(expect.objectContaining({ code: 'NOT_FOUND' }));
    });

    it('should handle invalid notification ID', async () => {
      const response = await testRequest(app)
        .patch(`/notifications/""/read`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(422);

      expect(response.body).toEqual(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
        })
      );
    });
  });
});
