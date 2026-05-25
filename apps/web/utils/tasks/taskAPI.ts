import { apiClient } from '@/lib/apiClient';
import {
  CreateDraftTaskResponse,
  DeleteTaskResponse,
  GetTaskByIdResponse,
  SearchTasksResponse,
  UpdateTaskResponse,
} from '@/types/tasks/api-response';
import { CreatorType, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';

export interface CreateDraftTaskParams {
  creatorType: CreatorType;
}

export interface UpdateTaskParams {
  id: string;
  title?: string;
  description?: string;
  statusName: TaskStatusEnum;
  priorityName: TaskPriorityEnum;
  taskCategoryName: string;
  assignedToId?: string;
  assignedToClientId?: string;
  skills?: string[];
  timeForTask?: string;
  overTime?: string;
  dueDate?: Date | null;
  initialComment?: string;
  customPrefix?: string;
}

class TaskAPI {
  async createDraftTask(params: CreateDraftTaskParams): Promise<Partial<CreateDraftTaskResponse>> {
    return apiClient.post<Partial<CreateDraftTaskResponse>>('/tasks/draft', params);
  }

  async updateTask(params: UpdateTaskParams): Promise<UpdateTaskResponse> {
    const { id, ...updateData } = params;
    return apiClient.put<UpdateTaskResponse>(`/tasks/${id}`, updateData);
  }

  async deleteTask(taskId: string): Promise<DeleteTaskResponse> {
    return apiClient.delete<DeleteTaskResponse>(`/tasks/${taskId}`);
  }

  async searchTasks(searchTerm: string): Promise<SearchTasksResponse> {
    return apiClient.get<SearchTasksResponse>('/tasks/search', {
      params: { search: searchTerm },
    });
  }

  async getTaskById(taskId: string): Promise<GetTaskByIdResponse> {
    return apiClient.get<GetTaskByIdResponse>(`/tasks/${taskId}`);
  }
}

export const taskAPI = new TaskAPI();
