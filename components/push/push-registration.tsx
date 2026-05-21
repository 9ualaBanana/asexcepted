"use client";

import { onMessage } from "firebase/messaging";
import { useEffect } from "react";

import { getFirebaseMessagingClient } from "@/lib/push/firebase-client";

function showForegroundNotification(payload: {
  notification?: { title?: string; body?: string; icon?: string };
  data?: Record<string, string>;
}) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  const notification = payload.notification ?? {};
  const data = payload.data ?? {};
  const title = notification.title || data.title || "AsExcepted";
  const body = notification.body || data.body || "";
  const icon = notification.icon || data.icon || "/icons/icon-192.png";
  new Notification(title, { body, icon });
}

export function PushRegistration() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;

      const messaging = await getFirebaseMessagingClient();
      if (!messaging || cancelled) return;

      unsubscribe = onMessage(messaging, (payload) => {
        // Foreground only — background uses the service worker (single display path).
        if (document.visibilityState !== "visible") return;
        showForegroundNotification(payload);
      });
    })().catch((error) => {
      console.warn("[push] registration failed:", error);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return null;
}
