'use client';

import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { transformEnumValue } from '@/utils/utils';
import { MultiSelect } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import FileUploadArea from '@/components/common/FileUploadArea';
import { FileWithMetadataFE, UserAssigneeSchema } from '@/utils/validationSchemas';
import { z } from 'zod';
import { useState } from 'react';
import { createTaskSchema } from './CreateTaskContainer';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface CreateTaskFormProps {
  form: UseFormReturn<z.infer<typeof createTaskSchema>>;
  onSubmit: (data: z.infer<typeof createTaskSchema>) => void;
  skills: { id: string; name: string }[];
  users: UserAssigneeSchema[];
  canAssignTasks?: boolean;
}

export const CreateTaskForm: React.FC<CreateTaskFormProps> = ({
  form,
  skills,
  users,
  canAssignTasks = true,
}) => {
  const [, setFiles] = useState<FileWithMetadataFE[]>([]);

  return (
    <Form {...form}>
      <div className="space-y-6 flex-1 overflow-y-auto px-6 py-6">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title</FormLabel>
              <FormControl>
                <Input placeholder="Task Title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Task Description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Skills */}
        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skills</FormLabel>
              <FormControl>
                <MultiSelect
                  options={skills.map(skill => ({
                    value: skill.name,
                    label: skill.name,
                  }))}
                  onValueChange={field.onChange}
                  defaultValue={field.value || []}
                  placeholder="Select Skills"
                  maxCount={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Status */}
        <FormField
          control={form.control}
          name="statusName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TaskStatusEnum).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {transformEnumValue(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Priority */}
        <FormField
          control={form.control}
          name="priorityName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TaskPriorityEnum).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {transformEnumValue(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Task Category */}
        <FormField
          control={form.control}
          name="taskCategoryName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Category</FormLabel>
              <FormControl>
                <Input placeholder="Task Category" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Assignee - Only show if the user has permission to assign tasks */}
        {canAssignTasks && (
          <FormField
            control={form.control}
            name="assignedToId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Task Agent</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Assignee" />
                    </SelectTrigger>
                    <SelectContent>
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
                                {user.firstName
                                  ? user.firstName.substring(0, 2).toUpperCase()
                                  : 'CN'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="ml-2">{`${user.firstName} ${user.lastName}`}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Time for Task */}
        <FormField
          control={form.control}
          name="timeForTask"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Original Estimate</FormLabel>
              <FormControl>
                <Input type="text" placeholder="e.g. 2w 1d 5h 4m" {...field} />
              </FormControl>
              <FormDescription>
                <span className="block w-full md:w-[80%] lg:w-[50%]">
                  The format is &apos; *w *d *h *m &apos; (representing weeks, days, hours and
                  minutes). Examples: 4d, 5h 30m, 60m, 3w.
                </span>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Due Date */}
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-[240px] pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={date => date < new Date('1900-01-01')}
                    autoFocus={true}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* File Upload */}
        <FileUploadArea onFilesChange={setFiles} />
      </div>
    </Form>
  );
};
