'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Roles, TaskPriorityEnum, TaskStatusEnum, NotificationType } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, CircleX, XCircle } from 'lucide-react';
import { getCookie, parseOriginalEstimate, trimWhitespace } from '@/utils/utils';
import { updateTaskById } from '@/db/repositories/tasks/updateTaskbyId';
import { deleteTaskById } from '@/db/repositories/tasks/deleteTaskById';
import { useCreatedTask } from '@/store/useTaskStore';
import { CreateTaskForm } from './CreateTaskForm';
import { useEffect, useState } from 'react';
import ModalWithConfirmation from '../common/ModalWithConfirmation';
import { UserAssigneeSchema } from '@/utils/validationSchemas';
import { usersList } from '@/db/repositories/users/usersList';
import { getCurrentUser, UserState } from '@/utils/user';
import { createNotification } from '@/db/repositories/notifications/notifications';
import { Button } from '../ui/button';
import { COOKIE_NAME } from '@/utils/constant';
import { useRouter } from 'next/navigation';

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task Name is required')
    .max(100, 'Task Name must not exceed 100 characters'),
  description: z.string().min(1, 'Description is required'),
  skills: z.array(z.string()).nonempty('Please select at least one skill'),
  statusName: z.nativeEnum(TaskStatusEnum).default(TaskStatusEnum.NEW),
  priorityName: z.nativeEnum(TaskPriorityEnum).default(TaskPriorityEnum.NORMAL),
  taskCategoryName: z.string().default('General Tasks'),
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
        message:
          "Invalid format for Original Estimate. Examples: '4d', '5h 30m', '60m', '3w', '2w 1d 5h 4m'",
      }
    ),
  dueDate: z
    .date()
    .nullable()
    .refine(date => !!date, 'Due date is required'),
});

