/* eslint-disable @typescript-eslint/no-explicit-any */
import { NotificationType } from '@prisma/client';

export interface TaskChange {
  field: string;
  oldValue: any;
  newValue: any;
  displayOldValue: string;
  displayNewValue: string;
}

interface NotificationFormatterOptions {
  taskId: string;
  taskTitle: string;
  changes: TaskChange[];
  currentUser: {
    id: string;
    name?: string;
    username?: string;
    avatarUrl?: string;
  };
}

export class NotificationFormatterService {
  /**
   * Transform enum values for display
   */
  private transformEnumValue(value: string): string {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLocaleLowerCase())
      .join(' ');
  }

  /**
   * Format a single change for display
   */
  private formatChangeDescription(change: TaskChange): string {
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

  /**
   * Create a summary of all changes
   */
  private createChangeSummary(changes: TaskChange[]): string {
    if (changes.length === 1 && changes[0]) {
      return this.formatChangeDescription(changes[0]);
    }

    // Groupd critical vs non-critical changes
    const criticalFields = ['status', 'priority', 'assignedTo'];
    const criticalChanges = changes.filter(change => criticalFields.includes(change.field));
    const nonCriticalChanges = changes.filter(change => !criticalFields.includes(change.field));

    const summaryParts: string[] = [];

    if (criticalChanges.length > 0) {
      summaryParts.push(
        criticalChanges.map(change => this.formatChangeDescription(change)).join(', ')
      );
    }

    if (nonCriticalChanges.length > 0) {
      if (nonCriticalChanges.length === 1 && nonCriticalChanges[0]) {
        summaryParts.push(this.formatChangeDescription(nonCriticalChanges[0]));
      } else {
        const fieldNames = nonCriticalChanges.map(c => {
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
        summaryParts.push(`${fieldNames.join(', ')} updated`);
      }
    }

    return summaryParts.join(' • ');
  }

  /**
   * Format notification data for task updates (batched changes)
   */
  formatTaskUpdateNotification(options: NotificationFormatterOptions) {
    const { taskId, taskTitle, changes, currentUser } = options;
    if (changes.length === 0) {
      throw new Error('No changes provided for notification');
    }

    const changesSummary = this.createChangeSummary(changes);
    const message = `Task "${taskTitle}" was updated by ${currentUser.name}: ${changesSummary}`;
    return {
      type: NotificationType.TASK_MODIFIED,
      message,
      data: {
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
      },
    };
  }
  /**
   * Format notification data for new task creation
   */
  formatTaskCreationNotification(options: {
    taskId: string;
    taskTitle: string;
    priority: string;
    status: string;
    category: string;
    currentUser: {
      id: string;
      name?: string;
      username?: string;
      avatarUrl?: string;
    };
  }) {
    const { taskId, taskTitle, priority, status, category, currentUser } = options;

    return {
      type: NotificationType.TASK_CREATED,
      message: `New task "${taskTitle}" has been created by ${currentUser.name}`,
      data: {
        type: NotificationType.TASK_CREATED,
        taskId,
        details: {
          status: this.transformEnumValue(status),
          priority: this.transformEnumValue(priority),
          category,
        },
        name: currentUser.name,
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl,
        url: `/taskOfferings/${taskId}`,
      },
    };
  }

  /**
   * Format notification data for task assignment
   */
  formatTaskAssignmentNotification(options: {
    taskId: string;
    taskTitle: string;
    priority: string;
    status: string;
    category: string;
    currentUser: {
      id: string;
      name?: string;
      username?: string;
      avatarUrl?: string;
    };
  }) {
    const { taskId, taskTitle, priority, status, category, currentUser } = options;
    return {
      type: NotificationType.TASK_ASSIGNED,
      message: `Task "${taskTitle}" has been assigned to you by ${currentUser.name}`,
      data: {
        type: NotificationType.TASK_ASSIGNED,
        taskId,
        details: {
          status: this.transformEnumValue(status),
          priority: this.transformEnumValue(priority),
          category,
        },
        name: currentUser.name,
        username: currentUser.username,
        avatarUrl: currentUser.avatarUrl,
        url: `/taskOfferings/${taskId}`,
      },
    };
  }
}
