'use client';

import { CountLabel } from '@/components/common/CountLabel';
import { TaskAgentChart } from '@/components/tasks/ChartTasks';
import { Card } from '@/components/ui/card';
import { getCurrentUser } from '@/utils/user';
import { taskApiClient } from '@/utils/taskApi';
import { Roles } from '@prisma/client';
import { CircleX, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TaskStatusCounts {
  IN_PROGRESS?: number;
  COMPLETED?: number;
  OVERDUE?: number;
}

const TaskSummaryPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [tasksWithStatus, setTasksWithStatus] = useState<TaskStatusCounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get current user
        const currentUser = await getCurrentUser();
        if (!currentUser || currentUser.role?.name !== Roles.CLIENT) {
          setError('Access denied: Not a client user');
          return;
        }

        setUser(currentUser);

        // Get task statistics using the new API client
        const statistics = await taskApiClient.getTaskStatistics(currentUser.id);

        if (statistics.success) {
          setTasksWithStatus(statistics.statusCounts || {});
        } else {
          setError(statistics.message || 'Failed to fetch task statistics');
        }
      } catch (err) {
        console.error('Error fetching task summary:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="col-span-2">
        <Card className="p-6 rounded-2xl shadow-m flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading task summary...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="col-span-2">
        <Card className="p-6 rounded-2xl shadow-m flex">
          <div className="flex flex-col gap-4 items-center justify-center w-full">
            <CircleX color="red" className="w-10 h-10" />
            <p className="text-destructive text-lg text-center">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Don't render if user is not a client
  if (!user || user.role?.name !== Roles.CLIENT) {
    return null;
  }

  return (
    <div className="col-span-2">
      <Card className="p-6 rounded-2xl shadow-m flex">
        <div className="space-y-7 w-full">
          <h2 className="font-bold text-2xl">Progress</h2>
          <div className="w-full flex flex-col gap-4">
            <CountLabel
              lineHeight={'normal'}
              label={'In-Progress Tasks'}
              count={tasksWithStatus.IN_PROGRESS ?? 0}
              align="start"
              isList={true}
              listOpacity={70}
              countSize="text-7xl"
            />
            <CountLabel
              lineHeight={'normal'}
              label={'Completed Tasks'}
              count={tasksWithStatus.COMPLETED ?? 0}
              align="start"
              isList={true}
              listOpacity={80}
              countSize="text-5xl"
              labelSize="lg"
            />
            <CountLabel
              lineHeight={'normal'}
              label={'Overdue Tasks'}
              count={tasksWithStatus.OVERDUE ?? 0}
              align="start"
              isList={true}
              listOpacity={80}
              countSize="text-3xl"
              labelSize="lg"
              countColor="red-500"
            />
          </div>
        </div>
        <TaskAgentChart />
      </Card>
    </div>
  );
};

export default TaskSummaryPage;
