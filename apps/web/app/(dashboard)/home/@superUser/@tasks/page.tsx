'use client';
import { TaskList } from '@/components/TaskList';
import TasksListModal from '@/components/tasks/TasksListModal';
import { getTasksByPriority } from '@/db/repositories/tasks/getTasksByPriority';
import { getCurrentUser } from '@/utils/user';
import { TaskByPriority } from '@/utils/validationSchemas';
import { Roles, TaskPriorityEnum } from '@prisma/client';
import { CallToAction } from '@/components/CallToAction';
import { useEffect, useState } from 'react';

export default function TasksSection() {
  const [open, setOpen] = useState(false);
  const [urgentTasks, setUrgentTasks] = useState<TaskByPriority[]>([]);
  const [normalTasks, setNormalTasks] = useState<TaskByPriority[]>([]);
  const [lowPriorityTasks, setLowPriorityTasks] = useState<TaskByPriority[]>([]);
  const [priority, setPriority] = useState<TaskPriorityEnum>(TaskPriorityEnum.NORMAL);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handlePriorityChange = (priority: TaskPriorityEnum) => {
    setPriority(priority);
    setOpen(true);
  };

  // Fetch tasks based on priority
  useEffect(() => {
    async function fetchTasks() {
      setIsLoading(true);
      const user = await getCurrentUser();
      if (user?.role?.name === Roles.SUPER_USER) {
        try {
          // Fetch all task types in parallel for better performance
          const [urgentResponse, normalResponse, lowResponse] = await Promise.all([
            getTasksByPriority(TaskPriorityEnum.URGENT),
            getTasksByPriority(TaskPriorityEnum.NORMAL),
            getTasksByPriority(TaskPriorityEnum.LOW_PRIORITY),
          ]);

          setUrgentTasks(urgentResponse.tasks || []);
          setNormalTasks(normalResponse.tasks || []);
          setLowPriorityTasks(lowResponse.tasks || []);
          setError(null);
        } catch (e) {
          console.error('Failed to retrieve tasks:', e);
          setError('Unable to load tasks. Please try again later.');
        } finally {
          setIsLoading(false);
        }
      }
    }
    fetchTasks();
  }, []);

  // If there are no tasks at all, show a call to action
  const noTasksAvailable =
    !isLoading &&
    urgentTasks.length === 0 &&
    normalTasks.length === 0 &&
    lowPriorityTasks.length === 0;

  if (error) {
    return (
      <div>
        <CallToAction
          link="/taskOfferings"
          action="Try Again"
          title="Unable to Load Tasks"
          description={error}
          variant="destructive"
          iconType="alert"
          buttonVariant="outline"
        />
      </div>
    );
  }

  if (noTasksAvailable) {
    return (
      <div>
        <h2 className="text-2xl font-bold col-span-full mb-4">Tasks</h2>
        <CallToAction
          link="/taskOfferings"
          action="Create Task"
          title="No Tasks Available"
          description="You don't have any tasks at the moment."
          helperText="Create your first task to get started managing work assignments."
          variant="primary"
          iconType="plus"
          className="w-full max-w-3xl mx-auto"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8">
        <h2 className="text-2xl font-bold col-span-full">Tasks</h2>

        {isLoading ? (
          // Loading state - show skeleton cards
          <>
            {[1, 2, 3].map(index => (
              <div
                key={index}
                className="w-full max-w-md rounded-2xl border p-6 space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
                  <div className="h-6 w-6 bg-purple-300 dark:bg-purple-800 rounded-full"></div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map(item => (
                    <div key={item} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          // Render actual task lists
          <>
            <TaskList
              tasks={urgentTasks}
              title="Urgent Tasks"
              icon="TriangleAlert"
              priority={TaskPriorityEnum.URGENT}
              handlePriority={handlePriorityChange}
            />
            <TaskList
              tasks={normalTasks}
              title="Normal Tasks"
              icon="Clock"
              priority={TaskPriorityEnum.NORMAL}
              handlePriority={handlePriorityChange}
            />
            <TaskList
              tasks={lowPriorityTasks}
              title="Low Priority Tasks"
              icon="CircleArrowDown"
              priority={TaskPriorityEnum.LOW_PRIORITY}
              handlePriority={handlePriorityChange}
            />
          </>
        )}
      </div>

      {/* Task list modal */}
      <TasksListModal open={open} setOpen={setOpen} priority={priority} />
    </div>
  );
}
