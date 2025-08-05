/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, CalendarIcon, Loader2, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';
import { TaskTable } from '@/utils/validationSchemas';
import { transformEnumValue } from '@/utils/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

export type UserDropdownMenuContent = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  currentTasksCount?: number;
};

interface BatchUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateType: 'status' | 'priority' | 'assignee' | 'category' | 'dueDate';
  selectedTasks: TaskTable[];
  onBatchUpdate: (updates: any) => Promise<void>;
  taskCategories: { id: string; categoryName: string }[];
  users: UserDropdownMenuContent[];
}

export function BatchUpdateDialog({
  open,
  onOpenChange,
  updateType,
  selectedTasks,
  onBatchUpdate,
  taskCategories,
  users,
}: BatchUpdateDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    // For assignee updates, allow empty/none values (unassignment)
    // For other update types, require a value or date
    if (updateType === 'assignee') {
      // For assignee, we allow any value including 'none' or empty
      // The validation will be handled in the switch statement below
    } else if (updateType === 'dueDate') {
      // For due date, we allow selectedDate to be undefined (clearing the date)
    } else if (!selectedValue) {
      // For other types, require a selected value
      return;
    }

    setIsLoading(true);
    try {
      const updates: any = {};
      const taskIds = selectedTasks.map(task => task.id);

      switch (updateType) {
        case 'status':
          updates.status = selectedValue as TaskStatusEnum;
          break;
        case 'priority':
          updates.priority = selectedValue as TaskPriorityEnum;
          break;
        case 'assignee':
          updates.assignedToId =
            selectedValue === 'none' || selectedValue === '' ? null : selectedValue;
          break;
        case 'category':
          updates.categoryId = selectedValue;
          break;
        case 'dueDate':
          updates.dueDate = selectedDate || null;
          break;
      }

      await onBatchUpdate({ taskIds, updates });
      onOpenChange(false);
      setSelectedValue('');
      setSelectedDate(undefined);
    } catch (error) {
      console.error('Batch update failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (updateType) {
      case 'status':
        return 'Update Task Status';
      case 'priority':
        return 'Update Task Priority';
      case 'assignee':
        return 'Assign Tasks';
      case 'category':
        return 'Update Task Category';
      case 'dueDate':
        return 'Update Due Date';
      default:
        return 'Update Tasks';
    }
  };

  const getDescription = () => {
    const count = selectedTasks.length;
    return `This will update ${count} selected task${count > 1 ? 's' : ''}.`;
  };

  const renderInput = () => {
    switch (updateType) {
      case 'status':
        return (
          <Select value={selectedValue} onValueChange={setSelectedValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TaskStatusEnum).map(status => (
                <SelectItem key={status} value={status}>
                  {transformEnumValue(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'priority':
        return (
          <Select value={selectedValue} onValueChange={setSelectedValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TaskPriorityEnum).map(priority => (
                <SelectItem key={priority} value={priority}>
                  {transformEnumValue(priority)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'assignee':
        return (
          <div className="space-y-4">
            {/* Assignment Context Summary */}
            {(() => {
              const assigned = selectedTasks.filter(task => task.assignedTo);
              const unassigned = selectedTasks.filter(task => !task.assignedTo);
              const assigneeGroups = assigned.reduce(
                (acc, task) => {
                  if (!task.assignedTo) return acc;
                  const id = task.assignedTo.id;
                  if (!acc[id]) {
                    acc[id] = {
                      name: `${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
                      count: 0,
                      avatar: task.assignedTo.avatarUrl,
                    };
                  }
                  acc[id].count++;
                  return acc;
                },
                {} as Record<string, { name: string; count: number; avatar?: string | null }>
              );

              const hasMultipleAssignees = Object.keys(assigneeGroups).length > 1;
              const isMixed = assigned.length > 0 && unassigned.length > 0;

              if (hasMultipleAssignees || isMixed) {
                return (
                  <div className="bg-muted/30 p-3 rounded-md text-sm space-y-2">
                    <div className="font-medium">Current Assignment:</div>
                    {Object.entries(assigneeGroups).map(([id, data]) => (
                      <div key={id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={data.avatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {data.name
                                .split(' ')
                                .map(n => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{data.name}</span>
                        </div>
                        <Badge variant="secondary">
                          {data.count} task{data.count > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    ))}
                    {unassigned.length > 0 && (
                      <div className="flex justify-between">
                        <span>Currently Unassigned</span>
                        <Badge variant="outline">
                          {unassigned.length} task{unassigned.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}

            <Select
              value={selectedValue || 'none'}
              onValueChange={value => setSelectedValue(value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignment option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                    <span>Unassigned</span>
                  </div>
                </SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {user.firstName[0]}
                            {user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                      {user.currentTasksCount !== undefined && (
                        <Badge
                          variant={user.currentTasksCount > 8 ? 'destructive' : 'secondary'}
                          className="text-xs ml-2"
                        >
                          {user.currentTasksCount} task{user.currentTasksCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Workload warning */}
            {selectedValue &&
              selectedValue !== '' &&
              (() => {
                const selectedUser = users.find(u => u.id === selectedValue);
                if (selectedUser?.currentTasksCount && selectedUser.currentTasksCount > 8) {
                  return (
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded-md text-sm">
                      <div className="flex items-center gap-2 text-orange-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          High workload: {selectedUser.firstName} {selectedUser.lastName} already
                          has {selectedUser.currentTasksCount} tasks
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

            {/* Assignment Preview */}
            {(() => {
              const assigned = selectedTasks.filter(task => task.assignedTo);

              if (selectedValue === '' || selectedValue === 'none') {
                if (assigned.length > 0) {
                  return (
                    <div className="text-sm text-muted-foreground bg-blue-50 border border-blue-200 p-3 rounded-md">
                      <strong>Preview:</strong> Will unassign {assigned.length} task
                      {assigned.length > 1 ? 's' : ''}
                    </div>
                  );
                }
              } else {
                const selectedUser = users.find(u => u.id === selectedValue);
                if (selectedUser) {
                  const totalToAssign = selectedTasks.length;
                  return (
                    <div className="text-sm text-muted-foreground bg-green-50 border border-green-200 p-3 rounded-md">
                      <strong>Preview:</strong> Will assign all {totalToAssign} task
                      {totalToAssign > 1 ? 's' : ''} to {selectedUser.firstName}{' '}
                      {selectedUser.lastName}
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>
        );
      case 'category':
        return (
          <Select value={selectedValue} onValueChange={setSelectedValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {taskCategories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.categoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'dueDate':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor={updateType}>
              {updateType === 'assignee' ? 'Assignee' : transformEnumValue(updateType)}
            </Label>
            {renderInput()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              (updateType === 'assignee'
                ? false // Always allow submission for assignee updates
                : updateType === 'dueDate'
                  ? false // Always allow submission for due date updates
                  : !selectedValue) // For other types, require selectedValue
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Tasks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
