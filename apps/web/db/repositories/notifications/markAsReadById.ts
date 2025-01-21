'use server';
import { COOKIE_NAME } from '@/utils/constant';
import { NotificationMarkAsReadResponse } from '@wnp/types';
import { cookies } from 'next/headers';

export const markAsReadNotification = async (
  id: string
): Promise<NotificationMarkAsReadResponse> => {
  const token = cookies().get(COOKIE_NAME)?.value;
  const response = await fetch(`${process.env.API_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to mark notification as read');
  }

  return response.json();
};