interface CreateTaskContainerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const CreateTaskContainer: React.FC<CreateTaskContainerProps> = ({ open, setOpen }) => {
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const { createdTask } = useCreatedTask();
  const [user, setUser] = useState<UserState>();
  const { toast } = useToast();
  const taskId = createdTask?.id ?? '';
  const [users, setUsers] = useState<UserAssigneeSchema[]>([]);
  const [canAssignTasks, setCanAssignTasks] = useState(false);
  const [taskCategories, setTaskCategories] = useState<{ id: string; categoryName: string }[]>([]);
  const router = useRouter();

  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    mode: 'onSubmit',
    defaultValues: {
      taskCategoryName: 'General Tasks',
      statusName: TaskStatusEnum.NEW,
      priorityName: TaskPriorityEnum.NORMAL,
    },
  });

  // Fetch skills dynamically
  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        // Get current user first to determine role
        const currentLoggedInUser = await getCurrentUser();
        setUser(currentLoggedInUser);

        // Determine if current role can assign tasks to others
        const roleCanAssignTasks =
          currentLoggedInUser?.role?.name === Roles.SUPER_USER ||
          currentLoggedInUser?.role?.name === Roles.TASK_SUPERVISOR;

        setCanAssignTasks(roleCanAssignTasks);

        // Fetch both skills and task categories
        const [skillsResponse, categoriesResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/skill/all`, {
            headers: {
              Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/taskCategory/all`, {
            headers: {
              Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
              'Content-Type': 'application/json',
            },
          }),
        ]);

        if (!skillsResponse.ok) throw new Error('Failed to fetch skills');
        if (!categoriesResponse.ok) throw new Error('Failed to fetch task categories');

        const skillsData = await skillsResponse.json();
        const categoriesData = await categoriesResponse.json();
        if (skillsData.length === 0) {
          toast({
            variant: 'destructive',
            title: 'No skills found',
            description: 'Please add skills to the system before creating a task.',
            icon: <CircleX size={40} />,
          });
        }
        setSkills(skillsData);

        // Process task categories
        setTaskCategories(categoriesData);
        if (categoriesData.length === 0) {
          toast({
            variant: 'destructive',
            title: 'No Task Categories Found',
            description: 'You need to create at least one task category before creating tasks.',
            icon: <AlertCircle size={40} />,
            action: (
              <Button
                onClick={() => router.push('/settings/picklists')}
                variant="outline"
                className="mt-2"
              >
                Add Categories
              </Button>
            ),
          });
        } else {
          // Set default task category if available
          const defaultCategory = categoriesData[0]?.categoryName || 'General Tasks';
          form.setValue('taskCategoryName', defaultCategory);
        }

        // Only fetch users list if the current role can assign tasks
        if (roleCanAssignTasks) {
          try {
            const response = await usersList(
              currentLoggedInUser?.role?.name ?? Roles.TASK_SUPERVISOR
            );
            if (response.success) {
              setUsers(response.users);
            } else if (response.message !== 'Not authorized') {
              // Only show error toast if it's not an authorization issue
              toast({
                variant: 'destructive',
                title: `Failed to fetch users`,
                description: response.message || 'Unknown error occurred',
                icon: <CircleX size={40} />,
              });
            }
          } catch (error) {
            // Silently handle error for Task Agent role
            if (currentLoggedInUser?.role?.name !== Roles.TASK_AGENT) {
              toast({
                variant: 'destructive',
                title: `Failed to fetch users`,
                description: error instanceof Error ? error.message : 'Something went wrong!',
                icon: <CircleX size={40} />,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dependencies:', error);
        toast({
          variant: 'destructive',
          title: 'Setup Error',
          description: error instanceof Error ? error.message : 'Failed to load required data',
          icon: <CircleX size={40} />,
        });
      }
    };

    fetchDependencies();
  }, []);

  const handleModalCloseRequest = () => {
    // Called when user tries to close the modal (opens confirmation alert)
    // Here we rely on the ModalWithConfirmation to handle showing the alert
    // We do nothing special here because ModalWithConfirmation will show the alert itself.
  };

  const confirmClose = async () => {
    // Called when user confirms they really want to close
    const response = await deleteTaskById(taskId);
    if (response.success) {
      toast({
        title: 'Task deleted Successfully',
        description: 'Draft task was discarded successfully',
        variant: 'success',
        icon: <CheckCircle size={40} />,
      });
      setOpen(false);
    } else {
      toast({
        title: 'Failed to delete the draft task',
        description: response.message,
        variant: 'destructive',
        icon: <CircleX size={40} />,
      });
    }
  };

  const onSubmit = async (data: z.infer<typeof createTaskSchema>) => {
    try {
      const trimmedData = trimWhitespace(data);
      const totalHours = parseOriginalEstimate(trimmedData.timeForTask);
      if (totalHours === null) {
        throw new Error('Invalid time format');
      }

      const formattedData = {
        ...trimmedData,
        id: taskId,
        deuDate: trimmedData.dueDate.toISOString(),
        timeForTask: totalHours.toString(),
      };
      const response = await updateTaskById(formattedData);
      if (response.success) {
        toast({
          title: 'Task Created Successfully',
          description: `Task: ${response.task?.title} is created successfully`,
          variant: 'success',
          icon: <CheckCircle size={40} />,
        });
        setOpen(false);
        // notify relevant user
        if (data.assignedToId) {
          try {
            await createNotification({
              type: NotificationType.TASK_ASSIGNED,
              message: `Task ${response?.task?.title} has been created by ${user?.name}`,
              clientId: null,
              userId: data.assignedToId,
              data: {
                taskId: response?.task?.id,
                details: {
                  status: response?.task?.statusName,
                  priority: response?.task?.priorityName,
                  category: response?.task?.taskCategoryName,
                },
                name: user?.name,
                username: user?.username,
                avatarUrl: user?.avatarUrl,
              },
            });
          } catch (error) {
            toast({
              title: 'Notification Failed',
              description:
                error instanceof Error ? error.message : 'Failed to notify assigned user',
              variant: 'destructive',
              icon: <XCircle size={40} />,
            });
          }
        }
      } else {
        // Improved error handling with specific messages and actions
        if (response.message?.includes('Invalid statusName, priorityName or taskCategoryName')) {
          toast({
            title: 'Missing Task Configuration',
            description: (
              <div>
                <p>One or more required task settings don&apos;t exist in the system:</p>
                <ul className="list-disc pl-5 mt-2">
                  {trimmedData.taskCategoryName && (
                    <li>Task Category: {trimmedData.taskCategoryName}</li>
                  )}
                  {trimmedData.statusName && <li>Status: {trimmedData.statusName}</li>}
                  {trimmedData.priorityName && <li>Priority: {trimmedData.priorityName}</li>}
                </ul>
                <p className="mt-2">
                  You need to set up these configurations before creating tasks.
                </p>
              </div>
            ),
            variant: 'destructive',
            icon: <CircleX size={40} />,
            action: (
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/settings/picklists')}
                className="mt-2"
              >
                Go to Settings
              </Button>
            ),
          });
        } else {
          toast({
            title: 'Failed to create new task',
            description: response.message,
            variant: 'destructive',
            icon: <CircleX size={40} />,
          });
        }
      }
    } catch (error) {
      console.error('Error updating task', error);
    }
  };

  return (
    <>
      <ModalWithConfirmation
        open={open}
        title="Create Task"
        onCloseRequest={handleModalCloseRequest}
        onConfirmClose={confirmClose}
        onSubmit={form.handleSubmit(onSubmit)}
        submitButtonLabel="Create Task"
      >
        <CreateTaskForm
          form={form}
          onSubmit={onSubmit}
          skills={skills}
          users={users}
          taskCategories={taskCategories}
          canAssignTasks={canAssignTasks}
        />
      </ModalWithConfirmation>
    </>
  );
};
