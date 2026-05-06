"use client";

import { getToken } from "firebase/messaging";

import { createClient } from "@/lib/supabase/client";
import { getFirebaseMessagingClient } from "@/lib/push/firebase-client";

type RegisterBrowserPushOptions = {
  requestPermission?: boolean;
};

export async function registerBrowserPushToken({
  requestPermission = false,
}: RegisterBrowserPushOptions = {}): Promise<
  | "unsupported"
  | "permission-denied"
  | "not-authenticated"
  | "misconfigured"
  | "registered"
> {
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

  const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swReg,
  });
  if (!token) return "misconfigured";

  await fetch("/api/push/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });

  return "registered";
}
