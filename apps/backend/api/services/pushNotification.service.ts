/* eslint-disable @typescript-eslint/no-explicit-any */
import webpush from 'web-push';
import prisma from '../config/db';
import { logger } from '../utils/logger';
import { env, environmentService } from '../config/environment';
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

        // Format notification payload
        const payload = {
          title: "What's Next Please",
          body: message,
          data: {
            ...data,
            timestamp: new Date().toISOString(),
            taskId: data?.taskId,
            url: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          },
        };
        console.log('Sending push notification:', payload);
        logger.info('Sending push notification:', payload);

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
