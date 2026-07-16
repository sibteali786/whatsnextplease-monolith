'use client';

import { useRouter } from 'next/navigation';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SerialNumberBadge } from '@/components/tasks/SerialNumberBadge';
import { taskPriorityColors, taskStatusColors } from '@/utils/taskUtilColorClasses';
import { transformEnumValue } from '@/utils/utils';
import { TaskByUserIdResponse } from '@/utils/validationSchemas';

type Task = NonNullable<TaskByUserIdResponse['data']>[number];

type Props = {
  tasks: Task[];
};

export default function RecentTasksTable({ tasks }: Props) {
  const router = useRouter();

  return (
    <Table className="border rounded-md">
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead>Serial</TableHead>
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
            onClick={() => router.push(`/taskOfferings/${task.id}`)}
          >
            <TableCell className="font-medium">
              <SerialNumberBadge serialNumber={task.serialNumber} showCopy size="md" />
            </TableCell>

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

            <TableCell className="text-right">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
