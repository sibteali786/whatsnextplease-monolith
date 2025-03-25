'use client';
import { useEffect, useState } from 'react';
import { SearchNFilter } from '../common/SearchNFilter';
import { UserTasksTable } from './UserTaskTable';
import { getTasksByUserId } from '@/db/repositories/users/getTasksByUserId';
import { getTaskIdsByUserId } from '@/utils/userTools';
import { DurationEnum, DurationEnumList } from '@/types';
import { CreatorType, Roles } from '@prisma/client';
import { Button } from '../ui/button';
import { CircleX, Loader2, Plus } from 'lucide-react';
import { createDraftTask } from '@/db/repositories/tasks/createDraftTask';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '../ui/toast';
import { useCreatedTask } from '@/store/useTaskStore';
import { CreateTaskContainer } from '../tasks/CreateTaskContainer';
import { TaskTable } from '@/utils/validationSchemas';

export const UserTasks = ({
  userId,
  listOfFilter,
  role,
}: {
  userId: string;
  listOfFilter?: DurationEnumList;
  role: Roles;
}) => {
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
      description: 'Please wait while we can create a draft task for you',
      icon: <Loader2 className="animate-spin" size={40} />,
    });
    const response = await createDraftTask(CreatorType.CLIENT, userId, role);
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
        //TODO: ability for user to retry after a certain interval
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
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await getTasksByUserId(userId, role, cursor, pageSize, searchTerm, duration); // Pass searchTerm
      const { taskIds, success } = await getTaskIdsByUserId(userId, searchTerm, duration, role);
      if (response.success && response.tasks && success) {
        setTaskIDs(taskIds);
        setData(response.tasks);
        setTotalCount(response.totalCount);
      } else {
        console.error(response.message);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchTasks();
  }, [cursor, pageSize, searchTerm, duration]); // Add searchTerm to dependency array
  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filter */}
      {role !== Roles.CLIENT ? (
        <SearchNFilter onSearch={handleSearch} filterList={listOfFilter} />
      ) : (
        <div className="flex justify-between">
          <SearchNFilter onSearch={handleSearch} filterList={listOfFilter} />
          <Button className="flex gap-2 font-bold text-base" onClick={() => createTaskHandler()}>
            {' '}
            <Plus className="h-5 w-5" /> Create New Task
          </Button>
          <CreateTaskContainer open={open} setOpen={setOpen} />
        </div>
      )}
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
      />
    </div>
  );
};
// TODO: retrieving the tasks is a UI blocking request lets use useTransition so if someone is hurried to create a new task they can do so.
