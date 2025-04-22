'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { taskPriorityColors, taskStatusColors } from '@/utils/commonClasses';
import { transformEnumValue } from '@/utils/utils';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';
import { CallToAction } from '@/components/CallToAction';
import { Loader2, ClipboardList } from 'lucide-react';
import { useState, useEffect } from 'react';
import { TaskTable } from '@/utils/validationSchemas';
import { tasksByType } from '@/db/repositories/tasks/tasksByType';
import { DurationEnum } from '@/types';

const IncomingTasksPage = () => {
  const [tasks, setTasks] = useState<TaskTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        if (user?.role?.name === Roles.TASK_AGENT) {
          const response = await tasksByType(
            'unassigned',
            Roles.TASK_AGENT,
            null,
            5,
            '',
            DurationEnum.ALL
          );

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
              <TableHead className="text-right font-medium">Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(task => (
              <TableRow
                key={task.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <TableCell className="font-medium">{task.taskCategory.categoryName}</TableCell>
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
                <TableCell className="text-right">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <CardFooter className="pt-1 pb-4 flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href="/taskOfferings" className="flex items-center gap-1">
            <span>View All Tasks</span>
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default IncomingTasksPage;
