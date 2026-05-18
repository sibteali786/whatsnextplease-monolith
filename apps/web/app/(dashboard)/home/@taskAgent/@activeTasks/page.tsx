import { getCurrentUser } from '@/utils/user';
import { CircleX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CountLabel } from '@/components/common/CountLabel';
import { TaskAgentChart } from '@/components/tasks/ChartTasks';
import { Roles } from '@prisma/client';
import { getTasksCountByStatus } from '@/db/repositories/tasks/getTasksCountByStatus';
import { ChartConfig } from '@/components/ui/chart';
const chartConfig = {
  progress: {
    label: 'In-Progress',
    color: 'hsl(var(--chart-1))',
  },
  completed: {
    label: 'Completed',
    color: 'hsl(var(--chart-2))',
  },
  overdue: {
    label: 'Overdue',
    color: 'hsl(var(--chart-3))',
  },
  new: {
    label: 'New',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

const ActiveTasks = async () => {
  const user = await getCurrentUser();
  if (user?.role?.name !== Roles.TASK_AGENT) {
    return null;
  }
  const { tasksWithStatus, success } = await getTasksCountByStatus(user.id, Roles.TASK_AGENT);

  const desktopData = [
    {
      type: 'progress',
      desktop: tasksWithStatus?.IN_PROGRESS ?? 0,
      fill: 'var(--color-progress)',
    },
    {
      type: 'completed',
      desktop: tasksWithStatus?.COMPLETED ?? 0,
      fill: 'var(--color-completed)',
    },
    {
      type: 'overdue',
      desktop: tasksWithStatus?.OVERDUE ?? 0,

      fill: 'var(--color-overdue)',
    },
    {
      type: 'new',
      desktop: tasksWithStatus?.NEW ?? 0,
      fill: 'var(--color-new)',
    },
  ];

  return (
    <div className="col-span-2">
      <Card className="p-6 rounded-2xl shadow-m flex flex-col sm:flex-row">
        {success ? (
          <div className="w-full flex flex-col gap-4">
            <CountLabel
              lineHeight={'normal'}
              label={'In-Progress Tasks'}
              count={tasksWithStatus.IN_PROGRESS ?? 0}
              align="start"
              isList={true}
              listOpacity={70}
              countSize="text-7xl"
              squareColor={chartConfig.progress.color}
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
              squareColor={chartConfig.completed.color}
            />
            <CountLabel
              lineHeight={'normal'}
              label={'Overdue'}
              count={tasksWithStatus.OVERDUE ?? 0}
              align="start"
              isList={true}
              listOpacity={30}
              countSize="text-4xl"
              labelSize="lg"
              squareColor={chartConfig.overdue.color}
            />
            <CountLabel
              lineHeight={'normal'}
              label={'New'}
              count={tasksWithStatus.NEW ?? 0}
              align="start"
              isList={true}
              listOpacity={30}
              countSize="text-3xl"
              labelSize="lg"
              squareColor={chartConfig.new.color}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 items-center justify-center">
            <CircleX color="red" className="w-10 h-10" />
            <p className="text-destructive text-lg text-center">Something is wrong at backend </p>
          </div>
        )}
        <TaskAgentChart chartConfig={chartConfig} desktopData={desktopData} />
      </Card>
    </div>
  );
};

export default ActiveTasks;
