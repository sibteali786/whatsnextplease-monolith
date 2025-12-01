import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import { CreatorType, TaskPriorityEnum, TaskStatusEnum } from '@prisma/client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

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
}

class TaskAPI {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
    };
  }

  async createDraftTask(params: CreateDraftTaskParams) {
    const response = await fetch(`${API_BASE}/tasks/draft`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create draft task');
    }

    return response.json();
  }

  async updateTask(params: UpdateTaskParams) {
    const { id, ...updateData } = params;

    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update task');
    }

    return response.json();
  }

  async deleteTask(taskId: string) {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete task');
    }

    return response.json();
  }

  async searchTasks(searchTerm: string) {
    const response = await fetch(
      `${API_BASE}/tasks/search?search=${encodeURIComponent(searchTerm)}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search tasks');
    }

    return response.json();
  }

  async getTaskById(taskId: string) {
    const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch task');
    }

    return response.json();
  }
}

export const taskAPI = new TaskAPI();
