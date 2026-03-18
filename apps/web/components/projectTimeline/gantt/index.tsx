'use client';

import { useEffect, useRef, useState } from 'react';
/* import { format, differenceInDays } from 'date-fns'; */
import { useSearchParams } from 'next/navigation';
import Chart, { ChartHandle, GanttTask } from './chart';
import { TasksByStatusFilters } from '@/utils/tasks/useTasksByStatus';
import { tasksByType } from '@/db/repositories/tasks/tasksByType';
import { TaskTable } from '@/utils/validationSchemas';
import { toast } from '@/hooks/use-toast';
import { CircleX } from 'lucide-react';
import { UserState } from '@/utils/user';
import { DurationEnum } from '@/types';
import GanttSkeleton from './skeleton';
import TaskColumn from './task-column';
import { TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { useAdvancedFilterContext } from '@/contexts/AdvancedFilterContext';

const FILTER_STORAGE_KEY = 'timelineFilter';

function formatDateYYYYMMDD(date: string | Date): string {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function makeEndExclusive(date: string | Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return formatDateYYYYMMDD(d);
}

function mapTaskToGantt(task: TaskTable): GanttTask | null {
  if (!task.createdAt || !task.dueDate) return null;

  return {
    id: String(task.id),
    name: task.title ?? 'Untitled Task',
    start: formatDateYYYYMMDD(task.createdAt),
    end: makeEndExclusive(task.dueDate),
    progress: 0,
    dependencies: '',
    categoryName: task.taskCategory?.categoryName,
    custom_class: task.status ? `status-${task.status}` : undefined,
    assignedTo: task.assignedTo ?? undefined,
  };
}

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

const PAGE_SIZE = 10;

const Gantt = ({
  user,
  searchTerm,
  duration,
  taskOffering = false,
  advancedFilterLoading,
  data,
}: {
  user: UserState | null;
  searchTerm?: string;
  duration?: DurationEnum;
  taskOffering?: boolean;
  advancedFilterLoading?: boolean;
  data?: TaskTable[] | null;
}) => {
  const searchParams = useSearchParams();
  const chartRef = useRef<ChartHandle>(null);

  const loadingRef = useRef(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tasks, setTasks] = useState<GanttTask[]>([]);

  const filtersUpdate = searchParams.get('filtersUpdate');
  // taskOffering Filters
  const statusFilter = searchParams.get('status');
  const priorityFilter = searchParams.get('priority');
  const assignedToFilter = searchParams.get('assignedTo') || undefined;

  const { loadMore: loadMoreAdvanced, hasNextCursor, filtersCleared } = useAdvancedFilterContext();

  const loadMore = async () => {
    if (!hasMore || loadingRef.current) return;

    loadingRef.current = true;

    try {
      if (!filtersCleared && loadMoreAdvanced && hasNextCursor) {
        await loadMoreAdvanced();
      } else if (filtersCleared && hasMore) {
        await fetchTasks(cursor);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        loadingRef.current = false;
      }, 300); // prevents rapid firing
    }
  };
  const fetchTasks = async (nextCursor: string | null = null) => {
    if (loadingMore) return;

    if (nextCursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const filters = getFiltersFromStorage();
      let response;
      if (taskOffering) {
        const statusArray = statusFilter?.split(',') || [];
        const priorityArray = priorityFilter?.split(',') || [];

        const normalizedStatus = statusArray
          ? statusArray
              .map(
                (status: string) => TaskStatusEnum[status as keyof typeof TaskStatusEnum] || null
              )
              .filter(status => status !== null)
          : [];
        const normalizedPriority = priorityArray
          ? priorityArray
              .map(
                (priority: string) =>
                  TaskPriorityEnum[priority as keyof typeof TaskPriorityEnum] || null
              )
              .filter(priority => priority !== null)
          : [];

        response = await tasksByType(
          nextCursor, //cursor
          PAGE_SIZE, // pageSize
          searchTerm ?? '',
          duration ?? DurationEnum.ALL,
          user?.id,
          normalizedStatus,
          normalizedPriority,
          assignedToFilter,
          undefined, // clientId
          undefined, // categoryId
          undefined, // sortBy
          false // fetchAll: true to get all tasks without pagination
        );
      } else {
        response = await tasksByType(
          nextCursor, //cursor
          PAGE_SIZE, // pageSize
          '',
          filters?.duration ?? DurationEnum.ALL,
          user?.id,
          [],
          [],
          filters?.assignedToId,
          filters?.clientId,
          filters?.categoryId,
          filters?.sortBy,
          false // fetchAll: true to get all tasks without pagination
        );
      }

      if (response?.success && response.tasks) {
        const ganttTasks = response.tasks
          .map(mapTaskToGantt)
          .filter((t): t is GanttTask => t !== null);

        setTasks(prev => [...prev, ...ganttTasks]);

        setCursor(response.nextCursor ?? null);
        setHasMore(Boolean(response.nextCursor));
      }
    } catch (error) {
      console.error(error);

      if (error instanceof Error) {
        toast({
          variant: 'destructive',
          title: 'Failed to fetch tasks',
          description: error.message,
          icon: <CircleX size={40} />,
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  useEffect(() => {
    if (!filtersCleared) {
      setHasMore(true);
    }
  }, [filtersCleared]);

  useEffect(() => {
    if (!filtersCleared) return;

    if (data?.length === 0 || data === undefined) {
      setTasks([]);
      setCursor(null);
      setHasMore(true);

      fetchTasks(null);
    }
  }, [
    filtersUpdate,
    user?.id,
    searchTerm,
    duration,
    statusFilter,
    priorityFilter,
    assignedToFilter,
    filtersCleared,
  ]);

  useEffect(() => {
    if (data) {
      const ganttTasks = data.map(mapTaskToGantt).filter((t): t is GanttTask => t !== null);

      setTasks(ganttTasks);
    }
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="relative border rounded-lg z-0 p-[2px]">
        {loading || advancedFilterLoading ? (
          <GanttSkeleton />
        ) : (
          <div className="relative">
            <TaskColumn tasks={tasks} chartRef={chartRef} hasMore={hasMore} loadMore={loadMore} />
            <Chart tasks={tasks} ref={chartRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Gantt;
