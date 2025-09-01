/* eslint-disable @typescript-eslint/no-explicit-any */
import webpush from 'web-push';
import prisma from '../config/db';
import { logger } from '../utils/logger';
import { env, environmentService } from '../config/environment';
import { NotificationType } from '@prisma/client';
export class PushNotificationService {
  constructor() {
    const { publicKey, privateKey, email } = environmentService.getVapidConfig();

    try {
      webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
      logger.info('VAPID details set successfully');
    } catch (error) {
      logger.error('Failed to set VAPID details:', error);
      throw error;
    }
  }
  private getNotificationUrl(type: NotificationType, data: any): string {
    const baseUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    switch (type) {
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_CREATED:
        return `${baseUrl}/taskOfferings`;

      case NotificationType.TASK_COMPLETED:
      case NotificationType.TASK_MODIFIED:
      case NotificationType.TASK_IN_PROGRESS:
      case NotificationType.TASK_OVERDUE:
        // If we have taskId, could navigate to specific task
        return data?.taskId
          ? `${baseUrl}/taskOfferings/${data.taskId}`
          : `${baseUrl}/taskOfferings`;
      case NotificationType.COMMENT_MENTION:
        // Direct link to the specific comment within the task
        return data?.taskId && data?.commentId
          ? `${baseUrl}/taskOfferings/${data.taskId}#comment-${data.commentId}`
          : data?.taskId
            ? `${baseUrl}/taskOfferings/${data.taskId}`
            : `${baseUrl}/taskOfferings`;

      case NotificationType.MESSAGE_RECEIVED:
        return `${baseUrl}/messages`;

      case NotificationType.PAYMENT_RECEIVED:
        return `${baseUrl}/billing`;

      case NotificationType.SYSTEM_ALERT:
        return `${baseUrl}/notifications/me`;

      default:
        return `${baseUrl}/notifications/me`;
    }
  }
  async saveSubscription(
    userId: string | null,
    clientId: string | null,
    subscription: webpush.PushSubscription
  ) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        clientId,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      },
      create: {
        userId,
        clientId,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      },
    });
  }

  async sendPushNotification(
    userId: string | null,
    clientId: string | null,
    message: string,
    data?: any
  ) {
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          OR: [{ userId: userId || undefined }, { clientId: clientId || undefined }],
        },
      });

      const pushPromises = subscriptions.map(subscription => {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };
        const contextualUrl = this.getNotificationUrl(data?.type, data);
        // Format notification payload
        const payload = {
          title: data?.pushNotification?.title || "What's Next Please",
          body: data?.pushNotification?.body || message,
          data: {
            ...data,
            timestamp: new Date().toISOString(),
            url: contextualUrl,
            // Include comment-specific data for mentions
            ...(data?.type === NotificationType.COMMENT_MENTION && {
              commentId: data.commentId,
              taskId: data.taskId,
              commentPreview: data.details?.commentPreview,
            }),
          },
        };

        console.log('Sending push notification:', payload);
        return webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      });

      await Promise.allSettled(pushPromises);
    } catch (error) {
      logger.error('Failed to send push notification:', error);
    }
  }

  async deleteSubscription(endpoint: string) {
    return prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }
}
export const pushNotificationService = new PushNotificationService();
