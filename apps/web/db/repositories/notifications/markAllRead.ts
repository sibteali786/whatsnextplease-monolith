import { NotificationMarkAllAsReadResponse } from '@wnp/types';

export async function markAllAsReadNotifications(userId: string, role: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/notifications/${userId}/readAll?role=${role}`,
    {
      method: 'PATCH',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }

  return response.json() as Promise<NotificationMarkAllAsReadResponse>;
}