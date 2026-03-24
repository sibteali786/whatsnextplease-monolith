'use client';

import { AlertCircle, CircleX, Loader2, PlusIcon } from 'lucide-react';
import TaskBox from './task';

import { TaskTable } from '@/utils/validationSchemas';
import { useDroppable } from '@dnd-kit/core';
import { CreatorType, Roles, TaskStatusEnum } from '@prisma/client';
import { useEffect, useRef, useState } from 'react';
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@radix-ui/react-toast';
import { useCreatedTask } from '@/store/useTaskStore';
import { createDraftTask } from '@/db/repositories/tasks/createDraftTask';
import { UserState } from '@/utils/user';
import { CreateTaskContainer } from '@/components/tasks/CreateTaskContainer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
type StatusColumnProps = {
  name: string;
  color: string;
  status: TaskStatusEnum;
  tasks: TaskTable[];
  totalCount: number;
  onReload: () => void;
  user?: UserState | null;
  loadMoreTasks: (status: TaskStatusEnum) => void;
  loadingMore: boolean;
  isAdvancedMode: boolean;
};

const StatusColumn = ({
  name,
  color,
  tasks,
  totalCount,
  status,
  onReload,
  user,
  loadMoreTasks,
  loadingMore,
  isAdvancedMode,
}: StatusColumnProps) => {
  const scrollLock = useRef(false);

  const [open, setOpen] = useState(false);
  const [hasSkills, setHasSkills] = useState(false);
  const [hasTaskCategories, setHasTaskCategories] = useState(false);
  const [taskCategories, setTaskCategories] = useState<{ id: string; categoryName: string }[]>([]);
  const { toast, dismiss } = useToast();
  const { setCreatedTask } = useCreatedTask();

  const { setNodeRef, isOver } = useDroppable({
    id: status, // this becomes the drop target
  });

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

    const response = await createDraftTask(
      CreatorType.USER,
      user ? user.id : '',
      user?.role?.name ?? Roles.SUPER_USER
    );
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
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = 80; // 80px from bottom

    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    if (
      isNearBottom &&
      !loadingMore &&
      !scrollLock.current &&
      (isAdvancedMode || tasks.length < totalCount)
    ) {
      scrollLock.current = true;

      try {
        await loadMoreTasks(status);
      } finally {
        scrollLock.current = false;
      }
    }
  };
  useEffect(() => {
    const checkPrerequisites = async () => {
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
        // Handle skill API errors
        if (!skillsResponse.ok) {
          const errorText = await skillsResponse.text();
          throw new Error(`Skills API error: ${skillsResponse.status} ${errorText}`);
        }

        // Handle category API errors
        if (!categoriesResponse.ok) {
          const errorText = await categoriesResponse.text();
          throw new Error(`Categories API error: ${categoriesResponse.status} ${errorText}`);
        }
        const skillsData = await skillsResponse.json();
        const categoriesData = await categoriesResponse.json();

        setHasSkills(skillsData.length > 0);
        setHasTaskCategories(categoriesData.length > 0);
        setTaskCategories(categoriesData);
      } catch (error) {
        console.error('Error checking prerequisites:', error);
        setHasSkills(false);
        setHasTaskCategories(false);
        setTaskCategories([]);
      }
    };

    checkPrerequisites();
  }, []);

  return (
    <div
      className={`
        custom-scrollbar relative
        flex flex-col gap-4 rounded-xl p-2
        transition-all duration-200
        md:w-[300px] md:min-w-[300px] 
        md:max-h-[500px] md:h-[500px] md:overflow-y-auto
        ${isOver ? 'border-2 border-primary bg-primary/5 shadow-md' : 'border border-transparent'}
      `}
      ref={setNodeRef}
    >
      <div className="flex gap-1 justify-between">
        <div className="flex gap-1">
          <Badge
            className="py-1 px-4 text-[10px] text-nowrap"
            style={{
              color: `rgb(${color})`,
              backgroundColor: `rgba(${color}, 0.2)`,
            }}
          >
            {name}
          </Badge>
          <div className="flex p-2 w-[25px] h-[25px] rounded-[10px] border bg-[rgba(255, 255, 255, 0.1)] items-center justify-center">
            <p className="text-[10px]">{totalCount}</p>
          </div>
        </div>
      </div>
      {/* task box */}

      <div
        className="flex flex-col gap-3 overflow-y-auto pb-4 max-h-[400px]" // ensure fixed height
        onScroll={handleScroll}
      >
        {tasks.length === 0 ? (
          <p>No tasks.</p>
        ) : (
          tasks.map(task => (
            <TaskBox
              key={task.id}
              task={task}
              role={user?.role?.name}
              taskCategories={taskCategories}
              onReload={onReload}
            />
          ))
        )}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="animate-spin h-4 w-4" />
          </div>
        )}
      </div>
      <Button
        size={'sm'}
        variant="ghost"
        className="flex items-center justify-center gap-2 px-0 bg-muted/70 min-h-[35px] h-[35px]"
        onClick={() => createTaskHandler()}
        disabled={!hasSkills || !hasTaskCategories}
      >
        <PlusIcon className="h-5 w-5" />
        <p className="text-[14px]">Add Task</p>
      </Button>
      <CreateTaskContainer open={open} setOpen={setOpen} onReload={onReload} status={status} />
    </div>
  );
};

export default StatusColumn;
