'use client';
import { DurationEnum } from '@/types';
import { handleError } from '@/utils/errorHandler';
import { getTaskIdsByTypeOutput } from '@/utils/validationSchemas';
import { Roles } from '@prisma/client';
import { z } from 'zod';
import { taskApiClient } from '@/utils/taskApi'; // UPDATED: Use backend API

type GetTaskIdsSchema = z.infer<typeof getTaskIdsByTypeOutput>;

export const taskIdsByType = async (
  type: 'all' | 'assigned' | 'unassigned' | 'my-tasks',
  role: Roles,
  searchTerm: string,
  duration: DurationEnum
): Promise<GetTaskIdsSchema> => {
  try {
    // UPDATED: Use backend API instead of Next.js API route
    const response = await taskApiClient.getTaskIds({
      search: searchTerm,
      duration,
      // Map type to backend query parameters
      ...(type === 'assigned' && { assignedToId: 'not-null' }),
      ...(type === 'unassigned' && { assignedToId: null }),
    });

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
