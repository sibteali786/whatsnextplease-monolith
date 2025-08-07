// utils/notifications/taskNotifications.server.ts
'use server';

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

interface TaskCreationNotificationData {
  taskId: string;
  taskTitle: string;
  assignedToId?: string;
  priority: string;
  status: string;
  category: string;
}

// Helper functions (not exported, so they can be regular functions)
async function getCurrentUserInfo() {
  try {
    return await getCurrentUser();
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

function getChangeDescription(field: string, oldValue: string, newValue: string): string {
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

function transformEnumValue(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Exported async functions (these are allowed in 'use server' files)
export async function sendTaskUpdateNotifications(data: TaskUpdateNotificationData) {
  console.log('SERVER: Sending task update notifications with data:', data);
  try {
    const currentUser = await getCurrentUserInfo();

    if (!currentUser) {
      console.error('Cannot send notifications: Current user not found');
      return;
    }

    const { taskId, taskTitle, createdByUserId, createdByClientId, assignedToId, changes } = data;

    // Transform enum values for better readability
    const oldValueDisplay =
      changes.field === 'status' || changes.field === 'priority'
        ? transformEnumValue(changes.oldValue)
        : changes.oldValue;

    const newValueDisplay =
      changes.field === 'status' || changes.field === 'priority'
        ? transformEnumValue(changes.newValue)
        : changes.newValue;

    const changeDescription = getChangeDescription(changes.field, oldValueDisplay, newValueDisplay);
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
      console.log('Sending notification to creator (user):', createdByUserId);
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
      console.log('Sending notification to creator (client):', createdByClientId);
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
      console.log('Sending notification to assignee:', assignedToId);
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

    console.log(`Sending ${notifications.length} notifications`);

    // Send all notifications
    await Promise.allSettled(notifications);
    console.log('All notifications sent successfully');
  } catch (error) {
    console.error('Failed to send task update notifications:', error);
    // Don't throw error to avoid breaking the main update flow
  }
}

export async function sendTaskCreationNotifications(data: TaskCreationNotificationData) {
  console.log('SERVER: Sending task creation notifications with data:', data);
  try {
    const currentUser = await getCurrentUserInfo();
    if (!currentUser) {
      console.error('Cannot send notifications: Current user not found');
      return;
    }

    const { taskId, taskTitle, assignedToId, priority, status, category } = data;

    // Transform enum values for better readability
    const priorityDisplay = transformEnumValue(priority);
    const statusDisplay = transformEnumValue(status);

    // Notification data for push notifications
    const notificationData = {
      type: NotificationType.TASK_CREATED,
      taskId,
      details: {
        status: statusDisplay,
        priority: priorityDisplay,
        category,
      },
      name: currentUser.name,
      username: currentUser.username,
      avatarUrl: currentUser.avatarUrl,
      url: `/taskOfferings/${taskId}`,
    };

    const notifications = [];

    // Send notification to assigned user (if any)
    if (assignedToId && assignedToId !== currentUser.id) {
      notifications.push(
        createNotification({
          type: NotificationType.TASK_ASSIGNED,
          message: `Task "${taskTitle}" has been assigned to you by ${currentUser.name}`,
          clientId: null,
          userId: assignedToId,
          data: {
            ...notificationData,
            type: NotificationType.TASK_ASSIGNED,
          },
        })
      );
    }

    // Send all notifications
    await Promise.allSettled(notifications);
  } catch (error) {
    console.error('Failed to send task creation notifications:', error);
    // Don't throw error to avoid breaking the main creation flow
  }
}
