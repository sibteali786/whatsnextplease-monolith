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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 10; // Maximum retry attempts

  const { toast } = useToast();

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(n => n.status === NotificationStatus.UNREAD).length;
    console.log('Unread count calculation:', {
      totalNotifications: notifications.length,
      unreadNotifications: notifications.filter(n => n.status === NotificationStatus.UNREAD),
      newUnreadCount: count,
      previousUnreadCount: unreadCount,
    });
    setUnreadCount(count);
  }, [notifications, unreadCount]);

  const getCookie = useCallback((name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
  }, []);

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

  // Clean up function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('Closing existing EventSource connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (countdownIntervalRef.current) {
      clearTimeout(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Load initial notifications
  useEffect(() => {
    const loadInitialNotifications = async () => {
      try {
        console.log(`Fetching notifications for: ${userId} ${role}`);
        const response = await fetchNotifications(userId, role);
        setNotifications(response.notifications);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch initial notifications:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
      } finally {
        setIsLoading(false);
      }
    };

    if (userId && role) {
      loadInitialNotifications();
    }
  }, [userId, role]);

  // Setup SSE connection with improved error handling
  const createEventSource = useCallback(() => {
    if (!userId) {
      console.warn('Cannot create EventSource: userId is missing');
      return;
    }

    // Don't retry if max retries exceeded
    if (retryCount >= maxRetries) {
      console.warn('Max retry attempts reached. Stopping reconnection attempts.');
      toast({
        title: 'Connection Failed',
        description: 'Unable to connect to notification service. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    const token = getCookie(COOKIE_NAME);
    if (!token) {
      console.error('No authentication token found');
      setError(new Error('Authentication token not found'));
      return;
    }

    // Clean up any existing connections
    cleanup();

    try {
      const sseUrl = `${process.env.NEXT_PUBLIC_API_URL}/notifications/subscribe/${userId}?token=${token}`;
      console.log('Creating new EventSource connection to:', sseUrl);

      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      console.log(`Initial EventSource readyState: ${eventSource.readyState}`);

      eventSource.onopen = event => {
        console.log('EventSource connection opened:', event);
        console.log(`EventSource onopen fired, readyState: ${eventSource.readyState}`);

        setIsConnected(true);
        setRetryCount(0); // Reset retry count on successful connection
        setReconnectIn(0);
        setError(null);

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
          console.log('SSE message received:', event.data);
          const data = JSON.parse(event.data);

          // Handle different message types
          if (data.type === 'ping' || data.type === 'connected') {
            console.log('Received ping/connection message:', data);
            return;
          }

          // Handle actual notifications - ensure it matches your notification structure
          if (data.type && data.message) {
            console.log('Adding new notification:', data);

            // Create notification object matching your NotificationResponse interface
            const newNotification: NotificationResponse = {
              id: data.id || `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: data.type,
              message: data.message,
              status: NotificationStatus.UNREAD, // Ensure new notifications are UNREAD
              data: data.data || null,
              userId: data.userId || userId,
              clientId: data.clientId || null,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            };

            console.log('Created notification object:', newNotification);
            console.log('Previous notifications count:', notifications.length);

            setNotifications(prev => {
              const updated = [newNotification, ...prev];
              console.log('Updated notifications count:', updated.length);
              console.log(
                'New unread count should be:',
                updated.filter(n => n.status === NotificationStatus.UNREAD).length
              );
              return updated;
            });

            // Show toast for new notifications
            toast({
              title: 'New Notification',
              description: data.message,
              variant: 'default',
            });
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err, 'Raw data:', event.data);
        }
      };

      eventSource.onerror = error => {
        console.error('EventSource error occurred:', error);
        console.log(`EventSource readyState on error: ${eventSource.readyState}`);

        setIsConnected(false);

        // Only attempt reconnection if connection was lost (not if it never connected)
        if (eventSource.readyState === EventSource.CLOSED && retryCount < maxRetries) {
          console.log('EventSource closed, attempting reconnection...');

          // Calculate exponential backoff with jitter
          const baseDelay = 1000; // 1 second
          const maxDelay = 30000; // 30 seconds
          let delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);

          // Add jitter (±25%) to prevent thundering herd
          const jitter = delay * 0.25 * (Math.random() - 0.5);
          delay = Math.max(1000, delay + jitter);

          console.log(
            `SSE connection lost. Reconnecting in ${(delay / 1000).toFixed(1)} seconds... (attempt ${retryCount + 1}/${maxRetries})`
          );

          // Show toast after a few failed attempts
          if (retryCount >= 2) {
            toast({
              title: 'Connection Lost',
              description: `Attempting to reconnect... (${retryCount + 1}/${maxRetries})`,
              variant: 'default',
            });
          }

          // Start countdown for UI
          let remainingTime = delay;
          setReconnectIn(remainingTime);

          const updateCountdown = () => {
            remainingTime -= 1000;
            setReconnectIn(Math.max(0, remainingTime));

            if (remainingTime > 0) {
              countdownIntervalRef.current = setTimeout(updateCountdown, 1000);
            }
          };

          countdownIntervalRef.current = setTimeout(updateCountdown, 1000);

          // Schedule reconnection
          reconnectTimeoutRef.current = setTimeout(() => {
            if (countdownIntervalRef.current) {
              clearTimeout(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }

            setRetryCount(prev => {
              const newCount = prev + 1;
              console.log(`Incrementing retry count from ${prev} to ${newCount}`);
              return newCount;
            });
          }, delay);
        } else {
          console.log(
            'Not attempting reconnection - max retries reached or connection never established'
          );
        }
      };

      // Handle page visibility changes to reconnect when page becomes visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !isConnected && retryCount < maxRetries) {
          console.log('Page became visible, attempting to reconnect...');
          setRetryCount(0); // Reset retry count on manual reconnect
          createEventSource();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Cleanup function for this specific EventSource
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        cleanup();
      };
    } catch (err) {
      console.error('Error creating EventSource:', err);
      setError(err instanceof Error ? err : new Error('Failed to create SSE connection'));
      setIsConnected(false);
    }
  }, [userId, retryCount, toast, getCookie, cleanup, maxRetries]); // Removed isConnected and notifications from dependencies

  // Initialize SSE connection
  useEffect(() => {
    if (userId) {
      const cleanupFn = createEventSource();
      return cleanupFn;
    }

    return cleanup;
  }, [userId, createEventSource, cleanup]);

  // Handle retry logic separately to avoid infinite loops
  useEffect(() => {
    if (retryCount > 0 && retryCount < maxRetries) {
      console.log(`Retry effect triggered with count: ${retryCount}`);
      // The actual retry is handled in the setTimeout in onError
      // This effect is just for logging/debugging
    }
  }, [retryCount, maxRetries]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    console.log('Manual reconnect triggered');
    setRetryCount(0);
    setReconnectIn(0);
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
        variant: 'success',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark all as read',
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

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
