import { TaskStatusEnum } from '@prisma/client';
import { taskApiClient } from '../taskApi';

export interface UpdateTaskFieldParams {
  taskId: string;
  field: 'status' | 'priority' | 'taskCategory';
  value: string;
}

/**
 * Update a single task field using the new backend API
 * Replaces the previous server action approach
 */
export async function updateTaskField(params: UpdateTaskFieldParams) {
  try {
    const response = await taskApiClient.updateTaskField(params.taskId, params.field, params.value);

    if (!response.success) {
      throw new Error(response.message || 'Failed to update task');
    }

    return response;
  } catch (error) {
    console.error('Error updating task field:', error);
    throw error;
  }
}

/**
 * Update task status with workflow validation
 * Uses the new status transition endpoint
 */
export async function updateTaskStatus(taskId: string, status: TaskStatusEnum) {
  try {
    const response = await taskApiClient.updateTaskStatusWithValidation(taskId, status);

    if (!response.success) {
      throw new Error(response.message || 'Failed to update task status');
    }

    return response;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 * Maps old function calls to new API
 */
export async function legacyUpdateTaskField(taskId: string, field: string, value: string) {
  // Map legacy field names to new ones if needed
  const fieldMapping: Record<string, 'status' | 'priority' | 'taskCategory'> = {
    status: 'status',
    priority: 'priority',
    taskCategory: 'taskCategory',
    category: 'taskCategory', // Handle legacy naming
  };

  const mappedField = fieldMapping[field];
  if (!mappedField) {
    throw new Error(`Invalid field: ${field}`);
  }

  return updateTaskField({
    taskId,
    field: mappedField,
    value,
  });
}
