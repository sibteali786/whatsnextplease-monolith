// utils/notifications/taskNotifications.ts
'use client';

import { NotificationType } from '@prisma/client';
import { createNotification } from '@/db/repositories/notifications/notifications';
import { getCurrentUser } from '@/utils/user';

interface TaskUpdateNotificationData {
  taskId: string;
  taskTitle: string;
  createdByUserId?: string;
  createdByClientId?: string;
  assignedToId?: string;
  changes: {
    field: 'status' | 'priority' | 'taskCategory';
    oldValue: string;
    newValue: string;
  };
}

export class TaskNotificationService {
  private static async getCurrentUserInfo() {
    try {
      return await getCurrentUser();
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  private static getChangeDescription(field: string, oldValue: string, newValue: string): string {
    switch (field) {
      case 'status':
        return `Status changed from "${oldValue}" to "${newValue}"`;
      case 'priority':
        return `Priority changed from "${oldValue}" to "${newValue}"`;
      case 'taskCategory':
        return `Category changed from "${oldValue}" to "${newValue}"`;
      default:
        return `${field} updated`;
    }
  }

  private static transformEnumValue(value: string): string {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  static async sendTaskUpdateNotifications(data: TaskUpdateNotificationData) {
    try {
      const currentUser = await this.getCurrentUserInfo();
      if (!currentUser) {
        console.error('Cannot send notifications: Current user not found');
        return;
      }

      const { taskId, taskTitle, createdByUserId, createdByClientId, assignedToId, changes } = data;

      // Transform enum values for better readability
      const oldValueDisplay =
        changes.field === 'status' || changes.field === 'priority'
          ? this.transformEnumValue(changes.oldValue)
          : changes.oldValue;

      const newValueDisplay =
        changes.field === 'status' || changes.field === 'priority'
          ? this.transformEnumValue(changes.newValue)
          : changes.newValue;

      const changeDescription = this.getChangeDescription(
        changes.field,
        oldValueDisplay,
        newValueDisplay
      );
      const baseMessage = `Task "${taskTitle}" was updated by ${currentUser.name}`;

      // Notification data for push notifications
      const notificationData = {
        type: NotificationType.TASK_MODIFIED,
        taskId,
        details: {
          field: changes.field,
          oldValue: oldValueDisplay,
          newValue: newValueDisplay,
          changeDescription,
        },
        name: currentUser.name,
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl,
        url: `/taskOfferings/${taskId}`,
      };

      const notifications = [];
      // 1. Notify task creator (if different from current user)
      if (createdByUserId && createdByUserId !== currentUser.id) {
        notifications.push(
          createNotification({
            type: NotificationType.TASK_MODIFIED,
            message: `${baseMessage}: ${changeDescription}`,
            clientId: null,
            userId: createdByUserId,
            data: notificationData,
          })
        );
      }

      if (createdByClientId && createdByClientId !== currentUser.id) {
        notifications.push(
          createNotification({
            type: NotificationType.TASK_MODIFIED,
            message: `${baseMessage}: ${changeDescription}`,
            clientId: createdByClientId,
            userId: null,
            data: notificationData,
          })
        );
      }

      // 2. Notify assigned user (if different from current user and creator)
      if (assignedToId && assignedToId !== currentUser.id && assignedToId !== createdByUserId) {
        notifications.push(
          createNotification({
            type: NotificationType.TASK_MODIFIED,
            message: `${baseMessage}: ${changeDescription}`,
            clientId: null,
            userId: assignedToId,
            data: notificationData,
          })
        );
      }

      // Send all notifications
      await Promise.allSettled(notifications);
    } catch (error) {
      console.error('Failed to send task update notifications:', error);
      // Don't throw error to avoid breaking the main update flow
    }
  }
}
