'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePushNotification } from '@/hooks/usePushNotification';
import { NotificationPermissionDialog } from './PushNotificationPermissionDialog';

interface NotificationPermissionContextType {
  showPermissionDialog: () => void;
  hidePermissionDialog: () => void;
  hasShownDialogThisSession: boolean;
  isDismissedPermanently: boolean;
}

const NotificationPermissionContext = createContext<NotificationPermissionContextType | undefined>(
  undefined
);

export const useNotificationPermissionDialog = () => {
  const context = useContext(NotificationPermissionContext);
  if (context === undefined) {
    throw new Error(
      'useNotificationPermissionDialog must be used within a NotificationPermissionProvider'
    );
  }
  return context;
};

interface NotificationPermissionProviderProps {
  children: ReactNode;
}

const STORAGE_KEYS = {
  DISMISSED_PERMANENTLY: 'notification_permission_dismissed_permanently',
  LAST_SHOWN: 'notification_permission_last_shown',
} as const;

export const NotificationPermissionProvider: React.FC<NotificationPermissionProviderProps> = ({
  children,
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [hasShownDialogThisSession, setHasShownDialogThisSession] = useState(false);
  const [isDismissedPermanently, setIsDismissedPermanently] = useState(false);

  const { subscription, isPushSupported } = usePushNotification();
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEYS.DISMISSED_PERMANENTLY);
    if (dismissed === 'true') {
      setIsDismissedPermanently(true);
    }
  }, []);

  useEffect(() => {
    const shouldShowDialog = () => {
      if (!isPushSupported || subscription || isDismissedPermanently || hasShownDialogThisSession)
        return false;

      const lastShown = localStorage.getItem(STORAGE_KEYS.LAST_SHOWN);
      if (lastShown) {
        const lastShownTime = new Date(lastShown).getTime();
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (lastShownTime > oneDayAgo) {
          return false;
        }
      }

      return true;
    };

    const timeoutId = setTimeout(() => {
      if (shouldShowDialog()) {
        setShowDialog(true);
        setHasShownDialogThisSession(true);
        localStorage.setItem(STORAGE_KEYS.LAST_SHOWN, new Date().toISOString());
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [isPushSupported, subscription, isDismissedPermanently, hasShownDialogThisSession]);

  const showPermissionDialog = () => {
    if (!isDismissedPermanently && isPushSupported && !subscription) {
      setShowDialog(true);
      setHasShownDialogThisSession(true);
    }
  };

  const hidePermissionDialog = () => {
    setShowDialog(false);
  };

  const handleDialogClose = (permanentlyDismissed: boolean = false) => {
    setShowDialog(false);

    if (permanentlyDismissed) {
      localStorage.setItem(STORAGE_KEYS.DISMISSED_PERMANENTLY, 'true');
      setIsDismissedPermanently(true);
    }
  };

  const contextValue: NotificationPermissionContextType = {
    showPermissionDialog,
    hidePermissionDialog,
    hasShownDialogThisSession,
    isDismissedPermanently,
  };
  return (
    <NotificationPermissionContext.Provider value={contextValue}>
      {children}
      <NotificationPermissionDialog open={showDialog} onOpenChange={handleDialogClose} />
    </NotificationPermissionContext.Provider>
  );
};
