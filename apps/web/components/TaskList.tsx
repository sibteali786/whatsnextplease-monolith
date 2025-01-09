// components/TaskList.tsx
import { DynamicIcon } from "@/utils/Icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { capitalizeFirstChar, transformEnumValue } from "@/utils/utils";
import { TaskPriorityEnum, TaskStatusEnum } from "@prisma/client";
import { TaskByPriority } from "@/utils/validationSchemas";
interface TaskListProps {
  tasks: TaskByPriority[];
  title: string;
  icon: string;
  priority: TaskPriorityEnum;
  handlePriority: (priority: TaskPriorityEnum) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  title,
  icon,
  priority,
  handlePriority,
}) => {
  return (
    <Card className="w-full max-w-md rounded-2xl">
      <CardHeader className="p-6">
        <CardTitle className="flex items-center justify-between mb-4">
          {title}
          <DynamicIcon name={icon} className="text-purple-600 h-6 w-6" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-px">
        {tasks.length > 0 ? (
          <ul className="space-y-2">
            {tasks.map((task, index) => (
              <li key={task.id}>
                <div className="flex items-center justify-start p-4 gap-3">
                  <DynamicIcon
                    name="Clipboard"
                    className="text-purple-600 font-bold h-8 w-8"
                  />
                  <div className="flex flex-row justify-between w-full">
                    <div className="flex flex-col items-start gap-2">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h5 className="text-base font-bold">
                            {capitalizeFirstChar(task.title)}
                          </h5>
                        </div>
                      </div>
                      <Badge
                        className="text-[10px]"
                        variant={`${
                          task.status.statusName === TaskStatusEnum.OVERDUE
                            ? "destructive"
                            : task.status.statusName ===
                                TaskStatusEnum.IN_PROGRESS
                              ? "warning"
                              : task.status.statusName ===
                                  TaskStatusEnum.COMPLETED
                                ? "success"
                                : "secondary"
                        }`}
                      >
                        {transformEnumValue(task.status.statusName)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {task.dueDate}
                    </p>
                  </div>
                </div>
                {index === tasks.length - 1 ? null : <Separator />}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center">Nothing to show here</div>
        )}
      </CardContent>
      <div className="mt-4 text-center">
        {tasks.length > 0 ? (
          <Button variant={"link"} onClick={() => handlePriority(priority)}>
            View More
          </Button>
        ) : null}
      </div>
    </Card>
  );
};
