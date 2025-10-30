'use client';
import { DurationEnum } from '@/types';
import { handleError } from '@/utils/errorHandler';
import { getTasksOutputSchema } from '@/utils/validationSchemas';
import { TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { z } from 'zod';
import { taskApiClient } from '@/utils/taskApi'; // UPDATED: Use backend API

type GetTaskSchema = z.infer<typeof getTasksOutputSchema>;

export const tasksByType = async (
  type: 'all' | 'assigned' | 'unassigned' | 'my-tasks',
  cursor: string | null,
  pageSize: number,
  searchTerm: string,
  duration: DurationEnum,
  userId?: string,
  status?: TaskStatusEnum | TaskStatusEnum[],
  priority?: TaskPriorityEnum | TaskPriorityEnum[]
): Promise<GetTaskSchema> => {
  try {
    const queryParams: any = {
      cursor: cursor || undefined,
      pageSize,
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
    const response = await taskApiClient.getTasks(queryParams);

    if (response.success) {
      return {
        success: true,
        tasks: response.tasks,
        hasNextCursor: response.hasNextCursor,
        nextCursor: response.nextCursor,
        totalCount: response.totalCount,
      };
    } else {
      throw new Error(response.message || 'Failed to fetch tasks');
    }
  } catch (error) {
    console.error('Error in tasksByType:', error);
    return handleError(error, 'tasksByType') as GetTaskSchema;
  }
};
