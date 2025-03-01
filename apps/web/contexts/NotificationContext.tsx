import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { NotificationResponse } from '@wnp/types';
import { fetchNotifications } from '@/db/repositories/notifications/getNotifications';
import { markAsReadNotification } from '@/db/repositories/notifications/markAsReadById';
import { NotificationStatus } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { markAllAsReadNotifications } from '@/db/repositories/notifications/markAllRead';
import { COOKIE_NAME } from '@/utils/constant';

interface NotificationContextType {
  notifications: NotificationResponse[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markingRead: string[];
  markAllAsRead: () => Promise<void>;
  isConnected: boolean;
  reconnectIn: number;
  manualReconnect: () => void;
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
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [reconnectIn, setReconnectIn] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  // eslint-disable-next-line no-undef
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

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

  // Load initial notifications
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

  // Setup SSE connection with reconnection logic
  const createEventSource = useCallback(() => {
    if (!userId) return;
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };

    const token = getCookie(COOKIE_NAME);
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const eventSource = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/subscribe/${userId}?token=${token}`
      );

      eventSourceRef.current = eventSource;
      console.log(`Initial EventSource readyState: ${eventSource.readyState}`, eventSource);
      if (eventSource.readyState === EventSource.OPEN) {
        console.log('EventSource already open on creation');
        setIsConnected(true);
        setRetryCount(0);
        setReconnectIn(0);
      }
      eventSource.onopen = () => {
        console.log(`EventSource onopen fired, readyState: ${eventSource.readyState}`);
        setIsConnected(true);
        setRetryCount(0);
        setReconnectIn(0);

        if (retryCount > 0) {
          toast({
            title: 'Connected',
            description: 'Notification service reconnected successfully',
            variant: 'success',
          });
        }
      };

      eventSource.onmessage = event => {
        try {
          const notification = JSON.parse(event.data);
          setNotifications(prev => [notification, ...prev]);
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        setIsConnected(false);

        // Calculate backoff delay with jitter
        const maxRetryDelay = 30000; // 30 seconds
        const baseDelay = 1000; // 1 second
        let delay = Math.min(baseDelay * Math.pow(1.5, retryCount), maxRetryDelay);
        // Add jitter (±20%) to prevent all clients from reconnecting simultaneously
        delay = delay * (0.8 + Math.random() * 0.4);

        console.log(`SSE connection lost. Reconnecting in ${delay / 1000} seconds...`);

        if (retryCount > 2) {
          // Show toast after a few attempts
          toast({
            title: 'Connection Lost',
            description: `Reconnecting to notification service...`,
            variant: 'default',
          });
        }

        // Countdown timer for UI
        const startTime = Date.now();
        const countdownInterval = setInterval(() => {
          const remaining = Math.max(0, delay - (Date.now() - startTime));
          setReconnectIn(remaining);

          if (remaining <= 0) {
            clearInterval(countdownInterval);
          }
        }, 1000);

        // Schedule reconnection
        reconnectTimeoutRef.current = setTimeout(() => {
          clearInterval(countdownInterval);
          setRetryCount(prev => prev + 1);
          createEventSource(); // Try to reconnect
        }, delay);
      };
    } catch (err) {
      console.error('Error creating EventSource:', err);
    }
  }, [userId, retryCount, toast]);

  // Initialize SSE connection
  useEffect(() => {
    if (userId) {
      createEventSource();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId, createEventSource]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    setRetryCount(0);
    createEventSource();
  }, [createEventSource]);

  const markAllAsRead = async () => {
    try {
      await markAllAsReadNotifications(userId, role);
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          status: NotificationStatus.READ,
        }))
      );
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark all as read',
      });
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markingRead,
        markAllAsRead,
        isConnected,
        reconnectIn,
        manualReconnect,
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
