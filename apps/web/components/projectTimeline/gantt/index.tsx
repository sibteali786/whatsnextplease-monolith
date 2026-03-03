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
const Gantt = ({ user }: { user: UserState | null }) => {
  const searchParams = useSearchParams();
  const chartRef = useRef<ChartHandle>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [tasks, setTasks] = useState<GanttTask[]>([]);
  /*   const [totalCount, setTotalCount] = useState<number | undefined>(0); */
  const filtersUpdate = searchParams.get('filtersUpdate');
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);

      try {
        const filters = getFiltersFromStorage();

        const response = await tasksByType(
          null,
          10,
          '',
          filters?.duration ?? DurationEnum.ALL,
          user?.id,
          [],
          [],
          filters?.assignedToId,
          filters?.clientId,
          filters?.categoryId,
          filters?.sortBy,
          true // fetchAll: true to get all tasks without pagination
        );

        if (response?.success) {
          /*    setTotalCount(response.totalCount); */

          //  MAP → FILTER nulls → SAVE
          if (response.tasks) {
            const ganttTasks = response.tasks
              .map(mapTaskToGantt)
              .filter((t): t is GanttTask => t !== null);

            setTasks(ganttTasks);
          }
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
      }
    };

    fetchTasks();
  }, [filtersUpdate, user?.id]);
  return (
    <div className="space-y-6">
      <div className="relative border rounded-lg z-0 p-[2px]">
        {loading ? (
          <GanttSkeleton />
        ) : (
          <div className="relative">
            <TaskColumn tasks={tasks} chartRef={chartRef} />
            <Chart tasks={tasks} ref={chartRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Gantt;
