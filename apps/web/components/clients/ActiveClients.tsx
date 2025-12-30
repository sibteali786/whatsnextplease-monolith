'use client';
import Link from 'next/link';
import { LabelValue } from '../LabelValue';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { ClientType } from '@/types';
import { CountLabel } from '../common/CountLabel';
import { useRouter } from 'next/navigation';
import { useClientStore } from '@/store/useClientStore';
import { TaskAgentChart } from '../tasks/ChartTasks';
import { ChartConfig } from '../ui/chart';
import { useEffect, useState } from 'react';
import { TasksCountType } from '@/app/(dashboard)/home/@taskSupervisor/@taskSummary/page';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';
import { taskApiClient } from '@/utils/taskApi';
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
interface ActiveClientsProps {
  error?: string;
  errorCount?: string;
  count: number;
  clients: ClientType[];
}

export const ActiveClients: React.FC<ActiveClientsProps> = ({
  error,
  errorCount,
  count,
  clients,
}) => {
  const router = useRouter();
  const [tasks, setTasks] = useState<TasksCountType>();

  const { setSelectedClient } = useClientStore();
  const handleLinkClick = (client: ClientType) => {
    // This function can be used to handle any additional logic when a client link is clicked
    setSelectedClient({
      id: client.id,
      username: client.contactName,
    });
    // You can also set the selected client in a global state or context if needed
    router.push(`/clients/${client.id}`);
  };

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
        const user = await getCurrentUser();

        // Check for authorized roles
        if (user?.role?.name !== Roles.SUPER_USER) {
          return null;
        }
        const response = await taskApiClient.getTasksCount(user.id, 'taskAssignmentStatus');

        if (response.success) {
          // Define type for count item
          type CountItem = {
            statusName: string;
            count: number;
          };

          // Transform backend response to match expected format
          const taskCounts = {
            UnassignedTasks:
              response.counts?.find((c: CountItem) => c.statusName === 'Unassigned')?.count || 0,
            AssignedTasks:
              response.counts?.find((c: CountItem) => c.statusName === 'Assigned')?.count || 0,
          };

          setTasks(taskCounts);
        } else {
          throw new Error(response.message || 'Failed to fetch task counts');
        }
      } catch (error) {
        console.error('Error fetching task counts:', error);
      }
    };

    fetchTasksCount();
  }, []);
  return (
    <Card className="p-6 rounded-2xl shadow-m">
      <div className="p-2 flex flex-row justify-between">
        {errorCount ? (
          <div className="flex flex-row justify-center">
            <p>{errorCount}</p>
          </div>
        ) : (
          <div className="space-y-7 w-full">
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
                squareColor={chartConfig.assignedTasks.color}
              />
              <CountLabel
                lineHeight={'normal'}
                label={'Active Clients'}
                count={count}
                align="start"
                isList={true}
                listOpacity={70}
                countSize="text-3xl"
              />
            </div>
          </div>
        )}
        <div className="min-w-[250px]">
          <TaskAgentChart chartConfig={chartConfig} desktopData={desktopData} />
        </div>
      </div>
      <CardContent>
        {error ? (
          <div className="flex flex-row justify-center">
            <p className="text-red-500 mt-4">{error}</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {clients.map(client => (
              <li
                key={client.id}
                className="flex justify-between items-center py-2 border-b last:border-0"
              >
                <div>
                  <h3 className="font-medium text-black dark:text-white text-lg">
                    {client.companyName}
                  </h3>
                  <LabelValue
                    className="text-muted-foreground"
                    label="Contact Name"
                    value={client.contactName}
                  />
                </div>
                <Button variant="link" onClick={() => handleLinkClick(client)}>
                  View Details
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        {error ? null : (
          <Link href="/clients">
            <Button variant="link">View More</Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
};
