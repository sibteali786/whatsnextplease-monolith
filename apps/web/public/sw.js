/* eslint-disable no-undef */
self.addEventListener('push', onPushContent);

self.addEventListener('notificationclick', onNotificationClick);

self.addEventListener('install', function onInstall(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function onActivate(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

function onPushContent(event) {
  if (!event.data) {
    return;
  }
  const { title, body, data } = JSON.parse(event.data.text());
  const options = {
    body: body,
    icon: '/lightLogo.svg',
    badge: '/lightLogo.svg',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: 'vibration-sample',
    actions: [
      {
        action: 'view',
        title: 'View Task',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    data: {
      url: data?.url || self.location.origin, // Use contextual URL from payload
      type: data?.type,
      taskId: data?.taskId,
    },
  };
  event.waitUntil(handleShowNotification(title, options));
}

function onNotificationClick(event) {
  const urlWebApp = event.notification.data.url;
  if (!urlWebApp) {
    throw new Error('Invalid Url');
  }
  if (event.action === 'dismiss') {
    event.waitUntil(event.notification.close());
  } else {
    event.waitUntil(clients.openWindow(urlWebApp));
  }
}

function handleShowNotification(title, options) {
  if (!title) {
    throw new Error('Title is required');
  }
  if ('body' in options && 'data' in options) {
    self.registration.showNotification(title, options);
  }
}
