import { useState, useEffect } from 'react';
import { taskApiClient } from '@/utils/taskApi';
import { TaskPriorityEnum } from '@prisma/client';
import { GetTasksResponse } from '@/types/tasks/api-response';

type AsyncState<T> =
  | {
      status: 'loading';
    }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
export function useTasksByPriorityLevel(
  level: TaskPriorityEnum,
  params?: {
    pageSize?: number;
    search?: string;
    userId?: string;
  }
) {
  const [state, setState] = useState<AsyncState<GetTasksResponse>>({ status: 'loading' });

  useEffect(() => {
    async function fetchTasks() {
      try {
        // Handle both level strings and individual priority enums
        // Use new grouped API
        const result = await taskApiClient.getTasksByPriorityLevel(level, params);
        if (!result || !result.data) {
          setState({ status: 'error', error: 'Failed to fetch tasks' });
        } else {
          setState({ status: 'success', data: result });
        }
      } catch (err) {
        setState({
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to fetch tasks',
        });
      } finally {
        // No need to set loading to false here since we use the status field
      }
    }

    fetchTasks();
  }, [level, JSON.stringify(params)]);

  return state;
}
