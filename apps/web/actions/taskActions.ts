import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/utils/constant';
import { TaskStatusEnum, TaskPriorityEnum } from '@prisma/client';
import { DurationEnum } from '@/types';
import { USER_CREATED_TASKS_CONTEXT } from '@/utils/commonUtils/taskPermissions';

// interface TaskQueryParams {
//   userId?: string;
//   cursor?: string;
//   pageSize?: number;
//   search?: string;
//   duration?: DurationEnum;
//   status?: TaskStatusEnum;
//   priority?: TaskPriorityEnum;
//   assignedToId?: string | null;
//   categoryId?: string;
//   context?: USER_CREATED_TASKS_CONTEXT;
// }

class TaskApiServerClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  }

  private getAuthHeaders() {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

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
    }
  ) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    const response = await fetch(`${this.baseUrl}/tasks?${searchParams.toString()}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks by user ID: ${response.statusText}`);
    }

    return response.json();
  }

  // Add other methods as needed...
}

export const taskApiServer = new TaskApiServerClient();
