// components/notifications/NotificationPermissionDialog.tsx
'use client';

import React, { useState } from 'react';
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
import { Bell, MessageSquare, CheckSquare, UserPlus } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface NotificationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean, permanentlyDismissed?: boolean) => void;
}

export const NotificationPermissionDialog: React.FC<NotificationPermissionDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [isEnabling, setIsEnabling] = useState(false);
  const { subscribeToNotifications, isPushSupported } = usePushNotification();
  const { toast } = useToast();

  if (!isPushSupported) return null;

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      await subscribeToNotifications();
      toast({
        title: 'Notifications Enabled!',
        description: "You'll now receive push notifications for important updates.",
        variant: 'success',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      toast({
        title: 'Permission Required',
        description: 'Please allow notifications in your browser settings to continue.',
        variant: 'destructive',
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleDontAskAgain = () => {
    onOpenChange(false, true); // permanentlyDismissed = true
  };

  const notificationTypes = [
    {
      icon: <CheckSquare className="h-4 w-4 text-blue-500" />,
      text: 'When tasks are assigned to you',
    },
    {
      icon: <MessageSquare className="h-4 w-4 text-green-500" />,
      text: 'When someone comments on your tasks',
    },
    {
      icon: <UserPlus className="h-4 w-4 text-purple-500" />,
      text: 'When task details are updated',
    },
    {
      icon: <Bell className="h-4 w-4 text-orange-500" />,
      text: 'Important system updates',
    },
  ];

  return (
    <AlertDialog open={open} onOpenChange={() => {}}>
      <AlertDialogContent className="max-w-[max-content]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <Bell className="h-6 w-6 text-blue-500" />
            Stay Updated with Push Notifications
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Never miss important updates! Get instant notifications for:
              </p>

              <ul className="space-y-3">
                {notificationTypes.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm">
                    {item.icon}
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-blue-50 dark:bg-blue-950/50 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 <strong>Tip:</strong> You can always change this setting later in your
                  notification preferences.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDontAskAgain}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Don&apos;t ask again
            </Button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <AlertDialogCancel onClick={handleCancel} className="flex-1 sm:flex-none">
              Maybe Later
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleEnable}
              disabled={isEnabling}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
            >
              {isEnabling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </>
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
