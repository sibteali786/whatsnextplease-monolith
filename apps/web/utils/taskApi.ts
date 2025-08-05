// utils/taskApi.ts
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import { TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';
import { DurationEnum } from '@/types';
interface BatchUpdateRequest {
  taskIds: string[];
  updates: {
    status?: TaskStatusEnum;
    priority?: TaskPriorityEnum;
    assignedToId?: string | null;
    categoryId?: string;
    dueDate?: Date | null;
    skillIds?: string[];
  };
}

interface BatchDeleteRequest {
  taskIds: string[];
}

interface TaskQueryParams {
  userId?: string;
  cursor?: string;
  pageSize?: number;
  search?: string;
  duration?: DurationEnum;
  status?: TaskStatusEnum;
  priority?: TaskPriorityEnum;
  assignedToId?: string | null;
  categoryId?: string;
}

class TaskApiClient {
  private baseUrl: string;
  private getAuthHeaders: () => Record<string, string>;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.getAuthHeaders = () => ({
      Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
      'Content-Type': 'application/json',
    });
  }

  /**
   * Get tasks with filtering and pagination
   */
  async getTasks(params: TaskQueryParams = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(`${this.baseUrl}/tasks?${searchParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string) {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch task: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get task IDs for pagination
   */
  async getTaskIds(params: TaskQueryParams = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(`${this.baseUrl}/tasks/ids?${searchParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch task IDs: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(userId?: string) {
    const searchParams = new URLSearchParams();
    if (userId) {
      searchParams.append('userId', userId);
    }

    const response = await fetch(`${this.baseUrl}/tasks/statistics?${searchParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch task statistics: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get unassigned tasks
   */
  async getUnassignedTasks(cursor?: string, pageSize = 10) {
    const searchParams = new URLSearchParams();
    if (cursor) searchParams.append('cursor', cursor);
    searchParams.append('pageSize', String(pageSize));

    const response = await fetch(`${this.baseUrl}/tasks/unassigned?${searchParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch unassigned tasks: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get task counts by status (legacy endpoint)
   */
  async getTasksCount(userId?: string) {
    const searchParams = new URLSearchParams();
    if (userId) {
      searchParams.append('userId', userId);
    }

    const response = await fetch(`${this.baseUrl}/tasks/counts?${searchParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch task counts: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Batch update tasks
   */
  async batchUpdateTasks(request: BatchUpdateRequest) {
    const response = await fetch(`${this.baseUrl}/tasks/batch/update`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update tasks: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Batch delete tasks
   */
  async batchDeleteTasks(request: BatchDeleteRequest) {
    const response = await fetch(`${this.baseUrl}/tasks/batch/delete`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete tasks: ${response.statusText}`);
    }

    return response.json();
  }
}

// Create singleton instance
export const taskApiClient = new TaskApiClient();

// Convenience functions for backward compatibility
export const getTasksByUserId = async (
  userId: string,
  role: any,
  cursor: string | null,
  pageSize = 10,
  searchTerm = '',
  duration: DurationEnum = DurationEnum.ALL,
  context?: any
) => {
  return taskApiClient.getTasks({
    userId,
    cursor: cursor || undefined,
    pageSize,
    search: searchTerm,
    duration,
  });
};

export const getTaskIdsByUserId = async (
  userId: string,
  searchTerm: string,
  duration: DurationEnum = DurationEnum.ALL,
  role: any
) => {
  const result = await taskApiClient.getTaskIds({
    userId,
    search: searchTerm,
    duration,
  });

  return {
    success: result.success,
    taskIds: result.taskIds,
    message: result.message,
  };
};

// Updated batch operation functions
export const batchUpdateTasks = async (updates: BatchUpdateRequest) => {
  return taskApiClient.batchUpdateTasks(updates);
};

export const batchDeleteTasks = async (taskIds: string[]) => {
  return taskApiClient.batchDeleteTasks({ taskIds });
};

// Export types for use in components
export type { BatchUpdateRequest, BatchDeleteRequest, TaskQueryParams };
