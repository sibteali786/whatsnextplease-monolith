'use client';
import { taskAPI } from '@/utils/tasks/taskAPI';
import { CreatorType, Roles } from '@prisma/client';

export const createDraftTask = async (
  creatorType: CreatorType,
  userId: string, // Not needed for API call, but keep for compatibility
  role: Roles      // Not needed for API call, but keep for compatibility
) => {
  try {
    const response = await taskAPI.createDraftTask({ creatorType });
    return response;
  } catch (error) {
    console.error('Error creating draft task:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create draft task',
    };
  }
};