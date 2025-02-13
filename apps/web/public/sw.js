/* eslint-disable no-undef */
self.addEventListener('push', onPushContent);

self.addEventListener('notificationclick', onNotificationClick);

function onPushContent(event) {
  if (!event.data) {
    return;
  }
  const options = {
    body: event.data.text(),
    icon: '/lightLogo.png',
    badge: '/lightLogo.png',
    data: {
      url: self.location.origin,
    },
  };
  event.waitUntil(handleShowNotification('WNP Notification', options));
}

function onNotificationClick(event) {
  event.notification.close();
  const urlWebApp = event.notification.data.url;
  event.waitUntil(handleNotificationClick(urlWebApp));
}

function handleShowNotification(title, options) {
  if (!title) {
    throw new Error('Title is required');
  }
  if ('body' in options && 'data' in options) {
    self.registration.showNotification(title, options);
  }
}

function handleNotificationClick(url) {
  if (!url) {
    throw new Error('Invalid Url');
  }
  clients.openWindow(url);
}
