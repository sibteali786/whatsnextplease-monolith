import { useState, useEffect } from 'react';
import { taskApiClient } from '@/utils/taskApi';
import { TaskPriorityEnum } from '@prisma/client';

export function useTasksByPriorityLevel(
  level: TaskPriorityEnum,
  params?: {
    pageSize?: number;
    search?: string;
    userId?: string;
  }
) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);

        // Handle both level strings and individual priority enums
        // Use new grouped API
        const result = await taskApiClient.getTasksByPriorityLevel(level, params);

        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [level, JSON.stringify(params)]);

  return { data, loading, error };
}
