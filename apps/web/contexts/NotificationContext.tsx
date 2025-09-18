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
  sseConnected: boolean;
  pushEnabled: boolean;
  reconnectIn: number;
  isConnected: boolean; // Backward compatibility
  manualReconnect: () => void;
  refreshNotifications: () => Promise<void>;
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
  const [sseConnected, setSseConnected] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [reconnectIn, setReconnectIn] = useState(0);

  // SSE connection management
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;
  const isPageVisible = useRef(!document.hidden);

  const { toast } = useToast();

  // Update unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter(n => n.status === NotificationStatus.UNREAD).length;
    setUnreadCount(count);
  }, [notifications]);

  const getCookie = useCallback((name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
  }, []);

  // Refresh notifications from API
  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetchNotifications(userId, role);
      setNotifications(response.notifications);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
    }
  }, [userId, role]);

  // Clean up SSE connection
  const cleanupSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSseConnected(false);
    setReconnectIn(0);
  }, []);

  // Create SSE connection with simplified retry logic
  const createSSEConnection = useCallback(() => {
    if (!userId || !isPageVisible.current) {
      console.log('Skipping SSE connection - page not visible or no userId');
      return;
    }

    // Don't retry beyond max attempts
    if (retryCount.current >= maxRetries) {
      console.log('SSE max retries reached, relying on push notifications');
      return;
    }

    const token = getCookie(COOKIE_NAME);
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    cleanupSSE();

    try {
      const sseUrl = `${process.env.NEXT_PUBLIC_API_URL}/notifications/subscribe/${userId}?token=${token}`;
      console.log(`Creating SSE connection (attempt ${retryCount.current + 1}/${maxRetries})`);

      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connection established');
        setSseConnected(true);
        setError(null);
        retryCount.current = 0; // Reset retry count on success
      };

      eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          // Handle ping messages
          if (data.type === 'ping' || data.type === 'connected') {
            return;
          }

          // Handle new notifications
          if (data.type && data.message) {
            const newNotification: NotificationResponse = {
              id: data.id || `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: data.type,
              message: data.message,
              status: NotificationStatus.UNREAD,
              data: data.data || null,
              userId: data.userId || userId,
              clientId: data.clientId || null,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            };

            setNotifications(prev => [newNotification, ...prev]);

            // Show toast only if page is visible
            if (isPageVisible.current) {
              toast({
                title: 'New Notification',
                description: data.message,
                variant: 'default',
              });
            }
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = () => {
        console.error('SSE connection error');
        setSseConnected(false);

        // Only retry if page is visible and within retry limit
        if (isPageVisible.current && retryCount.current < maxRetries) {
          const delay = Math.min(2000 * Math.pow(2, retryCount.current), 30000);
          console.log(`SSE reconnecting in ${delay}ms`);

          // Start countdown
          setReconnectIn(delay);
          countdownIntervalRef.current = setInterval(() => {
            setReconnectIn(prev => {
              const newValue = Math.max(0, prev - 1000);
              if (newValue === 0 && countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              return newValue;
            });
          }, 1000);

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectIn(0);
            retryCount.current++;
            createSSEConnection();
          }, delay);
        } else {
          console.log('SSE giving up, push notifications will handle delivery');
          setReconnectIn(0);
        }
      };
    } catch (err) {
      console.error('Error creating SSE connection:', err);
      setSseConnected(false);
    }
  }, [userId, getCookie, cleanupSSE, toast]);

  // Handle page visibility changes with delayed disconnection
  useEffect(() => {
    let disconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      const wasVisible = isPageVisible.current;
      isPageVisible.current = !document.hidden;

      if (!wasVisible && isPageVisible.current) {
        // Page became visible - clear any pending disconnect and reconnect
        if (disconnectTimeout) {
          clearTimeout(disconnectTimeout);
          disconnectTimeout = null;
        }
        if (!sseConnected) {
          console.log('Page became visible and SSE disconnected, reconnecting');
          retryCount.current = 0; // Reset retry count
          createSSEConnection();
        } else {
          console.log('Page became visible but SSE still connected, no action needed');
        }
        refreshNotifications();
      } else if (wasVisible && !isPageVisible.current) {
        // Page became hidden - schedule disconnect after delay
        console.log('Page became hidden, scheduling SSE disconnect in 30 seconds');

        disconnectTimeout = setTimeout(() => {
          if (!isPageVisible.current) {
            console.log('Page still hidden after 30s, closing SSE connection');
            cleanupSSE();
          }
          disconnectTimeout = null;
        }, 30000); // 30 second delay before disconnecting
      }
    };

    const handleFocus = () => {
      // Browser window gained focus - ensure SSE is connected
      if (!sseConnected && isPageVisible.current) {
        console.log('Window focused, ensuring SSE connection');
        createSSEConnection();
      }
    };

    const handleBlur = () => {
      // Browser window lost focus - but don't disconnect immediately
      console.log('Window blurred, but keeping SSE connection for now');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      if (disconnectTimeout) {
        clearTimeout(disconnectTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [createSSEConnection, cleanupSSE, refreshNotifications, sseConnected]);

  // Check for push notification support
  useEffect(() => {
    const checkPushSupport = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setPushEnabled(!!subscription);
        } catch (err) {
          console.log('Push notifications not available');
          setPushEnabled(false);
        }
      }
    };

    checkPushSupport();
  }, []);

  // Load initial notifications
  useEffect(() => {
    const loadInitialNotifications = async () => {
      try {
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

  // Initialize SSE connection
  useEffect(() => {
    if (userId && isPageVisible.current) {
      createSSEConnection();
    }
    return cleanupSSE;
  }, [userId, createSSEConnection, cleanupSSE]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    console.log('Manual reconnect triggered');
    retryCount.current = 0;
    setReconnectIn(0);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    createSSEConnection();
  }, [createSSEConnection]);

  // Mark notification as read
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

  // Mark all notifications as read
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

  // Listen for push notification events (when page is in background)
  useEffect(() => {
    const handlePushNotification = () => {
      // Refresh notifications when we receive a push notification
      // This helps sync state when notifications arrive via push while page was hidden
      if (isPageVisible.current) {
        refreshNotifications();
      }
    };

    // Listen for service worker messages about received push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'PUSH_NOTIFICATION_RECEIVED') {
          handlePushNotification();
        }
      });
    }
  }, [refreshNotifications]);

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
        sseConnected,
        pushEnabled,
        reconnectIn,
        isConnected: sseConnected || pushEnabled, // Backward compatibility
        manualReconnect,
        refreshNotifications,
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
