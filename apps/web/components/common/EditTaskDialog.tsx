'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

import { Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import {
  parseOriginalEstimate,
  transformEnumValue,
  trimWhitespace,
  formatOriginalEstimate,
  getCookie,
} from '@/utils/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, CheckCircle, CircleX, Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { updateTaskById } from '@/db/repositories/tasks/updateTaskbyId';
import { usersList } from '@/db/repositories/users/usersList';
import { FileSchemaType, TaskFile, TaskTable, UserAssigneeSchema } from '@/utils/validationSchemas';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { FileAttachmentsList } from '../files/FileAttachmentList';
import { fileAPI } from '@/utils/fileAPI';
import { COOKIE_NAME } from '@/utils/constant';
import { MultiSelect } from '../ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { taskPriorityColors, taskStatusColors } from '@/utils/taskUtilColorClasses';
import CommentSection from '../comments/CommentSection';
import { getTaskById } from '@/db/repositories/tasks/getTaskById';
import { taskApiClient } from '@/utils/taskApi';

// Extended schema with `overTime`, similar to `timeForTask`
const editTaskSchema = z.object({
  title: z.string().max(100, 'Title must not exceed 100 characters').min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priorityName: z.nativeEnum(TaskPriorityEnum),
  statusName: z.nativeEnum(TaskStatusEnum),
  taskCategoryName: z.string().min(1, 'Task Category is required'),
  assignedToId: z.string().optional(),
  skills: z.array(z.string()).nonempty('Please select at least one skill'),
  timeForTask: z
    .string()
    .min(1, 'Time for Task is required')
    .refine(
      value => {
        const regex = /^\s*(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*$/i;
        const match = value.trim().match(regex);
        if (!match) return false;
        const [, w, d, h, m] = match;
        return Boolean(w || d || h || m);
      },
      {
        message: "Invalid format for Original Estimate. Examples: '4d', '5h 30m', '60m', '3w'",
      }
    ),
  overTime: z
    .string()
    .optional()
    .transform(val => (val?.trim() === '' ? '0' : val))
    .refine(
      value => {
        // Allow empty or "0" meaning no overtime.
        if (!value || value === '0') return true;
        const regex = /^\s*(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*$/i;
        const match = value.trim().match(regex);
        if (!match) return false;
        const [, w, d, h, m] = match;
        return Boolean(w || d || h || m);
      },
      {
        message:
          "Invalid format for OverTime. Examples: '4d', '5h 30m', '60m', '3w' or leave empty if none",
      }
    ),
  dueDate: z.date().nullable(),
});
interface TaskMetadata {
  priorities: Array<{
    id: string;
    name: TaskPriorityEnum;
    displayName: string;
    isLegacy?: boolean;
  }>;
  statuses: Array<{
    id: string;
    name: TaskStatusEnum;
    displayName: string;
    isLegacy?: boolean;
  }>;
}
type EditTaskFormValues = z.infer<typeof editTaskSchema>;

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskTable;
  role: Roles;
  taskCategories: { id: string; categoryName: string }[];
  fetchTasks?: () => Promise<void>;
  onTaskUpdate?: () => Promise<void>;
}

export default function EditTaskDialog({
  open,
  onOpenChange,
  task,
  role,
  taskCategories,
  fetchTasks,
  onTaskUpdate,
}: EditTaskDialogProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserAssigneeSchema[]>([]);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [skills, setSkills] = useState<
    { id: string; name: string; skillCategory: { categoryName: string } }[]
  >([]);
  const [loadingFileIds, setLoadingFileIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [metadata, setMetadata] = useState<TaskMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Permission checks based on role
  const canAssignTasks = role === Roles.SUPER_USER || role === Roles.TASK_SUPERVISOR;
  const canEditStatus = role !== Roles.CLIENT;
  const canEditOverTime = role !== Roles.CLIENT;
  const canEditPriority =
    role === Roles.SUPER_USER || role === Roles.TASK_SUPERVISOR || role === Roles.TASK_AGENT;
  const canEditCategory = role !== Roles.CLIENT;

  const form = useForm<EditTaskFormValues>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      priorityName: TaskPriorityEnum.NORMAL,
      statusName: TaskStatusEnum.NEW,
      taskCategoryName: '',
      skills: [],
      timeForTask: '1d',
      overTime: '0',
      dueDate: new Date(),
    },
    mode: 'onSubmit',
  });

  /**
   * Fetch task metadata using taskApiClient
   * This replaces the old useTaskMetadat hook and provides better error handling
   */
  const fetchTaskMetadata = async () => {
    try {
      setMetadataLoading(true);
      setMetadataError(null);

      const metadataResponse = await taskApiClient.getTaskMetadata();

      if (metadataResponse.success) {
        setMetadata(metadataResponse.data);
      } else {
        throw new Error(metadataResponse.message || 'Failed to fetch task metadata');
      }
    } catch (error) {
      console.error('Error fetching task metadata:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch metadata';
      setMetadataError(errorMessage);

      toast({
        variant: 'destructive',
        title: 'Failed to load task metadata',
        description: errorMessage,
        icon: <CircleX size={40} />,
      });
    } finally {
      setMetadataLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/skill/all`, {
        headers: {
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const skillsData = await response.json();
        setSkills(skillsData);
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to fetch skills',
        description: 'Unable to load skills for editing',
        icon: <CircleX size={40} />,
      });
    }
  };

  const groupSkillsByCategory = (
    skills: { id: string; name: string; skillCategory: { categoryName: string } }[]
  ) => {
    const grouped = skills.reduce(
      (acc, skill) => {
        const categoryName = skill.skillCategory.categoryName;
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

  const fetchUsers = async () => {
    if (!canAssignTasks) {
      return;
    }
    try {
      const response = await usersList(role ?? Roles.TASK_SUPERVISOR);
      if (response.success) {
        setUsers(response.users);
      }
      if (!response.success) {
        toast({
          variant: 'destructive',
          title: `Failed to fetch users`,
          description: response.details.originalError,
          icon: <CircleX size={40} />,
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        toast({
          variant: 'destructive',
          title: `Failed to fetch users`,
          description: 'Something went wrong!',
          icon: <CircleX size={40} />,
        });
      }
    }
  };

  useEffect(() => {
    if (open && task) {
      form.reset({
        title: task.title,
        description: task.description,
        priorityName: task.priority.priorityName,
        statusName: task.status.statusName,
        taskCategoryName: task.taskCategory.categoryName,
        assignedToId: task?.assignedTo?.id || '',
        skills: task.taskSkills || [],
        timeForTask: formatOriginalEstimate(Number(task.timeForTask)) ?? '1d',
        overTime:
          task.overTime && Number(task.overTime) > 0
            ? formatOriginalEstimate(Number(task.overTime))
            : '',
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
      });
      // set files
      if (task.taskFiles) {
        setFiles(task.taskFiles);
      }
    }
    if (open) {
      fetchUsers();
      fetchSkills();
      fetchTaskMetadata();
    }
  }, [task, open, form]);

  const [, startTransition] = useTransition();

  // Updated delete handler using backend API
  const deleteFileHandler = async (fileId: string) => {
    setLoadingFileIds(prev => [...prev, fileId]);
    startTransition(async () => {
      try {
        const result = await fileAPI.deleteFile(fileId);

        if (result.success) {
          // Update local state after successful deletion
          setFiles(prevFiles => prevFiles.filter(file => file.file.id !== fileId));
          await handleCommentDataChange();
          toast({
            title: 'File Deleted Successfully',
            description: `File with id: ${fileId} deleted successfully`,
            variant: 'success',
            icon: <CheckCircle size={40} />,
          });
        } else {
          toast({
            title: 'Failed to delete file',
            description: result.error || result.message || 'Unknown error',
            variant: 'destructive',
            icon: <CircleX size={40} />,
          });
        }
      } catch (error) {
        console.error('Error deleting file', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete file',
          variant: 'destructive',
          icon: <CircleX size={40} />,
        });
      } finally {
        setLoadingFileIds(prev => prev.filter(id => id !== fileId));
      }
    });
  };

  // Updated download handler using backend API
  const handleDownload = async (file: FileSchemaType, options?: { forceDownload?: boolean }) => {
    setLoadingFileIds(prev => [...prev, file.id]);

    startTransition(async () => {
      try {
        const result = await fileAPI.generateDownloadUrl(file.id, {
          forceDownload: options?.forceDownload || false,
          openInNewTab: true, // Allow opening in new tab for viewable files
        });

        if (result.success) {
          // The fileAPI now handles the download/open logic internally
          toast({
            title: result.data?.openedInNewTab ? 'File Opened' : 'Download Started',
            description: result.data?.openedInNewTab
              ? `"${result.data.fileName}" opened in new tab`
              : `"${result.data.fileName}" download started`,
            variant: 'success',
          });
        } else {
          toast({
            title: 'Download Failed',
            description: result.error || result.message || 'Failed to generate download URL',
            variant: 'destructive',
            icon: <CircleX size={40} />,
          });
        }
      } catch (error) {
        console.error('Error downloading file', error);
        toast({
          title: 'Error',
          description:
            error instanceof Error
              ? error.message
              : 'An error occurred while downloading the file.',
          variant: 'destructive',
          icon: <CircleX size={40} />,
        });
      } finally {
        setLoadingFileIds(prev => prev.filter(id => id !== file.id));
      }
    });
  };

  const onSubmit = async (data: EditTaskFormValues) => {
    try {
      const trimmedData = trimWhitespace(data);

      const totalHours = parseOriginalEstimate(trimmedData.timeForTask);
      if (totalHours === null) {
        throw new Error('Invalid time format for timeForTask');
      }

      let overTimeDecimal = '0';
      if (trimmedData.overTime && trimmedData.overTime !== '0') {
        const overTimeHours = parseOriginalEstimate(trimmedData.overTime);
        if (overTimeHours === null) {
          throw new Error('Invalid time format for overTime');
        }
        overTimeDecimal = overTimeHours.toString();
      }

      // Make sure dueDate is properly formatted
      const formattedData = {
        ...trimmedData,
        id: task.id,
        dueDate: trimmedData.dueDate ? trimmedData.dueDate : null,
        timeForTask: totalHours.toString(),
        overTime: overTimeDecimal,
        skills: trimmedData.skills,
      };

      const response = await updateTaskById(formattedData);
      if (response.success) {
        toast({
          title: 'Task Updated Successfully',
          description: `Task: ${response.task?.title} updated successfully`,
          variant: 'success',
          icon: <CheckCircle size={40} />,
        });
        onOpenChange(false);
        if (fetchTasks) {
          await fetchTasks(); // Refresh tasks if fetchTasks is provided
        }

        if (onTaskUpdate) {
          await onTaskUpdate();
        }
      } else {
        toast({
          title: 'Failed to update task',
          description: response.message,
          variant: 'destructive',
          icon: <CircleX size={40} />,
        });
      }
    } catch (error) {
      console.error('Error updating task', error);
      if (error instanceof Error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update task',
          variant: 'destructive',
          icon: <CircleX size={40} />,
        });
      }
    }
  };
  const handleCommentDataChange = async () => {
    // Or re-fetch task data directly
    setRefreshKey(prev => prev + 1);
    await refetchTaskData();
  };

  const refetchTaskData = async () => {
    try {
      const { success, task: freshTask } = await getTaskById(task.id);
      if (success && freshTask) {
        // Update form with fresh data
        form.reset({
          title: task.title,
          description: task.description,
          priorityName: task.priority.priorityName,
          statusName: task.status.statusName,
          taskCategoryName: task.taskCategory.categoryName,
          assignedToId: task?.assignedTo?.id || '',
          skills: task.taskSkills || [],
          timeForTask: formatOriginalEstimate(Number(task.timeForTask)) ?? '1d',
          overTime:
            task.overTime && Number(task.overTime) > 0
              ? formatOriginalEstimate(Number(task.overTime))
              : '',
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
        });

        // Update files with fresh data
        if (freshTask.taskFiles) {
          setFiles(freshTask.taskFiles);
        }
      }
    } catch (error) {
      console.error('Failed to refresh task data:', error);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] max-h-[98%] overflow-hidden px-0">
        <DialogHeader className="px-6 flex flex-row gap-2 items-center">
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 max-h-[70vh] overflow-auto px-6"
          >
            {/* Title - Always editable */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Task Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description - Always editable */}
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

            {/* Skills - Always editable (with warning for clients) */}
            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Skills</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={groupSkillsByCategory(skills)}
                      onValueChange={field.onChange}
                      defaultValue={field.value || []}
                      placeholder="Select Skills"
                      maxCount={5}
                    />
                  </FormControl>
                  {role === Roles.CLIENT && (
                    <div className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded p-2">
                      <Info className="h-3 w-3 inline mr-1" />
                      Please ensure you select the correct skills. Task Supervisors may adjust if
                      needed.
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Task Category - Conditional editing */}
            {canEditCategory ? (
              <FormField
                control={form.control}
                name="taskCategoryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Category</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={taskCategories.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>Task Category</FormLabel>
                <div className="border rounded-md p-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Category: <strong>{task.taskCategory.categoryName}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Task category cannot be changed after creation.
                  </p>
                </div>
              </FormItem>
            )}

            {/* Priority - Conditional editing */}
            {canEditPriority ? (
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
                          {metadataLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading...
                            </SelectItem>
                          ) : metadataError ? (
                            <SelectItem value="error" disabled>
                              Error loading priorities
                            </SelectItem>
                          ) : (
                            metadata?.priorities.map(priority => (
                              <SelectItem key={priority.id} value={priority.name}>
                                <div className="flex items-center gap-2">
                                  <Badge className={taskPriorityColors[priority.name]}>
                                    {priority.displayName}
                                  </Badge>
                                  {priority.isLegacy && (
                                    <Badge variant="outline" className="text-xs">
                                      Legacy
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <div className="border rounded-md p-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <Badge className={taskPriorityColors[task.priority.priorityName]}>
                      {transformEnumValue(task.priority.priorityName)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Task priority is managed by Task Supervisors.
                  </p>
                </div>
              </FormItem>
            )}

            {/* Status - Conditional editing */}
            {canEditStatus ? (
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
                          {metadataLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading...
                            </SelectItem>
                          ) : metadataError ? (
                            <SelectItem value="error" disabled>
                              Error loading statuses
                            </SelectItem>
                          ) : (
                            metadata?.statuses.map(status => (
                              <SelectItem key={status.id} value={status.name}>
                                <Badge className={taskStatusColors[status.name]}>
                                  {status.displayName}
                                </Badge>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <div className="border rounded-md p-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <Badge className={taskStatusColors[task.status.statusName]}>
                      {transformEnumValue(task.status.statusName)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Task status is updated by the assigned Task Agent.
                  </p>
                </div>
              </FormItem>
            )}

            {/* Assignment - Conditional editing */}
            {canAssignTasks ? (
              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Task Agent</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={value => field.onChange(value === 'none' ? '' : value)}
                        value={field.value || 'none'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">No Assignee</span>
                          </SelectItem>
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
            ) : (
              <FormItem>
                <FormLabel>Assigned Task Agent</FormLabel>
                <div className="border rounded-md p-4 w-full bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    {task.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarImage
                            src={task.assignedTo.avatarUrl || 'https://github.com/shadcn.png'}
                            alt={task.assignedTo.firstName ?? 'avatar'}
                            className="rounded-full"
                          />
                          <AvatarFallback className="rounded-full">
                            {task.assignedTo.firstName
                              ? task.assignedTo.firstName.substring(0, 2).toUpperCase()
                              : 'CN'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          Assigned to:{' '}
                          <strong>{`${task.assignedTo.firstName} ${task.assignedTo.lastName}`}</strong>
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not yet assigned. Task Supervisors will assign this task.
                      </span>
                    )}
                  </div>
                </div>
              </FormItem>
            )}

            {/* Original Estimate - Always editable */}
            <FormField
              control={form.control}
              name="timeForTask"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Original Estimate</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="e.g. 2w 1d 5h 4m" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* OverTime - Conditional editing */}
            {canEditOverTime ? (
              <FormField
                control={form.control}
                name="overTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OverTime (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g. 1h 30m or leave empty if none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>OverTime</FormLabel>
                <div className="border rounded-md p-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {task.overTime && Number(task.overTime) > 0
                        ? `${formatOriginalEstimate(Number(task.overTime))} of overtime logged`
                        : 'No overtime logged'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Overtime is tracked by the Task Agent during work.
                  </p>
                </div>
              </FormItem>
            )}

            {/* Due Date - Always editable */}
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
                          {field.value ? (
                            new Date(field.value).toLocaleDateString()
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
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

            {/* Show Task Attachments if any */}
            {files && files.length > 0 && (
              <FileAttachmentsList
                files={files}
                onDownload={file => handleDownload(file)}
                onDelete={fileId => deleteFileHandler(fileId)}
                loadingFileIds={loadingFileIds}
              />
            )}

            {/* Add Comments Section */}
            <div className="border-t pt-6 mt-6">
              <CommentSection
                taskId={task.id}
                onDataChange={handleCommentDataChange}
                key={refreshKey}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
