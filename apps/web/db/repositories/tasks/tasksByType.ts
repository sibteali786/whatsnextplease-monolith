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
  priority?: TaskPriorityEnum | TaskPriorityEnum[],
  assignedToFilter?: string,
): Promise<GetTaskSchema> => {
  try {
    const queryParams: any = {
      cursor: cursor || undefined,
      pageSize,
      search: searchTerm,
      duration,
    };

	if (assignedToFilter) {
      // Explicit assignedTo filter takes precedence over type
      if (assignedToFilter === 'null') {
        queryParams.assignedToId = 'null';
      } else if (assignedToFilter === 'not-null') {
        queryParams.assignedToId = 'not-null';
      } else if (assignedToFilter === 'my-tasks') {
        queryParams.assignedToId = userId;
      } else if (assignedToFilter !== 'all') {
        queryParams.assignedToId = assignedToFilter; // Specific user ID
      }
      // If 'all', don't add assignedToId
    } else {
      // Fall back to type-based logic (backward compatibility)
      if (type === 'assigned') {
        queryParams.assignedToId = 'not-null';
      } else if (type === 'unassigned') {
        queryParams.assignedToId = 'null';
      } else if (type === 'my-tasks') {
        queryParams.assignedToId = userId;
      }
      // If type === 'all', don't add assignedToId
    }

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
