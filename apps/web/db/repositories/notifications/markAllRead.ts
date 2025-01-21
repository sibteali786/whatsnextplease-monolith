'use server';
import { COOKIE_NAME } from '@/utils/constant';
import { NotificationMarkAllAsReadResponse } from '@wnp/types';
import { cookies } from 'next/headers';

export async function markAllAsReadNotifications(userId: string, role: string) {
  const token = cookies().get(COOKIE_NAME)?.value;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/notifications/${userId}/readAll?role=${role}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }

  return response.json() as Promise<NotificationMarkAllAsReadResponse>;
}
