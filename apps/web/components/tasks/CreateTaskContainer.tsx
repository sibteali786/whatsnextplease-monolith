'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, CircleX } from 'lucide-react';
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
import { Button } from '../ui/button';
import { COOKIE_NAME } from '@/utils/constant';
import { useRouter } from 'next/navigation';

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task Name is required')
    .max(100, 'Task Name must not exceed 100 characters'),
  description: z.string().min(1, 'Description is required'),
  skills: z.array(z.string()).optional(),
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
  initialComment: z.string().max(5000, 'Comment cannot exceed 5000 characters').optional(),
});

interface CreateTaskContainerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  fetchTasks?: () => Promise<void>;
}

// Extended user interface to include task count
export interface UserWithTaskCount extends UserAssigneeSchema {
  currentTasksCount?: number;
}

export const CreateTaskContainer: React.FC<CreateTaskContainerProps> = ({
  open,
  setOpen,
  fetchTasks,
}) => {
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);

  const { createdTask } = useCreatedTask();
  const [user, setUser] = useState<UserState>();

  const { toast } = useToast();
  const taskId = createdTask?.id ?? '';
  const [users, setUsers] = useState<UserWithTaskCount[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState<boolean | undefined>(true);
  const [loading, setLoading] = useState(false);
  /* To refetch skills when new skill or skill category is added from task offering page */
  const [reload, setReload] = useState(false);

  const [canAssignTasks, setCanAssignTasks] = useState(false);
  const [taskCategories, setTaskCategories] = useState<{ id: string; categoryName: string }[]>([]);
  const [, setFormWasCancelled] = useState(false);
  const [lastSubmissionWasSuccessful, setLastSubmissionWasSuccessful] = useState(false);
  const [isFirstOpen, setIsFirstOpen] = useState(true); // Track if this is the first time opening
  const router = useRouter();

  const getDefaultValues = () => ({
    title: '',
    description: '',
    skills: [],
    statusName: TaskStatusEnum.NEW,
    priorityName: TaskPriorityEnum.NORMAL,
    taskCategoryName: taskCategories.length > 0 ? taskCategories[0]?.categoryName || '' : '',
    assignedToId: '',
    timeForTask: '1d',
    dueDate: undefined,
    initialComment: '',
  });

  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    mode: 'onSubmit',
    defaultValues: getDefaultValues(),
  });
  // Reset form logic based on state
  useEffect(() => {
    if (open) {
      // Reset form if:
      // 1. This is the first time opening, OR
      // 2. Last submission was successful (clean slate for next task)
      // Do NOT reset if form was cancelled (preserve user's work)
      if (isFirstOpen || lastSubmissionWasSuccessful) {
        form.reset(getDefaultValues());
        setLastSubmissionWasSuccessful(false); // Reset flag after using it
        setIsFirstOpen(false); // No longer first open
      }
      // Reset the cancelled flag when opening (for fresh state tracking)
      setFormWasCancelled(false);
    }
  }, [open, form, taskCategories, lastSubmissionWasSuccessful, isFirstOpen]);

  // Function to fetch current task counts for users
  const fetchUserTaskCounts = async (
    usersList: UserAssigneeSchema[]
  ): Promise<UserWithTaskCount[]> => {
    try {
      // Fetch task counts for all users in parallel
      const usersWithCounts = await Promise.all(
        usersList.map(async user => {
          try {
            // Call the backend to get current task count for this user
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/tasks/user/${user.id}/count`,
              {
                headers: {
                  Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (response.ok) {
              const responseData = await response.json();
              console.log(
                `Task count response for ${user.firstName} ${user.lastName}:`,
                responseData
              );

              // Extract the active task count from the nested structure
              const activeTasksCount = responseData?.data?.taskCounts?.activeTasksCount || 0;

              return {
                ...user,
                currentTasksCount: activeTasksCount,
              };
            } else {
              // If API fails, return user without count
              console.warn(
                `Failed to fetch task count for user ${user.id}. Status: ${response.status}`
              );
              return {
                ...user,
                currentTasksCount: 0,
              };
            }
          } catch (error) {
            console.warn(`Error fetching task count for user ${user.id}:`, error);
            return {
              ...user,
              currentTasksCount: 0,
            };
          }
        })
      );

      // Log the final result for debugging
      console.log(
        'Users with task counts:',
        usersWithCounts.map(u => ({
          name: `${u.firstName} ${u.lastName}`,
          taskCount: u.currentTasksCount,
        }))
      );

      return usersWithCounts;
    } catch (error) {
      console.error('Error fetching user task counts:', error);
      // Return original users without counts if there's an error
      return usersList.map(user => ({ ...user, currentTasksCount: 0 }));
    }
  };

  const fetchUsers = async (pageToFetch?: number) => {
    // Determine if current role can assign tasks to others
    const roleCanAssignTasks =
      user?.role?.name === Roles.SUPER_USER || user?.role?.name === Roles.TASK_SUPERVISOR;

    setCanAssignTasks(roleCanAssignTasks);
    if (roleCanAssignTasks) {
      if (!pageToFetch && (loading || !hasMore)) return; // Prevent multiple fetches
      setLoading(true);

      try {
        const response = await usersList(
          user?.role?.name ?? Roles.TASK_SUPERVISOR,
          form.getValues('skills'),
          5, //limit
          pageToFetch ?? page
        );
        if (response.success) {
          // Fetch task counts for users and update state
          const usersWithTaskCounts = await fetchUserTaskCounts(response.users);
          /* setUsers(usersWithTaskCounts); */
          if (pageToFetch) {
            setUsers([...usersWithTaskCounts]);
          } else {
            setUsers(prevUsers => [...prevUsers, ...usersWithTaskCounts]);
          }
          setHasMore(response.hasMore); // Update if more users are available
          // Increment page for next fetch
          if (pageToFetch) {
            setPage(2);
          } else {
            setPage(prevPage => prevPage + 1);
          }
        } else if (response.message !== 'Not authorized') {
          // Only show error toast if it's not an authorization issue
          toast({
            variant: 'destructive',
            title: `Failed to fetch users`,
            description: response.message || 'Unknown error occurred',
            icon: <CircleX size={40} />,
          });
        }
        setLoading(false);
      } catch (error) {
        // Silently handle error for Task Agent role
        if (user?.role?.name !== Roles.TASK_AGENT) {
          toast({
            variant: 'destructive',
            title: `Failed to fetch users`,
            description: error instanceof Error ? error.message : 'Something went wrong!',
            icon: <CircleX size={40} />,
          });
        }
        setLoading(false);
      }
    }
  };
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
        /*   if (roleCanAssignTasks) {
          try {
            const response = await usersList(
              currentLoggedInUser?.role?.name ?? Roles.TASK_SUPERVISOR,
              form.getValues('skills')
            );
            if (response.success) {
              const usersWithTaskCounts = await fetchUserTaskCounts(response.users);
              setUsers(usersWithTaskCounts);
            } else if (response.message !== 'Not authorized') {
              toast({
                variant: 'destructive',
                title: `Failed to fetch users`,
                description: response.message || 'Unknown error occurred',
                icon: <CircleX size={40} />,
              });
            }
          } catch (error) {
            if (currentLoggedInUser?.role?.name !== Roles.TASK_AGENT) {
              toast({
                variant: 'destructive',
                title: `Failed to fetch users`,
                description: error instanceof Error ? error.message : 'Something went wrong!',
                icon: <CircleX size={40} />,
              });
            }
          }
        } */
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
  }, [reload]);

  useEffect(() => {
    fetchUsers();
  }, [open]);

  const handleModalCloseRequest = () => {
    // Mark as cancelled to preserve form values
    setFormWasCancelled(true);
  };

  const confirmClose = async () => {
    // Called when user confirms they really want to close
    const response = await deleteTaskById(taskId);
    if (response.success) {
      toast({
        title: 'Task deleted',
        /*  description: 'Draft task was discarded successfully', */
        description: 'Task was discarded successfully',
        variant: 'success',
        icon: <CheckCircle size={40} />,
      });
      setOpen(false);
      form.reset(getDefaultValues());

      // Keep form values for next time (don't reset formWasCancelled)
    } else {
      toast({
        title: 'Failed to delete the draft task',
        description: response.message,
        variant: 'destructive',
        icon: <CircleX size={40} />,
      });
    }
  };

  const handleResetForm = () => {
    form.reset(getDefaultValues());

    setFormWasCancelled(false); // Clear cancel state
    setLastSubmissionWasSuccessful(false); // Clear success state
    setIsFirstOpen(true); // Reset to first open state
    toast({
      title: 'Form Reset',
      description: 'All form fields have been cleared.',
      variant: 'default',
    });
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
        initialComment: trimmedData.initialComment?.trim() || undefined,
      };

      const response = await updateTaskById(formattedData);
      if (response.success) {
        toast({
          title: 'Task Created Successfully',
          description: `Task: ${response.task?.title} is created successfully${
            trimmedData.initialComment ? ' with initial comment' : ''
          }`,
          variant: 'success',
          icon: <CheckCircle size={40} />,
        });

        // Mark submission as successful
        setLastSubmissionWasSuccessful(true);
        setFormWasCancelled(false);
        setOpen(false);

        if (fetchTasks) {
          await fetchTasks();
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

  // Check if form has unsaved changes
  const hasUnsavedChanges = () => {
    const values = form.getValues();
    return (
      values.title.trim() !== '' ||
      values.description.trim() !== '' ||
      (values.skills && values.skills.length > 0) ||
      values.assignedToId !== '' ||
      values.timeForTask !== '1d' ||
      values.dueDate !== undefined
    );
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
        // Add reset button functionality
        showResetButton={hasUnsavedChanges()}
        onReset={handleResetForm}
      >
        <CreateTaskForm
          form={form}
          onSubmit={onSubmit}
          skills={skills}
          users={users}
          taskCategories={taskCategories}
          canAssignTasks={canAssignTasks}
          fetchUsers={fetchUsers}
          reload={reload}
          setReload={setReload}
          role={user?.role?.name}
        />
      </ModalWithConfirmation>
    </>
  );
};
