'use client';
import { DynamicIcon } from '@/utils/Icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { capitalizeFirstChar, transformEnumValue } from '@/utils/utils';
import { TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { TaskByPriority } from '@/utils/validationSchemas';
import { Skeleton } from './ui/skeleton';

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
  // Function to determine badge color based on status
  const getBadgeVariant = (status: TaskStatusEnum) => {
    switch (status) {
      case TaskStatusEnum.OVERDUE:
        return 'destructive';
      case TaskStatusEnum.IN_PROGRESS:
        return 'warning';
      case TaskStatusEnum.COMPLETED:
        return 'success';
      case TaskStatusEnum.NEW:
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Define a consistent icon for tasks
  const taskIcon = 'Clipboard';

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="p-6 pb-3 bg-card">
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <DynamicIcon name={icon} className="text-primary h-6 w-6" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {tasks.length > 0 ? (
          <ul className="divide-y">
            {tasks.map(task => (
              <li key={task.id} className="hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-start p-4 gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <DynamicIcon name={taskIcon} className="text-primary h-5 w-5" />
                  </div>
                  <div className="flex flex-row justify-between w-full">
                    <div className="flex flex-col items-start gap-2">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h5 className="text-base font-semibold">
                            {capitalizeFirstChar(task.title)}
                          </h5>
                        </div>
                      </div>
                      <Badge
                        className="text-xs font-medium"
                        variant={getBadgeVariant(task.status.statusName)}
                      >
                        {transformEnumValue(task.status.statusName)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Nothing to show here</div>
        )}
      </CardContent>
      <div className="px-4 py-3 bg-card border-t text-center">
        {tasks.length > 0 ? (
          <Button variant="link" onClick={() => handlePriority(priority)}>
            View More
          </Button>
        ) : null}
      </div>
    </Card>
  );
};

export const TaskListSkeleton = () => (
  <Card className="w-full max-w-md rounded-2xl shadow-sm overflow-hidden">
    <CardHeader className="p-6 pb-3">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <div className="divide-y">
        {[1, 2, 3].map(index => (
          <div key={index} className="p-4">
            <div className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
    <div className="px-4 py-3 border-t text-center">
      <Skeleton className="h-9 w-24 mx-auto" />
    </div>
  </Card>
);
