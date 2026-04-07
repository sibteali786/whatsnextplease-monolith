'use client';

import { apiClient } from '@/lib/apiClient';
import { TaskAgentIdsResponse, TaskAgentsResponse } from '@/types/tasks/api-response';

// Updated interface to match backend response
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
    const response = await apiClient.get<TaskAgentIdsResponse>('/taskAgents/ids');

    if (!response.success) {
      throw new Error('Failed to fetch task agent IDs');
    }
    // Fixed: backend returns 'ids', not 'taskAgentIds'
    return response.data || [];
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
    // Build query string
    const queryParams = new URLSearchParams();
    if (cursor) queryParams.append('cursor', cursor);
    if (pageSize) queryParams.append('pageSize', pageSize.toString());
    // Use status instead of filter as per backend API
    if (status && status !== 'all') queryParams.append('status', status);
    // Add search parameter if provided
    if (searchTerm) queryParams.append('search', searchTerm);

    const response = await apiClient.get<TaskAgentsResponse>('/taskAgents', {
      params: { cursor: cursor ?? undefined, pageSize, status, search: searchTerm },
    });
    console.log('API Response:', response);
    if (!response.success) {
      console.error('API Error Response:', response);
      throw new Error(`Failed to fetch task agents: ${response.message || 'Unknown error'}`);
    }
    return {
      taskAgents: response.data as TaskAgent[],
      nextCursor: response.nextCursor,
      totalCount: response.totalCount,
      hasMore: response.hasMore,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching task agents:', error);
    return {
      taskAgents: [],
      totalCount: 0,
      hasMore: false,
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
