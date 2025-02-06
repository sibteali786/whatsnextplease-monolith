import { TaskTable } from '@/utils/validationSchemas';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TaskState {
  selectedTask: TaskTable | null;
  setSelectedTask: (task: TaskTable) => void;
  clearSelectedTask: () => void;
}

export const useSelectedTask = create<TaskState>()(
  persist(
    set => ({
      selectedTask: null,
      setSelectedTask: task => set({ selectedTask: task }),
      clearSelectedTask: () => set({ selectedTask: null }),
    }),
    {
      name: 'task-store', // Key in localStorage
    }
  )
);

interface TaskCreated {
  createdTask: { id: string } | null;
  setCreatedTask: (task: { id: string }) => void;
  clearCreatedTask: () => void;
}

export const useCreatedTask = create<TaskCreated>()(
  persist(
    set => ({
      createdTask: null,
      setCreatedTask: task => set({ createdTask: task }),
      clearCreatedTask: () => set({ createdTask: null }),
    }),
    {
      name: 'created-task',
    }
  )
);

interface TaskIdState {
  selectedTaskId: string | null;
  setSelectedTaskId: (taskId: string) => void;
  clearSelectedTask: () => void;
}

export const useSelectedTaskId = create<TaskIdState>()(
  persist(
    set => ({
      selectedTaskId: null,
      setSelectedTaskId: taskId => set({ selectedTaskId: taskId }),
      clearSelectedTask: () => set({ selectedTaskId: null }),
    }),
    {
      name: 'task-id-store', // Key in localStorage
    }
  )
);
