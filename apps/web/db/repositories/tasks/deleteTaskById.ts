'use client';
import { taskAPI } from '@/utils/tasks/taskAPI';

export const deleteTaskById = async (taskId: string) => {
  try {
    const response = await taskAPI.deleteTask(taskId);
    return response;
  } catch (error) {
    console.error('Error deleting task:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete task',
    };
  }
};