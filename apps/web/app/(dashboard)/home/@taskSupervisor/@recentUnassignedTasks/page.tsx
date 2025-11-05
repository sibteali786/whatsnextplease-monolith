// apps/web/app/(dashboard)/home/@taskSupervisor/@recentUnassignedTasks/page.tsx - UPDATED

'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { transformEnumValue } from '@/utils/utils';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';
import { TaskTable } from '@/utils/validationSchemas';
import { ClipboardCheck, Loader2, PlusCircle } from 'lucide-react';
import { CallToAction } from '@/components/CallToAction';
import { LinkButton } from '@/components/ui/LinkButton';
import { tasksByType } from '@/db/repositories/tasks/tasksByType';

import { taskPriorityColors, taskStatusColors } from '@/utils/taskUtilColorClasses';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DurationEnum } from '@/types';
import { useRouter } from 'next/navigation';

const RecentUnassignedTasksPage = () => {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskTable[] | null>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unassigned' | 'my-tasks'>('unassigned');
  const handleRowClick = (taskID: string) => {
    router.push(`/taskOfferings/${taskID}`);
  };
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const user = await getCurrentUser();
        if (user?.role?.name === Roles.TASK_SUPERVISOR) {
          // UPDATED: Use backend API instead of Next.js API route
          const response = await tasksByType(activeTab, null, 5, '', DurationEnum.ALL, user?.id);

          if (response && response.success) {
            setTasks(response.tasks);
          } else {
            throw new Error(response.message || 'Failed to fetch unassigned tasks');
          }
        }
      } catch (error) {
        console.error('Error fetching unassigned tasks:', error);
        setError(error instanceof Error ? error.message : 'Failed to load tasks');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, [activeTab]);

  return (
    <Tabs
      defaultValue={'unassigned'}
      className="w-full"
      onValueChange={value => {
        setActiveTab(value as 'unassigned' | 'my-tasks');
      }}
    >
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Tasks
          </CardTitle>
          <TabsList className="flex gap-4 bg-transparent items-start justify-start">
            <TabsTrigger value="unassigned" className="text-sm">
              Unassigned Tasks
            </TabsTrigger>

            <TabsTrigger value="my-tasks" className="text-sm">
              My Tasks
            </TabsTrigger>
          </TabsList>
        </CardHeader>

        <CardContent>
          {['unassigned', 'my-tasks'].map((ele, index) => (
            <TabsContent value={ele} key={index}>
              {isLoading ? (
                <div className="flex justify-center items-center h-[200px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <CallToAction
                  title="Error Loading Tasks"
                  link="/taskOfferings"
                  description={error}
                  action="Go to Tasks"
                  helperText="Try again later or contact support if the problem persists"
                  variant="destructive"
                  iconType="alert"
                  className="my-6"
                />
              ) : tasks?.length === 0 ? (
                <CallToAction
                  title={activeTab === 'unassigned' ? 'No unassigned tasks' : 'No Tasks Found'}
                  link="/taskOfferings"
                  description={
                    activeTab === 'unassigned'
                      ? 'There are currently no unassigned tasks in the system'
                      : 'There are no tasks assigned to you at the moment.'
                  }
                  action="Create New Task"
                  helperText={
                    activeTab === 'unassigned'
                      ? 'You can create a new task or wait for users to submit tasks'
                      : ''
                  }
                  variant="primary"
                  iconType="plus"
                  className="my-6"
                />
              ) : (
                <Table className="border rounded-md">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-medium">Task Details</TableHead>
                      <TableHead className="font-medium">Priority</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium">Customer</TableHead>
                      <TableHead className="text-right font-medium">Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks?.map(task => (
                      <TableRow
                        key={task.id}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => handleRowClick(task.id)}
                      >
                        <TableCell className="font-medium">{task.description}</TableCell>
                        <TableCell>
                          <Badge
                            className={`${taskPriorityColors[task.priority.priorityName]} py-1.5 px-2.5 text-xs font-medium`}
                          >
                            {transformEnumValue(task.priority.priorityName)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${taskStatusColors[task.status.statusName]} py-1.5 px-2.5 text-xs font-medium`}
                          >
                            {transformEnumValue(task.status.statusName)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.createdByClient?.companyName ||
                            task.createdByClient?.contactName ||
                            'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString()
                            : 'No due date'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          ))}
        </CardContent>
        {tasks && tasks?.length > 0 && (
          <CardFooter className="pt-1 pb-4 flex justify-end">
            <LinkButton
              href="/taskOfferings"
              className="flex items-center gap-1"
              variant={'outline'}
              size={'sm'}
              prefetch={true}
            >
              <span>View All Tasks</span>
              <PlusCircle className="h-4 w-4 ml-1" />
            </LinkButton>
          </CardFooter>
        )}
      </Card>
    </Tabs>
  );
};

export default RecentUnassignedTasksPage;
