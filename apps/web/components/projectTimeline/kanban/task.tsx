'use client';

import { taskPriorityColors } from '@/utils/taskUtilColorClasses';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Calendar, Equal, MoreHorizontal } from 'lucide-react';
import { TaskTable } from '@/utils/validationSchemas';
import { transformEnumValue } from '@/utils/utils';

import { useDraggable } from '@dnd-kit/core';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { Button } from '../../ui/button';
import { useState } from 'react';
import EditTaskDialog from '../../common/EditTaskDialog';
import { Roles, TaskType } from '@prisma/client';
import DeleteTaskDialog from './delete-task';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipArrow, TooltipPortal } from '@radix-ui/react-tooltip';
import { SerialNumberBadge } from '@/components/tasks/SerialNumberBadge';
const DateComponent = ({ dateString }: { dateString?: Date | null }) => {
  const date = dateString ? new Date(dateString) : null;
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (!dateString) {
    return (
      <div className="flex gap-2 rounded-[18px] p-2 border bg-[rgba(255, 255, 255, 0.1)] items-center justify-center">
        <Calendar className="h-3 w-3" />
        <p className="text-[10px] font-medium ">No Date</p>
      </div>
    );
  }

  return (
    <div className="flex gap-2 rounded-[18px] p-2 border bg-[rgba(255, 255, 255, 0.1)] items-center justify-center">
      <Calendar className="h-3 w-3" />
      <p className="text-[10px] font-medium ">{date?.toLocaleDateString(undefined, options)}</p>
    </div>
  );
};

const TaskBox = ({
  task,
  isDragOverlay = false,
  role,
  taskCategories,
  onReload,
}: {
  task: TaskTable;
  isDragOverlay?: boolean;
  role?: Roles;
  taskCategories?: { id: string; categoryName: string }[];
  onReload?: () => void;
}) => {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id, // task ID
  });
  if (isDragging) {
    return <div ref={setNodeRef} className="invisible h-[1px]" />;
  }
  const style = {
    backgroundColor: isDragOverlay ? 'rgba(109,40,217,0.1)' : undefined,
    boxShadow: isDragOverlay ? '0 10px 30px rgba(0,0,0,0.25)' : undefined,
  };
  console.log('TaskBox rendered with task:', task);
  return (
    <div className="flex flex-col p-1 relative min-w-[300px] md:min-w-full rounded-[16px]">
      <EditTaskDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={task}
        role={role ?? Roles.SUPER_USER}
        taskCategories={taskCategories ?? []}
        onReload={onReload}
      />
      <DeleteTaskDialog
        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        taskId={task.id}
        onReload={onReload}
      />

      <div
        style={style}
        className="flex flex-col rounded-[16px] border bg-[rgba(255, 255, 255, 0.1)]  min-w-[300px] md:min-w-full"
      >
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="w-full flex flex-col items-center justify-around bg-[#ffffff0a] cursor-grab rounded-t-[16px] h-[25px] "
        >
          {/* <div className="bg-white/40 w-[30px] h-[2px] min-h-[2px] max-h-[2px]" />
          <div className="bg-white/40 w-[30px] h-[2px] min-h-[2px] max-h-[2px]" /> */}
          <Equal className="text-white/40 w-8" />
        </div>
        <div
          className="flex flex-col gap-4 p-4 cursor-pointer hover:bg-primary/10 transition-colors duration-300"
          onClick={() => router.push(`/taskOfferings/${task.id}`)}
        >
          <div className="flex align-center items-center gap-2">
            {task.serialNumber && (
              <SerialNumberBadge
                serialNumber={task.serialNumber}
                showCopy={false}
                size="md"
                className={`text-xs py-1 ${
                  task.type === TaskType.EXTERNAL
                    ? 'bg-primary '
                    : task.type === TaskType.INTERNAL
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              />
            )}
            <Badge
              className={`${taskPriorityColors[task?.priority?.priorityName]} py-1 px-3 text-nowrap w-fit`}
            >
              {transformEnumValue(task?.priority?.priorityName)}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="ml-auto">
                <Button variant="ghost" className="h-5 w-5 p-0 ">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    const taskUrl = `${window.location.origin}/taskOfferings/${task.id}`;
                    navigator.clipboard.writeText(taskUrl);
                  }}
                >
                  Copy Task Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation(); // Prevents the row click event
                    setIsEditDialogOpen(true);
                  }}
                >
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async e => {
                    e.stopPropagation();
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="font-bold text-sm ">{task?.title}</p>
          <div
            className={`${task?.assignedTo ? 'justify-between' : 'justify-end'} flex gap-2 items-center`}
          >
            {task?.assignedTo && (
              <TooltipProvider>
                <Tooltip delayDuration={250}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 rounded-lg">
                      <AvatarImage
                        src={task?.assignedTo?.avatarUrl || 'https://github.com/shadcn.png'}
                        alt={task?.assignedTo?.firstName ?? 'avatar'}
                        className="rounded-full"
                      />
                      <AvatarFallback className="rounded-full text-xs">
                        {task?.assignedTo?.firstName} {task?.assignedTo?.lastName}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent
                      side="top"
                      align="center"
                      className="bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg"
                    >
                      {task?.assignedTo?.firstName} {task?.assignedTo?.lastName}
                      <TooltipArrow className="fill-gray-800" />
                    </TooltipContent>
                  </TooltipPortal>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="flex gap-1 items-center text-muted-foreground">
              <DateComponent dateString={task?.createdAt} />
              -
              <DateComponent dateString={task?.dueDate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskBox;
