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
} from '@/utils/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, CheckCircle, CircleX } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { updateTaskById } from '@/db/repositories/tasks/updateTaskbyId';
import { usersList } from '@/db/repositories/users/usersList';
import { FileSchemaType, TaskFile, TaskTable, UserAssigneeSchema } from '@/utils/validationSchemas';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { FileAttachmentsList } from '../files/FileAttachmentList';
import { fileAPI } from '@/utils/fileAPI'; // Import the API client

// Extended schema with `overTime`, similar to `timeForTask`
const editTaskSchema = z.object({
  title: z.string().max(100, 'Title must not exceed 100 characters').min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priorityName: z.nativeEnum(TaskPriorityEnum),
  statusName: z.nativeEnum(TaskStatusEnum),
  taskCategoryName: z.string().min(1, 'Task Category is required'),
  assignedToId: z.string().optional(),
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

type EditTaskFormValues = z.infer<typeof editTaskSchema>;

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskTable;
  role: Roles;
  taskCategories: { id: string; categoryName: string }[];
}

export default function EditTaskDialog({
  open,
  onOpenChange,
  task,
  role,
  taskCategories,
}: EditTaskDialogProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserAssigneeSchema[]>([]);
  const [files, setFiles] = useState<TaskFile[]>([]);
  // manage loading state for each file
  const [loadingFileIds, setLoadingFileIds] = useState<string[]>([]);
  const form = useForm<EditTaskFormValues>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      priorityName: TaskPriorityEnum.NORMAL,
      statusName: TaskStatusEnum.NEW,
      taskCategoryName: '',
      timeForTask: '1d',
      overTime: '0',
      dueDate: new Date(),
    },
    mode: 'onSubmit',
  });

  const fetchUsers = async () => {
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
    fetchUsers();
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
  const handleDownload = async (file: FileSchemaType) => {
    setLoadingFileIds(prev => [...prev, file.id]);
    startTransition(async () => {
      try {
        const result = await fileAPI.generateDownloadUrl(file.id);

        if (result.success && 'downloadUrl' in result && 'fileName' in result) {
          // Create temporary anchor element to trigger download
          const link = document.createElement('a');
          link.href = result.downloadUrl as string;
          link.setAttribute('download', (result.fileName as string) || (file.fileName as string));
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
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
        // Include skills if needed and available:
        skills: task.taskSkills ?? [],
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
                        {Object.values(TaskPriorityEnum).map(value => (
                          <SelectItem key={value} value={value}>
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
                        {Object.values(TaskStatusEnum).map(value => (
                          <SelectItem key={value} value={value}>
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

            {/* OverTime Field */}
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
