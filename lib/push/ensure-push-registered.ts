"use client";

import { getToken } from "firebase/messaging";

import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/client";
import { getFirebaseMessagingClient } from "@/lib/push/firebase-client";

export type EnsurePushResult =
  | "unsupported"
  | "permission-denied"
  | "not-authenticated"
  | "misconfigured"
  | "register-failed"
  | "registered";

type EnsurePushOptions = {
  requestPermission?: boolean;
};

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Macintosh/i.test(ua)) return "mac";
  return "web";
}

export async function ensurePushRegistered({
  requestPermission = false,
}: EnsurePushOptions = {}): Promise<EnsurePushResult> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  if (!("serviceWorker" in navigator)) return "unsupported";
  if (!window.isSecureContext) return "unsupported";

  let permission = Notification.permission;
  if (permission !== "granted" && requestPermission) {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return "permission-denied";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "not-authenticated";

  const messaging = await getFirebaseMessagingClient();
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!messaging || !vapidKey) return "misconfigured";

  const swReg = await navigator.serviceWorker.register(ROUTES.firebaseMessagingSw);
  await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swReg,
  });
  if (!token) return "misconfigured";

  const response = await fetch("/api/push/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, platform: detectPlatform() }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };
  if (!response.ok || !payload.ok) {
    return "register-failed";
  }

  return "registered";
}

/** @deprecated Use ensurePushRegistered */
export async function registerBrowserPushToken(
  options: EnsurePushOptions = {},
): Promise<EnsurePushResult> {
  return ensurePushRegistered(options);
}
