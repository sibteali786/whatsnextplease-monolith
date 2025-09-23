// apps/web/contexts/NotificationContext.tsx
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
  manualReconnect: () => void;
  refreshNotifications: () => Promise<void>;
  tabId: string;
  connectionId: string | null;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  userId: string;
  role: string;
}

// Generate unique tab ID for this browser tab
const generateTabId = (): string => {
  // Try to get existing tab ID from sessionStorage (unique per tab)
  let tabId = sessionStorage.getItem('wnp_tab_id');
  if (!tabId) {
    tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('wnp_tab_id', tabId);
  }
  return tabId;
};

export const NotificationProvider = ({ children, userId, role }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [markingRead, setMarkingRead] = useState<string[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [reconnectIn, setReconnectIn] = useState(0);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  // Generate stable tab ID for this tab session
  const tabId = useRef(generateTabId());

  // SSE connection management
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 5; // Increased for better reliability with multi-tab
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
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSseConnected(false);
    setConnectionId(null);
    setReconnectIn(0);
  }, []);

  // Create SSE connection with multi-tab support
  const createSSEConnection = useCallback(() => {
    if (!userId || !isPageVisible.current) {
      console.log(`[Tab:${tabId.current}] Skipping SSE connection - page not visible or no userId`);
      return;
    }

    // Don't retry beyond max attempts
    if (retryCount.current >= maxRetries) {
      console.log(`[Tab:${tabId.current}] SSE max retries reached, relying on push notifications`);
      return;
    }

    const token = getCookie(COOKIE_NAME);
    if (!token) {
      console.error(`[Tab:${tabId.current}] No authentication token found`);
      return;
    }

    cleanupSSE();

    try {
      // Include tabId in SSE URL for backend identification
      const sseUrl = `${process.env.NEXT_PUBLIC_API_URL}/notifications/subscribe/${userId}?token=${token}&tabId=${tabId.current}`;
      console.log(
        `[Tab:${tabId.current}] Creating SSE connection (attempt ${retryCount.current + 1}/${maxRetries})`
      );

      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log(`[Tab:${tabId.current}] SSE connection established`);
        setSseConnected(true);
        setError(null);
        retryCount.current = 0; // Reset retry count on success
      };

      eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          // Handle connection confirmation
          if (data.type === 'connected') {
            setConnectionId(data.connectionId);
            console.log(
              `[Tab:${tabId.current}] Connection confirmed with ID: ${data.connectionId}`
            );
            return;
          }

          // Handle ping messages
          if (data.type === 'ping') {
            console.debug(
              `[Tab:${tabId.current}] Received ping from connection: ${data.connectionId}`
            );
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

            console.log(
              `[Tab:${tabId.current}] Received notification via connection: ${data.connectionId}`
            );

            // Use functional update to avoid stale closure
            setNotifications(prev => {
              // Check if notification already exists to avoid duplicates
              const exists = prev.some(n => n.id === newNotification.id);
              if (exists) {
                console.log(
                  `[Tab:${tabId.current}] Duplicate notification ignored: ${newNotification.id}`
                );
                return prev;
              }
              return [newNotification, ...prev];
            });

            // Show toast only if page is visible and this is the active tab
            if (isPageVisible.current) {
              toast({
                title: 'New Notification',
                description: data.message,
                variant: 'default',
              });
            }
          }
        } catch (err) {
          console.error(`[Tab:${tabId.current}] Error parsing SSE message:`, err);
        }
      };

      eventSource.onerror = event => {
        console.error(`[Tab:${tabId.current}] SSE connection error:`, event);
        setSseConnected(false);

        // Only retry if page is visible and within retry limit
        if (isPageVisible.current && retryCount.current < maxRetries) {
          const delay = Math.min(2000 * Math.pow(2, retryCount.current), 30000);
          console.log(`[Tab:${tabId.current}] SSE reconnecting in ${delay}ms`);

          // Start countdown
          setReconnectIn(delay);
          countdownIntervalRef.current = window.setInterval(() => {
            setReconnectIn(prev => {
              const newValue = Math.max(0, prev - 1000);
              if (newValue === 0 && countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              return newValue;
            });
          }, 1000);

          reconnectTimeoutRef.current = window.setTimeout(() => {
            setReconnectIn(0);
            retryCount.current++;
            createSSEConnection();
          }, delay);
        } else {
          console.log(
            `[Tab:${tabId.current}] SSE giving up, push notifications will handle delivery`
          );
          setReconnectIn(0);
        }
      };
    } catch (err) {
      console.error(`[Tab:${tabId.current}] Error creating SSE connection:`, err);
      setSseConnected(false);
    }
  }, [userId, getCookie, cleanupSSE, toast]);

  // Handle page visibility changes with improved tab management
  useEffect(() => {
    let disconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      const wasVisible = isPageVisible.current;
      isPageVisible.current = !document.hidden;

      if (!wasVisible && isPageVisible.current) {
        // Page became visible
        console.log(`[Tab:${tabId.current}] Page became visible`);

        if (disconnectTimeout) {
          clearTimeout(disconnectTimeout);
          disconnectTimeout = null;
        }

        if (!sseConnected) {
          console.log(`[Tab:${tabId.current}] Page visible and SSE disconnected, reconnecting`);
          retryCount.current = 0; // Reset retry count
          createSSEConnection();
        }

        // Always refresh notifications when tab becomes visible
        refreshNotifications();
      } else if (wasVisible && !isPageVisible.current) {
        // Page became hidden - schedule disconnect after longer delay for multi-tab scenarios
        console.log(
          `[Tab:${tabId.current}] Page became hidden, scheduling SSE disconnect in 60 seconds`
        );

        disconnectTimeout = setTimeout(() => {
          if (!isPageVisible.current) {
            console.log(
              `[Tab:${tabId.current}] Page still hidden after 60s, closing SSE connection`
            );
            cleanupSSE();
          }
          disconnectTimeout = null;
        }, 60000); // Increased to 60 seconds for better multi-tab experience
      }
    };

    const handleFocus = () => {
      console.log(`[Tab:${tabId.current}] Window focused`);
      if (!sseConnected && isPageVisible.current) {
        console.log(`[Tab:${tabId.current}] Window focused, ensuring SSE connection`);
        createSSEConnection();
      }
    };

    const handleBlur = () => {
      console.log(`[Tab:${tabId.current}] Window blurred, but keeping SSE connection for now`);
    };

    // Handle tab/window closing
    const handleBeforeUnload = () => {
      console.log(`[Tab:${tabId.current}] Tab/window closing, cleaning up SSE`);
      cleanupSSE();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (disconnectTimeout) {
        clearTimeout(disconnectTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [createSSEConnection, cleanupSSE, refreshNotifications, sseConnected]);

  // Cross-tab communication for notification sync
  useEffect(() => {
    const channel = new BroadcastChannel('wnp_notifications');

    // Listen for notifications from other tabs
    channel.onmessage = event => {
      if (event.data.type === 'NOTIFICATION_RECEIVED' && event.data.tabId !== tabId.current) {
        console.log(`[Tab:${tabId.current}] Received notification sync from another tab`);
        // Another tab received a notification, sync our state
        refreshNotifications();
      } else if (event.data.type === 'MARK_AS_READ' && event.data.tabId !== tabId.current) {
        // Another tab marked notification as read, update our state
        const { notificationId } = event.data;
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, status: NotificationStatus.READ }
              : notification
          )
        );
      }
    };

    return () => {
      channel.close();
    };
  }, [refreshNotifications]);

  // Check for push notification support
  useEffect(() => {
    const checkPushSupport = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setPushEnabled(!!subscription);
        } catch (err) {
          console.log(`[Tab:${tabId.current}] Push notifications not available`);
          setPushEnabled(false);
        }
      }
    };

    checkPushSupport();
  }, []);

  // Load initial notifications
  useEffect(() => {
    const loadInitialNotifications = async () => {
      console.log(`[Tab:${tabId.current}] Loading initial notifications`);
      try {
        const response = await fetchNotifications(userId, role);
        setNotifications(response.notifications);
        setError(null);
      } catch (err) {
        console.error(`[Tab:${tabId.current}] Failed to fetch initial notifications:`, err);
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
      console.log(`[Tab:${tabId.current}] Initializing SSE connection`);
      createSSEConnection();
    }
    return cleanupSSE;
  }, [userId, createSSEConnection, cleanupSSE]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    console.log(`[Tab:${tabId.current}] Manual reconnect triggered`);
    retryCount.current = 0;
    setReconnectIn(0);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    createSSEConnection();
  }, [createSSEConnection]);

  // Mark notification as read with cross-tab sync
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

      // Broadcast to other tabs
      const channel = new BroadcastChannel('wnp_notifications');
      channel.postMessage({
        type: 'MARK_AS_READ',
        notificationId: id,
        tabId: tabId.current,
      });
      channel.close();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark as read'));
    } finally {
      setMarkingRead(prev => prev.filter(item => item !== id));
    }
  };

  // Mark all notifications as read with cross-tab sync
  const markAllAsRead = async () => {
    try {
      await markAllAsReadNotifications(userId, role);
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          status: NotificationStatus.READ,
        }))
      );

      // Broadcast to other tabs
      const channel = new BroadcastChannel('wnp_notifications');
      channel.postMessage({
        type: 'MARK_ALL_AS_READ',
        tabId: tabId.current,
      });
      channel.close();

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

  // Listen for push notification events
  useEffect(() => {
    const handlePushNotification = () => {
      if (isPageVisible.current) {
        console.log(`[Tab:${tabId.current}] Refreshing notifications due to push event`);
        refreshNotifications();
      }
    };

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
        manualReconnect,
        refreshNotifications,
        tabId: tabId.current,
        connectionId,
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
