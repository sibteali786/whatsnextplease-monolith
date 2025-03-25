'use client';
import { useCallback, useEffect, useState } from 'react';
import { SearchNFilter } from '../common/SearchNFilter';
import { DurationEnum, DurationEnumList } from '@/types';
import { CreatorType, Roles } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { UserTasksTable } from '../users/UserTaskTable';
import { tasksByType } from '@/db/repositories/tasks/tasksByType';
import { useToast } from '@/hooks/use-toast';
import { CircleX, Loader2, Plus } from 'lucide-react';
import { taskIdsByType } from '@/db/repositories/tasks/taskIdsByType';
import { TaskTable } from '@/utils/validationSchemas';
import { Button } from '../ui/button';
import { CreateTaskContainer } from './CreateTaskContainer';
import { ToastAction } from '../ui/toast';
import { createDraftTask } from '@/db/repositories/tasks/createDraftTask';
import { useCreatedTask } from '@/store/useTaskStore';

export const TaskSuperVisorList = ({
  userId,
  listOfFilter,
  role,
}: {
  userId: string;
  listOfFilter?: DurationEnumList;
  role: Roles;
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<DurationEnum>(DurationEnum.ALL);
  const [pageSize, setPageSize] = useState<number>(10);
  const [cursor, setCursor] = useState<string | null>(null);
  const [data, setData] = useState<TaskTable[] | null>([]);
  const [taskIds, setTaskIds] = useState<string[] | null>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'unassigned'>('unassigned');
  const { toast, dismiss } = useToast();
  const { setCreatedTask } = useCreatedTask();
  const handleSearch = (term: string, duration: DurationEnum) => {
    setSearchTerm(term);
    setDuration(duration);
  };
  const createTaskHandler = async () => {
    toast({
      title: 'Creating a Draft Task',
      description: 'Please wait while we can create a draft task for you',
      icon: <Loader2 className="animate-spin" size={40} />,
    });
    const response = await createDraftTask(CreatorType.USER, userId, role);
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

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await tasksByType(
        activeTab, // Pass the current tab as "type"
        role,
        cursor,
        pageSize,
        searchTerm,
        duration
      );
      const responseIds = await taskIdsByType(activeTab, role, searchTerm, duration);
      console.log(response);
      if (response && responseIds && response.success && responseIds.success) {
        setData(response.tasks);
        setTaskIds(responseIds.taskIds);
        setTotalCount(response.totalCount);
      }

      if (!response.success) {
        toast({
          variant: 'destructive',
          title: `Failed to fetch ${activeTab} tasks`,
          description: response.details.originalError,
          icon: <CircleX size={40} />,
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        toast({
          variant: 'destructive',
          title: `Failed to fetch ${activeTab} tasks`,
          description: 'Something went wrong!',
          icon: <CircleX size={40} />,
        });
      }
    }
    setLoading(false);
  }, [activeTab, searchTerm, duration, pageSize, cursor]);

  // Fetch tasks when tab, searchTerm, duration, pageSize, or cursor changes

  useEffect(() => {
    console.log('useEffect triggered by:', {
      activeTab,
      searchTerm,
      duration,
      pageSize,
      cursor,
    });
    fetchTasks();
  }, [activeTab, searchTerm, duration, pageSize, cursor]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filter */}

      <div className="flex justify-between">
        <SearchNFilter onSearch={handleSearch} filterList={listOfFilter} />
        <Button className="flex gap-2 font-bold text-base" onClick={() => createTaskHandler()}>
          {' '}
          <Plus className="h-5 w-5" /> Create New Task
        </Button>
        <CreateTaskContainer open={open} setOpen={setOpen} />
      </div>

      {/* Tabs for Task Types */}
      <Tabs
        defaultValue="unassigned"
        className="w-full"
        onValueChange={value => {
          setActiveTab(value as 'all' | 'assigned' | 'unassigned');
          setCursor(null); // Reset cursor when tab changes
        }}
      >
        <TabsList className="flex gap-4 bg-transparent items-start justify-start">
          <TabsTrigger value="all" className="text-sm">
            All
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="text-sm">
            Unassigned
          </TabsTrigger>
          <TabsTrigger value="assigned" className="text-sm">
            Assigned
          </TabsTrigger>
        </TabsList>

        {/* Tabs Content */}
        <TabsContent value="all">
          <UserTasksTable
            data={data ?? []}
            pageSize={pageSize}
            loading={loading}
            totalCount={totalCount}
            cursor={cursor}
            setCursor={setCursor}
            showDescription={true}
            setPageSize={setPageSize}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            taskIds={taskIds ?? []}
            role={role}
          />
        </TabsContent>

        <TabsContent value="unassigned">
          <UserTasksTable
            data={data ?? []}
            pageSize={pageSize}
            loading={loading}
            totalCount={totalCount}
            cursor={cursor}
            setCursor={setCursor}
            showDescription={true}
            setPageSize={setPageSize}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            taskIds={taskIds ?? []}
            role={role}
          />
        </TabsContent>

        <TabsContent value="assigned">
          <UserTasksTable
            data={data ?? []}
            pageSize={pageSize}
            loading={loading}
            totalCount={totalCount}
            cursor={cursor}
            setCursor={setCursor}
            showDescription={true}
            setPageSize={setPageSize}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            taskIds={taskIds ?? []}
            role={role}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
