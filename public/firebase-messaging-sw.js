/* eslint-disable no-undef */
const OFFLINE_URL = "/offline.html";

importScripts("/firebase-push-config.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js");

if (self.FIREBASE_PUSH_CONFIG) {
  firebase.initializeApp(self.FIREBASE_PUSH_CONFIG);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    // FCM already displays messages that include a top-level `notification` payload.
    if (payload?.notification?.title) return;
    showNotificationFromPayload(payload);
  });
}

function showNotificationFromPayload(payload) {
  const notification = payload?.notification ?? {};
  const data = payload?.data ?? {};
  const title =
    notification.title || data.title || "AsExcepted";
  const body = notification.body || data.body || "";
  const icon =
    notification.icon || data.icon || "/icons/icon-192.png";
  const url =
    data.url ||
    payload?.fcmOptions?.link ||
    notification.click_action ||
    "/feed";

  self.registration.showNotification(title, {
    body,
    icon,
    badge: "/icons/icon-192.png",
    data: { url },
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("asexcepted-offline-v1").then((cache) => cache.add(OFFLINE_URL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open("asexcepted-offline-v1");
      const fallback = await cache.match(OFFLINE_URL);
      return fallback || Response.error();
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/feed";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client && "navigate" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
