'use client';

import { State } from '@/components/DataState';
import NotificationsList from '@/components/notifications/NotificationsList';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { getCurrentUser, UserState } from '@/utils/user';
import { Roles } from '@prisma/client';
import { Bell, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const NotificationsContent = () => {
  const { notifications, isLoading, error, markAsRead, markingRead } = useNotifications();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <State
        variant={'destructive'}
        icon={XCircle}
        title="Failed to load notifications"
        description={error.message || 'Please try again later'}
        ctaText="Retry"
        onCtaClick={() => window.location.reload()}
      />
    );
  }

  if (!notifications.length) {
    return (
      <State
        icon={Bell}
        variant={'info'}
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
};

export default function Notifications({ params }: { params: { userId: string } }) {
  const [user, setUser] = useState<UserState>();

  useEffect(() => {
    const fetchDependencies = async () => {
      const loggedInUser = await getCurrentUser();
      setUser(loggedInUser);
    };
    fetchDependencies();
  }, []);

  if (!user) return null;

  return (
    <NotificationProvider
      userId={user.id ?? params?.userId}
      role={user.role.name ?? Roles.TASK_AGENT}
    >
      <NotificationsContent />
    </NotificationProvider>
  );
}
