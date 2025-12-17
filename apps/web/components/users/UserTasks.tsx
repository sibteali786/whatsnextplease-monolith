'use client';
import { useEffect, useState } from 'react';
import { SearchNFilter } from '../common/SearchNFilter';
import { UserTasksTable } from './UserTaskTable';
import { DurationEnum, DurationEnumList } from '@/types';
import { CreatorType, Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { Button } from '../ui/button';
import { CircleX, Loader2, Plus } from 'lucide-react';
import { createDraftTask } from '@/db/repositories/tasks/createDraftTask';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '../ui/toast';
import { useCreatedTask } from '@/store/useTaskStore';
import { CreateTaskContainer } from '../tasks/CreateTaskContainer';
import { TaskTable } from '@/utils/validationSchemas';
import { State } from '../DataState';
import { CallToAction } from '../CallToAction';
import { USER_CREATED_TASKS_CONTEXT } from '@/utils/commonUtils/taskPermissions';
import { useSearchParams } from 'next/navigation';
import { DynamicBreadcrumb } from '../skills/DynamicBreadcrumb';
import { taskApiClient } from '@/utils/taskApi';

export const UserTasks = ({
  userId,
  listOfFilter,
  role,
  onTaskUpdate,
  context = USER_CREATED_TASKS_CONTEXT.GENERAL,
}: {
  userId: string;
  listOfFilter?: DurationEnumList;
  role: Roles;
  onTaskUpdate?: () => Promise<void>;
  context: USER_CREATED_TASKS_CONTEXT;
}) => {
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [duration, setDuration] = useState<DurationEnum>(DurationEnum.ALL);
  const handleSearch = (term: string, duration: DurationEnum) => {
    setSearchTerm(term); // Update the search term when user searches
    setDuration(duration);
  };
  const [open, setOpen] = useState(false);
  const { toast, dismiss } = useToast();
  const { setCreatedTask } = useCreatedTask();
  const createTaskHandler = async () => {
    toast({
      title: 'Creating a Draft Task',
      description: 'Please wait while we create a draft task for you',
      icon: <Loader2 className="animate-spin" size={40} />,
    });
    let creatorType: CreatorType;
    if (role !== Roles.CLIENT) {
      creatorType = CreatorType.USER;
    } else {
      creatorType = CreatorType.CLIENT;
    }
    const response = await createDraftTask(creatorType, userId, role);
    if (response.success) {
      // hides the toast when response is succeeded
      dismiss();
      setCreatedTask(response.task);
      setOpen(true);
    } else {
      toast({
        title: 'Failed to Create a Draft Task',
        description: 'Please try again by clicking on the button to retry creating task',
        variant: 'destructive',
        icon: <CircleX size={40} />,
        action: (
          <ToastAction altText="Try Again" className="mt-2" onClick={() => createTaskHandler()}>
            Try again
          </ToastAction>
        ),
      });
    }
  };
  const [data, setData] = useState<TaskTable[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [taskIDs, setTaskIDs] = useState<string[] | null>([]);
  const [error, setError] = useState<string | null>(null);
  const statusFilter = searchParams.get('status');
  const priorityFilter = searchParams.get('priority');
  const typeFilter: 'all' | 'assigned' | 'unassigned' | 'my-tasks' = searchParams.get('type') as
    | 'all'
    | 'assigned'
    | 'unassigned'
    | 'my-tasks';
  const assignedToFilter = searchParams.get('assignedTo') || undefined;
  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Split the comma-separated status values
      const statusArray = statusFilter?.split(',') || [];
      const priorityArray = priorityFilter?.split(',') || [];

      // If there are status values, map them to TaskStatusEnum
      const normalizedStatus = statusArray
        ? statusArray
            .map((status: string) => TaskStatusEnum[status as keyof typeof TaskStatusEnum] || null)
            .filter(status => status !== null)
        : [];
      const normalizedPriority = priorityArray
        ? priorityArray
            .map(
              (priority: string) =>
                TaskPriorityEnum[priority as keyof typeof TaskPriorityEnum] || null
            )
            .filter(priority => priority !== null)
        : [];
      const params = {
        cursor: cursor ?? undefined,
        pageSize,
        search: searchTerm,
        duration,
        status: normalizedStatus,
        priority: normalizedPriority,
        context,
        assignedToId: assignedToFilter,
      };
      const response = await taskApiClient.getTasksByUserId(userId, params);
      const { taskIds, success } = await taskApiClient.getTaskIds({
        userId,
        search: searchTerm,
        duration,
        context: USER_CREATED_TASKS_CONTEXT.GENERAL,
        assignedToId: assignedToFilter,
      });

      if (response.success && success) {
        setTaskIDs(taskIds);
        setData(response.tasks || []);
        setTotalCount(response.totalCount);
        setError(null);
      } else {
        setError(response.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setError('An unexpected error occurred while fetching tasks');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [
    cursor,
    pageSize,
    searchTerm,
    duration,
    statusFilter,
    priorityFilter,
    typeFilter,
    assignedToFilter,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between">
        <DynamicBreadcrumb
          links={[
            { label: 'Task Offerings' },
            // ...(selectedCategory ? [{ label: selectedCategory.categoryName }] : []),
          ]}
        />
        <Button className="flex gap-2 font-bold text-base" onClick={() => createTaskHandler()}>
          <Plus className="h-5 w-5" /> Create New Task
        </Button>
        <CreateTaskContainer open={open} setOpen={setOpen} fetchTasks={fetchTasks} />
      </div>
      <SearchNFilter onSearch={handleSearch} filterList={listOfFilter} role={role} />

      {loading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <State
          icon={CircleX}
          variant="destructive"
          title="Error Loading Tasks"
          description={error}
          ctaText="Try Again"
          onCtaClick={fetchTasks}
        />
      ) : data.length === 0 ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <CallToAction
            link="#"
            action="Create Your First Task"
            title="No Tasks Found"
            helperText="Tasks will help you organize and track your work"
            description="Get started by creating your first task"
            variant="primary"
            iconType="plus"
            className="w-full max-w-xl mx-auto"
            buttonVariant="default"
            onClick={createTaskHandler}
          />
        </div>
      ) : (
        <UserTasksTable
          role={role}
          data={data}
          pageSize={pageSize}
          loading={loading}
          totalCount={totalCount}
          cursor={cursor}
          setCursor={setCursor}
          pageIndex={pageIndex}
          setPageIndex={setPageIndex}
          showDescription={true}
          setPageSize={setPageSize}
          taskIds={taskIDs}
          fetchTasks={fetchTasks}
          showAsModal={false}
          onTaskUpdate={onTaskUpdate}
        />
      )}
    </div>
  );
};
