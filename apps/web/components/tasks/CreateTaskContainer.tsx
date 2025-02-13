'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Roles, TaskPriorityEnum, TaskStatusEnum, NotificationType } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, CircleX, XCircle } from 'lucide-react';
import { parseOriginalEstimate, trimWhitespace } from '@/utils/utils';
import { updateTaskById } from '@/db/repositories/tasks/updateTaskbyId';
import { deleteTaskById } from '@/db/repositories/tasks/deleteTaskById';
import { useCreatedTask } from '@/store/useTaskStore';
import { CreateTaskForm } from './CreateTaskForm';
import { useEffect, useState } from 'react';
import ModalWithConfirmation from '../common/ModalWithConfirmation';
import { SkillsSchema, UserAssigneeSchema } from '@/utils/validationSchemas';
import { usersList } from '@/db/repositories/users/usersList';
import { getCurrentUser, UserState } from '@/utils/user';
import { createNotification } from '@/db/repositories/notifications/notifications';
import { usePushNotification } from '@/hooks/usePushNotification';
import { NotificationPermissionDialog } from '../notifications/PushNotificationPermissionDialog';

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task Name is required')
    .max(100, 'Task Name must not exceed 100 characters'),
  description: z.string().min(1, 'Description is required'),
  skills: z.array(z.string()).nonempty('Please select at least one skill'),
  statusName: z.nativeEnum(TaskStatusEnum).default(TaskStatusEnum.NEW),
  priorityName: z.nativeEnum(TaskPriorityEnum).default(TaskPriorityEnum.NORMAL),
  taskCategoryName: z.string().default('Data Entry'),
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
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const { subscription } = usePushNotification();
  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    mode: 'onSubmit',
    defaultValues: {
      taskCategoryName: 'Data Entry',
      statusName: TaskStatusEnum.NEW,
      priorityName: TaskPriorityEnum.NORMAL,
    },
  });

  // Fetch skills dynamically
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch('/api/skills');
        if (!response.ok) throw new Error('Failed to fetch skills');
        const data: SkillsSchema[] = await response.json();
        const flattenedSkills = data.flatMap(category =>
          category.skills.map(skill => ({
            id: skill.id,
            name: skill.name,
          }))
        );
        setSkills(flattenedSkills);
      } catch (error) {
        console.error(error);
      }
    };
    const fetchUsers = async () => {
      const currentLoggedInUser = await getCurrentUser();
      setUser(currentLoggedInUser);
      try {
        const response = await usersList(currentLoggedInUser.role.name ?? Roles.TASK_SUPERVISOR);
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
    fetchUsers();
    fetchSkills();
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
        if (data.assignedToId && !subscription) {
          setShowNotificationDialog(true);
        }
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
        toast({
          title: 'Failed to create new task',
          description: response.message,
          variant: 'destructive',
          icon: <CircleX size={40} />,
        });
      }
    } catch (error) {
      console.error('Error updating task', error);
    }
  };

  // TODO: the modal cross is not working
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
        <CreateTaskForm form={form} onSubmit={onSubmit} skills={skills} users={users} />
      </ModalWithConfirmation>
      <NotificationPermissionDialog
        open={showNotificationDialog}
        onOpenChange={setShowNotificationDialog}
      />
    </>
  );
};
