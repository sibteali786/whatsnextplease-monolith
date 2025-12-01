'use client';
import { taskAPI, UpdateTaskParams } from '@/utils/tasks/taskAPI';

export const updateTaskById = async (params: Omit<UpdateTaskParams, 'id'> & { id: string }) => {
  try {
    const response = await taskAPI.updateTask(params);
    
    return response;
  } catch (error) {
    console.error('Error updating task:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update task',
    };
  }
};