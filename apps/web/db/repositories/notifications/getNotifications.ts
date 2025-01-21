'use server';
import { COOKIE_NAME } from '@/utils/constant';
import { NotificationListResponse } from '@wnp/types';
import { cookies } from 'next/headers';

export const fetchNotifications = async (userId: string, role: string) => {
  console.log('response', userId, role);
  const token = cookies().get(COOKIE_NAME)?.value;
  const response = await fetch(`${process.env.API_URL}/notifications/${userId}?role=${role}`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }

  return response.json() as Promise<NotificationListResponse>;
};
