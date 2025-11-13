/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/notifications/taskNotifications.server.ts
'use server';

import { NotificationType } from '@prisma/client';
import { createNotification } from '@/db/repositories/notifications/notifications';
import { getCurrentUser } from '@/utils/user';
import { TaskChange } from './taskNotifications';

interface TaskUpdateNotificationData {
  taskId: string;
  taskTitle: string;
  createdByUserId?: string;
  createdByClientId?: string;
  assignedToId?: string;
  associatedClientId?: string;
  changes: TaskChange[]; // Now accepts multiple changes
}

interface TaskCreationNotificationData {
  taskId: string;
  taskTitle: string;
  assignedToId?: string;
  priority: string;
  status: string;
  category: string;
}

// Helper functions
async function getCurrentUserInfo() {
  try {
    return await getCurrentUser();
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

function transformEnumValue(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatChangeDescription(change: TaskChange): string {
  const { field, displayOldValue, displayNewValue, oldValue, newValue } = change;

  const oldVal = displayOldValue || oldValue;
  const newVal = displayNewValue || newValue;

  switch (field) {
    case 'status':
      return `Status: ${oldVal} → ${newVal}`;
    case 'priority':
      return `Priority: ${oldVal} → ${newVal}`;
    case 'taskCategory':
      return `Category: ${oldVal} → ${newVal}`;
    case 'assignedTo':
      return `Assignee: ${oldVal} → ${newVal}`;
    case 'associatedClient':
      return `Client: ${newVal}`;
    case 'title':
      return `Title: "${oldVal}" → "${newVal}"`;
    case 'description':
      return `Description updated`;
    case 'dueDate':
      return `Due date: ${oldVal} → ${newVal}`;
    case 'timeForTask':
      return `Time estimate: ${oldVal} → ${newVal}`;
    case 'overTime':
      return `Overtime: ${oldVal} → ${newVal}`;
    case 'skills':
      return `Skills updated`;
    default:
      return `${field} updated`;
  }
}

function createChangesSummary(changes: TaskChange[]): string {
  if (changes.length === 1 && changes[0]) {
    return formatChangeDescription(changes[0]);
  }

  // Group critical vs non-critical changes
  const criticalFields = ['status', 'priority', 'assignedTo'];
  const criticalChanges = changes.filter(c => criticalFields.includes(c.field));
  const otherChanges = changes.filter(c => !criticalFields.includes(c.field));

  const parts: string[] = [];

  if (criticalChanges.length > 0) {
    parts.push(criticalChanges.map(formatChangeDescription).join(', '));
  }

  if (otherChanges.length > 0) {
    if (otherChanges.length === 1 && otherChanges[0]) {
      parts.push(formatChangeDescription(otherChanges[0]));
    } else {
      const fieldNames = otherChanges.map(c => {
        switch (c.field) {
          case 'timeForTask':
            return 'time estimate';
          case 'taskCategory':
            return 'category';
          case 'dueDate':
            return 'due date';
          default:
            return c.field;
        }
      });
      parts.push(`${fieldNames.join(', ')} updated`);
    }
  }

  return parts.join(' • ');
}

// EXPORTED FUNCTIONS

export async function sendTaskUpdateNotifications(data: TaskUpdateNotificationData) {
  console.log('SERVER: Sending task update notifications with data:', data);
  try {
    const currentUser = await getCurrentUserInfo();

    if (!currentUser) {
      console.error('Cannot send notifications: Current user not found');
      return;
    }

    const {
      taskId,
      taskTitle,
      createdByUserId,
      createdByClientId,
      assignedToId,
      associatedClientId,
      changes,
    } = data;

    if (changes.length === 0) {
      console.log('No changes to notify about');
      return;
    }

    const changesSummary = createChangesSummary(changes);
    const baseMessage = `Task "${taskTitle}" was updated by ${currentUser.name}: ${changesSummary}`;

    // Notification data for push notifications
    const notificationData = {
      type: NotificationType.TASK_MODIFIED,
      taskId,
      details: {
        changesCount: changes.length,
        changesSummary,
        changes: changes.map(c => ({
          field: c.field,
          oldValue: c.displayOldValue || c.oldValue,
          newValue: c.displayNewValue || c.newValue,
        })),
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
          message: baseMessage,
          clientId: associatedClientId || null,
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
          message: baseMessage,
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
          message: baseMessage,
          clientId: associatedClientId || null,
          userId: assignedToId,
          data: notificationData,
        })
      );
    }

    console.log(`Sending ${notifications.length} notifications for ${changes.length} changes`);

    // Send all notifications
    await Promise.allSettled(notifications);
    console.log('All notifications sent successfully');
  } catch (error) {
    console.error('Failed to send task update notifications:', error);
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
  }
}
