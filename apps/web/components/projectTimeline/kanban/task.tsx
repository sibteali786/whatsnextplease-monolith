'use client';

import { taskPriorityColors } from '@/utils/taskUtilColorClasses';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Calendar, MoreHorizontal } from 'lucide-react';
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
import { Roles } from '@prisma/client';
import DeleteTaskDialog from './delete-task';
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 absolute right-4 top-5">
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
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="flex flex-col gap-4 p-4 rounded-[16px] border bg-[rgba(255, 255, 255, 0.1)] cursor-grab min-w-[300px] md:min-w-full"
      >
        <Badge
          className={`${taskPriorityColors[task?.priority?.priorityName]} py-1 px-3 text-nowrap w-fit`}
        >
          {transformEnumValue(task?.priority?.priorityName)}
        </Badge>

        <p className="font-bold text-sm ">{task?.title}</p>
        <div className="flex justify-between gap-2 items-center">
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
          <div className="flex gap-1 items-center text-muted-foreground">
            <DateComponent dateString={task?.createdAt} />
            -
            <DateComponent dateString={task?.dueDate} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskBox;
