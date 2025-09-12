'use client';
import { DynamicIcon } from '@/utils/Icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { capitalizeFirstChar, transformEnumValue } from '@/utils/utils';
import { TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { TaskByPriority } from '@/utils/validationSchemas';
import { taskStatusColors } from '@/utils/taskUtilColorClasses';

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
  const getStatusBadgeClass = (status: TaskStatusEnum): string => {
    return taskStatusColors[status] || 'bg-gray-500 text-white hover:bg-gray-600';
  };

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
                      {/* Updated Badge to use new color system */}
                      <Badge
                        className={`text-xs font-medium ${getStatusBadgeClass(task.status.statusName)}`}
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
          <div className="p-4 text-center text-muted-foreground">
            <p>No tasks found</p>
          </div>
        )}
        {tasks.length > 0 && (
          <div className="p-4 border-t">
            <Button variant="ghost" className="w-full" onClick={() => handlePriority(priority)}>
              View All {title}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
