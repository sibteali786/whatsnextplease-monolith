// utils/notifications/notificationService.ts
'use client';

import { NotificationType } from '@prisma/client';
import { createNotification as createNotificationAPI } from '@/db/repositories/notifications/notifications';
import { getCurrentUser } from '@/utils/user';

interface BaseNotificationData {
  type: NotificationType;
  message: string;
  userId?: string | null;
  clientId?: string | null;
  data?: any;
}

export class NotificationService {
  private static async getCurrentUserInfo() {
    try {
      return await getCurrentUser();
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Send notification with automatic current user context
   */
  static async sendNotification(
    params: Omit<BaseNotificationData, 'data'> & {
      data?: Partial<any>;
      includeCurrentUserContext?: boolean;
    }
  ) {
    try {
      let notificationData = params.data || {};

      // Add current user context if requested
      if (params.includeCurrentUserContext !== false) {
        const currentUser = await this.getCurrentUserInfo();
        if (currentUser) {
          notificationData = {
            ...notificationData,
            name: currentUser.name,
            username: currentUser.username,
            avatarUrl: currentUser.avatarUrl,
          };
        }
      }

      await createNotificationAPI({
        type: params.type,
        message: params.message,
        clientId: params.clientId || null,
        userId: params.userId || null,
        data: notificationData,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send multiple notifications
   */
  static async sendBulkNotifications(notifications: BaseNotificationData[]) {
    const promises = notifications.map(notification => this.sendNotification(notification));

    return Promise.allSettled(promises);
  }

  /**
   * Send notification to multiple users
   */
  static async sendToMultipleUsers(
    userIds: string[],
    params: Omit<BaseNotificationData, 'userId' | 'clientId'>
  ) {
    const notifications = userIds.map(userId => ({
      ...params,
      userId,
      clientId: null,
    }));

    return this.sendBulkNotifications(notifications);
  }

  /**
   * Send notification to multiple clients
   */
  static async sendToMultipleClients(
    clientIds: string[],
    params: Omit<BaseNotificationData, 'userId' | 'clientId'>
  ) {
    const notifications = clientIds.map(clientId => ({
      ...params,
      userId: null,
      clientId,
    }));

    return this.sendBulkNotifications(notifications);
  }
}
