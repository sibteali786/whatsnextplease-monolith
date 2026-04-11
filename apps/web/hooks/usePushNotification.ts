import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { StandardApiResponse } from '@/types/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotification = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          if (registration.waiting) {
            registration.waiting.postMessage('skipWaiting');
          }
          setRegistration(registration);
          return registration.pushManager.getSubscription();
        })
        .then(subscription => {
          setSubscription(subscription);
        })
        .catch(console.error);
    }
  }, []);

  const subscribeToNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      console.log('Permission ', permission);
      if (permission !== 'granted') {
        throw new Error('Permission not granted for notifications');
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) throw new Error('VAPID public key not found');

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      const newSubscription = await registration?.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      if (newSubscription) {
        const response = await apiClient.post<StandardApiResponse>(
          '/notifications/push-subscription',
          {
            subscription: newSubscription,
          }
        );

        if (!response.success) {
          throw new Error(
            'Failed to save subscription, try again or check network tab for more info'
          );
        }

        setSubscription(newSubscription);
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  };

  const unsubscribeFromNotifications = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        const response = await apiClient.delete<StandardApiResponse>(
          '/notifications/push-subscription',
          {
            endpoint: subscription.endpoint,
          }
        );
        if (response.success) {
          setSubscription(null);
        } else {
          throw new Error(
            'Failed to remove subscription, try again or check network tab for more info'
          );
        }
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      throw error;
    }
  };

  return {
    isPushSupported: 'serviceWorker' in navigator && 'PushManager' in window,
    subscription,
    subscribeToNotifications,
    unsubscribeFromNotifications,
  };
};
