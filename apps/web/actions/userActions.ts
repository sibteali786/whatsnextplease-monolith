'use server';
import { COOKIE_NAME } from '@/utils/constant';
import { cookies } from 'next/headers';

export async function searchUsersAction(
  query: string,
  taskId?: string // Add optional taskId
): Promise<{ users: any[]; success: boolean; message?: string }> {
  const token = cookies().get(COOKIE_NAME)?.value;

  // Build query parameters
  const params = new URLSearchParams({ q: query });
  if (taskId) params.append('taskId', taskId);

  const users = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!users.ok) {
    console.error('Failed to search users:', users.statusText);
    return { users: [], success: false, message: 'Failed to search users' };
  }

  const result = await users.json();

  if (result.success) {
    return { users: result.data, success: true };
  } else {
    console.error('Search users error:', result.message);
    return { users: [], success: false, message: result.message || 'Failed to search users' };
  }
}
