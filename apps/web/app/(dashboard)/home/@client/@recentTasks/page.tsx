import { getTasksByUserId } from '@/db/repositories/users/getTasksByUserId';
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
import { PlusCircle, ClipboardList } from 'lucide-react';

const RecentTasksPage = async () => {
  const user = await getCurrentUser();
  if (user?.role?.name !== Roles.CLIENT) {
    return null;
  }
  const { tasks } = await getTasksByUserId(user.id, Roles.CLIENT, null, 5);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Recent Tasks
        </CardTitle>
      </CardHeader>

      <CardContent>
        {tasks && tasks?.length === 0 ? (
          <CallToAction
            title="No tasks found"
            link="/taskOfferings"
            description="You don't have any tasks yet. Create your first task to get started."
            action="Create Task"
            helperText="You'll be able to track most recent of your tasks from this dashboard."
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
                <TableHead className="text-right font-medium">Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks &&
                tasks.map(task => (
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
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {tasks && tasks.length > 0 && (
        <CardFooter className="pt-1 pb-4 flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href="/taskOfferings" className="flex items-center gap-1">
              <span>View All Tasks</span>
              <PlusCircle className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default RecentTasksPage;
