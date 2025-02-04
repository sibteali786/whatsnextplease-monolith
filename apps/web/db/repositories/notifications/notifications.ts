'use server';
import { COOKIE_NAME } from '@/utils/constant';
import { CreateNotificationDto, ErrorResponse, NotificationResponse } from '@wnp/types';
import { cookies } from 'next/headers';

export const createNotification = async (
  params: CreateNotificationDto
): Promise<NotificationResponse | ErrorResponse> => {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    const response = await fetch(`${process.env.API_URL}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    console.log(response);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create notification');
    }

    return data;
  } catch (error) {
    console.error('Notification creation failed:', error);
    throw error;
  }
};
