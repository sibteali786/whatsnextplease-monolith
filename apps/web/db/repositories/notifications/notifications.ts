'use server';
import { COOKIE_NAME } from '@/utils/constant';
import { CreateNotificationDto } from '@wnp/types';
import { cookies } from 'next/headers';

export const createNotification = async (params: CreateNotificationDto): Promise<void> => {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    await fetch(`${process.env.API_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error('Notification creation failed:', error);
    throw error;
  }
};
