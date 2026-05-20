"use client";

import { getApps, initializeApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

import { readFirebasePushConfigFromEnv } from "@/lib/push/firebase-sw-config";

export async function getFirebaseMessagingClient(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) return null;

  const config = readFirebasePushConfigFromEnv();
  if (!config) return null;

  const app = getApps()[0] ?? initializeApp(config);
  return getMessaging(app);
}
