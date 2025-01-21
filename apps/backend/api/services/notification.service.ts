import { NotificationStatus, Roles } from '@prisma/client';
import { CreateNotificationDto } from '@wnp/types';
import { sseManager } from '../utils/SSEManager';
import prisma from '../config/db';
import { checkIfClientExists, checkIfUserExists } from '../utils/helperHandlers';
import { logger } from '../utils/logger';

export class NotificationService {
  async create(data: CreateNotificationDto) {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        message: data.message,
        data: data.data,
        userId: data.userId,
        clientId: data.clientId,
      },
    });

    if (data.userId) {
      sseManager.sendNotification(data.userId, notification);
    }
    if (data.clientId) {
      sseManager.sendNotification(data.clientId, notification);
    }

    return notification;
  }

  async getUserNotifications(userId: string, role: Roles) {
    console.log(userId, role);
    if (role === Roles.CLIENT) {
      return prisma.notification.findMany({
        where: { clientId: userId },
        orderBy: { createdAt: 'desc' },
      });
    }
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
        const doesUserExist = await checkIfUserExists(userId);
        if (!doesUserExist) {
          logger.warn({ userId }, 'User not found');
          throw new Error('User not found');
        }
        const updatedNotificationsCount = await tx.notification.updateMany({
          where: { userId, status: NotificationStatus.UNREAD },
          data: { status: NotificationStatus.READ },
        });
        return updatedNotificationsCount;
      } else {
        const doesClientExist = await checkIfClientExists(userId);
        if (!doesClientExist) {
          logger.warn({ userId }, 'Client not found');
          throw new Error('Client not found');
        }
        const updatedNotificationsCount = await tx.notification.updateMany({
          where: { clientId: userId, status: NotificationStatus.UNREAD },
          data: { status: NotificationStatus.READ },
        });
        return updatedNotificationsCount;
      }
    });
  }
}
