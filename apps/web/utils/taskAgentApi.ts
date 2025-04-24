'use client';

import { COOKIE_NAME } from '@/utils/constant';
import { getCookie } from '@/utils/utils';

// Update interface to match actual API response
export interface TaskAgent {
  id: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  assignedTasksCount: number;
  inProgressTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
}

export async function getTaskAgentIds() {
  try {
    const token = getCookie(COOKIE_NAME);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/taskAgents/ids`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch task agent IDs');
    }

    const data = await response.json();
    return data.taskAgentIds || [];
  } catch (error) {
    console.error('Error fetching task agent IDs:', error);
    return [];
  }
}

export async function getTaskAgents(
  cursor: string | null,
  pageSize: number,
  status: string = 'all',
  searchTerm: string = ''
) {
  try {
    const token = getCookie(COOKIE_NAME);

    // Build query string
    const queryParams = new URLSearchParams();
    if (cursor) queryParams.append('cursor', cursor);
    if (pageSize) queryParams.append('pageSize', pageSize.toString());
    // Use status instead of filter as per backend API
    if (status && status !== 'all') queryParams.append('status', status);
    // Add search parameter if provided
    if (searchTerm) queryParams.append('search', searchTerm);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/taskAgents?${queryParams.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch task agents');
    }

    const data = await response.json();
    return {
      taskAgents: data.taskAgents as TaskAgent[],
      nextCursor: data.nextCursor,
      totalCount: data.totalCount,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching task agents:', error);
    return {
      taskAgents: [],
      totalCount: 0,
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getTaskAgentById(id: string) {
  try {
    const token = getCookie(COOKIE_NAME);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/taskAgents/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch task agent details');
    }

    const data = await response.json();
    console.log('Task Agent Data:', data);
    return {
      taskAgent: data as TaskAgent,
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
