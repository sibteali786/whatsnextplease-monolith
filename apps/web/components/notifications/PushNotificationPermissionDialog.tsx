import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bell } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';

export const NotificationPermissionDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { subscribeToNotifications, isPushSupported } = usePushNotification();

  const handleEnable = async () => {
    try {
      await subscribeToNotifications();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    }
  };

  if (!isPushSupported) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Enable Push Notifications
          </AlertDialogTitle>
          <AlertDialogDescription>
            Get instant updates about your tasks, even when you&apos;re not actively using the app.
            You can always change this later in your application settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not Now</AlertDialogCancel>
          <AlertDialogAction onClick={handleEnable}>Enable</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
