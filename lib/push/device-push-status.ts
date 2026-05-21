"use client";

import { getToken } from "firebase/messaging";

import { ROUTES } from "@/lib/routes";
import { getFirebaseMessagingClient } from "@/lib/push/firebase-client";

export type DeviceFcmTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "permission-denied" | "misconfigured" };

/** Resolve this browser's FCM token without registering it. */
export async function getDeviceFcmToken(): Promise<DeviceFcmTokenResult> {
  if (typeof window === "undefined") return { ok: false, reason: "unsupported" };
  if (!("Notification" in window)) return { ok: false, reason: "unsupported" };
  if (!("serviceWorker" in navigator)) return { ok: false, reason: "unsupported" };
  if (!window.isSecureContext) return { ok: false, reason: "unsupported" };
  if (Notification.permission !== "granted") {
    return { ok: false, reason: "permission-denied" };
  }

  const messaging = await getFirebaseMessagingClient();
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!messaging || !vapidKey) return { ok: false, reason: "misconfigured" };

  const swReg = await navigator.serviceWorker.register(ROUTES.firebaseMessagingSw);
  await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: swReg,
  });
  if (!token) return { ok: false, reason: "misconfigured" };

  return { ok: true, token };
}

export async function fetchDevicePushRegistered(
  token: string,
): Promise<boolean | null> {
  const params = new URLSearchParams({ token });
  const response = await fetch(`/api/push/status?${params.toString()}`);
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => ({}))) as {
    registeredForDevice?: boolean;
  };
  return Boolean(payload.registeredForDevice);
}

export async function unregisterDevicePushToken(token: string): Promise<boolean> {
  const response = await fetch("/api/push/unregister", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean };
  return response.ok && Boolean(payload.ok);
}
