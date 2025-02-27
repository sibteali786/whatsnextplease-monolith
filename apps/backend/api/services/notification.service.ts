import { NotificationDeliveryStatus, NotificationStatus, Roles } from '@prisma/client';
import { CreateNotificationDto } from '@wnp/types';
import prisma from '../config/db';
import { checkIfClientExists, checkIfUserExists } from '../utils/helperHandlers';
import {
  DeliveryResults,
  NotificationDeliveryService,
  NotificationPayload,
  NotificationRecipient,
} from './notificationDelivery.service';

export class NotificationService {
  private deliveryResults: DeliveryResults;
  constructor() {
    this.deliveryResults = [];
  }
  async createNotification(data: CreateNotificationDto) {
    return await prisma.notification.create({
      data: { ...data, deliveryStatus: NotificationDeliveryStatus.PENDING },
    });
  }

  async deliverNotification(notification: NotificationPayload, data: CreateNotificationDto) {
    const deliveryService = new NotificationDeliveryService();
    if (data.userId) {
      const recipient: NotificationRecipient = { id: data.userId, type: 'USER' };
      const deliveryResult = await deliveryService.deliverToAll(notification, recipient);
      this.deliveryResults = deliveryResult;
    }
    if (data.clientId) {
      const recipient: NotificationRecipient = { id: data.clientId, type: 'CLIENT' };
      const deliveryResult = await deliveryService.deliverToAll(notification, recipient);
      this.deliveryResults = deliveryResult;
    }
  }

  getDeliveryResult(): DeliveryResults {
    return [...this.deliveryResults];
  }

  async updateDeliveryStatus(notificationId: string) {
    const status = this.determineDeliveryStatus();

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        deliveryStatus: status.deliveryStatus,
        deliveryError: status.deliveryError,
        lastDeliveryAttempt: new Date(),
      },
    });

    return status;
  }

  private determineDeliveryStatus() {
    if (!this.deliveryResults.length) {
      return {
        deliveryStatus: NotificationDeliveryStatus.FAILED,
        deliveryError: 'No Delivery attempts made',
      };
    }

    const flatDeliveryResults = this.deliveryResults.flat();
    const allSuccessfulDeliveries = flatDeliveryResults.every(delivery => delivery.success);
    const allFailedDeliveries = flatDeliveryResults.every(delivery => !delivery.success);

    if (allSuccessfulDeliveries) {
      return {
        deliveryStatus: NotificationDeliveryStatus.DELIVERED,
        deliveryError: null,
      };
    } else if (allFailedDeliveries) {
      const errors = flatDeliveryResults
        .map(result => `${result.channel}: ${result.error}`)
        .join(', ');

      return {
        deliveryStatus: NotificationDeliveryStatus.FAILED,
        deliveryError: errors,
      };
    } else {
      const failedChannels = flatDeliveryResults
        .filter(delivery => !delivery.success)
        .map(delivery => `${delivery.channel}: ${delivery.error}`)
        .join(', ');

      return {
        deliveryStatus: NotificationDeliveryStatus.PARTIAL,
        deliveryError: `Partial delivery. Failed: ${failedChannels}`,
      };
    }
  }

  async getUserNotifications(userId: string, role: Roles) {
    if (role === Roles.CLIENT) {
      await checkIfClientExists(userId);
      return prisma.notification.findMany({
        where: { clientId: userId },
        orderBy: { createdAt: 'desc' },
      });
    }
    await checkIfUserExists(userId);
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    const notification = await prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.READ },
      select: {
        id: true,
        status: true,
      },
    });

    return notification;
  }
  async markAllAsRead(userId: string, role: Roles) {
    return await prisma.$transaction(async tx => {
      if (role !== Roles.CLIENT) {
        // This will throw if user doesn't exist
        await checkIfUserExists(userId);

        const updatedNotificationsCount = await tx.notification.updateMany({
          where: { userId, status: NotificationStatus.UNREAD },
          data: { status: NotificationStatus.READ },
        });
        return updatedNotificationsCount;
      } else {
        // This will throw if client doesn't exist
        await checkIfClientExists(userId);

        const updatedNotificationsCount = await tx.notification.updateMany({
          where: { clientId: userId, status: NotificationStatus.UNREAD },
          data: { status: NotificationStatus.READ },
        });
        return updatedNotificationsCount;
      }
    });
  }
}
