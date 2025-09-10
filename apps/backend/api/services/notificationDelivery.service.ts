import { NotificationType } from '@prisma/client';
import { sseManager } from '../utils/SSEManager';
import { pushNotificationService } from './pushNotification.service';
import { logger } from '../utils/logger';

export interface NotificationPayload {
  type: NotificationType;
  message: string;
  data: unknown;
}
export interface DeliveryResultObject {
  success: boolean;
  channel: string;
  error: string | null;
}

export type DeliveryResults = Array<DeliveryResultObject>;
export interface NotificationRecipient {
  id: string;
  type: 'CLIENT' | 'USER';
}
export class NotificationDeliveryService {
  deliverViaSSE(
    notification: NotificationPayload,
    recipient: NotificationRecipient
  ): DeliveryResultObject {
    logger.debug(
      {
        recipientId: recipient.id,
        recipientType: recipient.type,
        notificationType: notification.type,
      },
      'Attempting SSE delivery'
    );

    try {
      // Log SSE manager state
      logger.debug(
        {
          recipientId: recipient.id,
          hasActiveConnection: sseManager.hasClient(recipient.id), // You'll need to add this method
        },
        'SSE Manager state before send'
      );

      sseManager.sendNotification(recipient.id, notification);

      logger.info(
        {
          recipientId: recipient.id,
          recipientType: recipient.type,
          notificationType: notification.type,
        },
        'SSE delivery successful'
      );

      return {
        success: true,
        channel: 'SSE',
        error: null,
      };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          recipientId: recipient.id,
          recipientType: recipient.type,
          notificationType: notification.type,
        },
        'SSE delivery failed'
      );

      return {
        success: false,
        channel: 'SSE',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deliverViaPush(
    notification: NotificationPayload,
    recipient: NotificationRecipient
  ): Promise<DeliveryResultObject> {
    logger.debug(
      {
        recipientId: recipient.id,
        recipientType: recipient.type,
        notificationType: notification.type,
      },
      'Attempting Push notification delivery'
    );

    try {
      if (recipient.type === 'CLIENT') {
        await pushNotificationService.sendPushNotification(
          null,
          recipient.id,
          notification.message,
          notification.data
        );
      } else {
        await pushNotificationService.sendPushNotification(
          recipient.id,
          null,
          notification.message,
          notification.data
        );
      }

      logger.info(
        {
          recipientId: recipient.id,
          recipientType: recipient.type,
          notificationType: notification.type,
        },
        'Push notification delivery successful'
      );

      return { success: true, channel: 'PUSH', error: null };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          recipientId: recipient.id,
          recipientType: recipient.type,
          notificationType: notification.type,
        },
        'Push notification delivery failed'
      );

      return {
        success: false,
        channel: 'PUSH',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deliverToAll(
    notification: NotificationPayload,
    recipient: NotificationRecipient
  ): Promise<DeliveryResults> {
    logger.debug(
      {
        recipientId: recipient.id,
        recipientType: recipient.type,
        notificationType: notification.type,
      },
      'Starting delivery to all channels'
    );

    const results = await Promise.all([
      this.deliverViaPush(notification, recipient),
      this.deliverViaSSE(notification, recipient),
    ]);

    logger.info(
      {
        recipientId: recipient.id,
        results,
        successCount: results.filter(r => r.success).length,
        totalChannels: results.length,
      },
      'Delivery to all channels completed'
    );

    return results;
  }
}
