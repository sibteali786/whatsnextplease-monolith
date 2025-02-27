import { NotificationType } from '@prisma/client';
import { sseManager } from '../utils/SSEManager';
import { pushNotificationService } from './pushNotification.service';

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
    try {
      sseManager.sendNotification(recipient.id, notification);
      return {
        success: true,
        channel: 'SSE',
        error: null,
      };
    } catch (error) {
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
      return { success: true, channel: 'PUSH', error: null };
    } catch (error) {
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
    const results = await Promise.all([
      this.deliverViaPush(notification, recipient),
      this.deliverViaSSE(notification, recipient),
    ]);
    return results;
  }
}
