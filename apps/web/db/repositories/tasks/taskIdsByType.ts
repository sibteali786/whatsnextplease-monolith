'use client';
import { DurationEnum } from '@/types';
import { handleError } from '@/utils/errorHandler';
import { getTaskIdsByTypeOutput } from '@/utils/validationSchemas';
import { z } from 'zod';
import { taskApiClient } from '@/utils/taskApi'; // UPDATED: Use backend API
import { TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';

type GetTaskIdsSchema = z.infer<typeof getTaskIdsByTypeOutput>;

export const taskIdsByType = async (
  type: 'all' | 'assigned' | 'unassigned' | 'my-tasks',
  searchTerm: string,
  duration: DurationEnum,
  userId?: string,
  status?: TaskStatusEnum | TaskStatusEnum[],
  priority?: TaskPriorityEnum | TaskPriorityEnum[]
): Promise<GetTaskIdsSchema> => {
  try {
    const queryParams: any = {
      search: searchTerm,
      duration,
      // Map type to backend query parameters
      ...(type === 'assigned' && { assignedToId: 'not-null' }),
      ...(type === 'unassigned' && { assignedToId: null }),
      ...(type === 'my-tasks' && { assignedToId: userId }),
    };
    // Only add 'status' if it is provided
    if (status && Array.isArray(status)) {
      queryParams.status = status.join(',');
    } else if (status && !Array.isArray(status)) {
      queryParams.status = status;
    }
    // Only add 'priority' if it is provided
    if (priority && Array.isArray(priority)) {
      queryParams.priority = priority.join(',');
    } else if (priority && !Array.isArray(priority)) {
      queryParams.priority = priority;
    }
    const response = await taskApiClient.getTaskIds(queryParams);

    if (response.success) {
      return {
        success: true,
        taskIds: response.taskIds,
      };
    } else {
      throw new Error(response.message || 'Failed to fetch task IDs');
    }
  } catch (error) {
    console.error('Error in taskIdsByType:', error);
    return handleError(error, 'tasksByType') as GetTaskIdsSchema;
  }
};
