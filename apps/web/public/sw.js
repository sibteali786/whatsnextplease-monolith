/* eslint-disable no-undef */
self.addEventListener('push', onPushContent);

self.addEventListener('notificationclick', onNotificationClick);

function onPushContent(event) {
  if (!event.data) {
    return;
  }
  const { title, body } = JSON.parse(event.data.text());
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
      url: self.location.origin,
    },
  };
  event.waitUntil(handleShowNotification(title, options));
}

function onNotificationClick(event) {
  event.notification.close();
  const urlWebApp = event.notification.data.url;
  event.waitUntil(handleNotificationClick(event, urlWebApp));
}

function handleShowNotification(title, options) {
  if (!title) {
    throw new Error('Title is required');
  }
  if ('body' in options && 'data' in options) {
    self.registration.showNotification(title, options);
  }
}

function handleNotificationClick(event, url) {
  if (!url) {
    throw new Error('Invalid Url');
  }
  if (event.notification.action === 'view') {
    clients.openWindow(url);
  }
  if (event.notification.action === 'dismiss') {
	event.notification.close();
  }
}
