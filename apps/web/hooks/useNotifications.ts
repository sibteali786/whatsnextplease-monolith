import { useState, useEffect } from "react";
import { NotificationResponse } from "@wnp/types";
import { fetchNotifications } from "@/db/repositories/notifications/getNotifications";
import { markAsReadNotification } from "@/db/repositories/notifications/markAsReadById";
import { NotificationStatus } from "@prisma/client";

interface UseNotificationsProps {
  userId: string;
  role: string;
}

export const useNotifications = ({ userId, role }: UseNotificationsProps) => {
  const [notifications, setNotifications] = useState<NotificationResponse[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [markingRead, setMarkingRead] = useState<string[]>([]);

  const markAsRead = async (id: string) => {
    try {
      setMarkingRead((prev) => [...prev, id]);
      await markAsReadNotification(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, status: NotificationStatus.READ }
            : notification,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to mark as read"),
      );
    } finally {
      setMarkingRead((prev) => prev.filter((item) => item !== id));
    }
  };

  useEffect(() => {
    const loadInitialNotifications = async () => {
      try {
        const response = await fetchNotifications(userId, role);
        setNotifications(response.notifications);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to fetch notifications"),
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialNotifications();
  }, [userId, role]);

  useEffect(() => {
    const eventSource = new EventSource(
      `http://localhost:5001/notifications/subscribe/${userId}`,
    );

    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      setNotifications((prev) => [notification, ...prev]);
    };

    eventSource.onerror = () => {
      setError(new Error("SSE connection error"));
      eventSource.close();
    };

    return () => eventSource.close();
  }, [userId]);

  return {
    notifications,
    isLoading,
    error,
    totalNotifications: notifications.length,
    markAsRead,
    markingRead,
  };
};
