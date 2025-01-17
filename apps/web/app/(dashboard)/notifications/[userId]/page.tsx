'use client';
import { State } from '@/components/DataState';
import NotificationsList from '@/components/notifications/NotificationsList';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, Loader2, XCircle } from 'lucide-react';

export default function Notifications() {
  const { notifications, isLoading, error, markAsRead, markingRead, unreadCount } = useNotifications();
  
  console.log('Notifications page rendering:', { notifications, unreadCount });

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
}