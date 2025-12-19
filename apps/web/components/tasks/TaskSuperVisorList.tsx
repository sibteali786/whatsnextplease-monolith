'use client';
import { useCallback, useEffect, useState } from 'react';
import { SearchNFilter } from '../common/SearchNFilter';
import { DurationEnum, DurationEnumList } from '@/types';
import { CreatorType, Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { UserTasksTable } from '../users/UserTaskTable';
import { tasksByType } from '@/db/repositories/tasks/tasksByType';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ChevronDown, ChevronUp, CircleX, Loader2, Plus } from 'lucide-react';
import { taskIdsByType } from '@/db/repositories/tasks/taskIdsByType';
import { TaskTable } from '@/utils/validationSchemas';
import { Button } from '../ui/button';
import { CreateTaskContainer } from './CreateTaskContainer';
import { ToastAction } from '../ui/toast';
import { createDraftTask } from '@/db/repositories/tasks/createDraftTask';
import { useCreatedTask } from '@/store/useTaskStore';
import { State } from '../DataState';
import { CallToAction } from '../CallToAction';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useSearchParams } from 'next/navigation';
import { DynamicBreadcrumb } from '../skills/DynamicBreadcrumb';
import { AdvancedFilterBuilder } from './AdvancedFilterBuilder';
import { useAdvancedFilterContext } from '@/contexts/AdvancedFilterContext';

