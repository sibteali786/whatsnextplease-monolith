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
import { taskPriorityColors, taskStatusColors } from '@/utils/commonClasses';
import { transformEnumValue } from '@/utils/utils';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/utils/user';
import { Roles } from '@prisma/client';
import { getUnassignedTasksOutputSchema, TaskType } from '@/utils/validationSchemas';

const RecentUnassignedTasksPage = () => {
  const [tasks, setTasks] = useState<TaskType[]>([]);
  useEffect(() => {
    const fetchTasks = async () => {
      const user = await getCurrentUser();
      if (user?.role?.name === Roles.TASK_SUPERVISOR) {
        const response = await fetch('/api/tasks/unassignedTasks?pageSize=5');

        if (!response.ok) {
          throw new Error('Failed to fetch unassigned tasks');
        }

        const jsonResponse = await response.json();
        // Validate response with Zod
        const { tasks } = getUnassignedTasksOutputSchema.parse(jsonResponse);
        setTasks(tasks);
      }
    };
    fetchTasks();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold col-span-full">Recent Unassigned Tasks</h2>
      <Table className="border bg-card text-card-foreground shadow-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Task Details</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell>{task.taskCategory.categoryName}</TableCell>
              <TableCell>
                <Badge className={`${taskPriorityColors[task.priority.priorityName]} py-2 px-4`}>
                  {transformEnumValue(task.priority.priorityName)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`${taskStatusColors[task.status.statusName]} py-2 px-4`}>
                  {transformEnumValue(task.status.statusName)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button variant={'link'}>
        <Link href="/taskOfferings">View Details</Link>
      </Button>
    </div>
  );
};

export default RecentUnassignedTasksPage;
