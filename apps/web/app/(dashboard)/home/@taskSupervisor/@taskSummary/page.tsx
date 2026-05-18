// apps/web/app/(dashboard)/home/@taskSupervisor/@taskSummary/page.tsx - UPDATED

'use client';
import { CountLabel } from '@/components/common/CountLabel';
import { TaskAgentChart } from '@/components/tasks/ChartTasks';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUser, UserState } from '@/utils/user';
import { Roles } from '@prisma/client';
import { CircleX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { taskApiClient } from '@/utils/taskApi'; // UPDATED: Use backend API
import { ChartConfig } from '@/components/ui/chart';
import { getTasksCountByStatus } from '@/db/repositories/tasks/getTasksCountByStatus';

const chartConfig = {
  unassignedTasks: {
    label: 'Unassigned',
    color: 'hsl(var(--chart-1))',
  },
  assignedTasks: {
    label: 'Assigned',
    color: 'hsl(var(--chart-2))',
  },
  progress: {
    label: 'In-Progress',
    color: 'hsl(var(--chart-3))',
  },
  review: {
    label: 'In-Review',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

export type TasksCountType = {
  UnassignedTasks: number;
  AssignedTasks: number;
  IN_PROGRESS?: number;
  IN_REVIEW?: number;
};

const TaskCount = async (userId: string) => {
  const { tasksWithStatus } = await getTasksCountByStatus(userId, Roles.TASK_SUPERVISOR);
  return tasksWithStatus;
};

const TaskSummaryPage = () => {
  const [tasks, setTasks] = useState<TasksCountType>();
  const [user, setUser] = useState<UserState | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const desktopData = [
    {
      type: 'unassignedTasks',
      desktop: tasks?.UnassignedTasks ?? 0,
      fill: 'var(--color-unassignedTasks)',
    },
    {
      type: 'assignedTasks',
      desktop: tasks?.AssignedTasks ?? 0,
      fill: 'var(--color-assignedTasks)',
    },
    {
      type: 'progress',
      desktop: tasks?.IN_PROGRESS ?? 0,
      fill: 'var(--color-progress)',
    },
    {
      type: 'review',
      desktop: tasks?.IN_REVIEW ?? 0,
      fill: 'var(--color-review)',
    },
  ];

  useEffect(() => {
    const fetchTaskCounts = async (userId: string) => {
      const taskCounts = await TaskCount(userId);

      setTasks(prev => ({
        UnassignedTasks: prev?.UnassignedTasks ?? 0,
        AssignedTasks: prev?.AssignedTasks ?? 0,
        IN_PROGRESS: taskCounts?.IN_PROGRESS ?? 0,
        IN_REVIEW: taskCounts?.REVIEW ?? 0,
      }));
    };

    if (user?.id) {
      fetchTaskCounts(user.id);
    }
  }, [user]);
  useEffect(() => {
    const fetchTasksCount = async () => {
      try {
        setIsLoading(true);
        const user = await getCurrentUser();
        setUser(user);
        // Check for authorized roles
        if (user?.role?.name !== Roles.TASK_SUPERVISOR) {
          return null;
        }
        const response = await taskApiClient.getTasksCount(user.id, 'taskAssignmentStatus');

        if (response.success) {
          // Transform backend response to match expected format
          const taskCounts = {
            UnassignedTasks: response.data?.unassigned || 0,
            AssignedTasks: response.data?.assigned || 0,
          };

          setTasks(prev => ({
            UnassignedTasks: taskCounts.UnassignedTasks,
            AssignedTasks: taskCounts.AssignedTasks,
            IN_PROGRESS: prev?.IN_PROGRESS ?? 0,
            IN_REVIEW: prev?.IN_REVIEW ?? 0,
          }));
          setSuccess(true);
        } else {
          throw new Error(response.message || 'Failed to fetch task counts');
        }
      } catch (error) {
        console.error('Error fetching task counts:', error);
        setSuccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasksCount();
  }, []);
  return (
    <div className="col-span-2">
      <Card className="p-6 rounded-2xl shadow-m flex flex-col sm:flex-row">
        {isLoading ? (
          <div className="flex flex-col gap-8 w-full">
            <Skeleton className="h-[30px] w-[200px]" />
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-[30px] w-full" />
              <Skeleton className="h-[100px] w-full rounded-lg" />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-[30px] w-full" />
              <Skeleton className="h-[100px] w-full rounded-lg" />
            </div>
          </div>
        ) : success && tasks ? (
          <div className="space-y-7 w-full">
            <h2 className="font-bold text-2xl">Progress</h2>
            <div className="w-full flex flex-col gap-4">
              <CountLabel
                lineHeight={'normal'}
                label={'Unassigned Tasks'}
                count={tasks?.UnassignedTasks ?? 0}
                align="start"
                isList={true}
                listOpacity={70}
                countSize="text-7xl"
                squareColor={chartConfig.unassignedTasks.color}
              />
              <CountLabel
                lineHeight={'normal'}
                label={'Assigned Tasks'}
                count={tasks?.AssignedTasks ?? 0}
                align="start"
                isList={true}
                listOpacity={80}
                countSize="text-5xl"
                labelSize="lg"
                squareColor={chartConfig.assignedTasks.color}
              />
              <CountLabel
                lineHeight={'normal'}
                label={'In-Progress'}
                count={tasks?.IN_PROGRESS ?? 0}
                align="start"
                isList={true}
                listOpacity={30}
                countSize="text-4xl"
                labelSize="lg"
                squareColor={chartConfig.progress.color}
              />
              <CountLabel
                lineHeight={'normal'}
                label={'In-Review'}
                count={tasks?.IN_REVIEW ?? 0}
                align="start"
                isList={true}
                listOpacity={30}
                countSize="text-3xl"
                labelSize="lg"
                squareColor={chartConfig.review.color}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 items-center justify-center">
            <CircleX color="red" className="w-10 h-10" />
            <p className="text-destructive text-lg text-center">
              Something went wrong at the backend.
            </p>
          </div>
        )}
        <TaskAgentChart chartConfig={chartConfig} desktopData={desktopData} />
      </Card>
    </div>
  );
};

export default TaskSummaryPage;
