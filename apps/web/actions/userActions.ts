'use server';

import { getUserById } from '@/utils/userTools';
import { getTaskAgentStatsById } from '@/utils/taskAgentActions';
import { COOKIE_NAME } from '@/utils/constant';
import { cookies } from 'next/headers';

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

export async function searchUsersAction(
  query: string
): Promise<{ users: any[]; success: boolean; message?: string }> {
  const token = cookies().get(COOKIE_NAME)?.value;
  const users = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/user/search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!users.ok) {
    console.error('Failed to search users:', users.statusText);
    return { users: [], success: false, message: 'Failed to search users' };
  }
  const result = await users.json();
  console.log('Search users response status:', result);
  if (result.success) {
    return { users: result.data, success: true };
  } else {
    console.error('Search users error:', result.message);
    return { users: [], success: false, message: result.message || 'Failed to search users' };
  }
}
