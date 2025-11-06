'use client';

import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { getCookie, transformEnumValue } from '@/utils/utils';
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
import { AlertTriangle, CalendarIcon, Info, UserX } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import FileUploadArea from '@/components/common/FileUploadArea';
import { FileWithMetadataFE } from '@/utils/validationSchemas';
import { z } from 'zod';
import { useEffect, useRef, useState } from 'react';
import { createTaskSchema, UserWithTaskCount } from './CreateTaskContainer';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { AddSkillDialog } from '../skills/AddSkillDialog';
import { COOKIE_NAME } from '@/utils/constant';

interface CreateTaskFormProps {
  form: UseFormReturn<z.infer<typeof createTaskSchema>>;
  onSubmit: (data: z.infer<typeof createTaskSchema>) => void;
  skills: { id: string; name: string }[];
  users: UserWithTaskCount[];
  canAssignTasks?: boolean;
  taskCategories: { id: string; categoryName: string }[];
  fetchUsers: (pageToFetch?: number) => void;
  reload?: boolean;
  setReload?: React.Dispatch<React.SetStateAction<boolean>>;
  role?: Roles;
}
interface SkillCategory {
  id: string;
  categoryName: string;
  skillsDescription: string;
}
export const CreateTaskForm: React.FC<CreateTaskFormProps> = ({
  form,
  skills,
  users,
  canAssignTasks = false,
  taskCategories,
  fetchUsers,
  reload,
  setReload,
  role,
}) => {
  /*   const user = await getCurrentUser(); */

  const [, setFiles] = useState<FileWithMetadataFE[]>([]);
  const [skillsCategory, setSkillsCategory] = useState<SkillCategory[]>([]);
  const [open, setOpen] = useState(false);

  const selectedAssigneeId = form.watch('assignedToId');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const groupSkillsByCategory = (
    skills: { id: string; name: string; skillCategory?: { categoryName: string } }[]
  ) => {
    const grouped = skills.reduce(
      (acc, skill) => {
        const categoryName = skill.skillCategory?.categoryName || 'Other';
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push({
          label: skill.name,
          value: skill.name,
        });
        return acc;
      },
      {} as Record<string, { label: string; value: string }[]>
    );

    return Object.entries(grouped).map(([category, items]) => ({
      category,
      items,
    }));
  };
  const handleScroll = () => {
    if (!dropdownRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = dropdownRef.current;
    const offset = 10; // pixels before reaching the bottom

    if (scrollTop + clientHeight >= scrollHeight - offset) {
      fetchUsers();
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skillCategory/search`, {
        headers: {
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const skillsData = await response.json();
        setSkillsCategory(skillsData);
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
    }
  };

  const onAddSkill = () => {
    setOpen(true);
  };

  useEffect(() => {
    fetchSkills();
  }, [reload]);
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
            <FormItem className="flex flex-col">
              <FormLabel>Skills</FormLabel>
              <FormControl>
                <MultiSelect
                  options={groupSkillsByCategory(skills)}
                  onValueChange={value => {
                    field.onChange(value); // still update the form value
                    fetchUsers(1);
                  }}
                  defaultValue={field.value || []}
                  value={field.value}
                  placeholder="Select Skills"
                  maxCount={5}
                  onAddSkill={onAddSkill}
                  taskOffering={true}
                  role={role}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <AddSkillDialog
          skills={skillsCategory}
          open={open}
          setOpen={setOpen}
          taskOffering={true}
          setReload={setReload}
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
              <FormLabel>Task Category*</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
                disabled={taskCategories.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {taskCategories.length > 0 ? (
                    taskCategories.map(category => (
                      <SelectItem key={category.id} value={category.categoryName}>
                        {category.categoryName}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-categories" disabled>
                      No categories available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {taskCategories.length === 0 && (
                <div className="mt-2 text-sm text-yellow-500 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  You need to add task categories before creating tasks
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Assignee - Only show if the user has permission to assign tasks */}
        {canAssignTasks ? (
          <FormField
            control={form.control}
            name="assignedToId"
            render={({ field }) => (
              <FormItem>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FormLabel>Assigned User</FormLabel>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Info className="h-3 w-3" />
                      <span>Numbers show current workload</span>
                    </div>
                  </div>

                  <FormControl>
                    <Select
                      onValueChange={value => field.onChange(value === 'none' ? '' : value)}
                      value={field.value || 'none'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <div
                          ref={dropdownRef}
                          onScroll={handleScroll}
                          style={{ maxHeight: '170px', overflowY: 'auto' }}
                        >
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <UserX className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">No Assignee</span>
                            </div>
                          </SelectItem>
                          {users.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6 rounded-lg">
                                    <AvatarImage
                                      src={user.avatarUrl || 'https://github.com/shadcn.png'}
                                      alt={user.firstName ?? 'avatar'}
                                      className="rounded-full"
                                    />
                                    <AvatarFallback className="rounded-full text-xs">
                                      {user.firstName
                                        ? user.firstName.substring(0, 2).toUpperCase()
                                        : 'CN'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{`${user.firstName} ${user.lastName}`}</span>
                                </div>
                                {user.currentTasksCount !== undefined && (
                                  <Badge
                                    variant={
                                      user.currentTasksCount > 8 ? 'destructive' : 'secondary'
                                    }
                                    className="text-xs ml-2"
                                    title={`Current workload: ${user.currentTasksCount} tasks`}
                                  >
                                    {user.currentTasksCount} total
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      </SelectContent>
                    </Select>
                  </FormControl>

                  {/* Workload Warning */}
                  {selectedAssigneeId &&
                    selectedAssigneeId !== '' &&
                    (() => {
                      const selectedUser = users.find(u => u.id === selectedAssigneeId);
                      if (selectedUser?.currentTasksCount && selectedUser.currentTasksCount > 8) {
                        const newTotal = selectedUser.currentTasksCount + 1; // Adding 1 new task
                        return (
                          <div className="bg-orange-50 border border-orange-200 p-3 rounded-md text-sm">
                            <div className="flex items-center gap-2 text-orange-800">
                              <AlertTriangle className="h-4 w-4" />
                              <div>
                                <div className="font-medium">High workload warning</div>
                                <div className="text-xs mt-1">
                                  {selectedUser.firstName} {selectedUser.lastName} currently has{' '}
                                  {selectedUser.currentTasksCount} tasks. Adding this task will
                                  bring their total to {newTotal} tasks.
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                  {/* Assignment Preview */}
                  {selectedAssigneeId &&
                    selectedAssigneeId !== '' &&
                    (() => {
                      const selectedUser = users.find(u => u.id === selectedAssigneeId);
                      if (selectedUser) {
                        return (
                          <div className="text-sm text-muted-foreground bg-green-50 border border-green-200 p-3 rounded-md">
                            <strong>Preview:</strong> This task will be assigned to{' '}
                            {selectedUser.firstName} {selectedUser.lastName}
                          </div>
                        );
                      }
                      return null;
                    })()}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="border rounded-md p-4 w-full">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>
                  This task will be sent to Task Supervisors for assignment after creation.
                </span>
              </div>
            </div>
          </div>
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
        {/* Initial Comment */}
        <FormField
          control={form.control}
          name="initialComment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Comment (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add an initial comment or note for this task..."
                  className="min-h-[80px] resize-none"
                  maxLength={5000}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This comment will be added to the task when it&apos;s created. You can add more
                comments later when editing the task.
              </FormDescription>
              <div className="text-xs text-muted-foreground text-right">
                {field.value?.length || 0}/5000
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
};
