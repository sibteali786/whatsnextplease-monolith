'use client';

import { Button } from '@/components/ui/button';
import { Column, ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { transformEnumValue } from '@/utils/utils';
import { taskPriorityColors, taskStatusColors } from '@/utils/commonClasses';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { TaskTable } from '@/utils/validationSchemas';

type TaskAssignees = {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};
export const generateUserTaskColumns = (
  showDescription = false,
  onEditTask?: (task: TaskTable) => void,
  deleteTask?: (taskId: string) => void
): ColumnDef<TaskTable>[] => {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'taskCategory',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Task Details
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const category: { categoryName: string } = row.getValue('taskCategory');
        return <p>{category.categoryName}</p>;
      },
    },
    ...(showDescription
      ? [
          {
            accessorKey: 'description',
            header: ({ column }: { column: Column<TaskTable, unknown> }) => (
              <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              >
                Description
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            ),
          },
        ]
      : []),
    {
      accessorKey: 'priority',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Priority
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const priority: { priorityName: TaskPriorityEnum } = row.getValue('priority');
        return (
          <Badge className={`${taskPriorityColors[priority?.priorityName]} py-2 px-4 text-nowrap`}>
            {transformEnumValue(priority?.priorityName)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const status: { statusName: TaskStatusEnum } = row.getValue('status');
        return (
          <Badge className={`${taskStatusColors[status?.statusName]} py-2 px-4 text-nowrap`}>
            {transformEnumValue(status?.statusName)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'dueDate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dueDate: string = row.getValue('dueDate');
        return dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date';
      },
    },
    {
      accessorKey: 'taskSkills',
      header: 'Skills',
      cell: ({ row }) => {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        const skillsSchema = z.array(z.string());
        type Skills = z.infer<typeof skillsSchema>;
        const skills: Skills = row.getValue('taskSkills');
        return (
          <div className={`flex ${skills.length > 2 ? 'flex-wrap' : ''} gap-2 items-center`}>
            {skills.map((skill, index) => (
              <Badge key={index} className="py-1 px-4 text-[10px] text-nowrap">
                {skill}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'assignedTo',
      header: 'Assignee',
      cell: ({ row }) => {
        const assignee: TaskAssignees = row.getValue('assignedTo');
        if (assignee) {
          return (
            <div className="flex items-center">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage
                  src={assignee.avatarUrl || 'https://github.com/shadcn.png'}
                  alt={assignee.firstName ?? 'avatar'}
                  className="rounded-full"
                />
                <AvatarFallback className="rounded-full">
                  {assignee.firstName ? assignee.firstName.substring(0, 2).toUpperCase() : 'CN'}
                </AvatarFallback>
              </Avatar>
              <span className="ml-2">{`${assignee.firstName} ${assignee.lastName}`}</span>
            </div>
          );
        }
        return 'Unassigned';
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const task = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(task.id)}>
                Copy Task ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={e => {
                  e.stopPropagation(); // Prevents the row click event
                  return onEditTask && onEditTask(task);
                }}
              >
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async e => {
                  e.stopPropagation();
                  return deleteTask && deleteTask(task.id);
                }}
              >
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};
