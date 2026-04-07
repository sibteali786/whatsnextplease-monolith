// apps/web/app/(dashboard)/home/@taskSupervisor/@taskSummary/page.tsx - UPDATED

'use client';
import { CountLabel } from '@/components/common/CountLabel';
import { TaskAgentChart } from '@/components/tasks/ChartTasks';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';
import { CircleX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { taskApiClient } from '@/utils/taskApi'; // UPDATED: Use backend API
import { ChartConfig } from '@/components/ui/chart';

const chartConfig = {
  unassignedTasks: {
    label: 'Unassigned',
    color: 'hsl(var(--chart-1))',
  },
  assignedTasks: {
    label: 'Assigned',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export type TasksCountType = {
  UnassignedTasks: number;
  AssignedTasks: number;
};

const TaskSummaryPage = () => {
  const [tasks, setTasks] = useState<TasksCountType>();
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
  ];
  useEffect(() => {
    const fetchTasksCount = async () => {
      try {
        setIsLoading(true);
        const user = await getCurrentUser();

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

          setTasks(taskCounts);
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
      <Card className="p-6 rounded-2xl shadow-m flex">
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
