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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';
import { TaskTable } from '@/utils/validationSchemas';
import { transformEnumValue } from '@/utils/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export type UserDropdownMenuContent = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
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
    if (!selectedValue && !selectedDate && updateType !== 'dueDate') return;

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
          updates.assignedToId = selectedValue || null;
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
          <Select value={selectedValue} onValueChange={setSelectedValue}>
            <SelectTrigger>
              <SelectValue placeholder="Select assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={user.avatarUrl || 'https://github.com/shadcn.png'}
                        alt={user.firstName ?? 'avatar'}
                        className="rounded-full"
                      />
                      <AvatarFallback className="rounded-full">
                        {user.firstName ? user.firstName.substring(0, 2).toUpperCase() : 'CN'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="ml-2">{`${user.firstName} ${user.lastName}`}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Button onClick={handleSubmit} disabled={isLoading || (!selectedValue && !selectedDate)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Tasks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
