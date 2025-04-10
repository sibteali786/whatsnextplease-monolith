'use server';
import { COOKIE_NAME } from '@/utils/constant';
import { NotificationListResponse } from '@wnp/types';
import { cookies } from 'next/headers';

export const fetchNotifications = async (userId: string, role: string) => {
  console.log('Fetching notifications for:', userId, role);
  const token = cookies().get(COOKIE_NAME)?.value;

  if (!token) {
    console.error('No auth token found');
    throw new Error('Authentication required');
  }

  const url = `${process.env.API_URL}/notifications/${userId}?role=${encodeURIComponent(role)}`;
  console.log('Fetching from URL:', url);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notification fetch error:', response.status, errorText);
      throw new Error(`Failed to fetch notifications: ${response.status}`);
    }

    return response.json() as Promise<NotificationListResponse>;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
