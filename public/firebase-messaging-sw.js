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

function resolveNotificationTargetUrl(raw) {
  const fallback = "/feed";
  if (!raw || typeof raw !== "string") return fallback;
  try {
    return new URL(raw, self.location.origin).href;
  } catch {
    return fallback;
  }
}

function pathFromResolvedUrl(absoluteUrl) {
  try {
    const parsed = new URL(absoluteUrl);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/feed";
  }
}

function notifyOpenClients(targetUrl) {
  const path = pathFromResolvedUrl(targetUrl);
  const message = {
    type: "push-notification-click",
    url: targetUrl,
    path,
  };
  return self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((windowClients) => {
      for (const client of windowClients) {
        client.postMessage(message);
      }
      const focused = windowClients.find((c) => "focus" in c);
      if (focused) {
        return focused.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = resolveNotificationTargetUrl(event.notification.data?.url);
  event.waitUntil(notifyOpenClients(targetUrl));
});
