// utils/taskInlineUpdate.ts
import { getCookie } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';

interface UpdateTaskFieldRequest {
  taskId: string;
  field: 'status' | 'priority' | 'taskCategory';
  value: string;
}

export const updateTaskField = async (request: UpdateTaskFieldRequest) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tasks/${request.taskId}/field`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          field: request.field,
          value: request.value,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update task');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error updating task field:', error);
    throw error;
  }
};
