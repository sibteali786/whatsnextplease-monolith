import { useCallback, useEffect, useState } from 'react';
import { taskApiClient } from '../taskApi';
import { TaskStatusEnum } from '@prisma/client';
import { DurationEnum } from '@/types';
import { TaskTable } from '../validationSchemas';
import { useSearchParams } from 'next/navigation';

interface TasksByStatusData {
  tasks: TaskTable[];
  count: number;
}

export interface TasksByStatusFilters {
  duration?: DurationEnum;
  assignedToId?: string;
  categoryId?: string;
  clientId?: string;
  search?: string;
  sortBy?: string;
  userId?: string;
}
const FILTER_STORAGE_KEY = 'timelineFilter';
const VIEW_ID_STORAGE_KEY = 'viewId';

// Helper to read filters from sessionStorage
function getFiltersFromStorage(): TasksByStatusFilters {
  const stored = sessionStorage.getItem(FILTER_STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

// Optional helper for viewId
export function getStoredViewId(): string | undefined {
  return sessionStorage.getItem(VIEW_ID_STORAGE_KEY) ?? undefined;
}

export function useTasksByStatus(statuses: TaskStatusEnum[]) {
  const searchParams = useSearchParams();
  const [reload, setReload] = useState(false);

  const [data, setData] = useState<Record<TaskStatusEnum, TasksByStatusData>>(() =>
    Object.values(TaskStatusEnum).reduce(
      (acc, status) => {
        acc[status] = { tasks: [], count: 0 }; // <-- initial value matches backend shape
        return acc;
      },
      {} as Record<TaskStatusEnum, TasksByStatusData>
    )
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersUpdate = searchParams.get('filtersUpdate');

  // Persist filters to sessionStorage whenever they change
  const onReload = useCallback(() => setReload(prevState => !prevState), []);

  useEffect(() => {
    let isCancelled = false;
    const filters = getFiltersFromStorage();
    async function fetchTasks() {
      try {
        setLoading(true);

        const result = await taskApiClient.getTasksByStatus(statuses, filters);

        if (!isCancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchTasks();

    return () => {
      isCancelled = true;
    };
  }, [JSON.stringify(statuses), filtersUpdate, reload]);

  return { data, loading, error, onReload };
}
