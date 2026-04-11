import { apiClient } from '@/lib/apiClient';
import { StandardApiResponse } from '@/types/api';
import { CreateTaskLinkResponse, TaskLinksGetResponse } from '@/types/tasks/api-response';

class TaskLinkAPI {
  /**
   * Get all links for a task
   */
  async getTaskLinks(taskId: string) {
    const data = await apiClient.get<TaskLinksGetResponse>(`/taskLinks/${taskId}/links`);
    return data;
  }

  /**
   * Create a new task link
   */
  async createTaskLink(taskId: string, url: string) {
    const response = await apiClient.post<CreateTaskLinkResponse>(`/taskLinks/${taskId}/links`, {
      url,
    });
    if (!response.success) {
      const error = 'Failed to create task link';
      throw new Error(error);
    }

    return response;
  }

  /**
   * Delete a task link
   */
  async deleteTaskLink(taskId: string, linkId: string) {
    const response = await apiClient.delete<StandardApiResponse>(
      `/taskLinks/${taskId}/links/${linkId}`
    );
    if (!response.success) {
      const error = { message: 'Failed to delete task link' };
      throw new Error(error.message || 'Failed to delete task link');
    }

    return response;
  }
}

export const taskLinkAPI = new TaskLinkAPI();
