import webpush from 'web-push';
import prisma from '../config/db';
import { logger } from '../utils/logger';
export class PushNotificationService {
  constructor() {
    webpush.setVapidDetails(
      `mailto:${process.env.WEB_PUSH_EMAIL!}`,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
  }

  async saveSubscription(
    userId: string | null,
    clientId: string | null,
    subscription: webpush.PushSubscription
  ) {
    return prisma.pushSubscription.create({
      data: {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        return webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title: 'WNP Notification',
            body: message,
            data,
          })
        );
      });
      await Promise.allSettled(pushPromises);
    } catch (error) {
      logger.error('Failed to send push notification:', error);
    }
  }
}
export const pushNotificationService = new PushNotificationService();
