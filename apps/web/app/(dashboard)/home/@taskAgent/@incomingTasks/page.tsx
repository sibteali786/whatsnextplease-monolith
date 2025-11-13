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
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { taskPriorityColors, taskStatusColors } from '@/utils/taskUtilColorClasses';
import { transformEnumValue } from '@/utils/utils';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';
import { CallToAction } from '@/components/CallToAction';
import { Loader2, ClipboardList } from 'lucide-react';
import { useState, useEffect } from 'react';
import { TaskTable } from '@/utils/validationSchemas';
import { tasksByType } from '@/db/repositories/tasks/tasksByType';
import { DurationEnum } from '@/types';
import { LinkButton } from '@/components/ui/LinkButton';
import { useRouter } from 'next/navigation';
const IncomingTasksPage = () => {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handleRowClick = (taskID: string) => {
    router.push(`/taskOfferings/${taskID}`);
  };
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (user?.role?.name === Roles.TASK_AGENT) {
          const response = await tasksByType('my-tasks', null, 5, '', DurationEnum.ALL, user.id);

          if (response.success) {
            setTasks(response.tasks || []);
            setError(null);
          } else {
            setError(response.message || 'Failed to fetch tasks');
          }
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        setError('An unexpected error occurred while fetching tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <CallToAction
        title="Error Loading Tasks"
        link="/taskOfferings"
        description={error}
        action="Try Again"
        variant="destructive"
        iconType="alert"
        buttonVariant="outline"
      />
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <CallToAction
        title="No Incoming Tasks"
        link="/taskOfferings"
        description="You don't have any new tasks assigned to you."
        helperText="Check back later for new task assignments or contact your supervisor."
        action="View All Tasks"
        variant="primary"
        iconType="file"
        className="w-full max-w-3xl mx-auto"
      />
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Incoming Tasks
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Table className="border rounded-md">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-medium">Task Details</TableHead>
              <TableHead className="font-medium">Priority</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="font-medium">Client</TableHead>
              <TableHead className="text-right font-medium">Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(task => (
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
                  {task.createdByClient?.companyName || task.createdByClient?.contactName || 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <CardFooter className="pt-1 pb-4 flex justify-end">
        <LinkButton
          href="/taskOfferings"
          className="flex items-center gap-1"
          variant={'outline'}
          size={'sm'}
          prefetch={true}
        >
          <span>View All Tasks</span>
        </LinkButton>
      </CardFooter>
    </Card>
  );
};

export default IncomingTasksPage;
