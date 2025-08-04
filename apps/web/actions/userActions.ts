// utils/userActions.ts or actions/userActions.ts
'use server';

import { getUserById } from '@/utils/userTools';
import { getTaskAgentStatsById } from '@/utils/taskAgentActions';

export async function fetchUserData(userId: string) {
  try {
    const { user, message } = await getUserById(userId);
    return { user, message, success: true };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return { user: null, message: 'Failed to fetch user data', success: false };
  }
}

export async function fetchTaskStats(userId: string) {
  try {
    const taskAgentResponse = await getTaskAgentStatsById(userId);
    if (taskAgentResponse.success && taskAgentResponse.taskAgent) {
      return {
        taskStats: taskAgentResponse.taskAgent,
        success: true,
      };
    }
    return { taskStats: null, success: false };
  } catch (error) {
    console.error('Error fetching task stats:', error);
    return { taskStats: null, success: false };
  }
}
