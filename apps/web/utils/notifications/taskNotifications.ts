/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/notifications/taskNotifications.ts
'use client';

import {
  sendTaskCreationNotifications,
  sendTaskUpdateNotifications,
} from './taskNotification.server';

// Updated interface to match server-side (array of changes instead of single change)
export interface TaskChange {
  field:
    | 'status'
    | 'priority'
    | 'taskCategory'
    | 'title'
    | 'description'
    | 'dueDate'
    | 'timeForTask'
    | 'overTime'
    | 'skills'
    | 'assignedTo';
  oldValue: any;
  newValue: any;
  displayOldValue?: string;
  displayNewValue?: string;
}

interface TaskUpdateNotificationData {
  taskId: string;
  taskTitle: string;
  createdByUserId?: string;
  createdByClientId?: string;
  assignedToId?: string;
  changes: TaskChange[]; // Now accepts array of changes
}

interface TaskCreationNotificationData {
  taskId: string;
  taskTitle: string;
  assignedToId?: string;
  priority: string;
  status: string;
  category: string;
}

// Helper function for transforming enum values (for inline edits)
function transformEnumValue(value: string): string {
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export class TaskNotificationService {
  static async sendTaskUpdateNotifications(data: TaskUpdateNotificationData) {
    return await sendTaskUpdateNotifications(data);
  }

  static async sendTaskCreationNotifications(data: TaskCreationNotificationData) {
    return await sendTaskCreationNotifications(data);
  }

  // Helper method for inline edits (single field changes)
  static async sendSingleFieldUpdate(
    taskId: string,
    taskTitle: string,
    field: 'status' | 'priority' | 'taskCategory',
    oldValue: string,
    newValue: string,
    createdByUserId?: string,
    createdByClientId?: string,
    assignedToId?: string
  ) {
    const change: TaskChange = {
      field,
      oldValue,
      newValue,
      displayOldValue:
        field === 'status' || field === 'priority' ? transformEnumValue(oldValue) : oldValue,
      displayNewValue:
        field === 'status' || field === 'priority' ? transformEnumValue(newValue) : newValue,
    };

    return await this.sendTaskUpdateNotifications({
      taskId,
      taskTitle,
      createdByUserId,
      createdByClientId,
      assignedToId,
      changes: [change], // Wrap single change in array
    });
  }
}
