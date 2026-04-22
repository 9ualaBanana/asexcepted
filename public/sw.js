const OFFLINE_URL = "/offline.html";

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

self.addEventListener("push", (event) => {
  const defaultPayload = {
    title: "AsExcepted",
    body: "You have a new notification.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };

  let payload = defaultPayload;
  if (event.data) {
    try {
      payload = { ...defaultPayload, ...event.data.json() };
    } catch {
      payload = { ...defaultPayload, body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: payload.url || "/",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
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
