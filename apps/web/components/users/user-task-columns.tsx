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
import { Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { transformEnumValue } from '@/utils/utils';
import { taskPriorityColors, taskStatusColors } from '@/utils/commonClasses';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { TaskTable } from '@/utils/validationSchemas';
import { InlineDropdown } from '../common/InlineDropdown';
import { updateTaskField } from '@/utils/tasks/taskInlineUpdates';
import { TaskNotificationService } from '@/utils/notifications/taskNotifications';

type TaskAssignees = {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

export const generateUserTaskColumns = (
  showDescription = false,
  onEditTask?: (task: TaskTable) => void,
  deleteTask?: (taskId: string) => void,
  onTaskUpdate?: () => Promise<void>,
  taskCategories?: { id: string; categoryName: string }[],
  role?: Roles
): ColumnDef<TaskTable>[] => {
  const canEditStatus = role !== Roles.CLIENT;
  const canEditPriority =
    role === Roles.SUPER_USER || role === Roles.TASK_SUPERVISOR || role === Roles.TASK_AGENT;
  const canEditCategory = role !== Roles.CLIENT;

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
          onClick={e => {
            e.stopPropagation();
          }}
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
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const category: { categoryName: string; id: string } = row.getValue('taskCategory');
        const task = row.original;

        if (!canEditCategory) {
          return (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 py-1 px-3 text-nowrap">
              {category?.categoryName}
            </Badge>
          );
        }

        const categoryOptions =
          taskCategories?.map(cat => ({
            value: cat.id,
            label: cat.categoryName,
            className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
          })) || [];

        const handleCategoryUpdate = async (newCategoryId: string) => {
          try {
            const oldCategoryName = category?.categoryName;
            const newCategory = taskCategories?.find(cat => cat.id === newCategoryId);

            await updateTaskField({
              taskId: task.id,
              field: 'taskCategory',
              value: newCategoryId,
            });

            // Send notification using the new helper method for single field updates
            if (newCategory && oldCategoryName !== newCategory.categoryName) {
              await TaskNotificationService.sendSingleFieldUpdate(
                task.id,
                task.title,
                'taskCategory',
                oldCategoryName,
                newCategory.categoryName,
                task.createdByUserId || undefined,
                task.createdByClientId || undefined,
                task.assignedToId || undefined
              );
            }

            console.log('Notification sent for category update');

            if (onTaskUpdate) {
              await onTaskUpdate();
            }
          } catch (error) {
            console.error('Failed to update category:', error);
          }
        };

        return (
          <div onClick={e => e.stopPropagation()}>
            <InlineDropdown
              value={category?.id}
              options={categoryOptions}
              onSelect={handleCategoryUpdate}
              displayValue={category?.categoryName}
              currentClassName="bg-blue-100 text-blue-800 hover:bg-blue-200"
            />
          </div>
        );
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
        const task = row.original;

        if (!canEditPriority) {
          return (
            <Badge
              className={`${taskPriorityColors[priority?.priorityName]} py-1 px-3 text-nowrap`}
            >
              {transformEnumValue(priority?.priorityName)}
            </Badge>
          );
        }

        const priorityOptions = Object.values(TaskPriorityEnum).map(value => ({
          value,
          label: transformEnumValue(value),
          className: taskPriorityColors[value],
        }));

        const handlePriorityUpdate = async (newPriority: TaskPriorityEnum) => {
          try {
            const oldPriority = priority?.priorityName;

            await updateTaskField({
              taskId: task.id,
              field: 'priority',
              value: newPriority,
            });

            // Send notification using the new helper method for single field updates
            if (oldPriority !== newPriority) {
              await TaskNotificationService.sendSingleFieldUpdate(
                task.id,
                task.title,
                'priority',
                oldPriority,
                newPriority,
                task.createdByUserId || undefined,
                task.createdByClientId || undefined,
                task.assignedToId || undefined
              );
            }

            if (onTaskUpdate) {
              await onTaskUpdate();
            }
          } catch (error) {
            console.error('Failed to update priority:', error);
          }
        };

        return (
          <div onClick={e => e.stopPropagation()}>
            <InlineDropdown
              value={priority?.priorityName}
              options={priorityOptions}
              onSelect={handlePriorityUpdate}
              displayValue={transformEnumValue(priority?.priorityName)}
              currentClassName={taskPriorityColors[priority?.priorityName]}
            />
          </div>
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
        const task = row.original;

        if (!canEditStatus) {
          return (
            <Badge className={`${taskStatusColors[status?.statusName]} py-1 px-3 text-nowrap`}>
              {transformEnumValue(status?.statusName)}
            </Badge>
          );
        }

        const statusOptions = Object.values(TaskStatusEnum).map(value => ({
          value,
          label: transformEnumValue(value),
          className: taskStatusColors[value],
        }));

        const handleStatusUpdate = async (newStatus: TaskStatusEnum) => {
          try {
            const oldStatus = status?.statusName;

            await updateTaskField({
              taskId: task.id,
              field: 'status',
              value: newStatus,
            });

            // Send notification using the new helper method for single field updates
            if (oldStatus !== newStatus) {
              await TaskNotificationService.sendSingleFieldUpdate(
                task.id,
                task.title,
                'status',
                oldStatus,
                newStatus,
                task.createdByUserId || undefined,
                task.createdByClientId || undefined,
                task.assignedToId || undefined
              );
            }

            if (onTaskUpdate) {
              await onTaskUpdate();
            }
          } catch (error) {
            console.error('Failed to update status:', error);
          }
        };

        return (
          <div onClick={e => e.stopPropagation()}>
            <InlineDropdown
              value={status?.statusName}
              options={statusOptions}
              onSelect={handleStatusUpdate}
              displayValue={transformEnumValue(status?.statusName)}
              currentClassName={taskStatusColors[status?.statusName]}
            />
          </div>
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
        const task = row.original;
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
        } else {
          return (
            <div className="flex items-center">
              <Button
                variant="default"
                onClick={e => {
                  e.stopPropagation();
                  return onEditTask && onEditTask(task);
                }}
              >
                Assign
              </Button>
            </div>
          );
        }
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
              <DropdownMenuItem
                onClick={e => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(task.id);
                }}
              >
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
