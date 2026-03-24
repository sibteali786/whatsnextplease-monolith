'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DurationEnum } from '@/types';
import { Roles, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';
import { UserTasksTable } from '../users/UserTaskTable';
import { tasksByType } from '@/db/repositories/tasks/tasksByType';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CircleX, Loader2 } from 'lucide-react';
import { taskIdsByType } from '@/db/repositories/tasks/taskIdsByType';
import { TaskTable } from '@/utils/validationSchemas';
import { Button } from '../ui/button';

import { State } from '../DataState';
import { CallToAction } from '../CallToAction';

import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useSearchParams } from 'next/navigation';

import { useAdvancedFilterContext } from '@/contexts/AdvancedFilterContext';

export const TaskSuperVisorList = ({
  userId,
  role,
  searchTerm,
  duration,
  checkingPrerequisites,
  hasSkills,
  hasTaskCategories,
  createTaskHandler,
  reload,
  advancedFilterData,
  advancedFilterTaskIds,
}: {
  userId: string;
  role: Roles;
  searchTerm?: string;
  duration?: DurationEnum;
  checkingPrerequisites?: boolean;
  hasSkills?: boolean;
  hasTaskCategories?: boolean;
  createTaskHandler?: () => void;
  reload?: boolean;
  advancedFilterData?: TaskTable[] | null;
  advancedFilterTaskIds: string[] | null;
}) => {
  const searchParams = useSearchParams();

  const [pageSize, setPageSize] = useState<number>(10);
  const [cursor, setCursor] = useState<string | null>(null);
  const [data, setData] = useState<TaskTable[] | null>([]);
  const [totalCount, setTotalCount] = useState<number | undefined>(0);
  const [totalAdvancedCount, setTotalAdvancedCount] = useState<number>(0);
  const [taskIds, setTaskIds] = useState<string[] | null>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageIndex, setPageIndex] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [filterMode, setFilterMode] = useState<'normal' | 'advanced'>('normal');

  // Advanced filter context
  const { searchResults, conditions, loadMore, hasNextCursor } = useAdvancedFilterContext();
  const hasAdvancedFilters = conditions.length > 0;

  const statusFilter = searchParams.get('status');
  const priorityFilter = searchParams.get('priority');
  const typeFilter: 'all' | 'assigned' | 'unassigned' | 'my-tasks' = searchParams.get('type') as
    | 'all'
    | 'assigned'
    | 'unassigned'
    | 'my-tasks';
  const assignedToFilter = searchParams.get('assignedTo') || undefined;

  // Handle advanced page changes
  const handleAdvancedPageChange = async (newPageIndex: number) => {
    if (!searchResults) return;
    setLoading(true);
    try {
      const startIndex = newPageIndex * pageSize;
      if (searchResults.length >= startIndex + 1) {
        setPageIndex(newPageIndex);
        return;
      }
      await loadMore();
      setPageIndex(newPageIndex);
    } finally {
      setLoading(false);
    }
  };

  const paginatedAdvancedData = useMemo(() => {
    if (!searchResults) return [];
    const start = pageIndex * pageSize;
    return searchResults.slice(start, start + pageSize);
  }, [searchResults, pageIndex, pageSize]);

  // ✅ Normal task fetch accepts cursor explicitly
  const fetchNormalTasks = useCallback(
    async (overrideCursor?: string | null) => {
      if (searchResults && searchResults.length > 0) return;

      setLoading(true);
      setError(null);

      try {
        const statusArray = statusFilter?.split(',') || [];
        const priorityArray = priorityFilter?.split(',') || [];

        const normalizedStatus = statusArray
          .map(s => TaskStatusEnum[s as keyof typeof TaskStatusEnum] || null)
          .filter(Boolean);

        const normalizedPriority = priorityArray
          .map(p => TaskPriorityEnum[p as keyof typeof TaskPriorityEnum] || null)
          .filter(Boolean);

        const response = await tasksByType(
          overrideCursor ?? null,
          pageSize,
          searchTerm || '',
          duration || DurationEnum.ALL,
          userId,
          normalizedStatus,
          normalizedPriority,
          assignedToFilter
        );

        const responseIds = await taskIdsByType(
          searchTerm || '',
          duration || DurationEnum.ALL,
          userId,
          normalizedStatus,
          normalizedPriority,
          assignedToFilter
        );

        if (response?.success && responseIds?.success) {
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
    },
    [
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
      reload,
      searchResults,
    ]
  );

  // Reset page and cursor when normal filters change
  useEffect(() => {
    if (filterMode === 'normal') {
      // Reset pagination and data
      setPageIndex(0);
      setCursor(null);
      setData([]);
      setTaskIds([]);

      // Explicitly fetch with null cursor
      fetchNormalTasks(null);
    }
  }, [statusFilter, priorityFilter, searchTerm, assignedToFilter, duration]);

  // Fetch normal tasks on initial load
  useEffect(() => {
    if (advancedFilterData && advancedFilterData.length > 0) return;
    if (filterMode === 'normal') {
      fetchNormalTasks(cursor);
    }
  }, [cursor, pageSize, filterMode, advancedFilterData]);

  // Switch back to normal mode when advanced filters are cleared
  useEffect(() => {
    if (!hasAdvancedFilters) {
      setFilterMode('normal');
      setPageIndex(0); // reset pagination to first page
      setCursor(null); // reset cursor for backend
      setData([]);
      setTaskIds([]);
      fetchNormalTasks(null); // fetch fresh data from page 0
    }
  }, [hasAdvancedFilters]);

  // Handle advanced results
  useEffect(() => {
    if (Array.isArray(searchResults) && searchResults.length > 0) {
      setData(searchResults);
      setTaskIds(advancedFilterTaskIds ?? []);
      setTotalAdvancedCount(hasNextCursor ? searchResults.length + pageSize : searchResults.length);

      if (filterMode !== 'advanced') {
        setFilterMode('advanced');
        setPageIndex(0);
      }
    }
  }, [searchResults, advancedFilterTaskIds, hasNextCursor]);

  const renderTaskTable = () => (
    <UserTasksTable
      filterMode={filterMode}
      data={filterMode === 'advanced' ? paginatedAdvancedData : (data ?? [])}
      pageSize={pageSize}
      loading={loading}
      cursor={cursor}
      setCursor={filterMode === 'advanced' ? () => {} : setCursor}
      showDescription={true}
      setPageSize={setPageSize}
      pageIndex={pageIndex}
      setPageIndex={filterMode === 'advanced' ? handleAdvancedPageChange : setPageIndex}
      taskIds={filterMode === 'advanced' ? (advancedFilterTaskIds ?? []) : (taskIds ?? [])}
      role={role}
      fetchTasks={fetchNormalTasks}
      showAsModal={false}
      totalPages={
        filterMode === 'advanced'
          ? Math.ceil(totalAdvancedCount / pageSize)
          : totalCount
            ? Math.ceil(totalCount / pageSize)
            : 0
      }
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
          onCtaClick={() => fetchNormalTasks(cursor)}
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

      {renderContent()}
    </div>
  );
};
