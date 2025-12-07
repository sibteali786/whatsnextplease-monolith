import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

class TaskLinkAPI {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
    };
  }

  /**
   * Get all links for a task
   */
  async getTaskLinks(taskId: string) {
    const response = await fetch(`${API_BASE}/taskLinks/${taskId}/links`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch task links' }));
      throw new Error(error.message || 'Failed to fetch task links');
    }

    return response.json();
  }

  /**
   * Create a new task link
   */
  async createTaskLink(taskId: string, url: string) {
    const response = await fetch(`${API_BASE}/taskLinks/${taskId}/links`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create task link' }));
      throw new Error(error.message || 'Failed to create task link');
    }

    return response.json();
  }

  /**
   * Delete a task link
   */
  async deleteTaskLink(taskId: string, linkId: string) {
    const response = await fetch(`${API_BASE}/taskLinks/${taskId}/links/${linkId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to delete task link' }));
      throw new Error(error.message || 'Failed to delete task link');
    }

    return response.json();
  }
}

export const taskLinkAPI = new TaskLinkAPI();
