"use client";
import { TaskList } from "@/components/TaskList";
import TasksListModal from "@/components/tasks/TasksListModal";
import { getTasksByPriority } from "@/db/repositories/tasks/getTasksByPriority";
import { getCurrentUser } from "@/utils/user";
import { TaskByPriority } from "@/utils/validationSchemas";
import { Roles, TaskPriorityEnum } from "@prisma/client";
import { useEffect, useState } from "react";

export default function TasksSection() {
  const [open, setOpen] = useState(false);
  const [urgentTasks, setUrgentTasks] = useState<TaskByPriority[]>([]);
  const [normalTasks, setNormalTasks] = useState<TaskByPriority[]>([]);
  const [lowPriorityTasks, setLowPriorityTasks] = useState<TaskByPriority[]>(
    [],
  );
  const [priority, setPriority] = useState<TaskPriorityEnum>(
    TaskPriorityEnum.NORMAL,
  );
  const handlePriorityChange = (priority: TaskPriorityEnum) => {
    setPriority(priority);
    setOpen(true);
  };
  // Fetch tasks based on priority
  useEffect(() => {
    async function fetchTasks() {
      const user = await getCurrentUser();
      if (user.role.name === Roles.SUPER_USER) {
        try {
          const { tasks: urgentTasks } = await getTasksByPriority(
            TaskPriorityEnum.URGENT,
          );
          if (urgentTasks) {
            setUrgentTasks(urgentTasks);
          }
          const { tasks: normalTasks } = await getTasksByPriority(
            TaskPriorityEnum.NORMAL,
          );
          if (normalTasks) {
            setNormalTasks(normalTasks);
          }
          const { tasks: lowPriorityTasks } = await getTasksByPriority(
            TaskPriorityEnum.LOW_PRIORITY,
          );
          if (lowPriorityTasks) {
            setLowPriorityTasks(lowPriorityTasks);
          }
        } catch (e) {
          console.error("Failed to retrieve tasks:", e);
        }
      }
    }
    fetchTasks();
  }, []);

  return (
    <div>
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8">
        <h2 className="text-2xl font-bold col-span-full">Tasks</h2>
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
      </div>
      <TasksListModal open={open} setOpen={setOpen} priority={priority} />
    </div>
  );
}
