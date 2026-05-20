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

// Push is handled only in /firebase-messaging-sw.js (do not duplicate here).