export const TaskSuperVisorList = ({
  userId,
  listOfFilter,
  role,
}: {
  userId: string;
  listOfFilter?: DurationEnumList;
  role: Roles;
}) => {
  const searchParams = useSearchParams();
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
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const { toast, dismiss } = useToast();
  const { setCreatedTask } = useCreatedTask();
  const [hasSkills, setHasSkills] = useState(false);
  const [hasTaskCategories, setHasTaskCategories] = useState(false);
  const [checkingPrerequisites, setCheckingPrerequisites] = useState(true);

  const [filterMode, setFilterMode] = useState<'normal' | 'advanced'>('normal');
  // Get advanced filter results
  const { searchResults, conditions, executeSearch } = useAdvancedFilterContext();
  const hasAdvancedFilters = conditions.length > 0;

  const statusFilter = searchParams.get('status');
  const priorityFilter = searchParams.get('priority');
  const typeFilter: 'all' | 'assigned' | 'unassigned' | 'my-tasks' = searchParams.get('type') as
    | 'all'
    | 'assigned'
    | 'unassigned'
    | 'my-tasks';
  const assignedToFilter = searchParams.get('assignedTo') || undefined;

  const handleSearch = (term: string, duration: DurationEnum) => {
    // Switch to normal mode and clear advanced filters
    if (filterMode === 'advanced') {
      setFilterMode('normal');
    }
    setSearchTerm(term);
    setDuration(duration);
  };

  const createTaskHandler = async () => {
    if (!hasSkills || !hasTaskCategories) {
      toast({
        title: 'Setup Required',
        description: 'You need to set up task categories and skills before creating tasks.',
        variant: 'destructive',
        icon: <AlertCircle size={40} />,
        action: (
          <Button
            onClick={() => (window.location.href = '/settings/picklists')}
            variant="outline"
            className="mt-2"
          >
            Go to Settings
          </Button>
        ),
      });
      return;
    }

    toast({
      title: 'Creating a Draft Task',
      description: 'Please wait while we create a draft task for you',
      icon: <Loader2 className="animate-spin" size={40} />,
    });

    const response = await createDraftTask(CreatorType.USER, userId, role);
    if (response.success) {
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

  const fetchNormalTasks = useCallback(async () => {
    console.log('fetchTasks called with hasAdvancedFilters:', hasAdvancedFilters);
    setLoading(true);
    setError(null);
    try {
      const statusArray = statusFilter?.split(',') || [];
      const priorityArray = priorityFilter?.split(',') || [];

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

      const response = await tasksByType(
        typeFilter ?? 'unassigned',
        cursor,
        pageSize,
        searchTerm,
        duration,
        userId,
        normalizedStatus,
        normalizedPriority,
        assignedToFilter
      );
      const responseIds = await taskIdsByType(
        typeFilter ?? 'unassigned',
        searchTerm,
        duration,
        userId,
        normalizedStatus,
        normalizedPriority,
        assignedToFilter
      );
      if (response && responseIds && response.success && responseIds.success) {
        setData(response.tasks);
        setTaskIds(responseIds.taskIds);
        setTotalCount(response.totalCount);
      } else {
        setError(response?.message || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      setError('An unexpected error occurred while fetching tasks');
      if (error instanceof Error) {
        toast({
          variant: 'destructive',
          title: `Failed to fetch ${typeFilter ?? 'unassigned'} tasks`,
          description: error.message || 'Something went wrong!',
          icon: <CircleX size={40} />,
        });
      }
    }
    setLoading(false);
  }, [
    searchTerm,
    duration,
    pageSize,
    cursor,
    role,
    toast,
    statusFilter,
    priorityFilter,
    typeFilter,
    assignedToFilter,
  ]);

  // Advanced filter fetch
  const fetchAdvancedTasks = useCallback(async () => {
    if (!hasAdvancedFilters) {
      toast({
        title: 'No Filters Applied',
        description: 'Please add at least one condition to search',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await executeSearch();
      // Results will be handled by the searchResults effect
    } catch (error) {
      console.error('Failed to fetch advanced tasks:', error);
      toast({
        variant: 'destructive',
        title: 'Advanced Search Failed',
        description: error instanceof Error ? error.message : 'Something went wrong!',
        icon: <CircleX size={40} />,
      });
    } finally {
      setLoading(false);
    }
  }, [hasAdvancedFilters, executeSearch, toast]);

  // Unified fetch function that delegates based on mode
  const fetchTasks = useCallback(() => {
    if (filterMode === 'advanced') {
      fetchAdvancedTasks();
    } else {
      fetchNormalTasks();
    }
  }, [filterMode, fetchNormalTasks, fetchAdvancedTasks]);
  useEffect(() => {
    if (filterMode === 'normal') {
      fetchNormalTasks();
    }
  }, [searchTerm, duration, pageSize, cursor, assignedToFilter, fetchNormalTasks]);

  useEffect(() => {
    if (Array.isArray(searchResults)) {
      setData(searchResults);
      setTaskIds(searchResults.map(t => t.id));
      setTotalCount(searchResults.length);

      // Ensure we're in advanced mode
      if (filterMode !== 'advanced') {
        setFilterMode('advanced');
      }
    }
  }, [searchResults]);
  useEffect(() => {
    const checkPrerequisites = async () => {
      setCheckingPrerequisites(true);
      try {
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

        const skillsData = await skillsResponse.json();
        const categoriesData = await categoriesResponse.json();

        setHasSkills(skillsData.length > 0);
        setHasTaskCategories(categoriesData.length > 0);
      } catch (error) {
        console.error('Error checking prerequisites:', error);
      } finally {
        setCheckingPrerequisites(false);
      }
    };

    checkPrerequisites();
  }, []);
  useEffect(() => {
    // Don't switch modes while we have search results
    if (searchResults && searchResults.length > 0) {
      return;
    }

    if (hasAdvancedFilters) {
      setFilterMode('advanced');
    } else {
      setFilterMode('normal');
    }
  }, [hasAdvancedFilters, searchResults, conditions]);

  const renderTaskTable = () => (
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
      fetchTasks={fetchNormalTasks}
      showAsModal={false}
    />
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <State
          icon={CircleX}
          variant="destructive"
          title="Error Loading Tasks"
          description={error}
          ctaText="Try Again"
          onCtaClick={fetchTasks}
        />
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="min-h-[300px] flex items-center justify-center">
          <CallToAction
            link="#"
            action="Create Your First Task"
            title="No Tasks Found"
            helperText="Create tasks to assign to your team members"
            description="Get started by creating your first task"
            variant="primary"
            iconType="plus"
            className="w-full max-w-xl mx-auto"
            buttonVariant="default"
            onClick={createTaskHandler}
          />
        </div>
      );
    }

    return renderTaskTable();
  };

  return (
    <div className="flex flex-col gap-4">
      {!checkingPrerequisites && (!hasSkills || !hasTaskCategories) && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Required Setup Missing</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              {!hasTaskCategories && <p>• Task categories are required to create tasks.</p>}
              {!hasSkills && <p>• Skills are required to create tasks.</p>}
              <p>As a Task Supervisor, you need to set these up first.</p>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/settings/picklists')}
                className="mt-2"
              >
                Go to Settings
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <DynamicBreadcrumb links={[{ label: 'Task Offerings' }]} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          >
            {showAdvancedFilter ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Hide Filters
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Advanced Filters
              </>
            )}
          </Button>

          <Button
            className="flex gap-2 font-bold text-base"
            onClick={() => createTaskHandler()}
            disabled={!hasSkills || !hasTaskCategories}
          >
            <Plus className="h-5 w-5" /> Create New Task
          </Button>
        </div>
        <CreateTaskContainer open={open} setOpen={setOpen} fetchTasks={fetchNormalTasks} />
      </div>

      {/* Advanced Filter Section */}
      {showAdvancedFilter && (
        <AdvancedFilterBuilder
          onSearch={() => {
            console.log('onSearch callback - staying in advanced mode');
            setFilterMode('advanced');
          }}
          compact={true}
        />
      )}

      <SearchNFilter onSearch={handleSearch} filterList={listOfFilter} role={role} />
      {renderContent()}
    </div>
  );
};
