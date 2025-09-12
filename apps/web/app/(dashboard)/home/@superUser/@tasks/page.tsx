'use client';
import { TaskList } from '@/components/TaskList';
import TasksListModal from '@/components/tasks/TasksListModal';
import { TaskByPriority } from '@/utils/validationSchemas';
import { TaskPriorityEnum } from '@prisma/client';
import { CallToAction } from '@/components/CallToAction';
import { useState } from 'react';
import { useTasksByPriorityLevel } from '@/utils/tasks/taskAPI';

export default function TasksSection() {
  const [open, setOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<TaskPriorityEnum>(TaskPriorityEnum.CRITICAL);

  const { data: criticalData, loading: criticalLoading } = useTasksByPriorityLevel('critical', {
    pageSize: 5,
  });
  const { data: highData, loading: highLoading } = useTasksByPriorityLevel('high', { pageSize: 5 });
  const { data: mediumData, loading: mediumLoading } = useTasksByPriorityLevel('medium', {
    pageSize: 5,
  });
  const { data: lowData, loading: lowLoading } = useTasksByPriorityLevel('low', { pageSize: 5 });
  const { data: holdData, loading: holdLoading } = useTasksByPriorityLevel('hold', { pageSize: 5 });
  const handlePriorityChange = (level: TaskPriorityEnum) => {
    setSelectedLevel(level);
    setOpen(true);
  };

  // Check if any data is still loading
  const anyLoading = criticalLoading || highLoading || mediumLoading || lowLoading || holdLoading;

  // Calculate total tasks
  const totalTasks =
    (criticalData?.totalCount || 0) +
    (highData?.totalCount || 0) +
    (mediumData?.totalCount || 0) +
    (lowData?.totalCount || 0) +
    (holdData?.totalCount || 0);

  if (anyLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold col-span-full mb-4">Tasks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-48"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (totalTasks === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold col-span-full mb-4">Tasks</h2>
        <CallToAction
          link="/taskOfferings"
          action="Create Task"
          title="No Tasks Available"
          description="You don't have any tasks at the moment."
          variant="default"
          iconType="plus"
        />
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convertToTaskByPriority = (tasks: any[]): TaskByPriority[] => {
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status, // Should match the expected shape
      priority: task.priority, // Should match the expected shape
      dueDate: task.dueDate,
      taskCategory: task.taskCategory ?? null, // or provide a sensible default
      description: task.description ?? '',
      createdByUser: task.createdByUser ?? null,
      createdByClient: task.createdByClient ?? null,
    }));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold col-span-full mb-4">Tasks by Priority</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Critical Tasks (combines URGENT + CRITICAL) */}
        {criticalData && criticalData.totalCount > 0 && (
          <TaskList
            tasks={convertToTaskByPriority(criticalData.tasks)}
            title={`Critical (${criticalData.totalCount})`}
            icon="AlertTriangle"
            priority={TaskPriorityEnum.CRITICAL} // For legacy compatibility
            handlePriority={() => handlePriorityChange(TaskPriorityEnum.CRITICAL)}
          />
        )}

        {/* High Priority Tasks */}
        {highData && highData.totalCount > 0 && (
          <TaskList
            tasks={convertToTaskByPriority(highData.tasks)}
            title={`High (${highData.totalCount})`}
            icon="ArrowUp"
            priority={TaskPriorityEnum.HIGH}
            handlePriority={() => handlePriorityChange(TaskPriorityEnum.HIGH)}
          />
        )}

        {/* Medium Priority Tasks (combines NORMAL + MEDIUM) */}
        {mediumData && mediumData.totalCount > 0 && (
          <TaskList
            tasks={convertToTaskByPriority(mediumData.tasks)}
            title={`Medium (${mediumData.totalCount})`}
            icon="Minus"
            priority={TaskPriorityEnum.MEDIUM}
            handlePriority={() => handlePriorityChange(TaskPriorityEnum.MEDIUM)}
          />
        )}

        {/* Low Priority Tasks (combines LOW_PRIORITY + LOW) */}
        {lowData && lowData.totalCount > 0 && (
          <TaskList
            tasks={convertToTaskByPriority(lowData.tasks)}
            title={`Low (${lowData.totalCount})`}
            icon="ArrowDown"
            priority={TaskPriorityEnum.LOW}
            handlePriority={() => handlePriorityChange(TaskPriorityEnum.LOW)}
          />
        )}

        {/* On Hold Tasks */}
        {holdData && holdData.totalCount > 0 && (
          <TaskList
            tasks={convertToTaskByPriority(holdData.tasks)}
            title={`On Hold (${holdData.totalCount})`}
            icon="Pause"
            priority={TaskPriorityEnum.HOLD}
            handlePriority={() => handlePriorityChange(TaskPriorityEnum.HOLD)}
          />
        )}
      </div>

      {/* Tasks List Modal */}
      <TasksListModal open={open} setOpen={setOpen} priority={selectedLevel} />
    </div>
  );
}
