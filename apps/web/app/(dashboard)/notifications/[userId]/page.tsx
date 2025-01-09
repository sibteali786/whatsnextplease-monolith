"use client";

import { State } from "@/components/DataState";
import NotificationsList from "@/components/notifications/NotificationsList";
import { useNotifications } from "@/hooks/useNotifications";
import { getCurrentUser, UserState } from "@/utils/user";
import { Roles } from "@prisma/client";
import { Bell, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function Notifications({
  params,
}: {
  params: { userId: string };
}) {
  const [user, setUser] = useState<UserState>();
  useEffect(() => {
    const fetchDependencies = async () => {
      const loggedInUser = await getCurrentUser();
      setUser(loggedInUser);
    };
    fetchDependencies();
  }, []);
  const {
    notifications,
    isLoading,
    error,
    totalNotifications,
    markAsRead,
    markingRead,
  } = useNotifications({
    userId: params.userId,
    role: user?.role.name ?? Roles.TASK_AGENT,
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  if (error)
    return (
      <State
        variant={"destructive"}
        icon={XCircle}
        title="Failed to load notifications"
        description={error.message || "Please try again later"}
        ctaText="Retry"
        onCtaClick={() => window.location.reload()}
      />
    );

  if (!totalNotifications) {
    return (
      <State
        icon={Bell}
        variant={"info"}
        title="No notifications"
        description="When you receive notifications, they'll show up here"
      />
    );
  }

  return (
    <div className="p-4">
      <NotificationsList
        notifications={notifications}
        markAsRead={markAsRead}
        markingRead={markingRead}
      />
    </div>
  );
}
