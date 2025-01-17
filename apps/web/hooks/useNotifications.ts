import { useState, useEffect, useCallback } from 'react';
import { NotificationResponse } from '@wnp/types';
import { fetchNotifications } from '@/db/repositories/notifications/getNotifications';
import { markAsReadNotification } from '@/db/repositories/notifications/markAsReadById';
import { NotificationStatus } from '@prisma/client';

interface UseNotificationsProps {
  userId: string;
  role: string;
}

export const useNotifications = ({ userId, role }: UseNotificationsProps) => {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [markingRead, setMarkingRead] = useState<string[]>([]);

  // Update unread count whenever notifications change
  const updateUnreadCount = useCallback(() => {
    const count = notifications.filter(n => n.status === NotificationStatus.UNREAD).length;
    setUnreadCount(count);
  }, [notifications]);

  // Call updateUnreadCount whenever notifications change
  useEffect(() => {
    updateUnreadCount();
  }, [notifications, updateUnreadCount]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        setMarkingRead(prev => [...prev, id]);
        await markAsReadNotification(id);

        setNotifications(prev =>
          prev.map(notification =>
            notification.id === id
              ? { ...notification, status: NotificationStatus.READ }
              : notification
          )
        );

        // Explicitly update unread count after marking as read
        updateUnreadCount();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to mark as read'));
      } finally {
        setMarkingRead(prev => prev.filter(item => item !== id));
      }
    },
    [updateUnreadCount]
  );

  useEffect(() => {
    const loadInitialNotifications = async () => {
      try {
        const response = await fetchNotifications(userId, role);
        setNotifications(response.notifications);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialNotifications();
  }, [userId, role]);

  useEffect(() => {
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/notifications/subscribe/${userId}`
    );

    eventSource.onmessage = event => {
      const notification = JSON.parse(event.data);
      setNotifications(prev => [notification, ...prev]);
    };

    eventSource.onerror = () => {
      setError(new Error('SSE connection error'));
      eventSource.close();
    };

    return () => eventSource.close();
  }, [userId]);

  return {
    notifications,
    isLoading,
    error,
    totalNotifications: notifications.length,
    unreadCount,
    markAsRead,
    markingRead,
  };
};
