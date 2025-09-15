'use client';
import { DurationEnum } from '@/types';
import { handleError } from '@/utils/errorHandler';
import { getTasksOutputSchema } from '@/utils/validationSchemas';
import { Roles } from '@prisma/client';
import { z } from 'zod';
import { taskApiClient } from '@/utils/taskApi'; // UPDATED: Use backend API

type GetTaskSchema = z.infer<typeof getTasksOutputSchema>;

export const tasksByType = async (
  type: 'all' | 'assigned' | 'unassigned',
  role: Roles,
  cursor: string | null,
  pageSize: number,
  searchTerm: string,
  duration: DurationEnum
): Promise<GetTaskSchema> => {
  try {
    const response = await taskApiClient.getTasks({
      cursor: cursor || undefined,
      pageSize,
      search: searchTerm,
      duration,
      // Map type to backend query parameters
      ...(type === 'assigned' && { assignedToId: 'not-null' }),
      ...(type === 'unassigned' && { assignedToId: null }),
    });

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
