import { useState, useEffect } from 'react';
import { taskApiClient } from '@/utils/taskApi';
import { TaskPriorityEnum } from '@prisma/client';

export function useTasksByPriorityLevel(
  level: 'critical' | 'high' | 'medium' | 'low' | 'hold' | TaskPriorityEnum,
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
        let result;
        if (
          typeof level === 'string' &&
          ['critical', 'high', 'medium', 'low', 'hold'].includes(level)
        ) {
          // Use new grouped API
          result = await taskApiClient.getTasksByPriorityLevel(
            level as 'critical' | 'high' | 'medium' | 'low' | 'hold',
            params
          );
        } else {
          // Legacy: map individual priority to level
          const priorityToLevel: Record<
            TaskPriorityEnum,
            'critical' | 'high' | 'medium' | 'low' | 'hold'
          > = {
            [TaskPriorityEnum.CRITICAL]: 'critical',
            [TaskPriorityEnum.URGENT]: 'critical',
            [TaskPriorityEnum.HIGH]: 'high',
            [TaskPriorityEnum.MEDIUM]: 'medium',
            [TaskPriorityEnum.NORMAL]: 'medium',
            [TaskPriorityEnum.LOW]: 'low',
            [TaskPriorityEnum.LOW_PRIORITY]: 'low',
            [TaskPriorityEnum.HOLD]: 'hold',
          };

          const mappedLevel = priorityToLevel[level as TaskPriorityEnum];
          if (mappedLevel) {
            result = await taskApiClient.getTasksByPriorityLevel(mappedLevel, params);
          } else {
            throw new Error(`Unknown priority: ${level}`);
          }
        }

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
