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
  priority?: TaskPriorityEnum | TaskPriorityEnum[],
  assignedToFilter?: string,
): Promise<GetTaskIdsSchema> => {
  try {
    const queryParams: any = {
      search: searchTerm,
      duration,
    };
	// Determine assignedToId based on both type and explicit filter
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
    } else {
      // Fall back to type-based logic
      if (type === 'assigned') {
        queryParams.assignedToId = 'not-null';
      } else if (type === 'unassigned') {
        queryParams.assignedToId = 'null';
      } else if (type === 'my-tasks') {
        queryParams.assignedToId = userId;
      }
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
