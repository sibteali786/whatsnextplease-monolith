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
  deliveredAt?: Date;
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
      // Check if client has active SSE connection
      const hasActiveConnection = sseManager.hasClient(recipient.id);

      logger.debug(
        {
          recipientId: recipient.id,
          hasActiveConnection,
          activeClientsCount: sseManager.getTotalConnectionCount(),
        },
        'SSE Manager state before send'
      );

      if (!hasActiveConnection) {
        logger.info(
          {
            recipientId: recipient.id,
            recipientType: recipient.type,
            notificationType: notification.type,
          },
          'No active SSE connection, delivery will rely on push notification'
        );

        return {
          success: false,
          channel: 'SSE',
          error: 'No active SSE connection',
        };
      }

      // Attempt to send via SSE
      const sent = sseManager.sendNotification(recipient.id, notification);

      if (sent) {
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
          deliveredAt: new Date(),
        };
      } else {
        logger.warn(
          {
            recipientId: recipient.id,
            recipientType: recipient.type,
            notificationType: notification.type,
          },
          'SSE delivery failed, connection may be stale'
        );

        return {
          success: false,
          channel: 'SSE',
          error: 'Failed to send via SSE, connection may be stale',
        };
      }
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          recipientId: recipient.id,
          recipientType: recipient.type,
          notificationType: notification.type,
        },
        'SSE delivery failed with exception'
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

      return {
        success: true,
        channel: 'PUSH',
        error: null,
        deliveredAt: new Date(),
      };
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

    // Try SSE first (synchronous)
    const sseResult = this.deliverViaSSE(notification, recipient);

    // Always try push notification as well (async)
    const pushResult = await this.deliverViaPush(notification, recipient);

    const results = [sseResult, pushResult];

    logger.info(
      {
        recipientId: recipient.id,
        results,
        successCount: results.filter(r => r.success).length,
        totalChannels: results.length,
        sseSuccess: sseResult.success,
        pushSuccess: pushResult.success,
      },
      'Delivery to all channels completed'
    );

    return results;
  }

  /**
   * Deliver with intelligent fallback strategy
   * If user has active SSE connection, prefer SSE + Push for redundancy
   * If no SSE connection, rely primarily on Push
   */
  async deliverWithFallback(
    notification: NotificationPayload,
    recipient: NotificationRecipient
  ): Promise<DeliveryResults> {
    logger.debug(
      {
        recipientId: recipient.id,
        recipientType: recipient.type,
        notificationType: notification.type,
      },
      'Starting intelligent delivery with fallback'
    );

    const hasActiveSSE = sseManager.hasClient(recipient.id);

    if (hasActiveSSE) {
      // User has active SSE connection - try both for redundancy
      logger.debug({ recipientId: recipient.id }, 'User has active SSE, using dual delivery');
      return this.deliverToAll(notification, recipient);
    } else {
      // No active SSE - focus on push notification
      logger.debug({ recipientId: recipient.id }, 'No active SSE, focusing on push delivery');

      const pushResult = await this.deliverViaPush(notification, recipient);

      // Still record SSE attempt for reporting purposes
      const sseResult: DeliveryResultObject = {
        success: false,
        channel: 'SSE',
        error: 'No active connection available',
      };

      return [sseResult, pushResult];
    }
  }

  /**
   * Get delivery statistics for monitoring
   */
  getDeliveryStats() {
    return {
      activeSSEConnections: sseManager.getTotalConnectionCount(),
      activeClients: sseManager.getActiveUsers(),
    };
  }
}
