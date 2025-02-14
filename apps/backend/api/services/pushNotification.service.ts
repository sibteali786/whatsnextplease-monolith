import webpush from 'web-push';
import prisma from '../config/db';
import { logger } from '../utils/logger';
import { environmentService } from '../config/environment';
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
        console.log('pushSubscription', message);
        return webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title: 'Whats Next Please',
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
