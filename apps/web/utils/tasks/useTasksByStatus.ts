import { useCallback, useEffect, useState } from 'react';
import { taskApiClient } from '../taskApi';
import { TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { DurationEnum } from '@/types';
import { useSearchParams } from 'next/navigation';
import { TasksByStatusData } from '@/types/tasks/api-response';

export interface TasksByStatusFilters {
  taskType?: string;
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
const PAGE_SIZE = 10;
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

export function useTasksByStatus(
  statuses: TaskStatusEnum[],
  userId?: string,
  searchTerm?: string,
  duration?: DurationEnum,
  taskOffering = false,
  filtersCleared?: boolean,
  newTaskReload?: boolean
) {
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

  const [loadingMore, setLoadingMore] = useState<Record<TaskStatusEnum, boolean>>(() =>
    Object.values(TaskStatusEnum).reduce(
      (acc, status) => {
        acc[status] = false;
        return acc;
      },
      {} as Record<TaskStatusEnum, boolean>
    )
  );
  const [cursors, setCursors] = useState<Record<TaskStatusEnum, string | undefined>>(
    Object.values(TaskStatusEnum).reduce(
      (acc, status) => {
        acc[status] = undefined;
        return acc;
      },
      {} as Record<TaskStatusEnum, string | undefined>
    )
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersUpdate = searchParams.get('filtersUpdate');

  // taskOffering Filters

  const priorityFilter = searchParams.get('priority');
  const assignedToFilter = searchParams.get('assignedTo') || undefined;
  const taskType = searchParams.get('taskType') || undefined;

  // Persist filters to sessionStorage whenever they change
  const onReload = useCallback(() => setReload(prevState => !prevState), []);

  const fetchTasksFromApi = async (
    statusesToFetch: TaskStatusEnum[],
    cursorsPerColumn?: Partial<Record<TaskStatusEnum, string | undefined>>,
    pageSize?: number // optional pageSize
  ) => {
    const filters = getFiltersFromStorage();

    if (taskOffering) {
      const priorityArray = priorityFilter?.split(',') || [];

      const normalizedPriority = priorityArray
        .map(
          (priority: string) => TaskPriorityEnum[priority as keyof typeof TaskPriorityEnum] || null
        )
        .filter(priority => priority !== null);

      let assignedToId;

      if (assignedToFilter === 'null') {
        assignedToId = 'null';
      } else if (assignedToFilter === 'not-null') {
        assignedToId = 'not-null';
      } else if (assignedToFilter === 'my-tasks') {
        assignedToId = userId;
      } else if (assignedToFilter !== 'all') {
        assignedToId = assignedToFilter;
      }

      return taskApiClient.getTasksByStatus(statusesToFetch, undefined, true, {
        normalizedPriority,
        assignedToFilter: assignedToId,
        taskType,
        searchTerm,
        duration,
        ...(cursorsPerColumn ? { cursors: cursorsPerColumn } : {}), // only add cursors if present
        pageSize,
      });
    }

    return taskApiClient.getTasksByStatus(statusesToFetch, filters, false, {
      searchTerm,
      taskType,
      duration,
      ...(cursorsPerColumn ? { cursors: cursorsPerColumn } : {}),
      pageSize,
    });
  };

  const loadMoreTasks = async (status: TaskStatusEnum) => {
    if (loadingMore[status]) return;
    if (data[status].tasks.length >= data[status].count) return;

    const cursor = cursors[status];

    if (!cursor) return;
    try {
      setLoadingMore(prev => ({
        ...prev,
        [status]: true,
      }));

      const result = await fetchTasksFromApi([status], { [status]: cursor }, PAGE_SIZE);
      if (result?.data?.[status]) {
        setData(prev => ({
          ...prev,
          [status]: {
            ...prev[status],
            tasks: [...prev[status].tasks, ...result.data![status].tasks],
            count: result.data![status].count,
          },
        }));

        // update cursor AFTER fetching new tasks
        const newCursor = result.data[status].tasks[result.data[status].tasks.length - 1]?.id;
        if (newCursor) {
          setCursors(prev => ({ ...prev, [status]: newCursor }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(prev => ({
        ...prev,
        [status]: false,
      }));
    }
  };
  useEffect(() => {
    if (filtersCleared) {
      setCursors(
        Object.values(TaskStatusEnum).reduce(
          (acc, status) => {
            acc[status] = undefined;
            return acc;
          },
          {} as Record<TaskStatusEnum, string | undefined>
        )
      );
      // Reset data
      setData(
        Object.values(TaskStatusEnum).reduce(
          (acc, status) => {
            acc[status] = { tasks: [], count: 0 };
            return acc;
          },
          {} as Record<TaskStatusEnum, TasksByStatusData>
        )
      );
    }
  }, [filtersCleared]);
  useEffect(() => {
    if (!filtersCleared) return; // Skip fetching if advanced filter data is present
    let isCancelled = false;
    async function fetchTasks() {
      try {
        setLoading(true);

        const result = await fetchTasksFromApi(statuses, undefined, PAGE_SIZE);

        if (!isCancelled) {
          // Update data per column without resetting all cursors
          setData(prev => {
            const newData = { ...prev };
            statuses.forEach(status => {
              newData[status] = {
                tasks: result.data![status].tasks,
                count: result.data![status].count,
              };
            });
            return newData;
          });

          // Update cursors after fetch
          setCursors(
            Object.fromEntries(
              statuses.map(status => [
                status,
                result.data![status].tasks[result.data![status].tasks.length - 1]?.id,
              ])
            ) as Record<TaskStatusEnum, string | undefined>
          );

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
  }, [
    statuses.join(','),
    filtersUpdate,
    reload,
    newTaskReload,
    searchTerm,
    duration,
    priorityFilter,
    assignedToFilter,
    taskType,
    filtersCleared,
  ]);

  return { data, loading, error, onReload, loadMoreTasks, loadingMore };
}
