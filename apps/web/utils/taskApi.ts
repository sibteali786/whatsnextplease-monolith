/* eslint-disable @typescript-eslint/no-explicit-any */
import { TaskStatusEnum, TaskPriorityEnum, Roles } from '@prisma/client';
import { DurationEnum } from '@/types';
import { USER_CREATED_TASKS_CONTEXT } from './commonUtils/taskPermissions';
import { TasksByStatusFilters } from './tasks/useTasksByStatus';
import { apiClient } from '@/lib/apiClient';
import {
  GetTasksResponse,
  GetTaskIdsResponse,
  GetTaskStatisticsResponse,
  GetTaskCountsResponse,
  GetTaskMetadataResponse,
  BatchUpdateTasksResponse,
  BatchDeleteTasksResponse,
  GetTaskByIdResponse,
  GetTasksByStatusResponse,
} from '@/types/tasks/api-response';

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
  status?: TaskStatusEnum | TaskStatusEnum[];
  priority?: TaskPriorityEnum | TaskPriorityEnum[];
  assignedToId?: string | null;
  categoryId?: string;
  clientId?: string;
  sortBy?: string;
  context?: USER_CREATED_TASKS_CONTEXT;
  role?: Roles;
}

class TaskApiClient {
  /**
   * Get tasks with filtering and pagination
   */
  async getTasks(params: TaskQueryParams = {}): Promise<GetTasksResponse> {
    const queryParams: Record<string, string> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = String(value);
      }
    });

    return apiClient.get<GetTasksResponse>('/tasks', { params: queryParams });
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: string): Promise<GetTaskByIdResponse> {
    return apiClient.get<GetTaskByIdResponse>(`/tasks/${taskId}`);
  }

  /**
   * Get task IDs for pagination
   */
  async getTaskIds(params: TaskQueryParams = {}): Promise<GetTaskIdsResponse> {
    const queryParams: Record<string, string> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams[key] = String(value);
      }
    });

    return apiClient.get<GetTaskIdsResponse>('/tasks/ids', { params: queryParams });
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(userId?: string): Promise<GetTaskStatisticsResponse> {
    const params = userId ? { userId } : undefined;
    return apiClient.get<GetTaskStatisticsResponse>('/tasks/statistics', { params });
  }

  /**
   * Get unassigned tasks
   */
  async getUnassignedTasks(cursor?: string, pageSize = 10): Promise<GetTasksResponse> {
    const params: Record<string, string> = {
      pageSize: String(pageSize),
    };

    if (cursor) {
      params.cursor = cursor;
    }

    return apiClient.get<GetTasksResponse>('/tasks/unassigned', { params });
  }

  /**
   * Get task counts by status (legacy endpoint)
   */
  async getTasksCount(userId?: string, query?: string): Promise<GetTaskCountsResponse> {
    const params: Record<string, string> = {};

    if (userId) {
      params.userId = userId;
    }
    if (query === 'taskAssignmentStatus') {
      params.taskAssignmentStatus = query;
    }

    return apiClient.get<GetTaskCountsResponse>('/tasks/counts', { params });
  }

  /**
   * Batch update tasks
   */
  async batchUpdateTasks(request: BatchUpdateRequest): Promise<BatchUpdateTasksResponse> {
    return apiClient.patch<BatchUpdateTasksResponse>('/tasks/batch/update', request);
  }

  /**
   * Batch delete tasks
   */
  async batchDeleteTasks(request: BatchDeleteRequest): Promise<BatchDeleteTasksResponse> {
    return apiClient.delete<BatchDeleteTasksResponse>('/tasks/batch/delete', request);
  }

  /**
   * Get all available task statuses and priorities for dropdowns
   */
  async getTaskMetadata(): Promise<GetTaskMetadataResponse> {
    return apiClient.get<GetTaskMetadataResponse>('/tasks/metadata');
  }

  /**
   * Get tasks by priority level (critical, high, medium, low, hold)
   */
  async getTasksByPriorityLevel(
    level: TaskPriorityEnum,
    params?: {
      cursor?: string;
      pageSize?: number;
      search?: string;
      duration?: string;
      status?: TaskStatusEnum;
      assignedToId?: string;
      categoryId?: string;
      userId?: string;
    }
  ): Promise<GetTasksResponse> {
    const queryParams: Record<string, string> = {};

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams[key] = String(value);
        }
      });
    }

    return apiClient.get<GetTasksResponse>(`/tasks/priority/${level}`, { params: queryParams });
  }

  /**
   * Get tasks by statuses (multiple statuses)
   */
  async getTasksByStatus(
    statuses: TaskStatusEnum[],
    filters?: TasksByStatusFilters,
    taskOffering?: boolean,
    taskOfferingFilters?: {
      normalizedPriority?: TaskPriorityEnum | TaskPriorityEnum[];
      assignedToFilter?: string;
      taskType?: string;
      searchTerm?: string;
      duration?: DurationEnum;
      page?: number;
      pageSize?: number;
      cursors?: Partial<Record<TaskStatusEnum, string | undefined>>;
    }
  ): Promise<GetTasksByStatusResponse> {
    const payload: any = {
      statuses: statuses.join(','),
      taskOffering,
      taskOfferingFilters,
      ...filters,
    };

    return apiClient.post<GetTasksByStatusResponse>('/tasks/by-status', payload);
  }

  /**
   * Update task status with workflow validation
   */
  async updateTaskStatusWithValidation(
    taskId: string,
    status: TaskStatusEnum
  ): Promise<GetTaskByIdResponse> {
    return apiClient.patch<GetTaskByIdResponse>(`/tasks/${taskId}/status-transition`, { status });
  }

  /**
   * Enhanced updateTaskField method
   */
  async updateTaskField(
    taskId: string,
    field: 'status' | 'priority' | 'taskCategory',
    value: string
  ): Promise<GetTaskByIdResponse> {
    return apiClient.patch<GetTaskByIdResponse>(`/tasks/${taskId}/field`, { field, value });
  }

  /**
   * GET: Tasks by User ID with enhanced filtering
   */
  async getTasksByUserId(
    userId: string,
    params: {
      cursor?: string;
      pageSize?: number;
      search?: string;
      duration?: DurationEnum;
      status?: TaskStatusEnum[];
      priority?: TaskPriorityEnum[];
      context: USER_CREATED_TASKS_CONTEXT;
      assignedToId?: string;
      role?: Roles;
    }
  ): Promise<GetTasksResponse> {
    return this.getTasks({
      userId,
      cursor: params.cursor,
      pageSize: params.pageSize,
      search: params.search,
      duration: params.duration,
      status: params.status,
      priority: params.priority,
      context: params.context,
      assignedToId: params.assignedToId,
      role: params.role,
    });
  }

  /**
   * Advanced filter search
   */
  async advancedSearch(query: {
    conditions: Array<{
      field: string;
      operator: string;
      value?: any;
    }>;
    logicalOperator: 'AND' | 'OR';
    cursor?: string;
    pageSize?: number;
    orderBy?: {
      field: string;
      direction: 'asc' | 'desc';
    };
    view?: 'list' | 'timeline' | 'kanban';
    status?: TaskStatusEnum;
  }): Promise<GetTasksResponse> {
    return apiClient.post<GetTasksResponse>('/tasks/advanced-search', query);
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
): Promise<GetTasksResponse> => {
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
  role: any,
  context: USER_CREATED_TASKS_CONTEXT = USER_CREATED_TASKS_CONTEXT.GENERAL
): Promise<GetTaskIdsResponse> => {
  return taskApiClient.getTaskIds({
    userId,
    search: searchTerm,
    duration,
    context,
  });
};

// Updated batch operation functions
export const batchUpdateTasks = async (
  updates: BatchUpdateRequest
): Promise<BatchUpdateTasksResponse> => {
  return taskApiClient.batchUpdateTasks(updates);
};

export const batchDeleteTasks = async (taskIds: string[]): Promise<BatchDeleteTasksResponse> => {
  return taskApiClient.batchDeleteTasks({ taskIds });
};

// Export types for use in components
export type { BatchUpdateRequest, BatchDeleteRequest, TaskQueryParams };
