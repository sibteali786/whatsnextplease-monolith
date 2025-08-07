// utils/notifications/taskNotifications.ts
'use client';

import {
  sendTaskCreationNotifications,
  sendTaskUpdateNotifications,
} from './taskNotification.server';

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

export class TaskNotificationService {
  static async sendTaskUpdateNotifications(data: TaskUpdateNotificationData) {
    return await sendTaskUpdateNotifications(data);
  }

  static async sendTaskCreationNotifications(data: TaskCreationNotificationData) {
    return await sendTaskCreationNotifications(data);
  }
}
