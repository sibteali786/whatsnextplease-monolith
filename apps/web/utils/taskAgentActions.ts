'use server';

import { COOKIE_NAME } from '@/utils/constant';
import { cookies } from 'next/headers';

export async function getTaskAgentStatsById(id: string) {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;

    if (!token) {
      return {
        success: false,
        message: 'Authentication token not found',
        taskAgent: null,
      };
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/taskAgents/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to fetch task agent details',
        taskAgent: null,
      };
    }

    const data = await response.json();

    return {
      taskAgent: data,
      success: true,
    };
  } catch (error) {
    console.error(`Error fetching task agent with ID ${id}:`, error);
    return {
      taskAgent: null,
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
