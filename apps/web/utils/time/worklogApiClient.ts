/**
 * WorkLog API Client
 * Uses /api/proxy pattern for consistency with other API clients
 */

interface CreateWorkLogRequest {
  timeSpent: string; // e.g., "2h 30m"
  timeRemaining?: string;
  startedAt: string; // ISO string
  description?: string;
}

interface UpdateWorkLogRequest {
  timeSpent?: string;
  timeRemaining?: string;
  startedAt?: string;
  description?: string;
}

interface WorkLogAuthor {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  contactName?: string;
  avatarUrl?: string;
}

export interface WorkLog {
  id: string;
  taskId: string;
  authorType: 'USER' | 'CLIENT';
  timeSpent: number; // in minutes
  timeRemaining: number | null;
  startedAt: string;
  description?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  authorUser?: WorkLogAuthor | null;
  authorClient?: WorkLogAuthor | null;
}

class WorkLogApiClient {
  private baseUrl: string;
  private getAuthHeaders: () => Record<string, string>;

  constructor() {
    this.baseUrl = '/api/proxy';
    this.getAuthHeaders = () => ({
      'Content-Type': 'application/json',
    });
  }

  /**
   * Create a new work log entry
   */
  async createWorkLog(taskId: string, data: CreateWorkLogRequest) {
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}/worklogs`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Failed to create work log');
    }

    return response.json();
  }

  /**
   * Get work logs for a task
   */
  async getWorkLogs(taskId: string, cursor?: string, pageSize = 20) {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('pageSize', String(pageSize));

    const response = await fetch(`${this.baseUrl}/tasks/${taskId}/worklogs?${params.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Failed to fetch work logs');
    }

    return response.json();
  }

  /**
   * Get a single work log by ID
   */
  async getWorkLogById(workLogId: string) {
    const response = await fetch(`${this.baseUrl}/worklogs/${workLogId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Failed to fetch work log');
    }

    return response.json();
  }

  /**
   * Update a work log entry
   */
  async updateWorkLog(workLogId: string, data: UpdateWorkLogRequest) {
    const response = await fetch(`${this.baseUrl}/worklogs/${workLogId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Failed to update work log');
    }

    return response.json();
  }

  /**
   * Delete a work log entry (soft delete)
   */
  async deleteWorkLog(workLogId: string) {
    const response = await fetch(`${this.baseUrl}/worklogs/${workLogId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Failed to delete work log');
    }

    return response.json();
  }
}

export const workLogApiClient = new WorkLogApiClient();
