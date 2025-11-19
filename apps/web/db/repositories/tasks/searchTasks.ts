'use client';
import { taskAPI } from '@/utils/tasks/taskAPI';

export const searchTasks = async (searchTerm: string) => {
  try {
    const response = await taskAPI.searchTasks(searchTerm);
    return response;
  } catch (error) {
    console.error('Error searching tasks:', error);
    return {
      success: false,
      tasks: [],
      message: error instanceof Error ? error.message : 'Failed to search tasks',
    };
  }
};