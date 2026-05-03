/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { DurationEnum, DurationEnumList } from '@/types';
import { TaskSuperVisorList } from './TaskSuperVisorList';
import { CreatorType, Roles } from '@prisma/client';
import { SearchNFilter } from '../common/SearchNFilter';
import { useCallback, useEffect, useState } from 'react';
import { DynamicBreadcrumb } from '../skills/DynamicBreadcrumb';
import { Button } from '../ui/button';
import { AlertCircle, ChevronDown, ChevronUp, CircleX, Loader2, Plus } from 'lucide-react';
import { CreateTaskContainer } from './CreateTaskContainer';
import { ToastAction } from '../ui/toast';
import { createDraftTask } from '@/db/repositories/tasks/createDraftTask';
import { useToast } from '@/hooks/use-toast';
import { useCreatedTask } from '@/store/useTaskStore';
import { AdvancedFilterBuilder } from './AdvancedFilterBuilder';
import { useSearchParams } from 'next/navigation';
import Kanban from '../projectTimeline/kanban';
import Gantt from '../projectTimeline/gantt';
import { UserState } from '@/utils/user';
import { useAdvancedFilterContext } from '@/contexts/AdvancedFilterContext';
import { TaskTable } from '@/utils/validationSchemas';
import { apiClient } from '@/lib/apiClient';

const TaskSupervisorBase = ({
  user,
  userId,
  listOfFilter,
  role,
}: {
  user: UserState | null;
  userId: string;
  listOfFilter?: DurationEnumList;
  role: Roles;
}) => {
  const searchParams = useSearchParams();
  const { toast, dismiss } = useToast();
  const { setCreatedTask } = useCreatedTask();
  const view = (searchParams.get('view') as 'list' | 'timeline' | 'kanban') ?? 'list';
  const [data, setData] = useState<TaskTable[] | null>([]);
  /*   const [totalCount, setTotalCount] = useState<number | undefined>(0); */

  const [taskIds, setTaskIds] = useState<string[] | null>([]);
  const [filterMode, setFilterMode] = useState<'normal' | 'advanced'>('normal');
  const [duration, setDuration] = useState<DurationEnum>(DurationEnum.ALL);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [hasSkills, setHasSkills] = useState(false);
  const [hasTaskCategories, setHasTaskCategories] = useState(false);
  const [checkingPrerequisites, setCheckingPrerequisites] = useState(true);
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(false);

  const { searchResults, conditions, loading } = useAdvancedFilterContext();
  const hasAdvancedFilters = conditions.length > 0;

  const onReload = useCallback(() => setReload(prevState => !prevState), []);

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
    if (response.success && response.data) {
      dismiss();
      setCreatedTask(response.data);
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

  useEffect(() => {
    const checkPrerequisites = async () => {
      setCheckingPrerequisites(true);
      try {
        const [skillsData, categoriesData] = await Promise.all([
          apiClient.get<any>('/skill/all'),
          apiClient.get<any>('/taskCategory/all'),
        ]);

        // Handle skill API errors
        if (!skillsData) {
          const errorText = 'No data received from skills API';
          throw new Error(`Skills API error: ${errorText}`);
        }

        // Handle category API errors
        if (!categoriesData) {
          const errorText = 'No data received from categories API';
          throw new Error(`Categories API error: ${errorText}`);
        }

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
  useEffect(() => {
    if (Array.isArray(searchResults)) {
      setData(searchResults);
      setTaskIds(searchResults.map(t => t.id));

      // Ensure we're in advanced mode
      if (filterMode !== 'advanced') {
        setFilterMode('advanced');
      }
    }
  }, [searchResults]);

  return (
    <div className="flex flex-col gap-4">
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
        <CreateTaskContainer
          open={open}
          setOpen={setOpen}
          /* fetchTasks={fetchNormalTasks} */ onReload={onReload}
        />
      </div>

      {/* Advanced Filter Section */}
      {showAdvancedFilter && (
        <AdvancedFilterBuilder
          onSearch={() => {
            setFilterMode('advanced');
          }}
          compact={true}
        />
      )}
      <SearchNFilter onSearch={handleSearch} filterList={listOfFilter} role={role} />
      {view === 'kanban' ? (
        <Kanban
          user={user}
          searchTerm={searchTerm}
          duration={duration}
          taskOffering={true}
          advancedFilterData={searchResults}
          advancedFilterLoading={loading}
          newTaskReload={reload}
        />
      ) : view === 'timeline' ? (
        <Gantt
          user={user}
          searchTerm={searchTerm}
          duration={duration}
          taskOffering={true}
          advancedFilterLoading={loading}
          data={data}
          reload={reload}
        />
      ) : (
        <TaskSuperVisorList
          role={role}
          userId={userId}
          searchTerm={searchTerm}
          duration={duration}
          checkingPrerequisites={checkingPrerequisites}
          hasSkills={hasSkills}
          hasTaskCategories={hasTaskCategories}
          createTaskHandler={createTaskHandler}
          reload={reload}
          advancedFilterData={data}
          advancedFilterTaskIds={taskIds}
        />
      )}
    </div>
  );
};

export default TaskSupervisorBase;
