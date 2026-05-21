"use client";

import { onMessage } from "firebase/messaging";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getFirebaseMessagingClient } from "@/lib/push/firebase-client";
import {
  attachPushNotificationClickHandler,
  listenForPushNotificationClicks,
  navigateFromPushNotification,
} from "@/lib/push/notification-navigation";

function extractPushUrl(payload: {
  notification?: { click_action?: string; title?: string; body?: string; icon?: string };
  data?: Record<string, string>;
  fcmOptions?: { link?: string };
}): string | undefined {
  const data = payload.data ?? {};
  const clickAction = payload.notification?.click_action;
  return (
    data.url ||
    payload.fcmOptions?.link ||
    (typeof clickAction === "string" ? clickAction : undefined) ||
    undefined
  );
}

function showForegroundNotification(
  payload: {
    notification?: { title?: string; body?: string; icon?: string };
    data?: Record<string, string>;
    fcmOptions?: { link?: string };
  },
  onNavigate: (url: string | undefined) => void,
) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  const notification = payload.notification ?? {};
  const data = payload.data ?? {};
  const title = notification.title || data.title || "AsExcepted";
  const body = notification.body || data.body || "";
  const icon = notification.icon || data.icon || "/icons/icon-192.png";
  const url = extractPushUrl(payload);

  const instance = new Notification(title, {
    body,
    icon,
    data: { url: url ?? "" },
  });
  attachPushNotificationClickHandler(instance, onNavigate, url);
}

export function PushRegistration() {
  const router = useRouter();

  useEffect(() => {
    return listenForPushNotificationClicks((href) => router.push(href));
  }, [router]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const onNavigate = (rawUrl: string | undefined) => {
      navigateFromPushNotification((href) => router.push(href), rawUrl);
    };

    void (async () => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;

      const messaging = await getFirebaseMessagingClient();
      if (!messaging || cancelled) return;

      unsubscribe = onMessage(messaging, (payload) => {
        const url = extractPushUrl({
          notification: payload.notification,
          data: payload.data,
          fcmOptions: payload.fcmOptions,
        });

        // App in foreground: navigate immediately on message if user is viewing the app,
        // and show a clickable notification for tray-based clicks.
        if (document.visibilityState === "visible") {
          showForegroundNotification(payload, onNavigate);
          return;
        }

        // Tab open but hidden: still route clicks via SW; optional local notification.
        if (url) {
          showForegroundNotification(payload, onNavigate);
        }
      });
    })().catch((error) => {
      console.warn("[push] registration failed:", error);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [router]);

  return null;
}
