import { getTasksByUserId } from "@/db/repositories/users/getTasksByUserId";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { taskPriorityColors, taskStatusColors } from "@/utils/commonClasses";
import { transformEnumValue } from "@/utils/utils";
import { getCurrentUser } from "@/utils/user";
import { Roles } from "@prisma/client";
const RecentTasksPage = async () => {
  const user = await getCurrentUser();
  if (user.role.name !== Roles.CLIENT) {
    return null;
  }
  const { tasks } = await getTasksByUserId(user.id, Roles.CLIENT, null, 5);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold col-span-full">Recent Tasks </h2>
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
          {tasks &&
            tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">
                  {task.taskCategory.categoryName}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${taskPriorityColors[task.priority.priorityName]} py-2 px-4`}
                  >
                    {transformEnumValue(task.priority.priorityName)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${taskStatusColors[task.status.statusName]} py-2 px-4`}
                  >
                    {transformEnumValue(task.status.statusName)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : ""}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <Button variant={"link"}>
        <Link href="/taskOfferings">View Details</Link>
      </Button>
    </div>
  );
};
export default RecentTasksPage;
