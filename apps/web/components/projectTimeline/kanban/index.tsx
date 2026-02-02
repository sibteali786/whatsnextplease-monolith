'use client';

import StatusColumn from './status-column';

import { UserState } from '@/utils/user';

import { useTasksByStatus } from '@/utils/tasks/useTasksByStatus';
import { TaskStatusEnum } from '@prisma/client';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import KanbanSkeleton from './skeleton';
import TaskBox from './task';
import { TaskTable } from '@/utils/validationSchemas';
import { updateTaskField } from '@/utils/tasks/taskInlineUpdates';

const columns = [
  {
    name: 'New',
    type: TaskStatusEnum.NEW,
    color: '69, 85, 108',
  },
  {
    name: 'In Progress',
    type: TaskStatusEnum.IN_PROGRESS,
    color: '21, 93, 252',
  },
  {
    name: 'Review',
    type: TaskStatusEnum.REVIEW,
    color: '152, 16, 250',
  },
  {
    name: 'Completed',
    type: TaskStatusEnum.COMPLETED,
    color: '0, 166, 62',
  },
  {
    name: 'Blocked',
    type: TaskStatusEnum.BLOCKED,
    color: '231, 0, 11',
  },
];

const Kanban = ({ user }: { user: UserState | null }) => {
  const [activeTask, setActiveTask] = useState<TaskTable | null>(null);
  const [activeTaskStatus, setActiveTaskStatus] = useState<TaskStatusEnum | null>(null);

  const { data, loading, error, onReload } = useTasksByStatus([
    TaskStatusEnum.NEW,
    TaskStatusEnum.IN_PROGRESS,
    TaskStatusEnum.REVIEW,
    TaskStatusEnum.COMPLETED,
    TaskStatusEnum.BLOCKED,
  ]);
  const [kanbanData, setKanbanData] = useState(data);

  const findTaskById = (taskId: string) => {
    for (const column of columns) {
      const columnData = kanbanData?.[column.type]; // ✅ FIX
      const task = columnData?.tasks?.find(t => t.id === taskId);
      if (task) return task;
    }
    return null;
  };

  useEffect(() => {
    if (data) setKanbanData(data);
  }, [data]);

  /*  useEffect(() => {
    const interval = setInterval(() => {
      onReload();
    }, 30_000); 

    return () => clearInterval(interval);
  }, [onReload]); */
  // Loading state
  if (loading) {
    return <KanbanSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-red-600">
        Failed to load tasks: {error}
      </div>
    );
  }

  const moveTaskOptimistically = (
    taskId: string,
    fromStatus: TaskStatusEnum,
    toStatus: TaskStatusEnum
  ) => {
    setKanbanData(prev => {
      if (!prev) return prev;

      const sourceTasks = prev[fromStatus].tasks.filter(t => t.id !== taskId);
      const movedTask = prev[fromStatus].tasks.find(t => t.id === taskId);

      if (!movedTask) return prev;

      return {
        ...prev,
        [fromStatus]: {
          ...prev[fromStatus],
          tasks: sourceTasks,
          count: prev[fromStatus].count - 1,
        },
        [toStatus]: {
          ...prev[toStatus],
          tasks: [{ ...movedTask, status: { statusName: toStatus } }, ...prev[toStatus].tasks],
          count: prev[toStatus].count + 1,
        },
      };
    });
  };

  return (
    <DndContext
      onDragStart={(event: DragStartEvent) => {
        const taskId = event.active.id as string;
        const task = findTaskById(taskId);

        setActiveTask(task);
        setActiveTaskStatus(task?.status?.statusName ?? null);
      }}
      onDragEnd={(event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over || !activeTaskStatus) {
          setActiveTaskStatus(null);
          return;
        }

        const taskId = active.id as string;
        const newStatus = over.id as TaskStatusEnum;

        //  SAME COLUMN → DO NOTHING
        if (newStatus === activeTaskStatus) return;
        moveTaskOptimistically(taskId, activeTaskStatus, newStatus);

        // update-status API

        const handleStatusUpdate = async () => {
          // Background API call
          try {
            await updateTaskField({
              taskId,
              field: 'status',
              value: newStatus,
            });
          } catch (err) {
            console.error(err);
            //  rollback if API fails
            moveTaskOptimistically(taskId, newStatus, activeTaskStatus);
          }
        };
        handleStatusUpdate();
        setActiveTaskStatus(null);
      }}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="flex flex-col md:flex-row gap-4 overflow-x-auto pb-4">
        {columns.map(column => {
          const columnData = kanbanData?.[column.type];
          return (
            <StatusColumn
              key={column.type}
              name={column.name}
              color={column.color}
              tasks={columnData?.tasks ?? []} // tasks array
              totalCount={columnData?.count ?? 0} // total count
              status={column.type}
              onReload={onReload}
              user={user}
            />
          );
        })}
      </div>

      <DragOverlay>{activeTask && <TaskBox task={activeTask} isDragOverlay />}</DragOverlay>
    </DndContext>
  );
};

export default Kanban;
