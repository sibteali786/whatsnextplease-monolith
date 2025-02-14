import { useState, useEffect } from 'react';
import { COOKIE_NAME } from '@/utils/constant';
import { getCookie } from '@/utils/utils';

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
        const token = getCookie(COOKIE_NAME);

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/push-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription: newSubscription }),
        });

        setSubscription(newSubscription);
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  };

  return {
    isPushSupported: 'serviceWorker' in navigator && 'PushManager' in window,
    subscription,
    subscribeToNotifications,
  };
};
