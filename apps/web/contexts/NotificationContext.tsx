import React, { createContext, useContext, useEffect, useState } from 'react';
import { NotificationResponse } from '@wnp/types';
import { fetchNotifications } from '@/db/repositories/notifications/getNotifications';
import { markAsReadNotification } from '@/db/repositories/notifications/markAsReadById';
import { NotificationStatus } from '@prisma/client';

interface NotificationContextType {
  notifications: NotificationResponse[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markingRead: string[];
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  userId: string;
  role: string;
}

export const NotificationProvider = ({ children, userId, role }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [markingRead, setMarkingRead] = useState<string[]>([]);

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(n => n.status === NotificationStatus.UNREAD).length;
    setUnreadCount(count);
  }, [notifications]);

  const markAsRead = async (id: string) => {
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
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark as read'));
    } finally {
      setMarkingRead(prev => prev.filter(item => item !== id));
    }
  };

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

    if (userId && role) {
      loadInitialNotifications();
    }
  }, [userId, role]);

  useEffect(() => {
    if (!userId) return;

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

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markingRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
